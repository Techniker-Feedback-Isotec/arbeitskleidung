# -*- coding: utf-8 -*-
"""Extrahiert die Bestandsdaten aus 'Arbeitsausstattung neu.xlsm' in server/seed.json."""
import json, re, sys, unicodedata
from datetime import datetime, date
import openpyxl

SRC = r"C:\Users\YannFeyen\Downloads\Arbeitsausstattung neu.xlsm"
OUT = r"C:\Users\YannFeyen\Desktop\arbeitskleidung\server\seed.json"

wb = openpyxl.load_workbook(SRC, data_only=True)

LETTERS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
TROUSERS = [str(n) for n in range(42, 66, 2)]
SHOES = [str(n) for n in range(38, 51)]
CAPS = ["S/M", "L/XL"]

# Kanonische Artikel. sizeSystem bestimmt die Groessenauswahl.
ARTICLES = [
    {"id": "shirt", "name": "T-Shirt", "category": "Oberteile", "icon": "👕", "sizes": LETTERS, "price": 20.73, "basisQty": 5},
    {"id": "sweatshirt", "name": "Sweatshirt", "category": "Oberteile", "icon": "🧥", "sizes": LETTERS, "price": 26.73, "basisQty": 2},
    {"id": "fleecejacke", "name": "Fleecejacke", "category": "Oberteile", "icon": "🧥", "sizes": LETTERS, "price": 28.44, "basisQty": 2},
    {"id": "jacke", "name": "Softshelljacke", "category": "Oberteile", "icon": "🧥", "sizes": LETTERS, "price": 84.73, "basisQty": 1},
    {"id": "weste", "name": "Weste", "category": "Oberteile", "icon": "🦺", "sizes": LETTERS, "price": 60.73, "basisQty": 1},
    {"id": "softshellweste", "name": "Softshell Weste", "category": "Oberteile", "icon": "🦺", "sizes": LETTERS, "price": None, "basisQty": 0},
    {"id": "stretchhose-grau", "name": "Stretchhose grau", "category": "Hosen", "icon": "👖", "sizes": TROUSERS, "price": 59.90, "basisQty": 4},
    {"id": "stretchhose-weiss", "name": "Stretchhose weiß", "category": "Hosen", "icon": "👖", "sizes": TROUSERS, "price": None, "basisQty": 0},
    {"id": "bundhose-weiss", "name": "Bundhose weiß", "category": "Hosen", "icon": "👖", "sizes": ["R - " + str(n) for n in range(38, 70, 2)], "price": None, "basisQty": 0},
    {"id": "short", "name": "Short", "category": "Hosen", "icon": "🩳", "sizes": TROUSERS, "price": 47.73, "basisQty": 0},
    {"id": "schuhe-low", "name": "S3 Sicherheitshalbschuhe Kastra II Low", "category": "Schuhe", "icon": "👟", "sizes": SHOES, "price": 96.90, "basisQty": 0},
    {"id": "schuhe-mid", "name": "S3 Sicherheitsschuhe Kastra II Mid", "category": "Schuhe", "icon": "🥾", "sizes": SHOES, "price": 106.90, "basisQty": 0},
    {"id": "muetze", "name": "Strickmütze", "category": "Kopfbedeckung", "icon": "🧢", "sizes": CAPS, "price": 20.73, "basisQty": 1},
    {"id": "cap", "name": "Cap", "category": "Kopfbedeckung", "icon": "🧢", "sizes": CAPS, "price": 21.73, "basisQty": 1},
]

ALIASES = {
    "shirt": "shirt", "t-shirt": "shirt",
    "sweatshirt": "sweatshirt",
    "fleecejacke": "fleecejacke",
    "jacke": "jacke", "softshelljacke": "jacke",
    "weste": "weste",
    "softshell weste": "softshellweste", "softshellweste": "softshellweste",
    "stretchhose grau": "stretchhose-grau", "stretchhose grau mascott": "stretchhose-grau",
    "stretchhose weiß": "stretchhose-weiss", "stretchhose weiss": "stretchhose-weiss",
    "bundhose weiß": "bundhose-weiss", "bundhose weiss": "bundhose-weiss", "bundhose": "bundhose-weiss",
    "short": "short", "hose kurz": "short",
    "schuhe": "schuhe-low",
    "s3 sicherheitshalbschuhe e.s. kastra ii low": "schuhe-low",
    "s3 sicherheitsschuhe e.s. kastra ii mid": "schuhe-mid",
    "mütze": "muetze", "strickmütze": "muetze",
    "cap": "cap",
}

def art_id(raw):
    if raw is None:
        return None
    key = str(raw).strip().lower()
    return ALIASES.get(key)

def norm_size(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return str(int(v))
    s = str(v).strip().upper().replace("Ö", "Ö")
    return s if s else None

def iso(d):
    if isinstance(d, (datetime, date)):
        return d.strftime("%Y-%m-%d")
    return None

# ---- Bestellliste: Soll + Mindestbestellmenge je Artikel+Groesse ----
soll = {}       # (artId, size) -> soll
min_order = {}  # artId -> Mindestbestellmenge
ws = wb["Bestellliste"]
for row in ws.iter_rows(min_row=4, values_only=True):
    a, size, ist, s, diff, mo, need = (list(row) + [None] * 7)[:7]
    aid = art_id(a)
    if not aid:
        if a: print("Bestellliste: unbekannter Artikel:", a, file=sys.stderr)
        continue
    size = norm_size(size)
    if size is None:
        continue
    if isinstance(s, (int, float)) and s > 0:
        soll[(aid, size)] = int(s)
    if isinstance(mo, (int, float)) and mo > 0:
        min_order[aid] = int(mo)

# ---- Bestand_Lager: Ist-Bestand je Artikel+Groesse ----
stock = {}  # artId -> {size: qty}
ws = wb["Bestand_Lager"]
rows = list(ws.iter_rows(values_only=True))
i = 0
current = None
sizes_row = None
while i < len(rows):
    r = rows[i]
    vals = [c for c in r if c not in (None, "")]
    first = r[0]
    if first and isinstance(first, str) and art_id(first):
        current = art_id(first)
    if current and len(r) > 1 and r[1] == "Größen":
        sizes_row = [norm_size(c) for c in r[2:]]
    if current and len(r) > 1 and r[1] == "Ist-Bestand" and sizes_row:
        for sz, q in zip(sizes_row, list(r)[2:]):
            if sz and isinstance(q, (int, float)):
                stock.setdefault(current, {})[sz] = int(q)
        sizes_row = None
    i += 1

# ---- Konfektionsgrößen: Mitarbeiter + Groessen ----
COL_TO_ART = {
    "Bundhose": ["stretchhose-grau", "stretchhose-weiss", "bundhose-weiss"],
    "Hose kurz": ["short"],
    "Sweatshirt": ["sweatshirt"],
    "Fleecejacke": ["fleecejacke"],
    "Schuhe": ["schuhe-low", "schuhe-mid"],
    "Jacke": ["jacke"],
    "Shirt": ["shirt"],
    "Strickmütze": ["muetze"],
    "Cap": ["cap"],
    "Softshell Weste": ["softshellweste"],
    "Weste": ["weste"],
}
employees = []
ws = wb["Konfektionsgrößen"]
rows = list(ws.iter_rows(values_only=True))
header = [str(c).strip() if c else "" for c in rows[2]]
def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
for r in rows[3:]:
    name = r[0]
    if not name or not str(name).strip():
        continue
    name = str(name).strip()
    emp = {"id": slug(name), "name": name, "active": True, "sizes": {}}
    for col_idx, col_name in enumerate(header):
        arts = COL_TO_ART.get(col_name)
        if not arts:
            continue
        sz = norm_size(r[col_idx])
        if sz:
            for aid in arts:
                emp["sizes"][aid] = sz
    employees.append(emp)

# ---- Warenausgabe ----
issues = []
ws = wb["Warenausgabe"]
skipped = []
for row in ws.iter_rows(min_row=2, values_only=True):
    emp_name, art, qty, size, d = (list(row) + [None] * 5)[:5]
    if not emp_name or not art:
        continue
    aid = art_id(art)
    if not aid:
        skipped.append(str(art)); continue
    if not isinstance(qty, (int, float)) or qty <= 0:
        continue
    issues.append({
        "employee": str(emp_name).strip(),
        "articleId": aid,
        "qty": int(qty),
        "size": norm_size(size),
        "date": iso(d),
    })

# ---- Einkauf ----
orders = []
ws = wb["Einkauf"]
statuses = set()
for row in ws.iter_rows(min_row=2, values_only=True):
    art, qty, size, status, d = (list(row) + [None] * 5)[:5]
    if not art:
        continue
    aid = art_id(art)
    if not aid:
        skipped.append(str(art)); continue
    if not isinstance(qty, (int, float)) or qty <= 0:
        continue
    statuses.add(str(status))
    orders.append({
        "articleId": aid,
        "qty": int(qty),
        "size": norm_size(size),
        "status": str(status).strip() if status else "Geliefert",
        "date": iso(d),
    })

print("Statuses:", statuses, file=sys.stderr)
print("Skipped articles:", set(skipped), file=sys.stderr)

# Artikel finalisieren
for a in ARTICLES:
    a["soll"] = {sz: soll.get((a["id"], sz), 0) for sz in a["sizes"] if soll.get((a["id"], sz), 0) > 0}
    a["minOrder"] = min_order.get(a["id"], 0)
    a["active"] = True

seed = {
    "articles": ARTICLES,
    "employees": employees,
    "stock": stock,
    "issues": issues,
    "orders": orders,
    "exportedFrom": "Arbeitsausstattung neu.xlsm",
    "seedDate": "2026-08-06",
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(seed, f, ensure_ascii=False, indent=1)
print("OK:", OUT)
print("employees:", len(employees), "| issues:", len(issues), "| orders:", len(orders), "| stock arts:", len(stock))
