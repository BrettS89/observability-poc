import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('golden-metrics');

export const httpRequestsTotal = meter.createCounter('http_requests_total', {
  description: 'Total HTTP requests',
});

export const httpRequestDurationMs = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration',
  unit: 'ms',
});

export const httpInFlight = meter.createUpDownCounter('http_in_flight_requests', {
  description: 'Number of in-flight HTTP requests',
});

export const eventLoopLagMs = meter.createHistogram('node_event_loop_lag_ms', {
  description: 'Event loop lag sampled over time',
  unit: 'ms',
});
