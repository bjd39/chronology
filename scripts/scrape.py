#!/usr/bin/env python3
"""Build the Chronology game corpus from Wikipedia century pages (antiquity->19thC)
and year pages (1900->2025 modern era)."""
import json, re, sys, time, urllib.request, urllib.parse

UA = "ChronologyGamePrototype/0.1 (personal hobby project; contact ben@mntc.ai)"
API = "https://en.wikipedia.org/w/api.php"

def ordinal(n):
    if 10 <= n % 100 <= 20:
        suf = "th"
    else:
        suf = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suf}"

def fetch_wikitext(page):
    q = urllib.parse.urlencode({
        "action": "parse", "page": page, "prop": "wikitext",
        "format": "json", "formatversion": "2", "redirects": "1",
    })
    req = urllib.request.Request(API + "?" + q, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    if "error" in d:
        return None
    return d["parse"]["wikitext"]

def events_section(wt):
    """Text of the ==Events== section (up to next level-2 heading)."""
    out, inside = [], False
    for ln in wt.split("\n"):
        m = re.match(r"^==\s*([^=].*?)\s*==\s*$", ln)
        if m:
            inside = m.group(1).strip().lower().startswith("event")
            continue
        if inside:
            out.append(ln)
    return "\n".join(out)

def strip_markup(s):
    s = re.sub(r"<ref[^>]*?/>", "", s)
    s = re.sub(r"<ref[^>]*?>.*?</ref>", "", s, flags=re.DOTALL)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.DOTALL)
    for _ in range(3):
        s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"\[\[[^\]|]*\|([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[https?://\S+\s+([^\]]*)\]", r"\1", s)
    s = re.sub(r"\[https?://\S+\]", "", s)
    s = s.replace("'''", "").replace("''", "")
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&nbsp;", " ").replace("&ndash;", "–").replace("&mdash;", "—")
    s = re.sub(r"\s+", " ", s).strip()
    return s

# Century line: optional "c.", a year (linked or bare, AD/BC), junk up to first colon, then desc.
CENTURY_RE = re.compile(
    r"^\*+\s*(?:c\.\s*)?(?:\[\[\s*)?(?:AD\s*)?(\d{1,4})(\s*BC)?\b[^:\]]*(?:\]\])?[^:]*?:\s*(.+)$"
)

def parse_century(section, default_bc):
    items = []
    for raw in section.split("\n"):
        ln = raw.strip()
        if not ln.startswith("*"):
            continue
        m = CENTURY_RE.match(ln)
        if not m:
            continue
        num = int(m.group(1))
        is_bc = bool(m.group(2)) or default_bc
        desc = strip_markup(m.group(3))
        if desc:
            items.append((-num if is_bc else num, desc))
    return items

def parse_year_page(section, year, cap):
    """Year page Events bullets: '* [[Month Day]] – description'."""
    raw_items = []
    for raw in section.split("\n"):
        ln = raw.strip()
        if not (ln.startswith("* ") or ln.startswith("*[")):
            continue  # skip nested ** sub-bullets and non-bullets
        # must contain an en/em dash separating date from event
        m = re.match(r"^\*+\s*(.+?)\s*[–—]\s*(.+)$", ln)
        if not m:
            continue
        date_part, desc = m.group(1), m.group(2)
        # date_part should reference a month (guards against prose lines)
        if not re.search(r"January|February|March|April|May|June|July|August|"
                         r"September|October|November|December", date_part):
            continue
        desc = strip_markup(desc)
        if desc:
            raw_items.append(desc)
    # even spread across the year, capped
    if len(raw_items) > cap:
        step = len(raw_items) / cap
        raw_items = [raw_items[int(i * step)] for i in range(cap)]
    return [(year, d) for d in raw_items]

def main():
    all_items = []

    # Century pages: BC 1..25 and AD 1..19 (20th/21st handled via year pages)
    pages = []
    for n in range(1, 20):
        pages.append((ordinal(n) + "_century", False))
    for n in range(1, 26):
        pages.append((ordinal(n) + "_century_BC", True))
    for page, is_bc in pages:
        try:
            wt = fetch_wikitext(page)
        except Exception as ex:
            print(f"  FAIL {page}: {ex}", file=sys.stderr); wt = None
        if not wt:
            continue
        items = parse_century(events_section(wt), is_bc)
        print(f"  {page}: {len(items)}", file=sys.stderr)
        all_items.extend(items)
        time.sleep(0.25)

    # Year pages: modern era
    for year in range(1900, 2026):
        page = str(year)
        try:
            wt = fetch_wikitext(page)
        except Exception as ex:
            print(f"  FAIL {page}: {ex}", file=sys.stderr); wt = None
        if not wt:
            continue
        items = parse_year_page(events_section(wt), year, cap=15)
        print(f"  {page}: {len(items)}", file=sys.stderr)
        all_items.extend(items)
        time.sleep(0.2)

    # clean / filter / dedupe
    seen, cleaned = set(), []
    for year, desc in all_items:
        desc = desc.strip()
        # trim dangling connective tails left by ref/template removal
        desc = re.sub(r"[\s,;:]+$", "", desc)
        if len(desc) < 20 or len(desc) > 190:
            continue
        if not re.search(r"[A-Za-z]", desc):
            continue
        if desc[-1] not in ".!?":
            desc += "."
        key = re.sub(r"[^a-z0-9]", "", desc.lower())[:55]
        if key in seen:
            continue
        seen.add(key)
        cleaned.append({"y": year, "e": desc})

    cleaned.sort(key=lambda x: (x["y"], x["e"]))
    print(f"TOTAL: {len(cleaned)}", file=sys.stderr)
    out = sys.argv[1] if len(sys.argv) > 1 else "events.json"
    with open(out, "w") as f:
        json.dump(cleaned, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {out}", file=sys.stderr)

if __name__ == "__main__":
    main()
