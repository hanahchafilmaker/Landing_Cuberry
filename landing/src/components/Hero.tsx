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
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done.current) return;
        done.current = true;
        const duration = 1400;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setShown(Math.round(value * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center sm:text-left">
      <div className="font-display text-3xl font-extrabold tracking-tight text-paper sm:text-4xl">
        {shown}
        <span className="text-gradient">{suffix}</span>
      </div>
      <div className="mt-1 font-mono text-[10px] tracking-[0.14em] text-faint">
        {label}
      </div>
    </div>
  );
}

/** "MAKE IT MOVE." → "MAKE IT" / "MOVE."(그라디언트). 어드민에서 바꾼 제목도 같은 규칙으로 렌더한다. */
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
      <span className="text-gradient">{last}</span>
    </>
  );
}

export function Hero() {
  const { settings, services } = useContent();
  return (
    <section
      id="top"
      className="noise relative overflow-hidden pb-16 pt-32 sm:pt-40 lg:pb-24"
    >
      {/* 배경 레이어 */}
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px] animate-pulse-glow" />
      <div className="pointer-events-none absolute right-[-10%] top-1/3 h-[380px] w-[380px] rounded-full bg-fuchsia-700/15 blur-[100px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* 왼쪽 카피 */}
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-light/30 bg-brand/10 px-4 py-1.5 font-mono text-[11px] tracking-[0.16em] text-neon">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime" />
              </span>
              {settings.eyebrow}
            </span>
          </Reveal>

          <Reveal delay={1}>
            <h1 className="mt-6 font-display text-[clamp(46px,8.2vw,104px)] font-extrabold leading-[0.92] tracking-[-0.045em] break-words text-paper">
              <HeroTitle text={settings.heroTitle} />
            </h1>
          </Reveal>

          <Reveal delay={2}>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-mute sm:text-[17px]">
              {settings.heroSubtitle}
            </p>
          </Reveal>

          <Reveal delay={3}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#contact"
                className="btn-glow group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-dark px-7 py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:-translate-y-1"
              >
                무료 상담 시작
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                >
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
              <a
                href="#works"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-[15px] font-semibold text-paper transition-all duration-300 hover:border-white/40 hover:bg-white/5"
              >
                포트폴리오 보기
              </a>
            </div>
          </Reveal>

          {/* 서비스 티어 칩 */}
          <Reveal delay={4}>
            <div className="mt-10 flex flex-wrap gap-3">
              {services.map((s) => (
                <a
                  key={s.key}
                  href="#pricing"
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-brand-light/50 hover:bg-brand/5"
                >
                  <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                    {s.tier}
                  </span>
                  <span className="text-sm font-bold text-paper">{s.price}</span>
                  <span className="text-[11px] text-faint">{s.duration}</span>
                  {s.badge && (
                    <span className="rounded-full bg-amber/15 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-amber">
                      {s.badge}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal delay={5}>
            <div className="mt-8 font-mono text-[11px] tracking-[0.1em] text-faint">
              {settings.heroNote}
            </div>
          </Reveal>
        </div>

        {/* 오른쪽 비주얼 */}
        <Reveal delay={2} className="relative">
          <div className="relative">
            <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-tr from-brand/30 via-fuchsia-600/15 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[24px] border border-white/10">
              <img
                src="images/hero-studio.jpg"
                alt="큐브베리 영상 제작 스튜디오"
                className="h-[340px] w-full object-cover sm:h-[440px] lg:h-[520px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="font-mono text-[10px] tracking-[0.24em] text-neon">
                  XCONDA / STORYBOARD 01 → 09 CUTS
                </div>
                <div className="mt-2 font-display text-2xl font-extrabold tracking-tight text-paper sm:text-3xl">
                  한 장의 시나리오,
                  <br />
                  아홉 컷의 브랜드 필름
                </div>
              </div>
            </div>

            {/* 플로팅 배지 */}
            <div className="absolute -left-3 top-8 animate-float rounded-2xl border border-white/10 bg-ink-2/85 px-4 py-3 backdrop-blur-md sm:-left-6">
              <div className="font-mono text-[9px] tracking-[0.18em] text-faint">
                BROADCAST VALIDATED
              </div>
              <div className="text-sm font-bold text-paper">KBS 제작 검증</div>
            </div>
            <div
              className="absolute -right-2 bottom-24 animate-float rounded-2xl border border-brand-light/30 bg-ink-2/85 px-4 py-3 backdrop-blur-md sm:-right-5"
              style={{ animationDelay: "1.2s" }}
            >
              <div className="font-mono text-[9px] tracking-[0.18em] text-brand-light">
                ONE-STOP
              </div>
              <div className="text-sm font-bold text-paper">기획 → 납품</div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 통계 바 */}
      <Reveal delay={3} className="relative mx-auto mt-16 max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:grid-cols-4">
          {stats.map((s) => (
            <CountUp key={s.label} {...s} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
