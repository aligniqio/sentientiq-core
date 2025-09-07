
export default function Problem() {
  return (
    <section className="section py-16">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="card">
          <p className="kicker">The Problem</p>
          <h2 className="mt-2 text-2xl font-semibold">Marketing is backward-looking.</h2>
          <p className="mt-3 text-white/70">
            Dashboards obsess over <em>what</em> and <em>how many</em>. But decisions hinge on <em>why</em>.
            Most “intent” data is probabilistic guesswork stitched from weak signals.
          </p>
          <ul className="mt-4 space-y-2 text-white/70">
            <li>• You act weeks after the moment has passed</li>
            <li>• You optimize for clicks, not conviction</li>
            <li>• You can’t see the feelings that drive buying</li>
          </ul>
        </div>
        <div className="card">
          <p className="kicker">The Shift</p>
          <h2 className="mt-2 text-2xl font-semibold">Measure emotions in the moment.</h2>
          <p className="mt-3 text-white/70">
            SentientIQ uses Plutchik’s model to read emotional responses from experience signals—
            then orchestrates a faculty of specialized “PhD” agents to debate what to do next.
          </p>
          <ul className="mt-4 space-y-2 text-white/70">
            <li>• Real-time: joy, anger, fear, trust</li>
            <li>• Daily recommendations with evidence</li>
            <li>• Boardroom debates when you need depth</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
