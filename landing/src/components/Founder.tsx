import { founder } from "@/data/content";

/** FOUNDER & CEO — 사진 한 장, 인용 한 문장, 이력은 dt/dd 표로. */
export function Founder() {
  return (
    <section id="founder" className="section">
      <div className="shell flex flex-wrap items-start gap-x-12 gap-y-8">
        <img
          src={founder.image}
          alt={`${founder.name} 대표 프로필 사진`}
          loading="lazy"
          decoding="async"
          width="800"
          height="1280"
          className="aspect-[4/5] w-full max-w-[320px] flex-1 rounded-[2px] border border-line bg-ink-3 object-cover object-[center_15%]"
        />

        <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-4">
          <span className="eyebrow">FOUNDER &amp; CEO</span>
          <h2 className="m-0 text-[clamp(28px,3.6vw,36px)] font-bold tracking-[-0.02em] text-paper">
            {founder.name}{" "}
            <span className="text-lg font-medium tracking-normal text-mute">
              {founder.nameEn}
            </span>
          </h2>

          <blockquote className="m-0 flex max-w-[26em] flex-col gap-2.5 p-0">
            <p className="m-0 text-[22px] font-medium leading-[1.5] text-paper">
              {founder.quote}
            </p>
            <cite className="font-mono text-xs not-italic tracking-[0.08em] text-brand">
              {founder.cite}
            </cite>
          </blockquote>

          <p className="m-0 max-w-[36em] text-base leading-relaxed text-body">{founder.bio}</p>

          <dl className="m-0 flex max-w-[40em] flex-col border-t border-line">
            {founder.facts.map((fact) => (
              <div key={fact.k} className="flex gap-6 border-b border-line py-3">
                <dt className="shrink-0 basis-14 font-mono text-xs text-faint">{fact.k}</dt>
                <dd className="m-0 text-sm leading-relaxed text-body">{fact.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
