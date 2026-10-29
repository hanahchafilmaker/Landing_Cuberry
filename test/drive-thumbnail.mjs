// 드라이브 썸네일 중계 검증 — 픽셀 판정(검은 썸네일 대체)이 브라우저에서 되려면 CORS 가 필요하다.
// 2026-10-29 대표님 지적: 디비전0 · 목구멍 썸네일이 새까맣게 나옴.
import assert from "node:assert/strict";
import { clearDriveThumbnailCache, driveThumbnail, driveThumbnailCacheSize } from "../server/lib/drive-thumbnail.mjs";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
let calls = [];
let reply = null;

globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (typeof reply === "function") return reply(String(url));
  return {
    ok: true,
    headers: { get: (name) => ({ "content-type": "image/jpeg", "content-length": String(JPEG.length) }[name.toLowerCase()] ?? null) },
    arrayBuffer: async () => JPEG.buffer.slice(JPEG.byteOffset, JPEG.byteOffset + JPEG.length),
  };
};

clearDriveThumbnailCache();
assert.equal(driveThumbnailCacheSize(), 0);

// ① 정상 — 구글 고정 주소로만 나가고, 크기 기본값은 w800
calls = [];
const first = await driveThumbnail({ id: "1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb" });
assert.equal(Buffer.isBuffer(first.body), true);
assert.equal(first.type, "image/jpeg");
assert.equal(calls.length, 1);
assert.equal(calls[0].startsWith("https://drive.google.com/thumbnail?"), true, "구글 주소가 아닙니다");
assert.equal(calls[0].includes("sz=w800"), true, "기본 크기가 w800 이 아닙니다");
assert.equal(calls[0].includes("id=1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb"), true);

// ② 두 번째 호출은 캐시에서(구글을 다시 부르지 않는다)
assert.equal(driveThumbnailCacheSize(), 1);
await driveThumbnail({ id: "1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb" });
assert.equal(calls.length, 1, "캐시를 쓰지 않았습니다");

// ③ 작은 크기(w160)는 따로 캐시한다 — 브라우저가 픽셀을 재는 용도
await driveThumbnail({ id: "1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb", size: "w160" });
assert.equal(calls.length, 2);
assert.equal(calls[1].includes("sz=w160"), true);
assert.equal(driveThumbnailCacheSize(), 2);

// ④ 파일 ID·리소스 키 규칙을 벗어나면 구글을 부르지도 않는다(SSRF 차단)
calls = [];
assert.equal(await driveThumbnail({ id: "http://evil.example.com/a.jpg" }), null);
assert.equal(await driveThumbnail({ id: "../../etc/passwd" }), null);
assert.equal(await driveThumbnail({ id: "" }), null);
assert.equal(calls.length, 0, "잘못된 값으로 외부 요청을 보냈습니다");

// ⑤ 리소스 키는 허용된 형식만 붙는다
calls = [];
await driveThumbnail({ id: "1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb", size: "w2000", resourceKey: "0AbCdEfGhIjKlMnOp" });
assert.equal(calls[0].includes("resourcekey=0AbCdEfGhIjKlMnOp"), true);
assert.equal(calls[0].includes("sz=w2000"), true);

// ⑥ 이미지가 아니거나 실패하면 null (화면은 원본 썸네일로 폴백)
reply = () => ({ ok: true, headers: { get: () => "text/html; charset=utf-8" }, arrayBuffer: async () => new ArrayBuffer(8) });
assert.equal(await driveThumbnail({ id: "1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb", size: "w300" }), null);
reply = () => ({ ok: false, status: 404, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) });
assert.equal(await driveThumbnail({ id: "1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb", size: "w400" }), null);
reply = () => { throw new Error("network down"); };
assert.equal(await driveThumbnail({ id: "1KZQiQvfpugRLPcHjYGcjrnwHCUIOqnbb", size: "w500" }), null);
assert.equal(driveThumbnailCacheSize(), 3, "실패한 응답을 캐시했습니다");

console.log("[drive thumbnail] 통과 — 구글 고정 주소 · 캐시 · 형식 검증 · 실패 시 null");
