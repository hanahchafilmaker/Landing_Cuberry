import { Reveal } from "./Reveal";
import { whatWeDo } from "@/data/content";

/** WHAT WE DO — 왼쪽 제목, 오른쪽 4개 항목. E안은 아이콘 없이 번호만으로 나눈다. */
export function WhatWeDo() {
  return (
    <section className="section">
      <div className="shell flex flex-wrap items-start gap-x-12 gap-y-8">
        <div className="flex min-w-[240px] flex-1 flex-col gap-2.5">
          <span className="eyebrow">WHAT WE DO</span>
          <h2 className="m-0 text-[clamp(26px,3.2vw,34px)] font-bold leading-[1.25] tracking-[-0.02em] text-paper">
            방송과 AI,
            <br />
            스튜디오와 IP
          </h2>
        </div>

        <div className="grid min-w-0 flex-[999_1_560px] gap-x-8 gap-y-9 sm:grid-cols-2">
          {whatWeDo.map((item, i) => (
            <Reveal key={item.num} delay={i + 1} className="flex flex-col gap-2">
              <span className="font-mono text-xs text-brand">{item.num}</span>
              <h3 className="m-0 text-lg font-semibold tracking-[-0.01em] text-paper">
                {item.title}
              </h3>
              <p className="m-0 text-sm leading-relaxed text-mute">{item.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
