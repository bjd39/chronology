#!/usr/bin/env python3
"""Build the Chronology game corpus from Wikipedia century pages (antiquity->19thC)
and year pages (1900->2025 modern era).

Cleaning goals:
  * strip all wiki/HTML markup, including stray brackets/pipes from partial links;
  * DROP any event whose description still names a year (BC/AD, a 4-digit year, a
    decade like "1990s"), since that gives the answer away;
  * emit pretty-printed JSON (one event per line) so the corpus is hand-checkable.
"""
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

# Ship-name templates ({{SS|Valencia}}, {{HMS|Hood|51}}) carry the *subject* of the
# sentence. The generic template strip below would delete them, leaving orphans like
# "The strikes a reef off Vancouver Island", so expand them first.
SHIP_TEMPLATE = re.compile(
    r"\{\{\s*(SS|MV|RMS|HMS|HMAS|HMCS|USS|MS|SMS|RFA|USNS)\s*\|\s*([^|}]+)[^}]*\}\}",
    re.IGNORECASE)


def strip_markup(s):
    s = SHIP_TEMPLATE.sub(lambda m: f"{m.group(1).upper()} {m.group(2).strip()}", s)
    # references, comments
    s = re.sub(r"<ref[^>]*?/>", "", s)
    s = re.sub(r"<ref[^>]*?>.*?</ref>", "", s, flags=re.DOTALL)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.DOTALL)
    # templates (repeat for simple nesting)
    for _ in range(4):
        s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    # media/category links first (their pipes hold layout junk, not prose)
    s = re.sub(r"\[\[(?:File|Image|Category):[^\[\]]*\]\]", "", s, flags=re.IGNORECASE)
    # piped links: keep the text after the LAST pipe (the display text)
    s = re.sub(r"\[\[[^\[\]]*\|([^\[\]|]*)\]\]", r"\1", s)
    # plain links
    s = re.sub(r"\[\[([^\[\]]*)\]\]", r"\1", s)
    # external links
    s = re.sub(r"\[https?://\S+\s+([^\]]*)\]", r"\1", s)
    s = re.sub(r"\[https?://\S+\]", "", s)
    # bold / italic
    s = s.replace("'''", "").replace("''", "")
    # any remaining tags / entities
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&nbsp;", " ").replace("&ndash;", "–").replace("&mdash;", "—")
    s = s.replace("&amp;", "&").replace("&quot;", '"')
    # image markup that survived as bare text ("File:Foo.jpg thumb 240x240px caption")
    s = re.sub(r"\s*\bFile:\S+.*$", "", s)
    # strip any orphaned markup characters left by partial links/templates
    s = s.replace("[", "").replace("]", "").replace("{", "").replace("}", "").replace("|", " ")
    # tidy whitespace and spacing before punctuation
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([.,;:!?])", r"\1", s)
    return s

# A description "names a year" (and so would give the answer away) if it contains an
# explicit era, a 4-digit year, a decade, or "the year N".
YEAR_REF = re.compile(
    r"\b\d{1,4}\s?(?:BC|BCE|AD|CE)\b"          # 44 BC, 300 AD, 1200 CE
    r"|\b(?:1\d{3}|20[0-2]\d)\b"                # standalone 1000-2029
    r"|\b\d{3,4}s\b"                            # 1990s, 300s
    r"|\bthe year\s+\d{1,4}\b"                  # "the year 1066"
)

def names_a_year(text):
    return bool(YEAR_REF.search(text))

# Century line: optional "c.", a year (linked or bare, AD/BC), junk up to first colon.
CENTURY_RE = re.compile(
    r"^\*+\s*(?:c\.\s*)?(?:\[\[\s*)?(?:AD\s*)?(\d{1,4})(\s*BC)?\b[^:\]]*(?:\]\])?[^:]*?:\s*(.+)$"
)

def parse_century(section, century, default_bc):
    """Bullets from a century page. `century` is 1-based (the 5th century is 5).

    The year is only trusted if it actually falls inside that century: some pages
    carry tables whose rows start with a day-of-month, which otherwise parse as
    year 2 or year 17 and file a Wars of the Roses battle under the Roman empire.
    """
    lo, hi = (century - 1) * 100 + 1, century * 100
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
        if not lo <= num <= hi:
            continue
        items.append((-num if is_bc else num, m.group(3)))
    return items

def parse_year_page(section, year, cap):
    """Year page Events bullets: '* [[Month Day]] - description'."""
    raw = []
    for line in section.split("\n"):
        ln = line.strip()
        if not (ln.startswith("* ") or ln.startswith("*[")):
            continue  # skip nested ** sub-bullets and non-bullets
        ln = ln.replace("&ndash;", "–").replace("&mdash;", "—")
        # Split date from event on the FIRST *spaced* dash. Requiring whitespace on
        # both sides avoids splitting inside things like "(1912–49)".
        m = re.match(r"^\*+\s*(.+?)\s+[–—]\s+(.+)$", ln)
        if not m:
            continue
        date_part, desc = m.group(1), m.group(2)
        if not re.search(r"January|February|March|April|May|June|July|August|"
                         r"September|October|November|December", date_part):
            continue
        raw.append(desc)
    if len(raw) > cap:
        step = len(raw) / cap
        raw = [raw[int(i * step)] for i in range(cap)]
    return [(year, d) for d in raw]

def finalize(desc):
    """Clean a raw description; return None if it should be dropped."""
    s = strip_markup(desc)
    # drop parentheticals containing a digit — dates, reign spans, "(aged 72)", etc.
    # (these are the most common way a clue leaks its own answer)
    s = re.sub(r"\s*\([^()]*\d[^()]*\)", "", s)
    s = s.strip().strip("*").strip()
    # guard against leftover fragments like "49) ..." from a bad upstream split
    if re.match(r"^[\d)\]]", s):
        return None
    # a stripped template can eat the subject, leaving "The sinks after colliding..."
    if re.match(r"^The (?:strikes|sinks|is|are|was|were|opens|begins|crashes|carries|,)\b", s):
        return None
    # or the object, leaving "Introduction of by Fibonacci." / "The, the ship ..."
    if re.search(r"\b(?:of|and|with|to)\s+by\b|\bThe,|,\s*,", s):
        return None
    if names_a_year(s):
        return None
    if len(s) < 20 or len(s) > 190:
        return None
    if not re.search(r"[A-Za-z]", s):
        return None
    # capitalize first alphabetic character
    for i, ch in enumerate(s):
        if ch.isalpha():
            s = s[:i] + ch.upper() + s[i + 1:]
            break
    if s[-1] not in ".!?":
        s = s.rstrip(",;:") + "."
    return s

def main():
    all_items = []

    pages = []
    for n in range(1, 20):
        pages.append((ordinal(n) + "_century", n, False))
    for n in range(1, 26):
        pages.append((ordinal(n) + "_century_BC", n, True))
    for page, century, is_bc in pages:
        try:
            wt = fetch_wikitext(page)
        except Exception as ex:
            print(f"  FAIL {page}: {ex}", file=sys.stderr); wt = None
        if not wt:
            continue
        items = parse_century(events_section(wt), century, is_bc)
        print(f"  {page}: {len(items)}", file=sys.stderr)
        all_items.extend(items)
        time.sleep(0.25)

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

    seen, cleaned, dropped = set(), [], 0
    for year, raw in all_items:
        s = finalize(raw)
        if s is None:
            dropped += 1
            continue
        key = re.sub(r"[^a-z0-9]", "", s.lower())[:55]
        if key in seen:
            continue
        seen.add(key)
        cleaned.append({"y": year, "e": s})

    cleaned.sort(key=lambda x: (x["y"], x["e"]))
    print(f"TOTAL: {len(cleaned)} (dropped for naming a year / too short: {dropped})",
          file=sys.stderr)

    out = sys.argv[1] if len(sys.argv) > 1 else "events.json"
    with open(out, "w") as f:
        f.write("[\n")
        f.write(",\n".join("  " + json.dumps(e, ensure_ascii=False) for e in cleaned))
        f.write("\n]\n")
    print(f"wrote {out}", file=sys.stderr)

if __name__ == "__main__":
    main()
