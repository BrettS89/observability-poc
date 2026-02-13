"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envVars = void 0;
exports.validateEnvironmentVariables = validateEnvironmentVariables;
const ajv_1 = __importDefault(require("ajv"));
const schema = {
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
function validateEnvironmentVariables() {
    const ajv = new ajv_1.default({ allErrors: true, coerceTypes: true });
    const validate = ajv.compile(schema);
    const data = {
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
    return Object.freeze(data);
}
exports.envVars = validateEnvironmentVariables();
