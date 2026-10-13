#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  compress-video.sh  —  us-ad-rere.mp4 다이어트 스크립트
#
#  사용법:  bash scripts/compress-video.sh
#
#  원본(29 MB 4K H.264)을 720p WebM(VP9) + 720p H.264(mp4) 두 가지로
#  변환하고, 랜딩 페이지가 모바일에서 원본 대신 가벼운 파일을 받게 한다.
#
#  출력:
#    us-ad-rere-720p.mp4   (~3–5 MB, H.264 Baseline, faststart)
#    us-ad-rere-720p.webm  (~2–4 MB, VP9)
#
#  ffmpeg 가 없으면 안내 메시지를 출력하고 종료한다.
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

INPUT="us-ad-rere.mp4"
MP4_OUT="us-ad-rere-720p.mp4"
WEBM_OUT="us-ad-rere-720p.webm"

if ! command -v ffmpeg &>/dev/null; then
  echo "❌  ffmpeg 를 찾을 수 없습니다."
  echo "    macOS:  brew install ffmpeg"
  echo "    Ubuntu: sudo apt install ffmpeg"
  echo "    Windows: https://ffmpeg.org/download.html"
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "❌  $INPUT 파일을 찾을 수 없습니다."
  exit 1
fi

ORIGINAL_SIZE=$(du -h "$INPUT" | cut -f1)
echo "📦  원본 크기: $ORIGINAL_SIZE"
echo ""

# ── 720p H.264 MP4 (Baseline profile, faststart) ──────────
echo "⏳  720p H.264 MP4 변환 중..."
ffmpeg -y -i "$INPUT" \
  -vf "scale=-2:720" \
  -c:v libx264 -profile:v baseline -level 3.1 \
  -preset slow -crf 28 \
  -c:a aac -b:a 96k -ac 2 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  "$MP4_OUT" 2>/dev/null

MP4_SIZE=$(du -h "$MP4_OUT" | cut -f1)
echo "✅  $MP4_OUT  ($MP4_SIZE)"

# ── 720p VP9 WebM ─────────────────────────────────────────
echo "⏳  720p VP9 WebM 변환 중..."
ffmpeg -y -i "$INPUT" \
  -vf "scale=-2:720" \
  -c:v libvpx-vp9 -b:v 0 -crf 35 \
  -c:a libopus -b:a 64k \
  -row-mt 1 \
  "$WEBM_OUT" 2>/dev/null

WEBM_SIZE=$(du -h "$WEBM_OUT" | cut -f1)
echo "✅  $WEBM_OUT  ($WEBM_SIZE)"

echo ""
echo "🎯  완료! 원본($ORIGINAL_SIZE) → MP4($MP4_SIZE) + WebM($WEBM_SIZE)"
echo ""
echo "다음 단계:"
echo "  1. 결과물 확인"
echo "  2. server/seed.json 의 videoUrl 을 /us-ad-rere-720p.mp4 로 변경"
echo "  3. Git 에 커밋 (원본은 .gitignore 처리 권장)"