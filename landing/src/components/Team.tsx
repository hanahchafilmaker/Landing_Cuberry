import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SmartImage } from "./SmartImage";
import { useContent } from "@/cms/ContentContext";

function initials(name: string) {
  return name.trim().slice(0, 2);
}

/** 이력 한 줄. 어드민에서 "[텍스트](https://...)" 로 적은 줄은 링크로 보여준다. */
function CareerLine({ line }: { line: string }) {
  const link = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (!link) return <>{line}</>;
  return (
    <a
      href={link[2]}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:text-paper"
    >
      {link[1]}
    </a>
  );
}

/**
 * TEAM PROFILE — 어드민 "팀 프로필"의 이름·역할 · 소속·이력·사진 위치가 그대로 반영된다.
 * E안은 카드 테두리 없이 1px 선과 사진만 쓴다.
 */
export function Team() {
  const { team } = useContent();
  if (team.length === 0) return null;

  return (
    <section id="team" className="section">
      <div className="shell">
        <SectionHeading
          label="TEAM PROFILE"
          title={
            <>
              PD의 기획력과 모션그래퍼의
              <br />
              크리에이티브가 만나는 팀
            </>
          }
          desc="프로젝트 성격과 규모에 따라 PD·감독·모션·AI·후반 제작 인력을 최적 구성합니다. 방송·감독 이력은 프로젝트 제안 및 계약 범위에 맞춰 상세히 안내드립니다."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <Reveal key={member.key} delay={(i % 3) + 1} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-[4px] border border-line bg-ink-3 transition-colors duration-200 hover:border-line-4">
                <div className="relative aspect-[4/5] overflow-hidden bg-void">
                  {member.image ? (
                    <SmartImage
                      src={member.image}
                      alt={`${member.name} 프로필`}
                      objectPosition={`center ${member.photoPosition ?? 0}%`}
                      className="h-full w-full"
                      imgClassName="transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-ink-3">
                      <span className="text-4xl font-bold tracking-[-0.02em] text-line-4">
                        {initials(member.name)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1 p-5">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-brand">
                    {member.role}
                  </div>
                  <h3 className="m-0 text-lg font-semibold tracking-[-0.01em] text-paper">
                    {member.name}
                  </h3>
                  {member.org && (
                    <div className="text-[12px] leading-relaxed text-faint">{member.org}</div>
                  )}
                </div>

                <ul
                  className="m-0 flex list-none flex-col gap-2 border-t border-line p-5"
                  hidden={member.career.length === 0}
                >
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
              </article>
            </Reveal>
          ))}

          <Reveal delay={2} className="h-full">
            <div className="flex h-full flex-col justify-center gap-4 rounded-[4px] border border-dashed border-line-2 p-7">
              <div className="font-mono text-[11px] tracking-[0.14em] text-brand">
                CUSTOM TEAM
              </div>
              <p className="m-0 text-[15px] leading-relaxed text-body">
                프로젝트별로 PD·감독·모션·AI·후반 인력을 다시 짜서 구성합니다.
                편성 일정과 예산 구간을 알려주시면 바로 견적으로 답합니다.
              </p>
              <a
                href="#contact"
                className="self-start rounded-[3px] border border-brand px-4 py-2.5 text-sm font-medium text-brand transition-colors duration-200 hover:bg-brand hover:text-[#140f00]"
              >
                팀 구성 상담받기 →
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
