export default function PulseDot({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium ring-1 ring-white/10">
      <span className="relative flex h-2.5 w-2.5">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-400" : "bg-amber-400"}`} />
      </span>
      {live ? "LIVE" : "OFFLINE"}
    </span>
  );
}