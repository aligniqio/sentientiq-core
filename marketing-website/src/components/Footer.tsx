
export default function Footer() {
  return (
    <footer className="section py-12 text-sm text-white/60">
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="h-6 w-6" alt="SentientIQ" />
          <span>SentientIQ</span>
        </div>
        <nav className="flex gap-6">
          <a href="/legal/terms">Terms</a>
          <a href="/legal/privacy">Privacy</a>
          <a href="https://sentientiq.app/login">Sign in</a>
        </nav>
      </div>
      <p className="mt-6 text-xs">&copy; {new Date().getFullYear()} SentientIQ. All rights reserved.</p>
    </footer>
  );
}
