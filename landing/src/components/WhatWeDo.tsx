import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { whatWeDo } from "@/data/content";

const icons = {
  building: (
    <>
      <path d="M4 21V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15" />
      <path d="M15 9h3a2 2 0 0 1 2 2v10" />
      <path d="M8 9h2M8 13h2M8 17h2" />
      <path d="M2 21h20" />
    </>
  ),
  play: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9.5 5 2.5-5 2.5z" />
    </>
  ),
  motion: (
    <>
      <path d="M4 18 9 6l5 8 3-4 3 8" />
      <circle cx="9" cy="6" r="1.4" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.4 12l3.6 1.4-3.6 1.4L12 18.5l-1.4-3.7L7 13.4 10.6 12z" />
    </>
  ),
};

export function WhatWeDo() {
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-1/4 h-72 bg-gradient-to-b from-brand/8 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="02 / WHAT WE DO"
          label="What we do"
          title={
            <>
              목적과 플랫폼에 맞는
              <br />
              포맷을 제안합니다
            </>
          }
          desc="목적과 플랫폼에 맞는 포맷을 제안하고, 필요한 경우 촬영 없이도 AI와 모션으로 구현합니다."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whatWeDo.map((item, i) => (
            <Reveal key={item.num} delay={i + 1}>
              <article className="card card-glow group h-full rounded-3xl p-7">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-light/25 bg-brand/10 text-neon transition-colors duration-300 group-hover:border-brand-light/60 group-hover:bg-brand/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                    >
                      {icons[item.icon]}
                    </svg>
                  </div>
                  <span className="font-mono text-2xl font-bold text-white/8">
                    {item.num}
                  </span>
                </div>
                <div className="mt-6 font-mono text-[10px] tracking-[0.2em] text-brand-light">
                  {item.key}
                </div>
                <h3 className="mt-2 font-display text-xl font-extrabold tracking-tight text-paper">
                  {item.title}
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
                  {item.desc}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-white/[0.05] px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-faint"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
