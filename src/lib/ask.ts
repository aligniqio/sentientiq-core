// src/lib/ask.ts

export type AskResponse = {
  id: string;
  answer: string;
  confidence?: number;
  factors?: Array<{ label: string; weight?: number }>;
};

export type AskOptions = {
  /** Override base endpoint (defaults to VITE_INTEL_API_URL) */
  endpoint?: string;
  /** Abort controller signal */
  signal?: AbortSignal;
  /** Client-side timeout in ms (default 30s) */
  timeoutMs?: number;
};

/** Capture UTMs once and keep them in sessionStorage for later calls */
function readUtms(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const found: Record<string, string> = {};
    for (const k of keys) {
      const v = url.searchParams.get(k);
      if (v) found[k] = v;
    }
    if (Object.keys(found).length) {
      sessionStorage.setItem("utm", JSON.stringify(found));
      return found;
    }
    const stored = sessionStorage.getItem("utm");
    return stored ? (JSON.parse(stored) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

/** Ask the PhD Collective a question */
export async function askPhD(question: string, opts: AskOptions = {}): Promise<AskResponse> {
  const base = (opts.endpoint ?? import.meta.env.VITE_INTEL_API_URL) as string | undefined;
  if (!base) throw new Error("Missing VITE_INTEL_API_URL");

  // Build payload
  const payload = {
    question,
    utm: readUtms(),
    client: typeof window !== "undefined"
      ? {
          page: window.location.pathname,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ua: navigator.userAgent,
        }
      : undefined,
  };

  // Timeout handling
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  const signal = opts.signal ?? controller.signal;

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
      credentials: "omit",
    });

    if (!res.ok) {
      let details = "";
      try {
        details = await res.text();
      } catch {
        // ignore
      }
      const snippet = details ? ` — ${details.slice(0, 200)}` : "";
      throw new Error(`Ask failed: ${res.status} ${res.statusText}${snippet}`);
    }

    return (await res.json()) as AskResponse;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Ask request timed out");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
