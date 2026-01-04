import express from 'express';
import { metricsRouter } from './ingest/metrics';

const app = express();

app.use('/otlp', express.raw({ type: ['application/x-protobuf', 'application/octet-stream'], limit: '10mb' }));

app.use(metricsRouter);

export { app };
