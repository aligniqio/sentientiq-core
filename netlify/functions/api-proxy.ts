// netlify/edge-functions/api-proxy.ts
// Proxy /api/* -> your FastAPI, inject Clerk identity & plan headers.
// Works with Clerk cookies or Authorization header. Streams SSE cleanly.

export default async (request: Request, context: any) => {
  const apiOrigin = Deno.env.get("API_ORIGIN") ?? "http://98.87.12.130";

  // Build target URL: /api/foo -> ${API_ORIGIN}/foo
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/api/, "") || "/";
  const targetUrl = new URL(targetPath + url.search, apiOrigin);

  // Clone headers, drop hop-by-hop & set forward headers
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  // ---- Auth stitching (Clerk) ----
  // 1) If Authorization already set by frontend -> pass through
  let auth = headers.get("authorization");

  // 2) Else try Clerk session cookie (__session)
  if (!auth) {
    const cookie = headers.get("cookie") || "";
    const m = cookie.match(/(?:^|;\s*)__session=([^;]+)/);
    if (m) auth = `Bearer ${decodeURIComponent(m[1])}`;
  }

  if (auth) {
    headers.set("authorization", auth);

    // Soft-decode JWT payload (no verify; backend does gate).
    try {
      const payloadB64 = auth.split(" ")[1].split(".")[1];
      const json = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
      const sub = json.sub || json.sid || "";
      const org = json.org_id || json.org || json.orgId || "";
      const plan =
        (json.public_metadata && (json.public_metadata.plan || json.public_metadata.tier)) ||
        (json.meta && (json.meta.plan || json.meta.tier)) ||
        "free";

      if (sub) headers.set("x-user-id", String(sub));
      if (org) headers.set("x-org-id", String(org));
      if (plan) headers.set("x-plan", String(plan).toLowerCase());
    } catch {
      // ignore decoding errors; backend can still resolve on its own
    }
  } else {
    // 3) Anonymous fallback: treat as Free
    headers.set("x-plan", "free");
  }

  // Keep SSE happy
  const isSSE = headers.get("accept")?.includes("text/event-stream") || targetPath.startsWith("/pulse");
  if (isSSE) {
    headers.set("accept", "text/event-stream");
    headers.set("cache-control", "no-cache");
  }

  // Handle preflight locally to keep things snappy (usually not needed if same-origin)
  if (request.method === "OPTIONS") {
    const respHeaders = new Headers({
      "access-control-allow-origin": url.origin,
      "access-control-allow-headers": headers.get("access-control-request-headers") || "*",
      "access-control-allow-methods": headers.get("access-control-request-method") || "GET,POST,OPTIONS",
      "access-control-max-age": "600",
    });
    return new Response(null, { status: 204, headers: respHeaders });
  }

  // Forward the request (stream body for POSTs)
  const init: RequestInit = {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
    redirect: "manual",
  };

  const upstream = await fetch(targetUrl.toString(), init);

  // Mirror upstream response, preserving streaming for SSE
  const respHeaders = new Headers(upstream.headers);
  // Same-origin to browser, so CORS is typically moot, but harmless to expose:
  respHeaders.set("access-control-allow-origin", url.origin);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
};

// --- helpers ---
function base64UrlDecode(b64url: string): Uint8Array {
  const pad = b64url.length % 4 === 2 ? "==" : b64url.length % 4 === 3 ? "=" : "";
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}