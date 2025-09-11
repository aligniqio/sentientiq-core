
export default function Navbar() {
  return (
    <header className="section py-6">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/red_pulse.png" alt="SentientIQ" className="h-8 w-8" />
          <span className="font-semibold">Sentient<span className="gradient-text">IQ</span></span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <a href="/#how">How it works</a>
          <a href="/why-different">Why it's different</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <a className="btn-ghost" href="https://sentientiq.app/login">Sign in</a>
          <a className="btn-primary" href="mailto:info@sentientiq.ai?subject=Get%20Started%20with%20SentientIQ">Get Started</a>
        </div>
      </div>
    </header>
  );
}
