// 드라이브 썸네일 중계 — 브라우저가 픽셀을 읽을 수 있게 우리 서버를 거쳐 보낸다.
//
// 왜 필요한가 (2026-10-29 대표님 지적: "디비전0 썸네일, 목구멍 썸네")
//   첫 장면이 검은 영상은 드라이브 썸네일도 새까맣다. 랜딩은 썸네일을 작게 한 번 더 받아
//   캔버스에 그려 보고 "거의 검정"이면 브랜드 카드로 대신 그린다.
//   그런데 drive.google.com 썸네일은 CORS 헤더를 주지 않아 캔버스가 오염(tainted)되고,
//   픽셀을 못 읽어 판정이 늘 실패한다 → 검은 카드가 그대로 나온다.
//   그래서 썸네일을 우리 서버가 대신 받아 CORS 를 붙여 내려 준다(같은 출처면 더 확실하다).
//
// 안전 규칙
//   · 주소를 그대로 받지 않는다. 파일 ID·크기·리소스 키만 받아 **고정된 구글 주소**를 만든다(SSRF 차단).
//   · 영상·원본은 저장하지 않는다. 메모리에 잠깐(30분)만 들고 있는다.
//   · 실패·용량 초과·이미지 아님 → null 을 돌려주고 라우트가 404 로 답한다(화면은 기존 폴백 사용).
const ID = /^[A-Za-z0-9_-]{8,200}$/;
const SIZE = /^w\d{2,4}$/;
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 96;
const MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_SIZE = "w800";

/** @type {Map<string, { body: Buffer, type: string, at: number }>} */
const cache = new Map();

function remember(key, value) {
  if (cache.size >= MAX_ENTRIES) {
    // 가장 오래된 것부터 버린다(Map 은 삽입 순서를 유지한다).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/**
 * @param {{ id: string, size?: string, resourceKey?: string }} params
 * @returns {Promise<{ body: Buffer, type: string } | null>}
 */
export async function driveThumbnail({ id, size, resourceKey } = {}) {
  if (!ID.test(String(id || ""))) return null;
  const sz = SIZE.test(String(size || "")) ? String(size) : DEFAULT_SIZE;
  const key = `${id}|${sz}|${resourceKey && ID.test(String(resourceKey)) ? resourceKey : ""}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { body: hit.body, type: hit.type };

  const query = new URLSearchParams({ id: String(id), sz });
  if (resourceKey && ID.test(String(resourceKey))) query.set("resourcekey", String(resourceKey));
  const target = `https://drive.google.com/thumbnail?${query.toString()}`;

  try {
    const response = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "cuberry-landing/1.0 (+https://www.cuberry.kr/)" },
    });
    if (!response.ok) return null;
    const type = String(response.headers.get("content-type") || "");
    if (!/^image\//i.test(type)) return null;
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_BYTES) return null;
    const body = Buffer.from(await response.arrayBuffer());
    if (!body.length || body.length > MAX_BYTES) return null;
    remember(key, { body, type, at: Date.now() });
    return { body, type };
  } catch {
    return null;
  }
}

/** 테스트용 — 캐시를 비운다. */
export function clearDriveThumbnailCache() {
  cache.clear();
}

export function driveThumbnailCacheSize() {
  return cache.size;
}
