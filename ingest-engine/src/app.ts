import express from 'express';
import { metricsRouter } from './ingest/metrics';

const app = express();

app.use(express.raw({
  type: ['application/x-protobuf', 'application/octet-stream', 'application/json'],
  limit: '10mb'
}));

app.use(metricsRouter);

export { app };
