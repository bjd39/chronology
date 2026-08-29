#!/usr/bin/env python3
"""Turn the raw Wikipedia scrape into the playable corpus.

The scraper (scripts/scrape.py) produces candidate events; this script decides
which of them are fair questions, how hard they are, and which theme packs they
belong to.

Three inputs, in increasing order of hand-work:

  scripts/curation.tsv  every scraped event, reviewed by hand: dropped, or kept
                        with a difficulty of 1 (iconic) to 5 (specialist).
  scripts/rewrites.tsv  replacement text for the handful of events the scraper
                        mangled but that are worth keeping.
  THEMES (below)        keyword lexicons, applied automatically.

Difficulty is judged in *game* terms — against the relative-error scale the game
scores on, not raw years. The survivable window at the standard 10% tolerance is
about 450 years for a 2500 BC event but only about 4 years for a 1985 one, so an
obscure Assyrian king can be easier to place than a famous modern election.

    python3 scripts/curate.py raw.json src/data/events.json
"""
import json, re, sys, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))

# --- Theme packs -------------------------------------------------------------
# Each event is tagged with every theme whose pattern it matches, so packs
# overlap (the fall of Constantinople is both Rome and the Islamic world).
# Keep these in sync with THEMES in src/game/themes.ts.

THEMES = {
    "rome": r"\bRom(e|an|ans)\b|\bCaesar|Augustus|Octavian|Mark Antony|Carthag|Punic\b"
            r"|\bconsuls?\b|legions?\b|Byzantine|Byzantium|Constantinople|Etruscan|Pompey"
            r"|Cicero|Hannibal|\bGaul\b|Roman Republic|Roman Empire|patrician|plebeian"
            r"|Visigoth|Ostrogoth|Tarquin|Nero\b|Hadrian|Trajan|Diocletian|Justinian",
    "greece": r"\bGreek|\bGreece\b|Athen|\bSparta|Peloponnes|Macedon|Alexander the Great"
              r"|Hellen|Olympi[ac]|Delian League|Corinth|\bIonia|Aristotle|\bPlato\b"
              r"|Socrates|Pericles|Herodotus|Sophocles|Euripides|Aeschylus|Pythagoras"
              r"|Thucydides|Delphi|Mycena|Minoan|\bCrete\b|Syracuse|Thebes",
    "egypt": r"Pharaoh|\bEgypt|Assyria|Babylon|Sumer|Hittite|Nineveh|Persia|Achaemenid"
             r"|Mesopotam|Akkad|Elamite|Nubia|\bKush\b|\bJudah\b|Israelites|Jerusalem"
             r"|Phoenicia|\bTyre\b|\bLydia\b|Urartu|Sasanian|Sassanid|Parthia|Median Empire"
             r"|Ptolem|Cleopatra|\bNile\b|[Dd]ynasty of Egypt|Xerxes|Darius|Cyrus",
    "china": r"\bChina|Chinese|\bZhou\b|Han dynasty|Tang dynasty|Song dynasty|\bMing\b"
             r"|\bQing\b|\bQin\b|Japan|Korea|shogun|samurai|Mongol|Yuan dynasty|Confuci"
             r"|Beijing|Peking|Kublai|Genghis|Xiongnu|Manchu|Shang dynasty|Joseon|Goryeo"
             r"|Silla|Baekje|Majapahit|Srivijaya|Khmer|Vietnam|Sui dynasty|Taiwan",
    "india": r"\bIndia\b|\bIndian\b|Mughal|Delhi|Maratha|Pakistan|Sri Lanka|Ceylon|Bengal"
             r"|Punjab|Buddha|Buddhis|Hindu|Sikh|Maurya|Gupta|Chola|Pandya|Vijayanagara"
             r"|Ashoka|Gandhi|Rajput|Deccan|Magadha|Nepal",
    "islam": r"Caliph|\bIslam|Muslim|Ottoman|Muhammad\b|Abbasid|Umayyad|Baghdad|Sultan"
             r"|\bMoor|Saladin|Mamluk|Fatimid|Safavid|Seljuk|Mecca\b|Medina\b|[Mm]osque"
             r"|Emirate|Saracen|\bArabs?\b|Janissar|Shia\b|Sunni",
    "britain": r"\bEngland|English\b|Britain|British|Scotland|Scottish|Ireland|Irish\b"
               r"|\bWales\b|Welsh|\bLondon\b|House of Commons|Anglo-|King of England"
               r"|Queen of England|United Kingdom|Tudor|Jacobite|Westminster|Cromwell"
               r"|Magna Carta|Northumbria|Mercia|Wessex",
    "americas": r"United States|\bU\.S\.|American\b|Americans\b|Washington|Continental Congress"
                r"|Confederate|President of the United|Canada|Canadian|Mexic|Brazil"
                r"|Argentin|\bPeru\b|Chile|Colombia|Aztec|\bInca\b|Maya\b|Mayan|New York"
                r"|California|\bCuba|Venezuela|Bolivia|Nicaragua|Panama",
    "africa": r"\bAfrica|Ethiopia|Abyssinia|Congo|Nigeria|Ghana|\bMali\b|Songhai|Zulu"
              r"|Morocco|Algeri|Tunisia|Libya|Sudan|Kenya|Rhodesia|Zimbabwe|Uganda|Somal"
              r"|Angola|Mozambique|Senegal|Timbuktu|Aksum|\bBenin\b|\bCairo\b|Carthage",
    "exploration": r"\bexplor|voyage|circumnavigat|Columbus|Magellan|colon(y|ies|ist|isation"
                   r"|ization|ise|ize)|expedition|Vasco da Gama|Antarctic|Arctic|North Pole"
                   r"|South Pole|East India Company|first European|conquistador|settlement",
    "worldwars": r"\bWWI\b|\bWWII\b|World War|Western Front|Gallipoli|trench|\bNazi\b|Nazis\b|Nazism|Hitler"
                 r"|Wehrmacht|Luftwaffe|Pearl Harbor|Holocaust|Auschwitz|\bAllied|\bAxis\b"
                 r"|Somme|Verdun|Normandy|U-boat|Kaiser Wilhelm|armistice|Mussolini"
                 r"|Fascist|Third Reich|Zeppelin",
    "coldwar": r"Soviet|USSR|NATO|Warsaw Pact|Communist|communism|Berlin Wall|Cold War|KGB"
               r"|Khrushchev|Stalin|Gorbachev|Kremlin|Red Army|Bolshevik|Iron Curtain"
               r"|Vietnam War|East Germany|West Germany|Cuban Missile|Politburo|nuclear test"
               r"|Korean War|missile|espionage|\bspy\b|defect(s|ed|ion)|Berlin\b|détente",
    "science": r"discover(s|ed|y|ies)|invent(s|ed|ion)|patent|physicist|chemist|scientist"
               r"|vaccin|theory of|telescope|experiment|astronom|mathematic|\belement\b"
               r"|\bDNA\b|genome|laborator|Nobel|computer|Internet|Einstein|Newton|Darwin"
               r"|Galileo|electric|\bengine\b|NASA|spacecraft|astronaut|cosmonaut|\bApollo \d"
               r"|orbit|Sputnik|space station|space probe|satellite|rocket",
    "arts": r"premiere|\bopera\b|\bnovel\b|symphon|painting|paints|painted|\bfilm\b|album\b"
            r"|is published|publishes (his|her|its|the)|\bpoet\b|composer|sculpt|cathedral"
            r"|Shakespeare|Michelangelo|Mozart|\btheatre\b|museum|architect|Academy Award"
            r"|literature|Renaissance|Gothic|statue|orchestra|\bballet\b|playwright"
            r"|novelist|painter|first performance|debuts|premieres|concert",
    "disasters": r"earthquake|hurricane|typhoon|tsunami|\beruption\b|volcan|famine|plague"
                 r"|epidemic|pandemic|\bfloods?\b|wildfire|cyclone|avalanche|shipwreck"
                 r"|capsiz|disaster|Black Death|smallpox|cholera",
}

# "Holy Roman" and "Roman Catholic" are not the Roman world; blank them out
# before matching so they do not drag half of medieval Europe into the Rome pack.
ROME_DECOYS = re.compile(r"Holy Roman|Roman Catholic")

# Some lexicons are only meaningful inside a period — "Kremlin" is a Cold War
# marker in 1962 and a piece of scenery in 1571.
ERAS = {
    "worldwars": (1900, 1950),
    "coldwar": (1945, 1991),
    "exploration": (1400, 2100),
}

COMPILED = {k: re.compile(v) for k, v in THEMES.items()}


def themes_for(text, year):
    rome_text = ROME_DECOYS.sub("", text)
    out = []
    for k, r in COMPILED.items():
        lo, hi = ERAS.get(k, (-10000, 10000))
        if lo <= year <= hi and r.search(rome_text if k == "rome" else text):
            out.append(k)
    return out


# --- Text tidying ------------------------------------------------------------
# Leftovers the scraper cannot reasonably strip on its own.

TIDY = [
    (re.compile(r"\s*\((?:approximate|traditional|estimated|possible|conjectural) date\)", re.I), ""),
    (re.compile(r"\s*\((?:middle|low|high) chronology\)", re.I), ""),
    (re.compile(r"^\(Approximate date\)\s*", re.I), ""),
    (re.compile(r"^\((?:January|February|March|April|May|June|July|August|September"
                r"|October|November|December)\)\s*"), ""),
    (re.compile(r"\s*[—–-]\s*see [A-Z][^.]*"), ""),
    (re.compile(r"\s+([.,;:])"), r"\1"),
    (re.compile(r"\.\s*\."), "."),
    (re.compile(r"\s{2,}"), " "),
]


def tidy(text):
    for pattern, repl in TIDY:
        text = pattern.sub(repl, text)
    text = text.strip()
    if text and text[-1] not in ".!?":
        text = text.rstrip(",;:") + "."
    return text


def slug(text):
    """Stable key for an event: first 55 alphanumerics of the raw text."""
    return re.sub(r"[^a-z0-9]", "", text.lower())[:55]


def load_tsv(name):
    rows = {}
    path = os.path.join(HERE, name)
    with open(path) as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            a, b = line.split("\t", 1)
            rows[a] = b
    return rows


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "src", "data", "events.json")
    dst = sys.argv[2] if len(sys.argv) > 2 else src

    raw = json.load(open(src))
    verdicts = load_tsv("curation.tsv")  # "<year>|<slug>" -> verdict
    rewrites = load_tsv("rewrites.tsv")

    out, dropped, unreviewed = [], 0, []
    for e in raw:
        key = f"{e['y']}|{slug(e['e'])}"
        verdict = verdicts.get(key)
        if verdict is None:
            unreviewed.append(key)
            continue
        if verdict == "x":
            dropped += 1
            continue
        text = tidy(rewrites.get(key, e["e"]))
        out.append({"y": e["y"], "e": text, "d": int(verdict), "t": themes_for(text, e["y"])})

    out.sort(key=lambda x: (x["y"], x["e"]))
    with open(dst, "w") as f:
        f.write("[\n")
        f.write(",\n".join("  " + json.dumps(e, ensure_ascii=False) for e in out))
        f.write("\n]\n")

    hist = collections.Counter(e["d"] for e in out)
    packs = collections.Counter(t for e in out for t in e["t"])
    print(f"kept {len(out)}, dropped {dropped}, unreviewed {len(unreviewed)}", file=sys.stderr)
    print("difficulty " + " ".join(f"{d}:{hist[d]}" for d in range(1, 6)), file=sys.stderr)
    print("packs " + " ".join(f"{k}:{v}" for k, v in packs.most_common()), file=sys.stderr)
    if unreviewed:
        print(f"WARNING: {len(unreviewed)} events are not in curation.tsv and were skipped; "
              f"first: {unreviewed[0]}", file=sys.stderr)


if __name__ == "__main__":
    main()
