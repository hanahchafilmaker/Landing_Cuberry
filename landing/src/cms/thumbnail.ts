// 드라이브 썸네일이 "새까만 프레임"인지 확인한다.
//
// 왜 필요한가
//   Google Drive 썸네일 API 는 영상의 특정 시점(예: 1분 지점)을 고를 수 없습니다.
//   첫 장면이 검은 화면인 영상은 카드가 통째로 검게 보여서, 작품이 없는 것처럼 보입니다
//   (2026-10-28 대표님 지적).
//
// 어떻게
//   썸네일을 아주 작은 크기(w160)로 한 번 더 받아 캔버스에 그려 픽셀 밝기를 잽니다.
//   거의 전체가 검정이면 "빈 썸네일"로 보고, 화면에서는 검은 사각형 대신 브랜드 톤의
//   카드로 대신 그립니다.
//
// 안전 규칙
//   · 원본 이미지는 건드리지 않는다(별도 Image 로만 검사) → CORS 가 막혀 있어도 화면은 그대로.
//   · 판정이 불가능하면 null(=모름) 을 돌려주고, 화면은 원래 썸네일을 쓴다.
//   · 검사는 카드가 화면에 붙은 뒤에 하고, 결과는 주소별로 기억해 다시 재지 않는다.

const PROBE_SIZE = 48;
/** 이 밝기(0~255)보다 어두운 픽셀을 "검정"으로 센다. */
const DARK_LEVEL = 26;
/** 이 비율보다 많은 픽셀이 검정이면 빈 썸네일로 본다. */
const BLANK_RATIO = 0.94;

const cache = new Map<string, boolean>();

/** 썸네일 주소를 가볍게(작은 크기) 바꿔 검사용으로 쓴다. */
function probeUrl(url: string) {
  return url.replace(/([?&])sz=w\d+/i, "$1sz=w160");
}

/**
 * @returns true = 거의 새까만 썸네일, false = 정상, null = 판정 불가(권한·CORS·캔버스 없음)
 */
export function detectBlankThumbnail(url: string): Promise<boolean | null> {
  const known = cache.get(url);
  if (known !== undefined) return Promise.resolve(known);

  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.Image !== "function") return resolve(null);
    const image = new window.Image();
    // 픽셀을 읽으려면 CORS 허용이 필요하다. 막혀 있으면 onerror 로 떨어져 원본을 그대로 쓴다.
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onerror = () => resolve(null);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = PROBE_SIZE;
        canvas.height = PROBE_SIZE;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, PROBE_SIZE, PROBE_SIZE);
        const { data } = context.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE);
        let dark = 0;
        let transparent = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 8) { transparent += 1; continue; }
          const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          if (luminance < DARK_LEVEL) dark += 1;
        }
        const opaque = PROBE_SIZE * PROBE_SIZE - transparent;
        if (opaque < (PROBE_SIZE * PROBE_SIZE) / 2) return resolve(null);
        const ratio = dark / opaque;
        cache.set(url, ratio >= BLANK_RATIO);
        resolve(ratio >= BLANK_RATIO);
      } catch {
        // 캔버스가 오염(tainted)됐거나 getImageData 가 막힌 경우 — 판정하지 않는다.
        resolve(null);
      }
    };
    image.src = probeUrl(url);
  });
}

/** 여러 썸네일을 한꺼번에 확인해 "검은 썸네일" 주소만 모은다. */
export async function findBlankThumbnails(urls: string[]): Promise<Set<string>> {
  const blanks = new Set<string>();
  await Promise.all(
    [...new Set(urls)].map(async (url) => {
      if (await detectBlankThumbnail(url)) blanks.add(url);
    }),
  );
  return blanks;
}
