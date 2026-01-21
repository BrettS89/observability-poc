type Point = { t: number; v: any };

export function mergeWindow(prev: Point[], next: Point[], windowMs: number): Point[] {
  const map = new Map<number, number>();
  for (const p of prev) map.set(p.t, p.v);
  for (const p of next) map.set(p.t, p.v);

  const cutoff = Date.now() - windowMs;

  return Array.from(map.entries())
    .map(([t, v]) => ({ t, v }))
    .filter((p) => p.t >= cutoff)
    .sort((a, b) => a.t - b.t);
}

export function timeAgo(ms?: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}