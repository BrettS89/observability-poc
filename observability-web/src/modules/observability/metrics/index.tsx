import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { useMetricsPoller } from '../../../hooks/use-metrics-poller';
import { useTablesPoller } from '../../../hooks/use-table-poller';
import { styles } from './styles';
import { makeLatencyOption } from './charts/latency';
import { makeSingleSeriesOption2 } from './charts/in-flight-requests';
import { makeSingleSeriesOptionError } from './charts/error-rate';
import { makeRpsOptions } from './charts/rps';
import { TopEndpointsByLatencyTable } from './tables/top-endpoints-by-latency';
import { timeAgo } from './utils';
import { RangeSelector } from './range-selector';

import Chip from "@mui/joy/Chip";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { TopEndpointsByErrorTable } from './tables/top-endpoints-by-errors';

export const Metrics = () => {
  const [range, setRage] = useState<string>('15m');
  const [tableRange, setTableRange] = useState<string>('15m');

  const { data: metrics, p50Points, p95Points, rpsPoints, errorRatePoints, inFlightPoints } = useMetricsPoller(range as any); // returns null initially
  const tablesData = useTablesPoller(tableRange as any);

  const rpsOption = useMemo(() => {
    const unit = metrics?.rps?.unit ?? 'req/s';
    return makeRpsOptions({
      title: 'Requests Per Second',
      unit,
      points: rpsPoints,
    });
  }, [metrics?.rps?.unit, rpsPoints]);

  const latencyOption = useMemo(() => {
    const unit = metrics?.latency?.unit ?? "ms";
    return makeLatencyOption({ unit, p50: p50Points, p95: p95Points });
  }, [metrics?.latency?.unit, p50Points, p95Points]);

  const errorRateOption = useMemo(() => {
    return makeSingleSeriesOptionError({
      title: "Error Rate",
      unit: "%",
      points: errorRatePoints,
      color: "rgb(244, 63, 94)", // rose/red
      minY: 0,
      decimals: 0,
    });
  }, [errorRatePoints]);

  const inFlightOption = useMemo(() => {
    return makeSingleSeriesOption2({
      title: "In-flight Requests",
      unit: "req",
      points: inFlightPoints,
      color: "rgb(251, 191, 36)", // amber
      minY: 0,
      decimals: 0,
    });
      }, [metrics?.inFlightRequests?.unit, inFlightPoints]);

  if (!metrics || !tablesData) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.charts}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
        }}>
          <RangeSelector
            value={range as any}
            onChange={setRage}
          />
        </div>
        
        <div style={styles.chartRow}>
          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Requests per Second (req/s)</div>
            </div>

            <div style={styles.chartBody}>
              <ReactECharts
                option={rpsOption}
                style={{ width: '100%', height: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Request Latency (ms)</div>
            </div>

            <div style={styles.chartBody}>
              <ReactECharts
                option={latencyOption}
                style={{ width: "100%", height: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>

          </div>
        </div>

        <div style={styles.chartRow}>
          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>In-Flight Requests (req)</div>
            </div>
            <div style={styles.chartBody}>
              <ReactECharts
                option={inFlightOption}
                style={{ width: "100%", height: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Error Rate (%)</div>
            </div>

            <div style={styles.chartBody}>
              <ReactECharts
                option={errorRateOption}
                style={{ width: "100%", height: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>
        </div>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
        }}>
          <RangeSelector
            value={tableRange as any}
            onChange={setTableRange}
            timeRanges={['5m', '15m', '1h']}
          />
        </div>

        <div style={styles.chartRow}>
          <div style={styles.table}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Top Endpoints by Latency</div>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="sm"
                  variant="soft"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.80)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontWeight: 600,
                    px: 1,
                  }}
                >
                  Last 15 min
                </Chip>

                <Typography
                  level="body-sm"
                  sx={{
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  Updated {timeAgo(tablesData.endpoint_latency.asOf)}
                </Typography>
              </Stack>
            </div>

            <div style={styles.tableBody}>
              <TopEndpointsByLatencyTable
                rows={tablesData.endpoint_latency.rows}
                onViewAll={() => console.log("view all")}
              />
            </div>
          </div>

          <div style={styles.chart}>
            <div style={styles.chartHeader}>
              <div style={styles.panelTitle}>Top Endpoints by Error Rate</div>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="sm"
                  variant="soft"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.80)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontWeight: 600,
                    px: 1,
                  }}
                >
                  Last 15 min
                </Chip>

                <Typography
                  level="body-sm"
                  sx={{
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  Updated {timeAgo(tablesData.endpoint_latency.asOf)}
                </Typography>
              </Stack>
            </div>
            <div style={styles.tableBody}>
              <TopEndpointsByErrorTable
                rows={tablesData.endpoint_errors.rows}
                onViewAll={() => console.log("view all")}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
