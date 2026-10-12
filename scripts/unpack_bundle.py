#!/usr/bin/env python3
"""Unpack a self-contained single-file HTML bundle (bundler islands) into plain files.

The shared design exports are one .html file whose real content lives inside
   <script type="__bundler/manifest">   -> {uuid: {mime, compressed, data(base64[+gzip])}}
   <script type="__bundler/template">   -> JSON string of the document html (uuid placeholders)
   <script type="__bundler/page_order"> -> [uuid, ...] nested pages (iframe targets)
   <script type="__bundler/ext_resources"> -> [{id, uuid}] external resource aliases
This script writes index.html, pages/<uuid>.html and assets/<uuid>.<ext> with every
placeholder replaced by the relative file name, plus report.json describing what is there.

Usage: python3 scripts/unpack_bundle.py <bundle.html> <out-dir>
"""

from __future__ import annotations

import base64
import gzip
import json
import pathlib
import re
import sys

EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "text/css": "css",
    "text/javascript": "js",
    "application/javascript": "js",
    "font/woff2": "woff2",
    "font/woff": "woff",
    "application/font-woff2": "woff2",
    "application/octet-stream": "bin",
}


def ext_for(mime: str) -> str:
    return EXT.get(mime, re.sub(r"[^a-z0-9]", "", (mime.split("/")[-1] or "bin").split("+")[0]) or "bin")


def island(text: str, kind: str):
    m = re.search(
        r'<script\s+type="__bundler/%s"[^>]*>(.*?)</script>' % re.escape(kind),
        text,
        re.S | re.I,
    )
    if not m:
        return None
    body = m.group(1).strip()
    return body or None


def payload_bytes(entry: dict) -> bytes:
    data = base64.b64decode(entry.get("data", ""))
    if entry.get("compressed"):
        try:
            data = gzip.decompress(data)
        except OSError:
            pass
    return data


def unwrap(text: str, depth: int = 0) -> str:
    """Return the plain document html for a bundle document (peel template islands)."""
    while depth < 6:
        raw = island(text, "template")
        if not raw:
            return text
        try:
            inner = json.loads(raw)
        except json.JSONDecodeError:
            return text
        if not isinstance(inner, str) or inner == text:
            return text
        text = inner
        depth += 1
    return text


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    raw = src.read_text(encoding="utf-8", errors="replace")

    root_manifest = {}
    for uuid, entry in json.loads(island(raw, "manifest") or "{}").items():
        root_manifest[uuid] = entry

    manifest_json = island(raw, "manifest")
    root_pages = json.loads(island(raw, "page_order") or "[]")

    # nested page documents may carry their own (small) manifest islands
    docs: dict[str, str] = {"index.html": unwrap(raw)}
    for pu in root_pages:
        entry = root_manifest.get(pu)
        if not entry:
            continue
        page_text = payload_bytes(entry).decode("utf-8", "replace")
        sub = unwrap(page_text)
        for uuid, entry2 in (json.loads(island(page_text, "manifest") or "{}").items()):
            root_manifest.setdefault(uuid, entry2)
        docs[f"pages/{pu[:8]}.html"] = sub
        for extra in json.loads(island(page_text, "page_order") or "[]"):
            e2 = root_manifest.get(extra)
            if not e2:
                continue
            docs[f"pages/{extra[:8]}.html"] = unwrap(
                payload_bytes(e2).decode("utf-8", "replace")
            )

    (out / "assets").mkdir(parents=True, exist_ok=True)
    (out / "pages").mkdir(parents=True, exist_ok=True)

    mapping: dict[str, str] = {}
    report_assets = []
    page_set = set(root_pages) | {k for k, v in docs.items() if k.startswith("pages/")}
    for uuid, entry in root_manifest.items():
        mime = entry.get("mime", "application/octet-stream")
        data = payload_bytes(entry)
        if uuid in page_set and mime.startswith("text/html"):
            continue  # shipped as a page document above
        rel = f"assets/{uuid[:8]}.{ext_for(mime)}"
        (out / rel).write_bytes(data)
        mapping[uuid] = rel
        report_assets.append(
            {
                "uuid": uuid,
                "mime": mime,
                "bytes": len(data),
                "path": rel,
                "name": entry.get("name"),
                "compressed": bool(entry.get("compressed")),
            }
        )

    page_map = {}
    for path in docs:
        if path.startswith("pages/"):
            page_map[path[len("pages/") : -len(".html")]] = path

    ext_aliases = {}
    for entry in json.loads(island(raw, "ext_resources") or "[]"):
        rid, ruuid = entry.get("id"), entry.get("uuid")
        if rid and ruuid and ruuid in mapping:
            ext_aliases[rid] = mapping[ruuid]

    def substitute(html: str, prefix: str) -> str:
        pairs = {}
        for uuid, rel in mapping.items():
            pairs[uuid] = prefix + rel
        for key, rel in page_map.items():
            pairs[key] = prefix + rel
            pairs[f"about:blank#{key}"] = prefix + rel
        for rid, rel in ext_aliases.items():
            pairs[rid] = prefix + rel
        for key in sorted(pairs, key=len, reverse=True):
            html = html.replace(key, pairs[key])
        return html

    for path, html in docs.items():
        prefix = "" if path == "index.html" else "../"
        (out / path).write_text(substitute(html, prefix), encoding="utf-8")

    report = {
        "source_bytes": len(raw.encode("utf-8")),
        "manifest_json_bytes": len(manifest_json or ""),
        "documents": [
            {"path": p, "bytes": (out / p).stat().st_size} for p in sorted(docs)
        ],
        "assets": sorted(report_assets, key=lambda a: -a["bytes"]),
        "page_order": root_pages,
        "ext_aliases": ext_aliases,
    }
    (out / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=1)[:4000])
    return 0


if __name__ == "__main__":
    sys.exit(main())
