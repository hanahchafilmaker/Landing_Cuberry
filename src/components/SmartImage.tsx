import { useState } from "react";
import { cn } from "@/utils/cn";

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** 원격 이미지 로드 실패 시 사용할 로컬 폴백 이미지 */
  fallbackSrc?: string;
}

/** 이미지 로드에 실패하면 폴백 이미지 → 그라디언트 플레이스홀더 순으로 대체합니다. */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackSrc,
}: SmartImageProps) {
  const [useFallback, setUseFallback] = useState(false);

  const activeSrc = useFallback ? fallbackSrc : src;

  if (!activeSrc) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-dark/50 via-ink-3 to-fuchsia-900/30",
          className,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          className="h-10 w-10 text-brand-light/50"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m10 9 5 3-5 3z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (!useFallback) setUseFallback(true);
      }}
      className={cn("object-cover", imgClassName, className)}
    />
  );
}
