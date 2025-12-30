import protobuf from "protobufjs";
import { compress as snappyCompress } from "snappyjs";

const REMOTE_WRITE_PROTO = `
syntax = "proto3";
package prometheus;

message WriteRequest {
  repeated TimeSeries timeseries = 1;
}

message TimeSeries {
  repeated Label labels = 1;
  repeated Sample samples = 2;
}

message Label {
  string name = 1;
  string value = 2;
}

message Sample {
  double value = 1;
  int64 timestamp = 2; // milliseconds since epoch
}
`;

const root = protobuf.parse(REMOTE_WRITE_PROTO).root;
const WriteRequest = root.lookupType("prometheus.WriteRequest");

type LabelMap = Record<string, string>;

type ParsedSample = {
  metric: string;
  labels: LabelMap;
  value: number;
  timestampMs: number;
};

const CONFIG = {
  scrapeIntervalMs: 5000,
  mimirRemoteWriteUrl: process.env.MIMIR_REMOTE_WRITE_URL ?? "http://localhost:9009/api/v1/push",
  // For real multi-tenancy, this should be derived from an API key lookup.
  tenantId: process.env.TENANT_ID ?? "demo-tenant",
  // Target to scrape
  targets: [
    {
      name: "customer-app",
      url: process.env.SCRAPE_URL ?? "http://localhost:9464/metrics",
      // Optional static labels you want on every series from this target.
      staticLabels: {
        job: "customer-app",
        instance: "local",
      },
    },
  ],
  // Optional: add tenant_id as label (not required for Mimir tenancy; that's header-based)
  addTenantLabel: true,
} as const;

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function scrapePrometheusText(url: string): Promise<string> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const body = await safeReadText(res);
    throw new Error(`Scrape failed ${res.status} ${res.statusText} from ${url}: ${body}`);
  }
  return await res.text();
}

function unescapePromLabelValue(v: string): string {
  // Prometheus text format escapes: \\ \" \n
  // We'll handle the common ones.
  return v
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function parseMetricAndLabels(head: string): { metric: string; labels: LabelMap } {
  const labels: LabelMap = {};
  const braceStart = head.indexOf("{");

  // no labels
  if (braceStart === -1) {
    return { metric: head, labels };
  }

  const metric = head.slice(0, braceStart);
  const braceEnd = head.lastIndexOf("}");
  if (braceEnd === -1 || braceEnd < braceStart) {
    return { metric: metric, labels }; // malformed; best effort
  }

  const inside = head.slice(braceStart + 1, braceEnd).trim();
  if (!inside) return { metric, labels };

  // Split by commas not inside quotes (simple state machine)
  const pairs: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i];
    if (ch === '"' && inside[i - 1] !== "\\") {
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if (ch === "," && !inQuotes) {
      pairs.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) pairs.push(cur.trim());

  for (const p of pairs) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq).trim();
    let v = p.slice(eq + 1).trim();

    // Expect v to be "..."
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1);
    }
    labels[k] = unescapePromLabelValue(v);
  }

  return { metric, labels };
}

function parsePrometheusText(text: string, defaultTimestampMs: number): ParsedSample[] {
  const lines = text.split("\n");
  const out: ParsedSample[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Split metric+labels part from value/timestamp part.
    // Example:
    //   http_requests_total{method="GET",route="/money"} 12 1712...
    const firstSpace = line.indexOf(" ");
    if (firstSpace === -1) continue;

    const head = line.slice(0, firstSpace);
    const tail = line.slice(firstSpace + 1).trim();
    if (!tail) continue;

    // Parse value and optional timestamp
    const parts = tail.split(/\s+/);
    const valueStr = parts[0];
    const tsStr = parts[1];

    const value = parseFloat(valueStr);
    if (!Number.isFinite(value)) continue;

    const timestampMs = tsStr ? parseInt(tsStr, 10) : defaultTimestampMs;
    if (!Number.isFinite(timestampMs)) continue;

    // Parse head -> metric + labels
    const { metric, labels } = parseMetricAndLabels(head);
    if (!metric) continue;

    out.push({ metric, labels, value, timestampMs });
  }

  return out;
}

function stableSeriesKey(labels: LabelMap): string {
  const parts = Object.entries(labels)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`);
  return parts.join("|");
}

type SeriesKey = string;

function buildTimeSeries(
  samples: ParsedSample[],
  extraStaticLabels: LabelMap,
  tenantId: string,
  addTenantLabel: boolean
): any[] {
  // Group samples by unique labelset (including __name__)
  const map = new Map<SeriesKey, { labels: LabelMap; samples: { value: number; timestamp: number }[] }>();

  for (const s of samples) {
    // Compose full label set
    const labels: LabelMap = {
      ...extraStaticLabels,
      ...s.labels,
      __name__: s.metric,
    };

    if (addTenantLabel) {
      labels["tenant_id"] = tenantId;
    }

    // Create stable key
    const key = stableSeriesKey(labels);

    let series = map.get(key);
    if (!series) {
      series = { labels, samples: [] };
      map.set(key, series);
    }

    series.samples.push({ value: s.value, timestamp: s.timestampMs });
  }

  // Convert to remote_write TimeSeries format
  const timeseries = [];
  for (const { labels, samples } of map.values()) {
    const labelList = Object.entries(labels)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, value]) => ({ name, value }));

    timeseries.push({
      labels: labelList,
      samples: samples.map((x) => ({ value: x.value, timestamp: x.timestamp })),
    });
  }

  return timeseries;
}

async function sendToMimir(timeseries: any[], tenantId: string): Promise<void> {
  const payloadObj = { timeseries };
  const err = WriteRequest.verify(payloadObj);
  if (err) throw new Error(`Invalid WriteRequest: ${err}`);

  const message = WriteRequest.create(payloadObj);
  const encoded: Uint8Array = WriteRequest.encode(message).finish();

  // Snappy-compress (Prometheus remote_write expects snappy)
  const compressed = snappyCompress(encoded);

  const res = await fetch(CONFIG.mimirRemoteWriteUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-protobuf",
      "Content-Encoding": "snappy",
      "X-Prometheus-Remote-Write-Version": "0.1.0",
      // Mimir multi-tenancy header:
      "X-Scope-OrgID": tenantId,
    },
    body: Buffer.from(compressed),
  });

  if (!res.ok) {
    const body = await safeReadText(res);
    throw new Error(`Mimir remote_write failed ${res.status} ${res.statusText}: ${body}`);
  }
}

async function oneScrapeCycle(): Promise<void> {
  const now = Date.now();

  for (const t of CONFIG.targets) {
    const text = await scrapePrometheusText(t.url);
    const parsed = parsePrometheusText(text, now);

    const timeseries = buildTimeSeries(
      parsed,
      t.staticLabels,
      CONFIG.tenantId,
      CONFIG.addTenantLabel
    );

    // If nothing parsed, don't spam Mimir
    if (timeseries.length === 0) continue;

    await sendToMimir(timeseries, CONFIG.tenantId);

    console.log(
      `[ingest] pushed ${timeseries.length} series from ${t.name} -> Mimir (tenant=${CONFIG.tenantId})`
    );
  }
}

async function run() {
  console.log(`[ingest] starting...`);
  console.log(`[ingest] scrape interval: ${CONFIG.scrapeIntervalMs}ms`);
  console.log(`[ingest] mimir: ${CONFIG.mimirRemoteWriteUrl}`);
  console.log(`[ingest] targets: ${CONFIG.targets.map((t) => t.url).join(", ")}`);

  while (true) {
    const start = Date.now();
    try {
      await oneScrapeCycle();
    } catch (e) {
      console.error(`[ingest] cycle error:`, e);
    }
    const elapsed = Date.now() - start;
    const sleep = Math.max(0, CONFIG.scrapeIntervalMs - elapsed);
    await new Promise((r) => setTimeout(r, sleep));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
