
export default function HowItWorks() {
  const steps = [
    { title: 'Scan', desc: 'Paste your URL. We scan performance and UX signals—no cookies or trackers.' },
    { title: 'Read', desc: 'We map signals to Plutchik emotions to create your emotional fingerprint.' },
    { title: 'Debate', desc: 'Specialist agents argue the best moves. You watch the stream live.' },
    { title: 'Act', desc: 'Daily Refresh turns insights into small, compounding wins.' }
  ];
  return (
    <section id="how" className="section py-16">
      <p className="kicker">How it works</p>
      <h2 className="mt-2 text-3xl font-semibold">From feeling → to decision → to lift</h2>
      <div className="mt-8 grid md:grid-cols-4 gap-6">
        {steps.map((s,i)=>(
          <div key={i} className="card">
            <div className="text-sm text-white/50">Step {i+1}</div>
            <div className="mt-1 font-medium">{s.title}</div>
            <p className="mt-2 text-white/70">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
