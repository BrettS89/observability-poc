export type MetricsRequestProps = {
  serviceName: string;
  tenant: string;
  start: number;
  end: number;
  step: number;
}

export type MetricsRequest <T = any> = (props: MetricsRequestProps) => Promise<T>;
