import express from 'express';
import cors from 'cors';
import { metricsIngestRouter } from './routes/ingest';
import { metricsRouter } from './routes/metrics';
import { tablesRouter } from './routes/tables';

export const app = express();

app.use(cors());

app.use(express.raw({
  type: ['application/x-protobuf', 'application/octet-stream', 'application/json'],
  limit: '10mb'
}));

app.use(express.json());

app.use(metricsIngestRouter);
app.use(metricsRouter);
app.use(tablesRouter);
