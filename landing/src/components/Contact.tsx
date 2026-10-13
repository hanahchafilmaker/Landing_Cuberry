import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { offices } from "@/data/content";
import { useContent } from "@/cms/ContentContext";
import { useI18n } from "@/i18n/LanguageContext";
import type { Vars } from "@/i18n/messages";

const inputClass =
  "mt-2 w-full rounded-[3px] border border-line-2 bg-void px-4 py-3 text-[14px] text-paper outline-none transition-colors placeholder:text-faint/70 focus:border-brand";

type Status = { state: "idle" | "sending" | "sent" | "error"; message?: string; code?: string };
type Translate = (text: string, vars?: Vars) => string;

// 문의는 어드민 "상담 문의" 목록에 쌓인다(POST /api/partnership).
// GitHub Pages 에서는 cms-bridge.js 가 정한 운영 Node 서버 주소로 보낸다.
async function sendInquiry(form: HTMLFormElement, t: Translate) {
  const data = new FormData(form);
  const body = {
    contactName: String(data.get("contactName") || "").trim(),
    company: String(data.get("contactName") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    projectType: "랜딩 무료 상담",
    brief: String(data.get("brief") || "").trim(),
    // 허니팟 — 사람은 못 보는 숨은 칸. 봇만 채우고 서버는 채워진 문의를 버린다.
    website: String(data.get("website") || "").trim(),
    // Phase 2: 서명된 폼 토큰 · Turnstile 응답 (없으면 서버가 FORM_TOKEN_MODE 정책에 따라 처리)
    formToken: String(data.get("formToken") || "").trim(),
    turnstile: String(data.get("cf-turnstile-response") || "").trim(),
  };
  const endpoint =
    window.CuberryApi && window.CuberryApi.url
      ? window.CuberryApi.url("/api/partnership")
      : "/api/partnership";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || t("문의 전송에 실패했습니다. 잠시 후 다시 시도해 주세요."));
  }
  return String(result.id || "");
}

/**
 * CONTACT — E안은 문의 창구(이메일·전화)와 사무실 두 곳을 먼저 보여주고,
 * 왼쪽에서 문의 내용을 받지 않을 정도로만 폼을 옆에 둔다.
 */
export function Contact() {
  const { settings } = useContent();
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [formToken, setFormToken] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const tokenRef = useRef("");
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);

  // 폼이 화면에 들어오거나(교차 관찰) 처음 포커스되면 서버에서 서명 토큰을 받는다.
  // 토큰을 못 받아도 제출은 그대로 — 서버가 FORM_TOKEN_MODE 정책에 따라 처리한다.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (tokenRef.current) return;
      try {
        const endpoint =
          window.CuberryApi && window.CuberryApi.url
            ? window.CuberryApi.url("/api/form-token")
            : "/api/form-token";
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !data?.token || tokenRef.current) return;
        tokenRef.current = String(data.token);
        setFormToken(tokenRef.current);
        if (data.turnstileSiteKey) setTurnstileSiteKey(String(data.turnstileSiteKey));
      } catch {
        /* 토큰 없이도 서버가 정책대로 처리한다 */
      }
    };
    const el = formRef.current;
    const observer =
      el && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                void load();
                observer?.disconnect();
              }
            },
            { threshold: 0.2 },
          )
        : null;
    if (el && observer) observer.observe(el);
    const onFocus = () => void load();
    el?.addEventListener("focusin", onFocus);
    return () => {
      alive = false;
      observer?.disconnect();
      el?.removeEventListener("focusin", onFocus);
    };
  }, []);

  // Turnstile siteKey 가 오면 위젯만 그려준다 — 켜져 있지 않으면 CF 스크립트 요청도 0이다.
  useEffect(() => {
    if (!turnstileSiteKey || !widgetRef.current || renderedRef.current) return;
    renderedRef.current = true;
    const w = window as unknown as {
      turnstile?: { render: (el: Element, opts: Record<string, unknown>) => void };
    };
    const render = () => {
      if (!widgetRef.current || !w.turnstile) return;
      try {
        w.turnstile.render(widgetRef.current, { sitekey: turnstileSiteKey });
      } catch {
        renderedRef.current = false;
      }
    };
    if (w.turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = render;
    script.onerror = () => {
      renderedRef.current = false;
    };
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  const sent = status.state === "sent";
  const telHref = `tel:${settings.phone.replace(/[^\d+]/g, "")}`;

  return (
    <section id="contact" className="section">
      <div className="shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <Reveal className="flex flex-col gap-3.5">
          <span className="eyebrow">CONTACT</span>
          <h2 className="m-0 text-[clamp(26px,3.2vw,34px)] font-bold tracking-[-0.02em] text-paper">
            {t("IR · 취재 · 제휴 문의")}
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-mute">
            {t(
              "문의 내용에 맞는 창구로 바로 연결됩니다. 회사소개서가 필요하시면 이 폼이나 메일로 요청만 남겨주세요.",
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1.5">
            <a
              href={`mailto:${settings.email}`}
              className="rounded-[3px] bg-brand px-5 py-3.5 text-[15px] font-semibold text-[#140f00] no-underline transition-colors duration-200 hover:bg-brand-light"
            >
              {settings.email}
            </a>
            <a
              href={telHref}
              className="rounded-[3px] border border-line-4 px-[18px] py-3.5 text-[15px] text-paper transition-colors duration-200 hover:border-brand hover:text-brand"
            >
              {settings.phone}
            </a>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {offices.map((office) => (
              <div
                key={office.kicker}
                className="flex flex-col gap-2 rounded-[4px] border border-line p-[22px]"
              >
                <span className="font-mono text-[11px] tracking-[0.12em] text-brand">
                  {t(office.kicker)}
                </span>
                <p className="m-0 text-base leading-relaxed text-paper">{t(office.address)}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={2}>
          <form
            ref={formRef}
            className="rounded-[4px] border border-line bg-ink-3 p-6 sm:p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              if (status.state === "sending") return;
              setStatus({ state: "sending" });
              try {
                const code = await sendInquiry(form, t);
                form.reset();
                setStatus({ state: "sent", code });
              } catch (error) {
                setStatus({
                  state: "error",
                  message:
                    error instanceof Error && error.message !== "Failed to fetch"
                      ? error.message
                      : t("문의 전송에 실패했습니다. {email} 로 메일 주셔도 됩니다.", {
                          email: settings.email,
                        }),
                });
              }
            }}
          >
            {sent ? (
              <div className="flex min-h-[340px] flex-col items-start justify-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand text-brand">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                </span>
                <h3 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-paper">
                  {t("문의가 접수되었습니다")}
                </h3>
                <p className="m-0 text-[14px] leading-relaxed text-body">
                  {status.code && (
                    <span className="mb-2 block font-mono text-[11px] tracking-[0.12em] text-brand">
                      {t("접수 번호 {code}", { code: status.code })}
                    </span>
                  )}
                  {t("담당자가 확인 후 영업일 기준 1일 내 회신드립니다. 급한 상담은 {phone}로 연락주세요.", {
                    phone: settings.phone,
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setStatus({ state: "idle" })}
                  className="mt-2 cursor-pointer rounded-[3px] border border-line-2 px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:border-brand hover:text-brand"
                >
                  {t("추가 문의 작성")}
                </button>
              </div>
            ) : (
              <>
                <h3 className="m-0 text-lg font-semibold tracking-[-0.01em] text-paper">
                  {t("상담 신청")}
                </h3>
                <p className="mt-2 text-[13px] text-faint">
                  {t("프로젝트 정보를 간단히 남겨주시면 맞춤 제안을 드립니다.")}
                </p>

                {/* 허니팟 — 화면 밖으로 숨겨서 사람만 절대 채우지 않게 한다. */}
                <input
                  type="text"
                  name="website"
                  defaultValue=""
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  placeholder="Leave this field empty"
                  style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", opacity: 0 }}
                />
                {/* Phase 2: 서명 토큰 — 서버 발급분을 그대로 되돌려 보낸다. */}
                <input type="hidden" name="formToken" value={formToken} readOnly />
                {/* Turnstile siteKey 가 있을 때만 그려지는 자리 (CF 가 숨은 응답 칸을 만든다) */}
                <div ref={widgetRef} />
                <div className="mt-6 flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                        {t("회사 / 이름 *")}
                      </span>
                      <input
                        required
                        name="contactName"
                        type="text"
                        autoComplete="organization"
                        maxLength={120}
                        placeholder={t("큐브베리 / 홍길동")}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                        {t("이메일 *")}
                      </span>
                      <input
                        required
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={320}
                        placeholder="name@company.com"
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                      {t("연락처")}
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={40}
                      placeholder="010-0000-0000"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                      {t("문의 내용 *")}
                    </span>
                    <textarea
                      required
                      name="brief"
                      rows={5}
                      maxLength={8000}
                      placeholder={t("영상 목적, 업로드 채널, 참고 레퍼런스, 희망 납기일을 자유롭게 적어주세요.")}
                      className={`${inputClass} resize-none`}
                    />
                  </label>
                </div>

                {status.state === "error" && (
                  <p
                    role="alert"
                    className="mt-4 rounded-[3px] border border-rec/50 bg-rec/10 px-4 py-3 text-[13px] text-[#ffb3b5]"
                  >
                    {status.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status.state === "sending"}
                  className="mt-6 w-full cursor-pointer rounded-[3px] bg-brand py-4 text-[15px] font-semibold text-[#140f00] transition-colors duration-200 hover:bg-brand-light disabled:cursor-wait disabled:opacity-70"
                >
                  {t(status.state === "sending" ? "보내는 중…" : "문의 보내기")}
                </button>
                <p className="mt-3 text-center font-mono text-[10px] text-faint">
                  {t("NDA 체결 · 세금계산서 발행 가능")}
                </p>
              </>
            )}
          </form>
        </Reveal>
      </div>
    </section>
  );
}
