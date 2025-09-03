export type AskResponse = {
  id: string;
  answer: string;
  confidence?: number;
  factors?: Array<{ label: string; weight?: number }>;
};

export async function askPhD(question: string): Promise<AskResponse> {
  const base = import.meta.env.VITE_INTEL_API_URL as string | undefined;
  if (!base) throw new Error('Missing VITE_INTEL_API_URL');

  const r = await fetch(`${base}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!r.ok) throw new Error(`Ask failed: ${r.status}`);
  return r.json();
}
