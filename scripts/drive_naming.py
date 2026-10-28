#!/usr/bin/env python3
"""Cuberry_Video 파일명 규칙(v1.4) 검사기.

`scripts/drive_folder.py` 로 만든 FOLDER_MANIFEST.json(또는 폴더 경로)을 읽어
규칙 위반을 찾는다. 파일 ID·폴더 ID 는 출력하지 않으므로 보고서를 공유해도 안전하다.

규칙 요약 (Drive `00_README_파일명규칙` v1.4)
  {프로젝트}_{콘텐츠}_{버전}_{언어}.mp4   /  시리즈: {프로젝트}_{번호}_{콘텐츠}_{언어}.mp4
  1) 구분자는 밑줄만, 공백·한글·콜론·특수문자 금지
  2) 프로젝트 표기 고정: XCONDA / Kosha / ScanPang / SeongnamCity / Cubeberry / TV / WebDrama / Guide / Demo / JejuContest …
  4) 가이드 시리즈는 두 자리 번호(01, 02 …)
  5) 버전은 v1, v2 … (소수점 없음)
  6) 언어 코드: 오디오 KO·EN·JA / 자막 KOsub·ENsub·JAsub, 오디오_자막 순서
  7) 날짜는 원본에 있던 경우만 YYMMDD 또는 YYYYMM
  8) 확장자는 항상 소문자 .mp4
  11) 산출물 종류: _Trailer · _PilotTest · _Delivery_v1 · _Showreel

Usage
  python3 scripts/drive_naming.py --manifest drive-incoming/_local/drive-folder/FOLDER_MANIFEST.json
  python3 scripts/drive_naming.py --dir drive-incoming/_local/drive-folder [--json out.json]
  python3 scripts/drive_naming.py --self-test
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from collections import Counter

PROJECTS = {
    "XCONDA", "Kosha", "ScanPang", "SeongnamCity", "Cubeberry", "Cuberry",
    "TV", "WebDrama", "Guide", "Demo", "JejuContest",
}
AUDIO = {"KO", "EN", "JA"}
SUBS = {"KOsub", "ENsub", "JAsub"}
OUTPUT_TOKENS = {"Trailer", "PilotTest", "Showreel", "Delivery", "Teaser", "Making"}
SAFE = re.compile(r"^[A-Za-z0-9._-]+$")
VERSION = re.compile(r"^v\d+$")
SERIES_NO = re.compile(r"^\d{2}$")
# 언어 코드처럼 생겼지만 규칙에 없는 표기 (TURN·KBS·MASH 같은 작품/툴 이름은 건드리지 않는다)
KNOWN_BAD_LANGS = {
    "ENG", "KOR", "JPN", "JP", "KR", "CN", "CHI", "ZHO", "FRE", "GER", "ESP", "RUS", "VIE", "THA",
    "ENGsub", "KORsub", "JPNsub", "JPsub", "KRsub", "CHIsub", "FREsub", "GERsub", "ESPsub",
}
LANG_LIKE = re.compile(r"^[A-Z]{2,4}(?:sub|Sub|SUB)?$")
DATE_LIKE = re.compile(r"^(?:\d{6}|\d{8})$")
YEAR_ONLY = re.compile(r"^(?:19|20)\d{2}$")
LANG_DIRS = {"EN", "KO", "JA"}


class Issue:
    __slots__ = ("severity", "path", "code", "message")

    def __init__(self, severity: str, path: str, code: str, message: str):
        self.severity = severity
        self.path = path
        self.code = code
        self.message = message

    def as_dict(self) -> dict:
        return {"severity": self.severity, "path": self.path, "code": self.code, "message": self.message}

    def __str__(self) -> str:
        mark = {"error": "✗", "warn": "!", "info": "·"}[self.severity]
        return f"{mark} {self.path}: {self.message} ({self.code})"


def parse_tokens(stem: str) -> list[str]:
    return stem.split("_")


def lint_path(path: str) -> list[Issue]:
    """path: '01_Commercial/Kosha/Kosha_daVinci_MonaLisa_v5.mp4' 형태."""
    issues: list[Issue] = []
    parts = path.split("/")
    name = parts[-1]
    dirs = parts[:-1]

    stem, dot, ext = name.rpartition(".")
    if not dot:
        return [Issue("error", path, "no-extension", "확장자가 없습니다 (.mp4 필요)")]
    if ext != ext.lower() or ext != "mp4":
        issues.append(Issue("error", path, "extension", f"확장자는 소문자 .mp4 만 사용합니다 (지금 .{ext})"))
    if not SAFE.match(stem):
        bad = sorted({ch for ch in stem if not re.match(r"[A-Za-z0-9._-]", ch)})
        shown = " ".join(repr(ch) for ch in bad[:6])
        issues.append(
            Issue("error", path, "characters", f"공백·한글·특수문자 금지 — 사용할 수 없는 문자: {shown}")
        )

    tokens = parse_tokens(stem)
    if tokens and tokens[0] not in PROJECTS:
        issues.append(
            Issue(
                "warn",
                path,
                "project",
                f"프로젝트 표기 '{tokens[0]}' 가 규칙 목록({', '.join(sorted(PROJECTS))})에 없습니다",
            )
        )

    # 언어 토큰: 오디오_자막 순서, 규칙에 있는 코드만
    langs = [(i, t) for i, t in enumerate(tokens) if LANG_LIKE.match(t) and t.lower() not in {"part", "turn"}]
    for index, token in langs:
        if token in KNOWN_BAD_LANGS:
            issues.append(
                Issue("error", path, "language", f"언어 코드 '{token}' 는 규칙에 없습니다 (KO/EN/JA, KOsub/ENsub/JAsub)")
            )
    langs = [(i, t) for i, t in langs if t in AUDIO or t in SUBS]
    audios = [i for i, t in langs if t in AUDIO]
    subs = [i for i, t in langs if t in SUBS]
    if audios and subs and subs[0] < audios[0]:
        issues.append(Issue("error", path, "language-order", "자막 코드가 오디오 코드보다 앞에 있습니다 (오디오_자막 순서)"))
    if "sub" in (t.lower() for t in tokens):
        issues.append(Issue("error", path, "language", "자막은 '_sub' 가 아니라 '_ENsub' 처럼 오디오 코드 없이 붙여 씁니다"))
    if len(audios) > 1:
        issues.append(Issue("warn", path, "language", "오디오 언어 코드가 2개 이상입니다"))

    # 언어 폴더(02_Guide/EN …)와 언어 토큰 일치
    lang_dir = next((d for d in reversed(dirs) if d in LANG_DIRS), "")
    if lang_dir and audios:
        audio_token = tokens[audios[0]]
        if audio_token != lang_dir:
            issues.append(
                Issue("warn", path, "language-folder", f"폴더는 {lang_dir} 인데 오디오 언어는 {audio_token} 입니다")
            )
    if "02_Guide" in dirs and not lang_dir:
        issues.append(Issue("warn", path, "guide-folder", "가이드 영상은 02_Guide 안의 언어 폴더(EN/KO/JA)에 두세요"))

    # 번호(가이드 시리즈) — 두 자리
    if "02_Guide" in dirs and not any(SERIES_NO.match(t) for t in tokens):
        issues.append(Issue("warn", path, "series-number", "가이드 시리즈는 두 자리 번호(01, 02 …)를 붙입니다"))
    for token in tokens:
        if re.fullmatch(r"\d", token):
            issues.append(Issue("warn", path, "series-number", f"시리즈 번호 '{token}' 는 두 자리로 씁니다"))

    # 버전 / 산출물 종류
    versions = [t for t in tokens if VERSION.match(t)]
    if versions and not all(re.fullmatch(r"v\d+", v) for v in versions):
        issues.append(Issue("error", path, "version", "버전은 v1, v2 처럼 소수점 없이 씁니다"))
    if not versions:
        has_output = any(t in OUTPUT_TOKENS for t in tokens)
        has_series = "02_Guide" in dirs and any(SERIES_NO.match(t) for t in tokens)
        if not has_output and not has_series:
            issues.append(Issue("warn", path, "version", "버전 토큰(_v1 …)이나 산출물 토큰(_Trailer 등)이 없습니다"))

    # 날짜 토큰
    for i, token in enumerate(tokens):
        if YEAR_ONLY.match(token):
            issues.append(Issue("warn", path, "date", f"연도만 있는 토큰 '{token}' — YYYYMM(예 202610) 형식을 권장"))
        elif token.isdigit() and len(token) in (4, 5, 7) and token not in ("1080", "2160"):
            issues.append(Issue("warn", path, "date", f"날짜 같은 토큰 '{token}' 의 자릿수를 확인하세요 (YYMMDD/YYYYMM)"))
        if token.isdigit() and len(token) == 6 and not DATE_LIKE.match(token):
            issues.append(Issue("warn", path, "date", f"날짜 토큰 '{token}' 형식을 확인하세요"))

    if "_dup" in stem and "_archive" not in dirs:
        issues.append(Issue("warn", path, "archive", "_dup 파일은 _archive 로 옮깁니다"))
    if "_archive" in dirs:
        issues.append(Issue("info", path, "archive", "_archive 는 납품/공유 대상이 아닙니다"))
    return issues


def collect_paths(root: pathlib.Path) -> list[str]:
    return sorted(
        str(p.relative_to(root)).replace("\\", "/")
        for p in root.rglob("*")
        if p.is_file() and not p.name.startswith(".") and p.name not in {"FOLDER_MANIFEST.json", "RUN_LOG.txt", "README.md"}
    )


def collect_from_manifest(manifest: pathlib.Path) -> list[str]:
    data = json.loads(manifest.read_text(encoding="utf-8"))

    def walk(entries: list[dict], prefix: str = "") -> list[str]:
        out: list[str] = []
        for entry in entries:
            if entry.get("kind") == "folder":
                out.extend(walk(entry.get("children") or [], prefix + entry["name"] + "/"))
            else:
                out.append(prefix + entry["name"])
        return out

    return walk(data.get("entries") or [])


VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}


def lint_paths(paths: list[str]) -> tuple[list[Issue], dict]:
    issues: list[Issue] = []
    media = []
    for path in paths:
        ext = pathlib.PurePosixPath(path).suffix.lower()
        if ext not in VIDEO_EXT:
            # 규칙 문서·이미지 등 영상이 아닌 항목은 이름 규칙 대상이 아니다.
            if ext in {".jpg", ".jpeg", ".png", ".zip", ".pptx", ".pdf"}:
                issues.append(Issue("info", path, "not-video", "영상이 아닌 파일 — 이름 규칙 검사 대상 아님"))
            continue
        media.append(path)
        issues.extend(lint_path(path))
    paths = media

    stems = Counter(pathlib.PurePosixPath(p).stem for p in paths)
    for stem, count in stems.items():
        if count > 1:
            where = [p for p in paths if pathlib.PurePosixPath(p).stem == stem]
            issues.append(
                Issue("error", where[0], "duplicate-name", f"같은 이름이 {count}곳에 있습니다: {', '.join(where)}")
            )

    stats = {
        "files": len(paths),
        "errors": len([i for i in issues if i.severity == "error"]),
        "warnings": len([i for i in issues if i.severity == "warn"]),
        "by_code": dict(Counter(i.code for i in issues).most_common()),
        "by_folder": dict(Counter(p.split("/")[0] for p in paths).most_common()),
    }
    return issues, stats


def self_test() -> int:
    ok = [
        "01_Commercial/Kosha/Kosha_daVinci_MonaLisa_v5.mp4",
        "02_Guide/KO/Guide_XCONDA_05_AutoAngleGenerator_KO.mp4",
        "02_Guide/EN/Guide_XCONDA_17_TURN_EN.mp4",
        "01_Commercial/XCONDA/XCONDA_SeedancePromo_Part5_Toothpaste_EN_KOsub_v1.mp4",
        "03_Demo/Demo_Cubeberry_Showreel.mp4",
    ]
    for path in ok:
        errors = [i for i in lint_path(path) if i.severity == "error"]
        assert not errors, (path, [str(i) for i in errors])

    bad_cases = {
        "한글 이름.mp4": "characters",
        "Kosha_My Video_v1.mp4": "characters",
        "XCONDA_Turn_v1_ENGsub.mp4": "language",
        "Kosha_MonaLisa_(KO)_v5.mp4": "characters",
        "Kosha_MonaLisa_KO_sub.mp4": "language",
        "WebDrama_ToyFarm_Trailer.MP4": "extension",
        "Demo_Showreel": "no-extension",
        "01_Commercial/XCONDA/Path_With_Sub.jpg": "extension",
    }
    for path, expected in bad_cases.items():
        codes = {i.code for i in lint_path(path) if i.severity == "error"}
        assert expected in codes, (path, codes)

    warn_cases = {
        "TV/TV_Ramen_KBS_2026.mp4": "date",
        "02_Guide/KO/Guide_XCONDA_ImageGenerator_KO.mp4": "series-number",
        "05_Web_Drama/WebDrama_GirlDetective.mp4": "version",
        "02_Guide/Guide_XCONDA_01_ImageGenerator_EN.mp4": "guide-folder",
    }
    for path, expected in warn_cases.items():
        codes = {i.code for i in lint_path(path) if i.severity == "warn"}
        assert expected in codes, (path, codes)

    issues, stats = lint_paths(ok + ["02_Guide/KO/Guide_XCONDA_05_AutoAngleGenerator_KO.mp4"])
    assert stats["files"] == 6 and stats["errors"] == 1, stats  # 중복 이름 1건
    print("drive_naming.py self-test: 통과 (정상 5 · 오류 7 · 경고 4 · 중복 1 사례)")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Cuberry_Video 파일명 규칙 검사")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--manifest", help="drive_folder.py 가 만든 FOLDER_MANIFEST.json")
    source.add_argument("--dir", help="이미 내려받은 폴더 경로")
    parser.add_argument("--json", help="결과를 JSON 으로 저장할 경로")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()
    if not args.manifest and not args.dir:
        parser.error("--manifest 또는 --dir 이 필요합니다 (--self-test 로 자체 점검)")

    if args.manifest:
        paths = collect_from_manifest(pathlib.Path(args.manifest))
    else:
        paths = collect_paths(pathlib.Path(args.dir))

    issues, stats = lint_paths(paths)
    print(f"검사 파일 {stats['files']}건 — 오류 {stats['errors']} · 경고 {stats['warnings']}")
    print("폴더별:", ", ".join(f"{k} {v}" for k, v in stats["by_folder"].items()) or "-")
    if stats["by_code"]:
        print("유형별:", ", ".join(f"{k} {v}" for k, v in stats["by_code"].items()))
    print()
    for issue in issues:
        if issue.severity != "info":
            print(issue)

    if args.json:
        pathlib.Path(args.json).write_text(
            json.dumps(
                {"stats": stats, "issues": [i.as_dict() for i in issues]},
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"\nJSON: {args.json}")
    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
