"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const createHttpClient = (config) => {
    const client = axios_1.default.create({
        baseURL: config.baseURL,
        timeout: config.timeoutMs,
        headers: config.headers,
    });
    (0, axios_retry_1.default)(client, {
        retries: config.retries,
        retryCondition: err => {
            if (axios_retry_1.default.isNetworkOrIdempotentRequestError(err)) {
                return true;
            }
            const status = err.response?.status;
            if (config.retryOn429 && status === 429)
                return true;
            return status === 500 || status === 502 || status === 503 || status === 504;
        },
        retryDelay: (retryCount, err) => {
            const ra = err.response?.headers?.["retry-after"];
            if (ra) {
                const seconds = Number(ra);
                if (!Number.isNaN(seconds))
                    return seconds * 1000;
            }
            return axios_retry_1.default.exponentialDelay(retryCount);
        },
        onRetry: (retryCount, err, req) => {
            const status = err.response?.status;
            console.log(`[${config.name}] retry #${retryCount} ${req.method?.toUpperCase()} ${req.url} status=${status ?? "n/a"}`);
        },
    });
    return { request: client };
};
exports.createHttpClient = createHttpClient;
