import { navLinks } from "@/data/content";
import { useContent } from "@/cms/ContentContext";
import { Logo } from "@/components/Logo";

export function Footer() {
  const { settings } = useContent();
  return (
    <footer className="border-t border-white/10 bg-ink-2">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo className="text-[22px]" />
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-mute">
              기업 홍보영상, 브랜드 필름, AI 광고, 모션그래픽을 기획부터 납품까지.
              큐브베리는 영상의 처음과 끝을 함께 만드는 크리에이티브 영상
              스튜디오입니다.
            </p>
          </div>

          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-faint">
              MENU
            </div>
            <ul className="mt-5 space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[14px] text-mute transition-colors hover:text-paper"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-faint">
              CONTACT
            </div>
            <ul className="mt-5 space-y-3 text-[14px] text-mute">
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="transition-colors hover:text-paper"
                >
                  {settings.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                  className="transition-colors hover:text-paper"
                >
                  {settings.phone}
                </a>
              </li>
              <li>서울 마포구 만리재로 14</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 sm:flex-row">
          <p className="font-mono text-[11px] text-faint">
            © 2026 {settings.brand} STUDIO. All rights reserved.
          </p>
          <p className="font-mono text-[11px] text-faint">
            Creative video studio / Seoul · Korea
          </p>
        </div>
      </div>
    </footer>
  );
}
