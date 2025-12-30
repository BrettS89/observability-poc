import express from 'express';
import axios from 'axios';
import { goldenMetricsMiddleware, startEventLoopLagSampler } from './middleware/express-golden-metrics';

const app = express();

startEventLoopLagSampler(1000);

app.use(goldenMetricsMiddleware);

app.use(express.json());

const url = 'https://www.swapi.tech/api/people';

app.get('/characters/:id', async (req, res) => {
  const { data } = await axios({
    method: 'GET',
    url: `${url}/${req.params.id}`,
  });

  res.json(data);
});

app.get('/cart', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/products', (_req, res) => {
  res.status(500).json({ ok: false });
});

export { app };
