import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { stats } from "@/data/content";
import { useContent } from "@/cms/ContentContext";

function CountUp({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done.current) return;
        done.current = true;
        const duration = 1300;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setShown(Math.round(value * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="relative px-3 text-center sm:px-6 sm:text-left">
      <div className="font-display text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-[38px]">
        {shown}
        <span className="text-gradient">{suffix}</span>
      </div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint sm:text-[10px]">
        {label}
      </div>
    </div>
  );
}

/** The CMS-controlled final word becomes the rose-gold focal point. */
function HeroTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <>
      {words.length > 0 && (
        <>
          {words.join(" ")}
          <br />
        </>
      )}
      <span className="text-gradient italic">{last}</span>
    </>
  );
}

function BrandObject() {
  return (
    <div className="relative mx-auto w-full max-w-[570px]">
      <div className="pointer-events-none absolute inset-[9%] rounded-full bg-brand/20 blur-[80px] animate-pulse-glow" />

      <div className="crystal-panel relative aspect-[0.94] rounded-[30px] p-4 sm:rounded-[40px] sm:p-6">
        <div className="bg-facets pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute inset-[9%] rounded-full hero-ring" />
        <div className="pointer-events-none absolute inset-[16%] animate-orbit rounded-full border border-dashed border-brand-light/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-px -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gradient-to-b from-transparent via-brand-light/14 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-px -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        <div className="absolute left-5 top-5 z-10 sm:left-7 sm:top-7">
          <div className="font-mono text-[8px] tracking-[0.2em] text-faint sm:text-[9px]">CREATIVE OBJECT</div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.16em] text-brand-light sm:text-xs">CB / 001</div>
        </div>
        <div className="absolute right-5 top-5 z-10 text-right sm:right-7 sm:top-7">
          <div className="flex items-center justify-end gap-2 font-mono text-[8px] tracking-[0.15em] text-mute sm:text-[9px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-light" />
            </span>
            SEOUL / KR
          </div>
          <div className="mt-1 font-mono text-[8px] tracking-[0.14em] text-faint">EST. FILMMAKERS</div>
        </div>

        <img
          src="images/cuberry-mark.webp"
          alt="투명 크리스털 큐브 형태의 C와 B 큐브베리 심볼"
          width="479"
          height="520"
          fetchPriority="high"
          className="absolute left-1/2 top-1/2 z-[2] w-[73%] -translate-x-1/2 -translate-y-[48%] object-contain drop-shadow-[0_32px_40px_rgba(0,0,0,0.52)] animate-float-soft sm:w-[76%]"
        />

        <div className="absolute inset-x-4 bottom-4 z-10 flex items-end justify-between gap-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:px-5 sm:py-4">
          <div>
            <img
              src="images/cuberry-wordmark.webp"
              alt=""
              aria-hidden="true"
              width="1200"
              height="409"
              className="w-[152px] object-contain opacity-90 brightness-125 sm:w-[190px]"
            />
            <div className="mt-1 font-mono text-[7px] tracking-[0.16em] text-faint sm:text-[8px]">FILM · MOTION · ARTIFICIAL INTELLIGENCE</div>
          </div>
          <div className="hidden items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-brand-light sm:flex">
            <span className="h-px w-7 bg-brand-light/50" />
            MAKE IT MOVE
          </div>
        </div>
      </div>

      <div className="absolute -left-3 top-[46%] z-20 hidden -translate-y-1/2 rounded-full border border-brand-light/20 bg-ink/75 px-3 py-2 font-mono text-[8px] tracking-[0.14em] text-mute backdrop-blur-md sm:block lg:-left-7">
        28Y / EXPERIENCE
      </div>
      <div className="absolute -right-3 top-[35%] z-20 hidden rounded-full border border-brand-light/20 bg-ink/75 px-3 py-2 font-mono text-[8px] tracking-[0.14em] text-mute backdrop-blur-md sm:block lg:-right-7">
        ONE TEAM / ONE FLOW
      </div>
    </div>
  );
}

export function Hero() {
  const { settings, services } = useContent();

  return (
    <section id="top" className="noise relative overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-56 right-[-15%] h-[680px] w-[680px] rounded-full bg-brand/12 blur-[140px] animate-pulse-glow" />
      <div className="pointer-events-none absolute -left-48 top-[45%] h-[420px] w-[420px] rounded-full bg-brand-dark/14 blur-[110px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="relative z-[1] mx-auto max-w-[1380px] px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[0.94fr_1.06fr] lg:gap-16 xl:gap-24">
          <div className="relative z-10">
            <Reveal>
              <div className="inline-flex items-center gap-3 border-l border-brand-light/70 pl-3.5 font-mono text-[9px] uppercase tracking-[0.2em] text-brand-light sm:text-[10px]">
                <span>{settings.eyebrow}</span>
              </div>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="balance-text mt-7 font-editorial text-[clamp(58px,8.5vw,116px)] font-semibold leading-[0.82] tracking-[-0.055em] text-paper">
                <HeroTitle text={settings.heroTitle} />
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="mt-8 max-w-xl text-[15px] leading-[1.85] text-mute sm:text-[17px] sm:leading-[1.8]">
                {settings.heroSubtitle}
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#contact"
                  className="btn-glow group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#ecd8d0] via-[#c89d91] to-[#a87569] px-7 py-3.5 text-[14px] font-bold text-[#160f0d] transition-all duration-300 hover:-translate-y-1 sm:justify-start"
                >
                  프로젝트 상담하기
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
                <a
                  href="#works"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-light/20 bg-white/[0.025] px-7 py-3.5 text-[14px] font-semibold text-paper transition-all duration-300 hover:border-brand-light/50 hover:bg-brand/10"
                >
                  포트폴리오 보기
                  <span aria-hidden="true" className="text-brand-light">↓</span>
                </a>
              </div>
            </Reveal>

            <Reveal delay={4}>
              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-5 font-mono text-[9px] uppercase tracking-[0.13em] text-faint sm:text-[10px]">
                <span>KBS production validated</span>
                <span className="h-1 w-1 rounded-full bg-brand-light/60" />
                <span>Planning to delivery</span>
                <span className="h-1 w-1 rounded-full bg-brand-light/60" />
                <span>{settings.heroNote}</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2} className="relative">
            <BrandObject />
          </Reveal>
        </div>

        {services.length > 0 && (
          <Reveal delay={3} className="mt-14 sm:mt-20">
            <div className="grid overflow-hidden rounded-2xl border border-brand-light/14 bg-white/[0.018] sm:grid-cols-3">
              {services.map((service) => (
                <a
                  key={service.key}
                  href="#pricing"
                  aria-label={`${service.name} ${service.price} 자세히 보기`}
                  className="group grid min-h-[92px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-brand-light/10 px-5 py-5 transition-colors hover:bg-brand/8 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-6"
                >
                  <span className="font-mono text-[9px] tracking-[0.18em] text-brand-light">{service.tier}</span>
                  <span className="row-span-2 font-display text-base font-bold text-paper transition-transform group-hover:translate-x-1 sm:text-lg">{service.price}</span>
                  <span className="text-[10px] text-faint">{service.duration}</span>
                </a>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal delay={4} className="mt-6">
          <div className="grid grid-cols-2 gap-y-8 rounded-2xl border border-white/8 bg-black/20 py-7 sm:grid-cols-4 sm:py-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className={index % 2 === 1 ? "border-l border-white/8 sm:border-l" : index > 0 ? "sm:border-l sm:border-white/8" : ""}>
                <CountUp {...stat} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
