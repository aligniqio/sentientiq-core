
export default function LogoCloud() {
  return (
    <section className="section pb-12">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6 opacity-70">
        {/* Replace with real logos */}
        {Array.from({length:6}).map((_,i)=>(
          <div key={i} className="h-10 rounded-md bg-white/5 border border-white/10"></div>
        ))}
      </div>
    </section>
  );
}
