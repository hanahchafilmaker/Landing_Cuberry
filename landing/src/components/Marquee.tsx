import { marqueeItems } from "@/data/content";

export function Marquee() {
  const row = [...marqueeItems, ...marqueeItems];

  return (
    <div aria-label="큐브베리 제작 분야" className="relative overflow-hidden border-y border-brand-light/10 bg-ink-2/90 py-4 sm:py-5">
      <div className="marquee-track flex w-max animate-marquee items-center gap-9 whitespace-nowrap sm:gap-12">
        {row.map((item, index) => (
          <span key={`${item}-${index}`} aria-hidden={index >= marqueeItems.length} className="flex items-center gap-9 sm:gap-12">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-mute/70 sm:text-[11px]">{item}</span>
            <span className="relative h-2 w-2 rotate-45 border border-brand-light/50">
              <span className="absolute inset-[2px] bg-brand-light/35" />
            </span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-ink-2 to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-ink-2 to-transparent sm:w-32" />
    </div>
  );
}
