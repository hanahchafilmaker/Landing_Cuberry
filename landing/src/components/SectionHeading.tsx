import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  num: string;
  label: string;
  title: React.ReactNode;
  desc?: string;
  align?: "left" | "center";
  className?: string;
}

/** xconda 스타일의 넘버링 섹션 헤딩 */
export function SectionHeading({
  num,
  label,
  title,
  desc,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-brand-light",
          align === "center" && "justify-center",
        )}
      >
        <span className="text-brand-light/60">{num}</span>
        <span className="h-px w-8 bg-brand-light/40" />
        <span className="uppercase">{label}</span>
      </div>
      <h2 className="font-display text-[clamp(30px,4.6vw,54px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-paper">
        {title}
      </h2>
      {desc && (
        <p className="mt-5 text-[15px] leading-relaxed text-mute sm:text-base">
          {desc}
        </p>
      )}
    </Reveal>
  );
}
