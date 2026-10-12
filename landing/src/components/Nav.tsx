import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { navLinks } from "@/data/content";
import { useScrolled } from "@/hooks/useReveal";
import { Logo } from "@/components/Logo";
import { useContent } from "@/cms/ContentContext";

export function Nav() {
  const { settings } = useContent();
  const scrolled = useScrolled(24);
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
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-500",
        scrolled || open
          ? "glass border-brand-light/12 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.16)]"
          : "border-transparent py-4 sm:py-5",
      )}
    >
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-4 sm:px-8">
        <a href="#top" aria-label="큐브베리 홈으로" className="group rounded-sm">
          <Logo brand={settings.brand} className="text-[23px] transition-transform duration-500 group-hover:scale-[1.025] sm:text-[25px]" />
        </a>

        <nav aria-label="주요 메뉴" className="hidden items-center rounded-full border border-white/8 bg-black/20 p-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mute transition-colors duration-300 hover:bg-brand/10 hover:text-paper xl:px-5"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#contact"
            className="btn-glow inline-flex min-h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#e5cec6] to-[#ad7c70] px-4 text-[12px] font-bold text-[#160f0d] transition-all duration-300 hover:-translate-y-0.5 sm:px-5 sm:text-[13px]"
          >
            <span className="sm:hidden">상담하기</span>
            <span className="hidden sm:inline">프로젝트 상담</span>
          </a>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-light/20 bg-black/20 text-paper transition-colors hover:border-brand-light/50 hover:bg-brand/10 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={cn(
          "overflow-hidden transition-all duration-500 lg:hidden",
          open ? "max-h-[560px] opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <nav aria-label="모바일 메뉴" className="mx-auto max-w-[1380px] px-4 pb-3 pt-3 sm:px-8">
          <div className="crystal-panel rounded-2xl p-2.5">
            <div className="grid sm:grid-cols-2">
              {navLinks.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between rounded-xl px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-mute transition-colors hover:bg-brand/10 hover:text-paper"
                >
                  <span>{link.label}</span>
                  <span className="text-[9px] text-brand-light/60">0{index + 1}</span>
                </a>
              ))}
            </div>
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-between rounded-xl border border-brand-light/20 bg-brand/10 px-4 py-3.5 text-sm font-bold text-paper"
            >
              <span>프로젝트 상담 시작</span>
              <span aria-hidden="true" className="text-brand-light">↗</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
