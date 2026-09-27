import { useState } from "react";
import { Reveal } from "./Reveal";
import { settings } from "@/data/content";

export function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[120px] animate-pulse-glow" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <div className="font-mono text-xs tracking-[0.2em] text-brand-light">
              11 / START A PROJECT
            </div>
            <h2 className="mt-5 font-display text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-paper">
              영상의 목적을
              <br />
              알려주세요
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-mute">
              영상의 목적, 업로드 채널, 참고 레퍼런스, 희망 납기일을 알려주세요.
              자료가 모두 준비되지 않아도 괜찮습니다.
            </p>

            <div className="mt-10 space-y-4">
              <a
                href={`mailto:${settings.email}`}
                className="card flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors hover:border-brand-light/50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-neon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    className="h-5 w-5"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <span>
                  <span className="block font-mono text-[10px] tracking-[0.18em] text-faint">
                    EMAIL
                  </span>
                  <span className="text-[15px] font-semibold text-paper">
                    {settings.email}
                  </span>
                </span>
              </a>
              <a
                href={`tel:${settings.phone.replace(/-/g, "")}`}
                className="card flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors hover:border-brand-light/50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-neon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    className="h-5 w-5"
                  >
                    <path d="M5 3h3l2 5-2.5 1.5a12 12 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 3z" />
                  </svg>
                </span>
                <span>
                  <span className="block font-mono text-[10px] tracking-[0.18em] text-faint">
                    PHONE
                  </span>
                  <span className="text-[15px] font-semibold text-paper">
                    {settings.phone}
                  </span>
                </span>
              </a>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <form
              className="card rounded-3xl p-7 sm:p-9"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              {sent ? (
                <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime/15 text-lime">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="h-8 w-8"
                    >
                      <path d="M4 12.5 9.5 18 20 6.5" />
                    </svg>
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-extrabold text-paper">
                    문의가 접수되었습니다
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-mute">
                    담당자가 확인 후 영업일 기준 1일 내 회신드립니다.
                    <br />
                    급한 상담은 {settings.phone}로 연락주세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-8 rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:border-brand-light/60 hover:bg-brand/10"
                  >
                    추가 문의 작성
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-xl font-extrabold tracking-tight text-paper">
                    무료 상담 신청
                  </h3>
                  <p className="mt-2 text-[13px] text-faint">
                    프로젝트 정보를 간단히 남겨주시면 맞춤 제안을 드립니다.
                  </p>

                  <div className="mt-7 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                          회사 / 이름 *
                        </span>
                        <input
                          required
                          type="text"
                          placeholder="큐브베리"
                          className="mt-2 w-full rounded-xl border border-white/10 bg-ink-2/60 px-4 py-3 text-[14px] text-paper outline-none transition-colors placeholder:text-faint/60 focus:border-brand-light/60 focus:shadow-[0_0_0_3px_rgba(167,139,250,0.12)]"
                        />
                      </label>
                      <label className="block">
                        <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                          연락처 *
                        </span>
                        <input
                          required
                          type="text"
                          placeholder="010-0000-0000"
                          className="mt-2 w-full rounded-xl border border-white/10 bg-ink-2/60 px-4 py-3 text-[14px] text-paper outline-none transition-colors placeholder:text-faint/60 focus:border-brand-light/60 focus:shadow-[0_0_0_3px_rgba(167,139,250,0.12)]"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                        문의 내용 *
                      </span>
                      <textarea
                        required
                        rows={5}
                        placeholder="영상 목적, 업로드 채널, 참고 레퍼런스, 희망 납기일을 자유롭게 적어주세요."
                        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-ink-2/60 px-4 py-3 text-[14px] text-paper outline-none transition-colors placeholder:text-faint/60 focus:border-brand-light/60 focus:shadow-[0_0_0_3px_rgba(167,139,250,0.12)]"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn-glow mt-7 w-full rounded-full bg-gradient-to-r from-brand to-brand-dark py-4 text-[15px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5"
                  >
                    문의 보내기
                  </button>
                  <p className="mt-4 text-center font-mono text-[10px] text-faint">
                    NDA 체결 · 세금계산서 발행 가능
                  </p>
                </>
              )}
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
