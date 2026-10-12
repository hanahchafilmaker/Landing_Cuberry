import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  /** 절 위쪽의 얇은 mono 라벨 (E안: TWO SECTORS · HISTORY · PATENTS …) */
  label: string;
  title: React.ReactNode;
  desc?: string;
  align?: "left" | "center";
  className?: string;
}

/** E안의 제목은 박스가 아니라 "mono 라벨 + 34px 강조 제목" 두 줄로 끝난다. */
export function SectionHeading({
  label,
  title,
  desc,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-2.5",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <span className="eyebrow">{label}</span>
      <h2 className="balance-text text-[clamp(26px,3.2vw,34px)] font-bold leading-[1.3] tracking-[-0.02em] text-paper">
        {title}
      </h2>
      {desc && (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mute">{desc}</p>
      )}
    </Reveal>
  );
}
