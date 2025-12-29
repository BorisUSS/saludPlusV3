export function minutesToMs(m) { return m * 60 * 1000; }

export function parseIntEnv(name, def) {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function iso(d) { return new Date(d).toISOString(); }
