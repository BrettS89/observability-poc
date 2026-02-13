import Ajv, { JSONSchemaType } from 'ajv';

type EnvVars = {
  NODE_ENV: 'local' | 'dev' | 'prod';
  PORT: number;
  CLOUD_METRICS_URL: string;
  CLOUD_METRICS_TOKEN: string;
};

const schema: JSONSchemaType<EnvVars> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    NODE_ENV: { type: 'string', enum: ['local', 'dev', 'prod'] },
    PORT: { type: 'integer', minimum: 1, maximum: 65535 },
    CLOUD_METRICS_URL: { type: 'string' },
    CLOUD_METRICS_TOKEN: { type: 'string' },
  },
  required: [
    'NODE_ENV',
    'PORT',
    'CLOUD_METRICS_URL',
    'CLOUD_METRICS_TOKEN',
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
