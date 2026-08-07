# -*- coding: utf-8 -*-
"""Strauss-Rechnungen & Gutschriften 01–07/2026 in seed.json einarbeiten.

Abgleich-Ergebnis (Dopplungen): Die Excel-Einkäufe vom 14.01./02.03./17.03./
31.03./01.04. entsprechen den Strauss-Rechnungen RS2056588, RS2075673,
RS2110863 (Shirts/Sweatshirts), RS2124364, RS2127278, RS2131369, RS2165247,
RS2186457, RS2187002, RS2189111, RS2190512 – diese Positionen werden NICHT
doppelt angelegt. Korrekturen: Die Excel nannte die Funktions Cargohose
e.s.dynashield "Stretchhose grau" und die Bundhose motion ten weiß
"Stretchhose weiß" – diese Seed-Einkäufe werden auf die richtigen Artikel
umgebucht. Alles Neue ist mit seed=true markiert (Bestand kam bereits über
den Excel-Schnappschuss vom 06.08.).
"""
import json, io

P = r"C:\Users\YannFeyen\Desktop\arbeitskleidung\src\data\seed.json"
seed = json.load(io.open(P, encoding="utf-8"))
by_id = {a["id"]: a for a in seed["articles"]}

TROUSERS = [str(n) for n in range(42, 66, 2)]
SHOES = [str(n) for n in range(38, 51)]

NEW_ARTICLES = [
    {"id": "cargohose-dynashield", "name": "Funktions Cargohose e.s.dynashield", "category": "Hosen",
     "icon": "👖", "sizes": TROUSERS, "price": 59.90, "supplier": "Engelbert Strauss"},
    {"id": "cargohose-vision", "name": "Cargohose e.s.vision stretch anthrazit", "category": "Hosen",
     "icon": "👖", "sizes": TROUSERS, "price": 64.90, "supplier": "Engelbert Strauss"},
    {"id": "bundhose-motion-ten-granit", "name": "Bundhose e.s. motion ten granit", "category": "Hosen",
     "icon": "👖", "sizes": TROUSERS, "price": 69.90, "supplier": "Engelbert Strauss"},
    {"id": "schuhe-zardik-low", "name": "S3 Sicherheitshalbschuhe Zardik low", "category": "Schuhe",
     "icon": "👟", "sizes": SHOES, "price": 104.90, "supplier": "Engelbert Strauss"},
    {"id": "schuhe-hadar", "name": "S3 Sicherheitsschuhe Hadar", "category": "Schuhe",
     "icon": "🥾", "sizes": SHOES, "price": 60.90, "supplier": "Engelbert Strauss"},
]
for n in NEW_ARTICLES:
    if n["id"] in by_id:
        continue
    seed["articles"].append({
        **n, "soll": {}, "minOrder": 0, "basisQty": 0, "active": False,
    })

# Short = Mascot ACCELERATE Shorts ULTIMATE STRETCH schwarz (18149-511-09), via WS Bau Handel
short = by_id["short"]
short["supplier"] = "Mascot"
short["price"] = 53.55
short["shopUrl"] = "https://www.mascot.de/de/mascot-accelerate-18149-511"
short["imageUrl"] = "artikel/short.jpg"

# Excel-Fehlzuordnungen korrigieren
for o in seed["orders"]:
    d, a = o.get("date"), o["articleId"]
    if a == "stretchhose-grau" and d in ("2026-03-02", "2026-03-31", "2026-04-01"):
        o["articleId"] = "cargohose-dynashield"
        o["note"] = "Funktions Cargohose (in Excel als Stretchhose grau geführt)"
    if a == "stretchhose-weiss" and d in ("2026-01-14", "2026-03-02"):
        o["articleId"] = "bundhose-motion-ten"
        o["note"] = "Bundhose e.s. motion ten weiß (in Excel als Stretchhose weiß geführt)"

# Neue Belege: (articleId, size, qty, date, status, note)
G = "Geliefert"
Z = "Zurückgesendet"
NEW_ORDERS = [
    # Rechnungen (noch nicht im System)
    ("knieschoner", "Einheitsgröße", 2, "2026-01-27", G, "Rechnung RS2068017"),
    ("schuhe-low", "41", 1, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-low", "42", 4, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-low", "43", 4, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-low", "44", 1, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-low", "45", 1, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-low", "46", 1, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-low", "47", 1, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-mid", "42", 2, "2026-02-23", G, "Rechnung RS2110863"),
    ("schuhe-mid", "43", 2, "2026-02-23", G, "Rechnung RS2110863"),
    ("knieschoner", "Einheitsgröße", 3, "2026-03-05", G, "Rechnung RS2131369"),
    ("bundhose-motion-ten-granit", "52", 2, "2026-05-06", G, "Rechnung R184477006 (Lisa)"),
    ("bundhose-motion-ten-granit", "54", 2, "2026-05-06", G, "Rechnung R184477006 (Lisa)"),
    ("cargohose-vision", "52", 2, "2026-05-06", G, "Rechnung R184477006 (Lisa)"),
    ("cargohose-vision", "54", 2, "2026-05-06", G, "Rechnung R184477006 (Lisa)"),
    ("schuhe-hadar", "45", 1, "2026-05-06", G, "Rechnung R184477006 (Lisa)"),
    ("knieschoner", "Einheitsgröße", 20, "2026-06-09", G, "Rechnung R184961311 (Lisa)"),
    ("schuhe-zardik-low", "42", 1, "2026-06-25", G, "Rechnung R185233519 (Lisa)"),
    ("schuhe-mid", "43", 1, "2026-06-25", G, "Rechnung R185233519 (Lisa), 116,90 €"),
    ("cargohose-vision", "50", 1, "2026-07-15", G, "Rechnung R185530514 (Lisa)"),
    ("short", "48", 8, "2026-07-20", G, "WS Bau Handel 46727, Mascot ACCELERATE Shorts schwarz, 53,55 €/Stk nach 10 % Rabatt"),
    ("short", "50", 6, "2026-07-20", G, "WS Bau Handel 46727"),
    ("short", "52", 12, "2026-07-20", G, "WS Bau Handel 46727"),
    ("short", "54", 6, "2026-07-20", G, "WS Bau Handel 46727"),
    ("short", "56", 6, "2026-07-20", G, "WS Bau Handel 46727"),
    ("short", "58", 4, "2026-07-20", G, "WS Bau Handel 46727"),
    # Gutschriften / Rücksendungen
    ("schuhe-low", "41", 1, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-low", "42", 4, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-low", "43", 4, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-low", "44", 1, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-low", "45", 1, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-low", "46", 1, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-low", "47", 1, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-mid", "42", 2, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("schuhe-mid", "43", 2, "2026-03-20", Z, "Gutschrift G25607279 zu RS2110863"),
    ("cargohose-dynashield", "48", 1, "2026-03-26", Z, "Gutschrift G25634610 zu RS2146966 (zement/graphit)"),
    ("bundhose-motion-ten-granit", "52", 1, "2026-05-26", Z, "Gutschrift G25853039 zu R184477006"),
    ("bundhose-motion-ten-granit", "54", 1, "2026-05-26", Z, "Gutschrift G25853039 zu R184477006"),
    ("cargohose-vision", "52", 2, "2026-05-26", Z, "Gutschrift G25853039 zu R184477006"),
    ("cargohose-vision", "54", 2, "2026-05-26", Z, "Gutschrift G25853039 zu R184477006"),
    ("schuhe-hadar", "45", 1, "2026-05-26", Z, "Gutschrift G25853039 zu R184477006"),
    ("cargohose-dynashield", "48", 14, "2026-06-18", Z, "Gutschrift G25937731 zu RS2187002"),
    ("cargohose-dynashield", "50", 10, "2026-06-18", Z, "Gutschrift G25937731 zu RS2187002"),
    ("cargohose-dynashield", "52", 22, "2026-06-18", Z, "Gutschriften G25938011/G25938922"),
    ("cargohose-dynashield", "54", 9, "2026-06-18", Z, "Gutschrift G25938922 zu RS2187002"),
    ("cargohose-dynashield", "56", 14, "2026-06-19", Z, "Gutschriften G25939780/G25940559"),
    ("cargohose-dynashield", "58", 18, "2026-06-19", Z, "Gutschriften G25939780/G25940559"),
]

have = {(o["articleId"], o.get("size"), o["qty"], o.get("date"), o.get("status")) for o in seed["orders"]}
added = 0
for aid, size, qty, date, status, note in NEW_ORDERS:
    if (aid, size, qty, date, status) in have:
        continue
    seed["orders"].append({"articleId": aid, "qty": qty, "size": size, "status": status, "date": date, "note": note})
    added += 1

json.dump(seed, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
print("Artikel:", len(seed["articles"]), "| Orders gesamt:", len(seed["orders"]), "| neu:", added)
