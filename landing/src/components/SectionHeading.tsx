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

export function SectionHeading({
  num,
  label,
  title,
  desc,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <div
        className={cn(
          "mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.21em] text-brand-light sm:text-[11px]",
          align === "center" && "justify-center",
        )}
      >
        <span className="rounded-full border border-brand-light/18 bg-brand/8 px-2.5 py-1 text-brand-light/80">{num}</span>
        <span className="h-px w-9 bg-gradient-to-r from-brand-light/55 to-transparent" />
        <span>{label}</span>
      </div>
      <h2 className="balance-text font-display text-[clamp(31px,4.6vw,56px)] font-semibold leading-[1.12] tracking-[-0.045em] text-paper">
        {title}
      </h2>
      {desc && <p className="mt-6 max-w-2xl text-[14.5px] leading-[1.85] text-mute sm:text-[16px]">{desc}</p>}
    </Reveal>
  );
}
