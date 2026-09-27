import { useState } from "react";
import { cn } from "@/utils/cn";
import { navLinks, settings } from "@/data/content";
import { useScrolled } from "@/hooks/useReveal";

function CubeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cubeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 29 9.2v13.6L16 29.5 3 22.8V9.2L16 2.5z"
        fill="url(#cubeGrad)"
        opacity="0.9"
      />
      <path
        d="M16 2.5 29 9.2 16 15.9 3 9.2 16 2.5z"
        fill="#c4b5fd"
        opacity="0.85"
      />
      <path d="M16 15.9 29 9.2v13.6L16 29.5V15.9z" fill="#6d28d9" opacity="0.55" />
      <path d="M16 15.9 3 9.2v13.6L16 29.5V15.9z" fill="#4c1d95" opacity="0.55" />
    </svg>
  );
}

export function Nav() {
  const scrolled = useScrolled(32);
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass border-b border-white/10 py-3" : "py-5",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="group flex items-center gap-2.5">
          <CubeMark className="h-8 w-8 transition-transform duration-500 group-hover:rotate-[12deg]" />
          <span className="font-display text-lg font-extrabold tracking-[0.14em] text-paper">
            {settings.brand}
          </span>
          <span className="hidden font-mono text-[10px] tracking-[0.3em] text-faint sm:block">
            STUDIO
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-mute transition-colors duration-300 hover:bg-white/5 hover:text-paper"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="btn-glow hidden rounded-full bg-gradient-to-r from-brand to-brand-dark px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 sm:block"
          >
            무료 상담 시작
          </a>
          <button
            type="button"
            aria-label="메뉴 열기"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-paper lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5"
            >
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 lg:hidden",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="mx-auto mt-4 max-w-7xl px-5 pb-4 sm:px-8">
          <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-ink-2/90 p-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-mute transition-colors hover:bg-white/5 hover:text-paper"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-3 text-center text-sm font-bold text-white"
            >
              무료 상담 시작
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
