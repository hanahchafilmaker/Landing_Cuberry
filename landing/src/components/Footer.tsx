import { navLinks } from "@/data/content";
import { useContent } from "@/cms/ContentContext";
import { Logo } from "@/components/Logo";

export function Footer() {
  const { settings } = useContent();
  return (
    <footer className="border-t border-white/10 bg-ink-2">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo brand={settings.brand} className="text-[24px]" />
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-mute">
              방송 전문가들이 이끄는 AI 콘텐츠 기업.
              큐브베리는 기획부터 유통까지, 방영 가능한 완성도로
              한 팀이 끝까지 만드는 크리에이티브 스튜디오입니다.
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
              OFFICES
            </div>
            <ul className="mt-5 space-y-3 text-[14px] text-mute">
              <li>
                <span className="font-mono text-[10px] tracking-[0.12em] text-brand-light">본사 · 광주</span>
                <br />전남광주광역시 충장로 69-12, 2층
              </li>
              <li>
                <span className="font-mono text-[10px] tracking-[0.12em] text-brand-light">지사 · 부천</span>
                <br />경기도 부천시 부천로198번길 18, 춘의테크노파크II
              </li>
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

            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 sm:flex-row">
          <p className="font-mono text-[11px] text-faint">
            © 2026 {settings.brand}. 주식회사 큐브베리 · 대표 이진서 · 사업자등록번호 480-88-03079
          </p>
          <p className="font-mono text-[11px] text-faint">
            AI Content Company / Broadcasting Experts
          </p>
        </div>
      </div>
    </footer>
  );
}
