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
      className="text-neon underline decoration-brand-light/40 underline-offset-4 transition-colors hover:text-paper"
    >
      {link[1]}
    </a>
  );
}

export function Team() {
  const { team } = useContent();
  if (team.length === 0) return null;
  return (
    <section id="team" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          num="06 / TEAM PROFILE"
          label="Team profile"
          title={
            <>
              PD의 기획력과 모션그래퍼의
              <br />
              크리에이티브가 만나는 팀
            </>
          }
          desc="프로젝트 성격과 규모에 따라 PD·감독·모션·AI·후반 제작 인력을 최적 구성합니다. 방송·감독 이력은 프로젝트 제안 및 계약 범위에 맞춰 상세히 안내드립니다."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <Reveal key={member.key} delay={(i % 3) + 1}>
              <article className="card card-glow group h-full overflow-hidden rounded-3xl">
                <div className="relative h-60 overflow-hidden">
                  {member.image ? (
                    <SmartImage
                      src={member.image}
                      alt={`${member.name} 프로필`}
                      objectPosition={`center ${member.photoPosition ?? 0}%`}
                      className="h-full w-full"
                      imgClassName="grayscale-[0.35] transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-dark/40 via-ink-3 to-fuchsia-900/25">
                      <span className="font-display text-4xl font-extrabold text-brand-light/70">
                        {initials(member.name)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-3 via-ink-3/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="font-mono text-[10px] tracking-[0.2em] text-neon">
                      {member.role}
                    </div>
                    <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight text-paper">
                      {member.name}
                    </h3>
                    {member.org && (
                      <div className="text-[12px] text-faint">{member.org}</div>
                    )}
                  </div>
                </div>
                <ul className="space-y-2 p-6" hidden={member.career.length === 0}>
                  {member.career.map((c, j) => (
                    <li
                      key={`${j}-${c}`}
                      className="flex gap-2.5 text-[13px] leading-relaxed text-mute"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-light" />
                      <span className="min-w-0 break-words">
                        <CareerLine line={c} />
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}

          {/* 구성 안내 카드 */}
          <Reveal delay={2}>
            <div className="flex h-full flex-col justify-center rounded-3xl border border-dashed border-brand-light/30 bg-brand/5 p-8">
              <div className="font-mono text-[10px] tracking-[0.2em] text-brand-light">
                OPTIMAL CREW
              </div>
              <h3 className="mt-3 font-display text-xl font-extrabold tracking-tight text-paper">
                프로젝트별 전담 구성
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-mute">
                프로젝트 성격과 규모에 따라 PD·감독·모션·AI·후반 제작 인력을
                최적 구성합니다. 기획 → 촬영 → 편집 → 모션그래픽 → 납품까지 한
                팀이 함께합니다.
              </p>
              <a
                href="#contact"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-brand-light/40 px-5 py-2.5 text-sm font-semibold text-neon transition-colors hover:bg-brand/10"
              >
                팀 구성 상담받기
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
