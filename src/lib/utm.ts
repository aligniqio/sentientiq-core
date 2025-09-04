// src/lib/utm.ts
export function captureUtms() {
  const u = new URL(window.location.href);
  const keys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"];
  const utm: Record<string,string> = {};
  keys.forEach(k => { const v = u.searchParams.get(k); if (v) utm[k] = v; });
  if (Object.keys(utm).length) sessionStorage.setItem("utm", JSON.stringify(utm));
}
export function getUtms(): Record<string,string> | null {
  try { return JSON.parse(sessionStorage.getItem("utm") || "null"); } catch { return null; }
}
