"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const ingest_1 = require("./routes/ingest");
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.raw({
    type: ['application/x-protobuf', 'application/octet-stream', 'application/json'],
    limit: '10mb'
}));
exports.app.use(express_1.default.json());
exports.app.use(ingest_1.metricsIngestRouter);
