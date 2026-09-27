import { useState } from "react";
import { cn } from "@/utils/cn";

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** 원격 이미지 로드 실패 시 사용할 로컬 폴백 이미지 */
  fallbackSrc?: string;
  /** 어드민 "사진 위치"처럼 object-position 을 지정할 때 */
  objectPosition?: string;
}

/** 이미지 로드에 실패하면 폴백 이미지 → 그라디언트 플레이스홀더 순으로 대체합니다. */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackSrc,
  objectPosition,
}: SmartImageProps) {
  // 어드민에서 주소를 바꾸면 src 가 달라지므로, "실패한 주소"를 기억해 새 주소는 다시 시도한다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [failedFallback, setFailedFallback] = useState<string | null>(null);
  const useFallback = Boolean(src) && failedSrc === src;

  const activeSrc = !src || useFallback ? (fallbackSrc && failedFallback !== fallbackSrc ? fallbackSrc : undefined) : src;

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
      style={objectPosition ? { objectPosition } : undefined}
      onError={() => {
        if (activeSrc === src) setFailedSrc(src ?? null);
        else setFailedFallback(activeSrc ?? null);
      }}
      className={cn("object-cover", imgClassName, className)}
    />
  );
}
