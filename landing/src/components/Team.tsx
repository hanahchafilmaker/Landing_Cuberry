import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SmartImage } from "./SmartImage";
import { useContent } from "@/cms/ContentContext";
import { T, useI18n } from "@/i18n/LanguageContext";

/**
 * 사진이 없는 팀원 카드에 넣는 이니셜.
 * 국문 이름은 지금까지처럼 앞 두 글자, 영문 이름은 단어 첫 글자를 모은다.
 */
function initials(name: string) {
  const trimmed = name.trim();
  if (/[\uAC00-\uD7A3]/.test(trimmed)) return trimmed.slice(0, 2);
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

/** 이력 한 줄. 어드민에서 "[텍스트](https://...)" 로 적은 줄은 링크로 보여준다. */
function CareerLine({ line }: { line: string }) {
  const { t } = useI18n();
  const link = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (!link) return <>{t(line)}</>;
  return (
    <a
      href={link[2]}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:text-paper"
    >
      {t(link[1])}
    </a>
  );
}

/**
 * TEAM PROFILE — 어드민 "팀 프로필"의 이름·역할 · 소속·이력·사진 위치가 그대로 반영된다.
 * E안은 카드 테두리 없이 1px 선과 사진만 쓴다.
 */
export function Team() {
  const { team } = useContent();
  const { t } = useI18n();
  if (team.length === 0) return null;

  return (
    <section id="team" className="section">
      <div className="shell">
        <SectionHeading
          label="TEAM PROFILE"
          title={<T text={"이야기부터 완성까지,\n큐브베리의 제작진"} />}
          desc={t("방송·드라마·애니메이션 작가부터 AI 제작·편집·라이브 콘텐츠 전문가까지. 큐브베리의 직원과 주요 제작 이력을 소개합니다.")}
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <Reveal key={member.key} delay={(i % 3) + 1} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-[4px] border border-line bg-ink-3 transition-colors duration-200 hover:border-line-4">
                <div className="relative aspect-[4/5] overflow-hidden bg-void">
                  {member.image ? (
                    <SmartImage
                      src={member.image}
                      alt={t("{name} 프로필", { name: t(member.name) })}
                      objectPosition={`center ${member.photoPosition ?? 0}%`}
                      className="h-full w-full"
                      imgClassName="transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-ink-3">
                      <span className="text-4xl font-bold tracking-[-0.02em] text-line-4">
                        {initials(t(member.name))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1 p-5">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-brand">
                    {t(member.role)}
                  </div>
                  <h3 className="m-0 text-lg font-semibold tracking-[-0.01em] text-paper">
                    {t(member.name)}
                  </h3>
                  {member.org && (
                    <div className="text-[12px] leading-relaxed text-faint">{t(member.org)}</div>
                  )}
                </div>

                {member.career.length > 0 && (
                  <details className="team-history border-t border-line px-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[11px] font-mono tracking-[0.08em] text-faint transition-colors hover:text-paper">
                      <span>{t("주요 이력 보기 {count}건", { count: member.career.length })}</span>
                      <span aria-hidden="true" className="team-history-icon text-base leading-none text-brand">
                        +
                      </span>
                    </summary>
                    <ul className="m-0 flex list-none flex-col gap-2 pb-5">
                      {member.career.map((c, j) => (
                        <li
                          key={`${j}-${c}`}
                          className="flex gap-2.5 text-[13px] leading-relaxed text-mute"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand"
                          />
                          <span className="min-w-0 break-words">
                            <CareerLine line={c} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            </Reveal>
          ))}

          <Reveal delay={2} className="h-full">
            <div className="flex h-full flex-col justify-center gap-4 rounded-[4px] border border-dashed border-line-2 p-7">
              <div className="font-mono text-[11px] tracking-[0.14em] text-brand">
                CUSTOM TEAM
              </div>
              <p className="m-0 text-[15px] leading-relaxed text-body">
                {t(
                  "프로젝트별로 PD·감독·모션·AI·후반 인력을 다시 짜서 구성합니다. 편성 일정과 예산 구간을 알려주시면 바로 견적으로 답합니다.",
                )}
              </p>
              <a
                href="#contact"
                className="self-start rounded-[3px] border border-brand px-4 py-2.5 text-sm font-medium text-brand transition-colors duration-200 hover:bg-brand hover:text-[#140f00]"
              >
                {t("팀 구성 상담받기 →")}
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
