import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 25,
  duration: '30m',
};

export default function () {
  const r = Math.random();

  if (r < 0.7) {
    http.get('http://localhost:4006/cart');
  } else {
    http.get('http://localhost:4006/products');
  }

  sleep(1);
}
