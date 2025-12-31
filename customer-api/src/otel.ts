import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { context } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

context.setGlobalContextManager(new AsyncLocalStorageContextManager());

const prometheusExporter = new PrometheusExporter(
  {
    port: 9464,
    endpoint: '/metrics',
  },
  () => {
    console.log('Prometheus metrics available at http://localhost:9464/metrics');
  }
);

// const exporter = new OTLPTraceExporter({
//   url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
// });

const sdk = new NodeSDK({
  // traceExporter: exporter,
  metricReader: prometheusExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    getNodeAutoInstrumentations()
  ],
});

sdk.start();

console.log('OpenTelemetry started');