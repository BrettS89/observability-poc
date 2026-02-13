import { Routes, Route } from 'react-router';
import { Metrics } from '../modules/observability/metrics';

export const Router = () => {
  return (
    <Routes>
      <Route path='/metrics/:tenant/:service' element={<Metrics />} />
    </Routes>
  );
};
