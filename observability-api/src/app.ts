import express from 'express';
import cors from 'cors';

import { metricsRouter } from './routes/metrics';

const app = express();

app.use(express.json());
app.use(cors());

app.use(metricsRouter);

export { app };
