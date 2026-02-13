"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorRate = exports.formatInFlight = exports.formatLatency = exports.formatRps = void 0;
const formatRps = (data, range) => {
    const series = data?.data?.result?.[0];
    const values = series?.values ?? [];
    const points = fillTimeGrid({
        start: range.start,
        end: range.end,
        step: range.step,
        points: values,
        defaultValue: 0,
    });
    return {
        unit: "req/s",
        series: [
            {
                name: "rps",
                points,
            },
        ],
    };
};
exports.formatRps = formatRps;
const formatLatency = (data, range) => {
    const result = data?.data?.result ?? [];
    return {
        unit: "ms",
        series: result.map((s) => {
            // If you’re querying with `quantile="0.5"` / `quantile="0.95"`
            // you can map it to friendly names:
            const q = s.metric?.quantile;
            const name = q === "0.5" ? "p50" :
                q === "0.95" ? "p95" :
                    q ?? "unknown";
            const values = s?.values ?? [];
            const points = fillTimeGrid({
                start: range.start,
                end: range.end,
                step: range.step,
                points: values,
            });
            return { name, points };
        }),
    };
};
exports.formatLatency = formatLatency;
const formatInFlight = (data, range) => {
    const series = data?.data?.result?.[0];
    if (!series) {
        return {
            unit: "requests",
            series: [],
        };
    }
    const values = series.values ?? [];
    const points = fillTimeGrid({
        start: range.start,
        end: range.end,
        step: range.step,
        points: values,
        defaultValue: 0,
    });
    return {
        unit: "requests",
        series: [
            {
                name: "in_flight",
                points,
            },
        ],
    };
};
exports.formatInFlight = formatInFlight;
const formatErrorRate = (data, range) => {
    const series = data?.data?.result?.[0];
    if (!series) {
        return {
            unit: "percent",
            series: [],
        };
    }
    const values = series.values ?? [];
    const points = fillTimeGrid({
        start: range.start,
        end: range.end,
        step: range.step,
        points: values,
        defaultValue: 0,
    });
    return {
        unit: "percent",
        series: [
            {
                name: "error_rate",
                points,
            },
        ],
    };
};
exports.formatErrorRate = formatErrorRate;
function fillTimeGrid(args) {
    let { start, end, step, points, defaultValue = null } = args;
    start = Math.floor(start);
    end = Math.floor(end);
    step = Math.floor(step);
    if (!Number.isFinite(step) || step <= 0)
        return [];
    const map = new Map();
    for (const [tsSec, valStr] of points) {
        const v = Number(valStr);
        if (Number.isFinite(v)) {
            map.set(Math.floor(tsSec) * 1000, v);
        }
    }
    const out = [];
    for (let t = start; t <= end; t += step) {
        const ms = t * 1000;
        out.push({
            t: ms,
            v: map.get(ms) ?? defaultValue,
        });
    }
    return out;
}
