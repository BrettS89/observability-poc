import express from 'express';
import cors from 'cors';

import { metricsRouter } from './routes/metrics';
import { tablesRouter } from './routes/tables';

const app = express();

app.use(express.json());
app.use(cors());

app.use(metricsRouter);
app.use(tablesRouter);

export { app };
