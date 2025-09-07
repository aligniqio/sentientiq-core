
export default function Hero() {
  return (
    <section className="section pt-6 pb-16 md:pt-10 md:pb-24">
      <div className="max-w-3xl">
        <p className="kicker">Emotional intelligence for marketing</p>
        <h1 className="mt-3 text-4xl md:text-6xl font-semibold leading-tight">
          Replace <span className="gradient-text">fake intent</span> with
          <br /> the emotions your audience actually feels.
        </h1>
        <p className="mt-5 text-lg text-white/70 max-w-2xl">
          SentientIQ reads how people feel as they experience your site—then turns it
          into clear, daily actions that lift conversion. No cookies. No scripts. Just answers.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a className="btn-primary text-base px-6 py-3" href="https://sentientiq.app/signup">Get your emotional fingerprint</a>
          <a className="btn-ghost text-base px-6 py-3" href="#how">See how it works</a>
        </div>
        <p className="mt-4 text-xs text-white/50">3-second onboarding • privacy-first • free to start</p>
      </div>
    </section>
  );
}
