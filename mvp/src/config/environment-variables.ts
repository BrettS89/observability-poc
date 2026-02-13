import Ajv, { JSONSchemaType } from 'ajv';

type EnvVars = {
  NODE_ENV: 'local' | 'development' | 'production';
  PORT: number;
  CLOUD_METRICS_URL: string;
  CLOUD_METRICS_TOKEN: string;
  CLOUD_PROMETHEUS_URL: string;
};

const schema: JSONSchemaType<EnvVars> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    NODE_ENV: { type: 'string', enum: ['local', 'development', 'production'] },
    PORT: { type: 'integer', minimum: 1, maximum: 65535 },
    CLOUD_METRICS_URL: { type: 'string' },
    CLOUD_METRICS_TOKEN: { type: 'string' },
    CLOUD_PROMETHEUS_URL: { type: 'string' },
  },
  required: [
    'NODE_ENV',
    'PORT',
    'CLOUD_METRICS_URL',
    'CLOUD_METRICS_TOKEN',
    'CLOUD_PROMETHEUS_URL',
  ],
};

export function validateEnvironmentVariables(): Readonly<EnvVars> {
  const ajv = new Ajv({ allErrors: true, coerceTypes: true });

  const validate = ajv.compile(schema);

  const data: Record<string, unknown> = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    CLOUD_METRICS_URL: process.env.CLOUD_METRICS_URL,
    CLOUD_METRICS_TOKEN: process.env.CLOUD_METRICS_TOKEN,
    CLOUD_PROMETHEUS_URL: process.env.CLOUD_PROMETHEUS_URL,
  };

  const ok = validate(data);

  if (!ok) {
    const details = (validate.errors ?? [])
      .map(e => `${e.instancePath || '(root)'} ${e.message ?? ''}`.trim())
      .join(', ');
    throw new Error(`Invalid environment variables: ${details}`);
  }

  return Object.freeze(data as EnvVars);
}

export const envVars = validateEnvironmentVariables();
