
export default function Safeguards() {
  return (
    <div className="mx-auto max-w-3xl p-6 text-white">
      <h1 className="text-2xl font-semibold">Safeguards</h1>
      <p className="mt-2 text-white/70">
        Canary models, rollback, rate caps, and anomaly alerts keep the faculty safe while moving fast.
      </p>

      <div className="mt-6 space-y-4">
        <Section title="Model Canary & Rollback" body="Promote canary on win; auto-rollback on regression or alert." />
        <Section title="Rate & Cost Guards" body="Per-route rate caps and Athena scan limits to prevent runaway spend." />
        <Section title="Data Quality Gates" body="Bot filters, dedupe, and authenticity thresholds at ingest." />
        <Section title="Anomaly Detection" body="Real-time monitoring for unusual patterns in EVI, consensus drift, or volume spikes." />
        <Section title="Circuit Breakers" body="Automatic failover when agent response times exceed SLA thresholds." />
        <Section title="Audit Logging" body="Complete decision trail for every PhD agent response with feature attribution." />
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 text-sm text-white/70">{body}</p>
    </div>
  );
}