#!/usr/bin/env python3
"""List and selectively download the contents of a Google Drive folder.

Why this exists
---------------
The dev sandbox cannot reach drive.google.com, so folders shared by the client
are pulled by a GitHub Actions runner instead (see
.github/workflows/fetch-drive-folder.yml). Listing first keeps the repository
small: you can read FOLDER_MANIFEST.json, then download only the files you
actually want.

Modes
-----
  list                 Write <out>/FOLDER_MANIFEST.json (no file downloads).
  download             Download the files named by --files ('*' = every file).
  probe                Diagnose sharing/permissions (no files, no manifest).

Usage
-----
  python3 scripts/drive_folder.py list \
      --folder-id <folder-id> \
      --out-dir drive-incoming/some-folder

  python3 scripts/drive_folder.py download \
      --folder-id <folder-id> \
      --out-dir drive-incoming/some-folder \
      --files 'deck.pptx,cover.jpg' --max-mb 25

Requires only the Python standard library. If a direct download is refused
(big files / virus-scan interstitial), the script falls back to the `gdown`
package when it is installed (`pip install gdown`).
"""

from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import html
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
DRIVE = "https://drive.google.com"

FILE_RE = re.compile(r"^https://drive\.google\.com/file/d/([-\w]{25,})/")
DOCS_RE = re.compile(r"^https://docs\.google\.com/(\w+)/d/([-\w]{25,})/")
FOLDER_RE = re.compile(r"^https://drive\.google\.com/drive/(?:u/\d+/)?folders/([-\w]{25,})")
ANCHOR_RE = re.compile(r"<a\b[^>]*?href=\"([^\"]+)\"[^>]*>(.*?)</a>", re.S | re.I)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
TAG_RE = re.compile(r"<[^>]+>")

DOC_MIME = {
    "document": "application/vnd.google-apps.document",
    "spreadsheets": "application/vnd.google-apps.spreadsheet",
    "presentation": "application/vnd.google-apps.presentation",
    "forms": "application/vnd.google-apps.form",
    "drawings": "application/vnd.google-apps.drawing",
}
# (google-docs 경로 조각, 내보내기 확장자)
DOC_EXPORT = {
    "document": ("txt", "document"),
    "spreadsheet": ("csv", "spreadsheets"),
    "presentation": ("pptx", "presentation"),
    "drawing": ("png", "drawing"),
    "form": ("zip", "forms"),
}

# Marker magic for formats we care about; a virus-scan/interstitial HTML page
# would otherwise be saved as if it were the real file.
MAGIC = {
    ".pptx": b"PK\x03\x04",
    ".docx": b"PK\x03\x04",
    ".xlsx": b"PK\x03\x04",
    ".zip": b"PK\x03\x04",
    ".pdf": b"%PDF",
    ".png": b"\x89PNG",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".gif": b"GIF8",
    ".webp": b"RIFF",
    ".mp4": b"\x00\x00\x00",
    ".wdp": b"II\xbc",
}


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def log(msg: str) -> None:
    print(msg, flush=True)


def sanitize(name: str, fallback: str = "unnamed") -> str:
    """Make a Drive file name safe for a path component."""
    name = html.unescape(name or "").strip()
    name = name.replace("\\", "/").split("/")[-1]  # drop any path we were given
    name = re.sub(r"[\x00-\x1f\x7f<>:\"|?*]", "_", name)
    name = re.sub(r"\s+", " ", name).strip(" .")
    if not name:
        name = fallback
    if len(name) > 150:
        stem, dot, ext = name.rpartition(".")
        if dot and len(ext) <= 8:
            name = stem[: 150 - len(ext) - 1] + "." + ext
        else:
            name = name[:150]
    return name


def unique_path(directory: pathlib.Path, name: str) -> pathlib.Path:
    target = directory / name
    if not target.exists():
        return target
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    n = 2
    while True:
        candidate = directory / (f"{stem} ({n})." + ext if ext else f"{stem} ({n})")
        if not candidate.exists():
            return candidate
        n += 1


def fetch(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def probe(url: str, timeout: int = 60) -> tuple[int, bytes, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, res.read(), ""
    except urllib.error.HTTPError as exc:
        return exc.code, b"", str(exc)
    except urllib.error.URLError as exc:
        return 0, b"", str(exc)


# --------------------------------------------------------------------------- #
# listing
# --------------------------------------------------------------------------- #
def parse_folder_html(markup: str) -> tuple[str, list[dict]]:
    """Parse drive.google.com/embeddedfolderview HTML into (folder name, entries)."""
    title = TITLE_RE.search(markup)
    folder_name = ""
    if title:
        folder_name = html.unescape(TAG_RE.sub("", title.group(1))).strip()
        folder_name = re.sub(r"\s*-\s*Google\s*Drive\s*$", "", folder_name, flags=re.I)

    entries: list[dict] = []
    seen: set[str] = set()
    for href, inner in ANCHOR_RE.findall(markup):
        href = html.unescape(href)
        label = html.unescape(TAG_RE.sub("", inner)).strip()

        match_file = FILE_RE.match(href)
        if match_file:
            fid = match_file.group(1)
            if fid in seen:
                continue
            seen.add(fid)
            entries.append({"id": fid, "name": label or fid, "kind": "file", "mime": "application/octet-stream"})
            continue

        match_docs = DOCS_RE.match(href)
        if match_docs:
            kind, fid = match_docs.groups()
            if fid in seen:
                continue
            seen.add(fid)
            entries.append(
                {
                    "id": fid,
                    "name": label or fid,
                    "kind": "google-native",
                    "mime": DOC_MIME.get(kind, ""),
                    "doc_kind": kind.rstrip("s") if kind != "spreadsheets" else "spreadsheets",
                }
            )
            continue

        match_folder = FOLDER_RE.match(href)
        if match_folder:
            fid = match_folder.group(1)
            if fid in seen:
                continue
            seen.add(fid)
            entries.append({"id": fid, "name": label or fid, "kind": "folder", "mime": ""})
    return folder_name or "drive-folder", entries


IVD_RE = re.compile(r"window\['_DRIVE_ivd'\]\s*=\s*'((?:[^'\\]|\\.)*)'")
FOLDER_MIME = "application/vnd.google-apps.folder"


def unescape_js(text: str) -> str:
    """Decode the \\xNN / \\uNNNN escapes Drive uses inside its JS string blobs."""

    def repl(match: re.Match) -> str:
        token = match.group(0)
        if token == "\\n":
            return "\n"
        if token == "\\t":
            return "\t"
        if token == "\\\\":
            return "\\"
        if token.startswith("\\x"):
            return chr(int(token[2:], 16))
        if token.startswith("\\u"):
            return chr(int(token[2:], 16))
        return token[1:]

    return re.sub(r"\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}|\\\\|\\n|\\t|\\'|\\\"", repl, text)


def parse_folder_page(markup: str) -> tuple[str, list[dict]] | None:
    """Fallback listing: read window['_DRIVE_ivd'] from /drive/folders/<id>."""
    match = IVD_RE.search(markup)
    if not match:
        return None
    try:
        data = json.loads(unescape_js(match.group(1)))
    except json.JSONDecodeError:
        return None
    items = data[0] if isinstance(data, list) and data and isinstance(data[0], list) else []
    folder_name = ""
    if isinstance(data, list) and len(data) > 2 and isinstance(data[2], str):
        folder_name = data[2]
    entries: list[dict] = []
    for item in items:
        if not isinstance(item, list) or len(item) < 4:
            continue
        fid, name, mime = item[0], item[2], item[3]
        if not isinstance(fid, str) or not isinstance(name, str):
            continue
        if mime == FOLDER_MIME:
            entries.append({"id": fid, "name": name, "kind": "folder", "mime": mime})
        elif isinstance(mime, str) and mime.startswith("application/vnd.google-apps."):
            entries.append({"id": fid, "name": name, "kind": "google-native", "mime": mime})
        else:
            entries.append({"id": fid, "name": name, "kind": "file", "mime": mime or ""})
        size = item[13] if len(item) > 13 else None
        if isinstance(size, int) and size > 0 and entries[-1]["kind"] == "file":
            entries[-1]["bytes"] = size
    return folder_name or "drive-folder", entries


def list_folder(folder_id: str, depth: int = 0, max_depth: int = 1, prefix: str = "") -> tuple[str, list[dict]]:
    url = f"{DRIVE}/embeddedfolderview?id={urllib.parse.quote(folder_id)}&list"
    try:
        markup = fetch(url).decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        if exc.code not in (401, 403):
            raise
        # 두 번째 방법: 폴더 페이지에 박혀 있는 _DRIVE_ivd JSON 을 읽는다.
        parsed = None
        try:
            page = fetch(f"{DRIVE}/drive/folders/{urllib.parse.quote(folder_id)}").decode("utf-8", "replace")
            parsed = parse_folder_page(page)
        except urllib.error.HTTPError:
            parsed = None
        if parsed is None:
            raise RuntimeError(
                f"폴더를 읽을 수 없습니다 (HTTP {exc.code}). 공유 설정을 "
                "'링크가 있는 모든 사용자 · 뷰어'로 바꾼 뒤 다시 실행하세요. "
                "(비공개 폴더는 공유 링크가 있어도 서버에서 읽을 수 없습니다. "
                "'probe' 모드로 진단할 수 있습니다.)"
            ) from exc
        folder_name, entries = parsed
    else:
        folder_name, entries = parse_folder_html(markup)
        if not entries:
            # 빈 폴더일 수도 있고, 목록을 못 읽었을 수도 있다 — 치명적으로 보지 않는다.
            if "folders/" not in markup and "file/d/" not in markup:
                log(f"  (목록 비어 있음) {prefix or 'root'} — 빈 폴더이거나 공유 범위 밖입니다")

    result: list[dict] = []
    for entry in entries:
        entry["path"] = prefix + entry["name"]
        if entry["kind"] == "folder":
            entry["children"] = []
            if depth < max_depth and entry["id"] != folder_id:
                try:
                    child_name, child_entries = list_folder(
                        entry["id"],
                        depth=depth + 1,
                        max_depth=max_depth,
                        prefix=prefix + entry["name"] + "/",
                    )
                    entry["children"] = child_entries
                    log(f"  폴더: {prefix}{entry['name']} ({len(child_entries)}건)")
                except Exception as exc:  # noqa: BLE001 - listing is best effort
                    entry["error"] = str(exc)
                    log(f"  폴더 목록 실패: {prefix}{entry['name']} — {exc}")
        result.append(entry)
    return folder_name, result


def flatten(entries: list[dict]) -> list[dict]:
    out: list[dict] = []
    for entry in entries:
        if entry["kind"] == "folder":
            out.extend(flatten(entry.get("children") or []))
        else:
            out.append(entry)
    return out


# --------------------------------------------------------------------------- #
# downloading
# --------------------------------------------------------------------------- #
def looks_downloaded(path: pathlib.Path) -> bool:
    """Reject Drive HTML pages saved in place of the real binary."""
    try:
        with open(path, "rb") as fh:
            head = fh.read(512)
    except OSError:
        return False
    if not head:
        return False
    lowered = head.lstrip().lower()
    if lowered.startswith(b"<!doctype") or lowered.startswith(b"<html"):
        return False
    magic = MAGIC.get(path.suffix.lower())
    if magic and not head.startswith(magic):
        # mp4/wdp markers are loose; only the strong containers are enforced
        if path.suffix.lower() in {".pptx", ".docx", ".xlsx", ".zip", ".pdf", ".png", ".jpg", ".jpeg", ".gif"}:
            return False
    return True


def stream_to(url: str, dest: pathlib.Path, max_bytes: int, timeout: int = 300) -> str:
    """Download url to dest, aborting if it exceeds max_bytes. Returns status."""
    part = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            ctype = (res.headers.get("Content-Type") or "").lower()
            length = res.headers.get("Content-Length")
            if "text/html" in ctype:
                return "html-instead-of-file"
            if length and length.isdigit() and int(length) > max_bytes:
                return f"too-large ({int(length) / 1048576:.1f}MB)"
            written = 0
            with open(part, "wb") as fh:
                while True:
                    chunk = res.read(1 << 20)
                    if not chunk:
                        break
                    written += len(chunk)
                    if written > max_bytes:
                        fh.close()
                        part.unlink(missing_ok=True)
                        return f"too-large (>{max_bytes / 1048576:.0f}MB)"
                    fh.write(chunk)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
        part.unlink(missing_ok=True)
        return f"error: {exc}"
    finally:
        pass

    if written == 0:
        part.unlink(missing_ok=True)
        return "empty"
    if not looks_downloaded(part):
        part.unlink(missing_ok=True)
        return "not-the-real-file (Drive 확인 페이지일 수 있음)"
    part.replace(dest)
    return "ok"


def gdown_fallback(fid: str, dest: pathlib.Path) -> str:
    if shutil.which("python3") is None:
        return "gdown-unavailable"
    try:
        import importlib.util

        if importlib.util.find_spec("gdown") is None:
            return "gdown-not-installed"
    except Exception:  # noqa: BLE001
        return "gdown-not-installed"
    log(f"    gdown 대체 경로 시도: {dest.name}")
    proc = subprocess.run(
        [sys.executable, "-m", "gdown", "--id", fid, "-O", str(dest)],
        capture_output=True,
        text=True,
    )
    if proc.returncode == 0 and dest.exists() and looks_downloaded(dest):
        return "ok"
    silent = (proc.stdout + proc.stderr).strip().splitlines()
    dest.unlink(missing_ok=True)
    return "gdown 실패" + (f" ({silent[-1][:120]})" if silent else "")


def download_entry(entry: dict, out_dir: pathlib.Path, max_bytes: int) -> dict:
    rel = entry["path"]
    dest = out_dir / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest = unique_path(dest.parent, dest.name)

    if entry["kind"] == "google-native":
        doc_kind = entry.get("doc_kind") or ""
        if not doc_kind:
            mime = entry.get("mime", "")
            doc_kind = next((k for k in DOC_EXPORT if mime.endswith(k)), "")
        spec = DOC_EXPORT.get(doc_kind)
        if not spec:
            entry["status"] = "skip (google-native, 내보낼 수 없는 형식)"
            return entry
        ext, path_kind = spec
        if not dest.name.lower().endswith("." + ext):
            dest = dest.with_name(dest.name + "." + ext)
        # 구글 문서는 docs.google.com/<kind>/d/<id>/export?format=… 로만 내려받힌다.
        url = f"https://docs.google.com/{path_kind}/d/{entry['id']}/export?format={ext}"
    else:
        url = f"https://drive.usercontent.google.com/download?id={entry['id']}&export=download&confirm=t"

    status = stream_to(url, dest, max_bytes)
    if status != "ok" and entry["kind"] == "file":
        log(f"    직접 다운로드 실패 ({status}) → gdown 재시도")
        status = gdown_fallback(entry["id"], dest)

    entry["status"] = status
    if status == "ok":
        entry["file"] = str(dest.relative_to(out_dir))
        entry["bytes"] = dest.stat().st_size
        log(f"  ✓ {entry['file']} ({entry['bytes'] / 1024:.0f}KB)")
    else:
        log(f"  ✗ {rel} — {status}")
    return entry


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="List/download a shared Google Drive folder.")
    parser.add_argument("mode", choices=["list", "download", "probe"], nargs="?", default="list")
    parser.add_argument("--folder-id", required=False, default=os.environ.get("DRIVE_FOLDER_ID", ""))
    parser.add_argument("--out-dir", default=os.environ.get("DRIVE_OUT_DIR", "drive-incoming/drive-folder"))
    parser.add_argument("--files", default="*", help="쉼표로 구분한 파일 이름 글롭 (download 모드)")
    parser.add_argument("--max-mb", type=float, default=float(os.environ.get("DRIVE_MAX_MB", "25")))
    parser.add_argument("--max-depth", type=int, default=1, help="하위 폴더를 훑는 깊이")
    parser.add_argument("--fresh", action="store_true", help="out-dir 를 비우고 다시 받기")
    parser.add_argument("--self-test", action="store_true", help="파서 자체 점검 (네트워크 불필요)")
    parser.add_argument("--probe", action="store_true", help="공유 설정 진단 (파일을 받지 않음)")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    if not args.folder_id:
        parser.error("--folder-id 가 필요합니다")

    folder_id = args.folder_id.strip()
    match = FOLDER_RE.match(folder_id) or re.search(r"folders/([-\w]{25,})", folder_id) or re.search(
        r"[?&]id=([-\w]{25,})", folder_id
    )
    if match:
        folder_id = match.group(1)

    if args.probe or args.mode == "probe":
        return probe_drive(folder_id)

    out_dir = pathlib.Path(args.out_dir)
    if args.fresh and out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    log(f"폴더 목록 읽는 중: {folder_id}")
    try:
        folder_name, entries = list_folder(folder_id, max_depth=max(0, args.max_depth))
    except RuntimeError as exc:
        log(f"오류: {exc}")
        return 1
    files = flatten(entries)
    log(f"'{folder_name}' — 파일 {len(files)}건 (폴더 {len(entries) - len([e for e in entries if e['kind'] != 'folder'])}건)")

    if args.mode == "download":
        patterns = [p.strip() for p in args.files.split(",") if p.strip()] or ["*"]
        chosen = [
            entry
            for entry in files
            if any(fnmatch.fnmatch(entry["name"], pat) or fnmatch.fnmatch(entry["path"], pat) for pat in patterns)
            or "*" in patterns
        ]
        if not chosen:
            log(f"선택한 이름과 맞는 파일이 없습니다: {args.files}")
            for entry in files:
                log(f"  - {entry['path']}")
            return 1
        log(f"내려받을 파일 {len(chosen)}건 (파일당 최대 {args.max_mb:.0f}MB)")
        max_bytes = int(args.max_mb * 1024 * 1024)
        for entry in chosen:
            download_entry(entry, out_dir, max_bytes)

    manifest = {
        "folder_id": folder_id,
        "folder_name": folder_name,
        "mode": args.mode,
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "counts": {
            "files": len([e for e in files if e["kind"] == "file"]),
            "google_native": len([e for e in files if e["kind"] == "google-native"]),
            "folders": len([e for e in entries if e["kind"] == "folder"]),
        },
        "entries": entries,
    }
    manifest_path = out_dir / "FOLDER_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"매니페스트: {manifest_path}")

    for entry in files:
        size = f"{entry['bytes'] / 1024:.0f}KB" if entry.get("bytes") else "-"
        log(f"  {entry['kind']:<14} {entry['path']}  {size}  {entry.get('status', '')}")
    return 0


def probe_drive(folder_id: str) -> int:
    """공유 설정이 실제로 열려 있는지 단계별로 확인한다(진단용)."""
    targets = [
        f"{DRIVE}/file/d/{folder_id}/view",
        f"{DRIVE}/drive/folders/{folder_id}",
        f"{DRIVE}/embeddedfolderview?id={folder_id}&list",
        "https://drive.usercontent.google.com/download?id=" + folder_id + "&export=download",
    ]
    for url in targets:
        status, body, err = probe(url)
        text = body.decode("utf-8", "replace")
        markers = []
        for needle, label in (
            ("You need access", "액세스 요청 필요"),
            ("requestAccess", "액세스 요청 필요"),
            ("Google Drive", "드라이브 페이지"),
            ("flip-entry", "목록 렌더링됨"),
            ("Sign in", "로그인 필요"),
        ):
            if needle in text:
                markers.append(label)
        print(f"{status:>4}  {url}  ({len(body)}B) {err} {'/'.join(dict.fromkeys(markers))}", flush=True)
        head = text.strip()[:200].replace("\n", " ")
        if head:
            print(f"        {head}")
    try:
        import importlib.util

        if importlib.util.find_spec("gdown") is None:
            print("gdown: 설치되어 있지 않음")
            return 0
        from gdown.download_folder import _download_and_parse_google_drive_link  # type: ignore
        import requests  # type: ignore

        node = _download_and_parse_google_drive_link(
            sess=requests.Session(),
            folder_id=folder_id,
            quiet=True,
            verify=True,
            timeout=60,
        )
        print(f"gdown: '{node.name}' 자식 {len(node.children)}건")
        for child in node.children[:50]:
            print(f"  - {child.type} {child.name} ({child.id})")
    except Exception as exc:  # noqa: BLE001 - diagnostics only
        print(f"gdown 실패: {type(exc).__name__}: {exc}")
    return 0


SAMPLE_HTML = """
<html><head><title>IR 자료 - Google Drive</title></head><body>
<div class="flip-entry"><a href="https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=drive_web" target="_blank">IR_큐브베리_2026.pptx</a></div>
<div class="flip-entry"><a href="https://drive.google.com/file/d/1ZzYyXxWwVvUuTtSsRrQqPpOoNnMmLlKk/view" target="_blank">cover &amp; logo.png</a></div>
<div class="flip-entry"><a href="https://docs.google.com/presentation/d/1GoOgLeNaTiVeFiLeId0123456789/edit" target="_blank">발표자료</a></div>
<div class="flip-entry"><a href="https://drive.google.com/drive/folders/1SuBfOlDeR0123456789abcdefg" target="_blank">과거 자료</a></div>
</body></html>
"""


def _ivd_fixture() -> str:
    """Build a synthetic /drive/folders page with a window['_DRIVE_ivd'] blob."""
    def row(fid, name, mime, size=None):
        item = [fid, ["parent001"], name, mime] + [None] * 9
        item.append(size)
        return item

    payload = [
        [
            row("1AbCdEfGhIjKlMnOpQrStUvWxYz012345", "IR_큐브베리_2026.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", 123456),
            row("1ZzYyXxWwVvUuTtSsRrQqPpOoNnMmLlKk", "cover & logo.png", "image/png", 2048),
            row("1SuBfOlDeR0123456789abcdefg", "과거 자료", "application/vnd.google-apps.folder"),
        ],
        None,
        "IR 자료 모음",
    ]
    raw = json.dumps(payload, ensure_ascii=False)
    js = "".join(ch if (ch.isprintable() and ord(ch) < 128 and ch not in "\\'") else "\\u%04x" % ord(ch) for ch in raw)
    return f"<html><script>window['_DRIVE_ivd'] = '{js}';</script></html>"


def self_test() -> int:
    name, entries = parse_folder_html(SAMPLE_HTML)
    assert name == "IR 자료", name
    kinds = [e["kind"] for e in entries]
    assert kinds == ["file", "file", "google-native", "folder"], kinds
    assert entries[0]["name"] == "IR_큐브베리_2026.pptx"
    assert entries[1]["name"] == "cover & logo.png"
    assert entries[2]["mime"] == "application/vnd.google-apps.presentation"
    assert sanitize("a/b\\c:d?.png") == "c_d_.png", sanitize("a/b\\c:d?.png")
    assert sanitize("   ") == "unnamed"
    parsed = parse_folder_page(_ivd_fixture())
    assert parsed is not None, "폴더 페이지 파서가 _DRIVE_ivd 를 읽지 못했습니다"
    folder, page_entries = parsed
    assert folder == "IR 자료 모음", folder
    assert [e["kind"] for e in page_entries] == ["file", "file", "folder"], page_entries
    assert page_entries[0]["name"] == "IR_큐브베리_2026.pptx", page_entries[0]["name"]
    assert page_entries[0]["bytes"] == 123456
    assert page_entries[1]["name"] == "cover & logo.png"
    assert parse_folder_page("<html>no blob</html>") is None
    log("drive_folder.py self-test: 폴더 목록 파서 2종 · 이름 정리 확인 완료")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
