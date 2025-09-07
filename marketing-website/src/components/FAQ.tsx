
export default function FAQ() {
  const qa = [
    { q: 'Do I need dev help to start?', a: 'No. Paste a URL and go. We stream your first insights instantly.' },
    { q: 'What data do you use?', a: 'Experience and performance signals. No third-party cookies.' },
    { q: 'Can I see the debate?', a: 'Yes. Watch personas argue in real-time and save conclusions to your plan.' },
    { q: 'What happens when I upgrade?', a: 'You unlock Boardroom debates, scheduling, persona publishing, and team seats.' }
  ];
  return (
    <section id="faq" className="section py-16">
      <p className="kicker">FAQ</p>
      <h2 className="mt-2 text-3xl font-semibold">Answers, quickly</h2>
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        {qa.map((x,i)=>(
          <div key={i} className="card">
            <div className="font-medium">{x.q}</div>
            <p className="mt-2 text-white/70">{x.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
