// GodammConfettiButton.tsx
import { PartyPopper, Zap } from "lucide-react";

export default function GodammConfettiButton() {
  return (
    <div className="fixed bottom-4 right-4 z-[9000] flex gap-3">
      <button
        onClick={() => window.dispatchEvent(new Event('go!'))}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2
                   text-sm font-semibold shadow-lg shadow-emerald-500/20 ring-1 ring-white/20 hover:brightness-110"
        title="Launch GO confetti"
      >
        <PartyPopper className="h-4 w-4" /> Confetti (GO)
      </button>
      <button
        onClick={() => window.dispatchEvent(new Event('wait!'))}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2
                   text-sm font-semibold shadow-lg shadow-amber-500/20 ring-1 ring-white/20 hover:brightness-110"
        title="Launch WAIT confetti"
      >
        <Zap className="h-4 w-4" /> Confetti (WAIT)
      </button>
    </div>
  );
}