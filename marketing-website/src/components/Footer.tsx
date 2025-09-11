
export default function Footer() {
  const partners = [
    {
      name: 'CreditSuite',
      url: 'https://creditsuite.com',
      description: 'Business Credit Platform'
    },
    {
      name: 'LifeBrands',
      url: 'https://lbd2c.com',
      description: 'D2C Brand Accelerator'
    }
  ];

  return (
    <footer className="section py-12">
      {/* Partners Section */}
      <div className="mb-12 pb-12 border-b border-white/10">
        <div className="text-center mb-8">
          <p className="text-sm text-purple-400 font-semibold tracking-wider uppercase mb-2">
            Real Partners. Real Results.
          </p>
          <p className="text-white/70">
            Detecting emotions for companies that matter
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-12">
          {partners.map((partner) => (
            <a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg p-4 group-hover:border-white/30 transition-all duration-300">
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {partner.name}
                  </div>
                </div>
              </div>
              <span className="mt-2 text-xs text-white/50 group-hover:text-white/70 transition-colors">
                {partner.description}
              </span>
            </a>
          ))}
        </div>
      </div>
      
      {/* Original Footer Content */}
      <div className="text-sm text-white/60">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/red_pulse.png" className="h-6 w-6" alt="SentientIQ" />
            <span>SentientIQ</span>
          </div>
          <nav className="flex gap-6">
            <a href="/legal/terms">Terms</a>
            <a href="/legal/privacy">Privacy</a>
            <a href="https://sentientiq.app/login">Sign in</a>
          </nav>
        </div>
        <p className="mt-6 text-xs">&copy; {new Date().getFullYear()} SentientIQ. All rights reserved.</p>
      </div>
    </footer>
  );
}
