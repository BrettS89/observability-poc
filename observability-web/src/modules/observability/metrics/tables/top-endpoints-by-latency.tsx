import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import Link from "@mui/joy/Link";

export type TopLatencyRow = {
  endpoint: string; // "GET /products"
  method: string;
  route: string;
  p95: number | null;
  p50: number | null;
  rps: number | null;
};

export type TopEndpointsByLatencyTableProps = {
  title?: string;
  windowLabel?: string; // "15m"
  subtitle?: string; // "p95 over last 15m"
  asOf?: number; // ms epoch
  rows: TopLatencyRow[];
  onViewAll?: () => void;
};

function fmtInt(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function fmtRps(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  // match mockup: one decimal
  return n.toFixed(1);
}

export function TopEndpointsByLatencyTable(props: TopEndpointsByLatencyTableProps) {
  const {
    rows,
    onViewAll,
  } = props;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >

      <Box sx={{ px: 2.25, pt: 1.25, flex: 1, overflow: "hidden" }}>
        <Table
          size="sm"
          borderAxis="none"
          stickyHeader={false}
          sx={{
            width: "100%",
            // "--TableCell-paddingY": "14px",
            // "--TableCell-paddingX": "12px",
            backgroundColor: "transparent",
            "--TableCell-paddingY": "8px",

            // remove Joy defaults that create the black band
            "& thead th": {
              backgroundColor: "transparent",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 650,
              letterSpacing: "0.06em",
              fontSize: 15,
              borderBottom: "1px solid rgba(255,255,255,0.10)",
              paddingTop: "0px",
              paddingBottom: "10px",
            },

            "& tbody td": {
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.84)",
              fontSize: 14,
            },

            "& tbody tr:hover td": {
              backgroundColor: "rgba(255,255,255,0.03)",
            },
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", width: "55%" }}>Endpoint</th>
              <th style={{ textAlign: "right", width: "15%" }}>p95 (ms)</th>
              <th style={{ textAlign: "right", width: "15%" }}>p50 (ms)</th>
              <th style={{ textAlign: "right", width: "15%" }}>RPS</th>
            </tr>
          </thead>

          <tbody>
            {rows?.length ? (
              rows.slice(0, 5).map((r) => (
                <tr key={r.endpoint}>
                  <td>
                    <Typography
                      level="body-md"
                      sx={{
                        fontWeight: 650,
                        color: "rgba(255,255,255,0.90)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {r.endpoint}
                    </Typography>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <Typography
                      level="body-md"
                      sx={{
                        fontWeight: 700,
                        color: "rgba(251, 191, 36, 0.95)", // amber highlight like mock
                      }}
                    >
                      {fmtInt(r.p95)}
                    </Typography>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <Typography level="body-md" sx={{ fontWeight: 650 }}>
                      {fmtInt(r.p50)}
                    </Typography>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <Typography level="body-md" sx={{ fontWeight: 650 }}>
                      {fmtRps(r.rps)}
                    </Typography>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  <Typography
                    level="body-sm"
                    sx={{ color: "rgba(255,255,255,0.55)", py: 1 }}
                  >
                    No data yet
                  </Typography>
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {/* Footer link */}
        <Box sx={{ pt: 1.25, pb: 1.25 }}>
          <Link
            component="button"
            onClick={onViewAll}
            underline="none"
            sx={{
              color: "rgba(96, 165, 250, 0.95)", // blue link like mock
              fontWeight: 650,
              fontSize: 13,
              "&:hover": { color: "rgba(147, 197, 253, 0.95)" },
            }}
          >
            View all →
          </Link>
        </Box>
      </Box>
    </Box>
  );
}