import { cn } from "@/utils/cn";

interface LogoProps {
  className?: string;
  brand?: string;
}

/** Detailed CB crystal mark paired with the CMS-controlled wordmark. */
export function Logo({ className, brand = "CUBERRY" }: LogoProps) {
  return (
    <span
      role="img"
      aria-label={brand}
      className={cn("inline-flex select-none items-center gap-[0.44em] whitespace-nowrap", className)}
    >
      <img
        src="images/cuberry-mark.webp"
        alt=""
        aria-hidden="true"
        width="479"
        height="520"
        className="h-[1.72em] w-auto object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,0.34)]"
      />
      <span aria-hidden="true" className="font-editorial border-y border-brand-light/35 py-[0.16em] text-[0.64em] font-semibold leading-none tracking-[0.08em] text-paper">
        {brand}
      </span>
    </span>
  );
}
