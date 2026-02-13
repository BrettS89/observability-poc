import express from 'express';
import { metricsIngestRouter } from './routes/ingest';
import { metricsRouter } from './routes/metrics';

export const app = express();

app.use(express.raw({
  type: ['application/x-protobuf', 'application/octet-stream', 'application/json'],
  limit: '10mb'
}));

app.use(express.json());

app.use(metricsIngestRouter);
app.use(metricsRouter);
