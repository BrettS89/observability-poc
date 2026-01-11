import express from 'express';

import { metricsRouter } from './routes/metrics';

const app = express();

app.use(express.json());

app.use(metricsRouter);

export { app };
