import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { navLinks } from "@/data/content";
import { useScrolled } from "@/hooks/useReveal";
import { Logo } from "@/components/Logo";
import { useContent } from "@/cms/ContentContext";

/**
 * E안 헤더 — 얇은 1px 아래 구분선, 워드마크, 한글 메뉴 4개,
 * 오른쪽 gold 테두리 XCONDA 버튼. 모바일만 MENU 토글을 쓴다.
 */
export function Nav() {
  const { settings } = useContent();
  const scrolled = useScrolled(12);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled || open ? "glass border-line" : "border-line/60 bg-ink/70",
      )}
    >
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-2 px-[clamp(16px,4vw,40px)] py-3.5">
        <a href="#top" aria-label={`${settings.brandKo} 홈으로`} className="rounded-[3px] py-1.5">
          <Logo brand={settings.brand} className="text-[19px]" />
        </a>

        <nav aria-label="주 메뉴" className="hidden items-center gap-6 text-sm lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="border-b-2 border-transparent py-2.5 text-mute transition-colors duration-200 hover:border-brand hover:text-paper"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <a
            href="#lab"
            className="hidden rounded-[3px] border border-brand px-3.5 py-2.5 text-[13px] font-medium text-brand transition-colors duration-200 hover:bg-brand hover:text-[#140f00] sm:inline-block"
          >
            XCONDA 시작하기 ↗
          </a>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-line-2 text-paper transition-colors hover:border-line-4 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-5 w-5"
              aria-hidden="true"
            >
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={cn(
          "overflow-hidden transition-all duration-300 lg:hidden",
          open ? "max-h-[420px] opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <nav aria-label="모바일 메뉴" className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,40px)] pb-4">
          <div className="grid border-t border-line">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-line py-3.5 text-[15px] text-body transition-colors hover:text-paper"
              >
                <span>{link.label}</span>
                <span aria-hidden="true" className="font-mono text-[10px] text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </a>
            ))}
          </div>
          <a
            href="#lab"
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-between rounded-[3px] border border-brand px-4 py-3 text-[14px] font-medium text-brand"
          >
            <span>XCONDA 시작하기</span>
            <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
