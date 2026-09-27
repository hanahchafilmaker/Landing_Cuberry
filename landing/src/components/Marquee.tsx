import { marqueeItems } from "@/data/content";

export function Marquee() {
  const row = [...marqueeItems, ...marqueeItems];

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-ink-2 py-5">
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="font-display text-sm font-bold uppercase tracking-[0.28em] text-mute/70">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-brand-light" />
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink-2 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink-2 to-transparent" />
    </div>
  );
}
