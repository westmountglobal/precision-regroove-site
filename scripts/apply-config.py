#!/usr/bin/env python3
"""Sync businessName and canonicalOrigin from js/config.js into HTML meta tags."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
cfg = (ROOT / "js/config.js").read_text(encoding="utf-8")

def grab(key):
    m = re.search(rf"{key}:\s*\"([^\"]+)\"", cfg)
    if not m:
        raise SystemExit(f"Missing {key} in js/config.js")
    return m.group(1)

name = grab("businessName")
origin = grab("canonicalOrigin").rstrip("/")
tagline_fr = grab("taglineFr")

subs = {
    "TITLE": f"{name} · {tagline_fr}",
    "OG_TITLE": name,
    "CANONICAL": origin + "/",
    "OG_IMAGE": origin + "/img/og.jpg",
    "OG_IMAGE_ALT": f"{name} — {tagline_fr}",
}

# Tokens in HTML: data-site="TITLE" etc., or comments <!--SITE:TITLE-->...<!--/SITE:TITLE-->
token_re = re.compile(r"<!--SITE:([A-Z_]+)-->(.*?)<!--/SITE:\1-->", re.S)

def patch(path: Path):
    text = path.read_text(encoding="utf-8")
    def repl(m):
        key = m.group(1)
        if key not in subs:
            return m.group(0)
        return f"<!--SITE:{key}-->{subs[key]}<!--/SITE:{key}-->"
    new, n = token_re.subn(repl, text)
    path.write_text(new, encoding="utf-8")
    print(f"{path.name}: {n} tokens updated")

for f in ("index.html", "404.html"):
    patch(ROOT / f)
