import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter,  } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { context } from '@opentelemetry/api';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

context.setGlobalContextManager(new AsyncLocalStorageContextManager());

function withJitter(baseMs: number, jitterRatio = 0.3) {
  const delta = baseMs * jitterRatio;
  return Math.floor(baseMs - delta + Math.random() * (2 * delta));
}

const metricExporter = new OTLPMetricExporter({
  // Example: http://localhost:4318/v1/metrics
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/otlp/metrics`,
  // headers: { Authorization: `Bearer ${process.env.INGEST_TOKEN}` }, // if needed
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: withJitter(10_000, 0.3),
  exportTimeoutMillis: 5_000,
});

// const exporter = new OTLPTraceExporter({
//   url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
// });

const sdk = new NodeSDK({
  // traceExporter: exporter,
  metricReader,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    getNodeAutoInstrumentations()
  ],
});

sdk.start();

process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
  } finally {
    process.exit(0);
  }
});

console.log('OpenTelemetry started');
