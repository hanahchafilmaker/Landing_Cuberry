import { cn } from "@/utils/cn";

/**
 * CUBEBERRY 워드마크 로고.
 * "CUBE"는 화이트, "BERRY"는 브랜드 바이올렛으로 렌더한다.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="CUBEBERRY"
      className={cn(
        "font-display select-none whitespace-nowrap font-extrabold leading-none tracking-[-0.02em]",
        className,
      )}
    >
      <span aria-hidden="true" className="text-paper">
        CUBE
      </span>
      <span aria-hidden="true" className="text-brand-light">
        BERRY
      </span>
    </span>
  );
}
