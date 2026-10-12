import { cn } from "@/utils/cn";

interface LogoProps {
  className?: string;
  brand?: string;
}

/** E안은 이미지 심볼 없이 자간을 넓힌 워드마크만 쓴다 (images/cuberry-mark.webp 는 히어로·파비콘용으로 유지). */
export function Logo({ className, brand = "CUBEBERRY" }: LogoProps) {
  return (
    <span
      role="img"
      aria-label={brand}
      className={cn("inline-flex select-none items-center whitespace-nowrap leading-none", className)}
    >
      <span
        aria-hidden="true"
        className="text-[1em] font-bold tracking-[0.1em] text-paper"
      >
        {brand}
      </span>
    </span>
  );
}
