# -*- coding: utf-8 -*-
"""FENTO-Knieschoner (Amazon) + Mascot-Auftrag vom 23.06.2026 in seed.json eintragen."""
import json, io

P = r"C:\Users\YannFeyen\Desktop\arbeitskleidung\server\seed.json"
seed = json.load(io.open(P, encoding="utf-8"))
by_id = {a["id"]: a for a in seed["articles"]}

# FENTO Original Knieschoner (Amazon, 97,00 € brutto)
if "knieschoner-fento" not in by_id:
    seed["articles"].append({
        "id": "knieschoner-fento",
        "name": "FENTO Original Knieschoner",
        "category": "Zubehör",
        "icon": "🦵",
        "sizes": ["Einheitsgröße"],
        "soll": {},
        "minOrder": 0,
        "price": 97.00,
        "basisQty": 0,
        "active": True,
        "supplier": "Amazon",
        "shopUrl": "https://www.amazon.de/dp/B07GSQBJ4Z",
        "imageUrl": "https://m.media-amazon.com/images/I/81VD+Mg0WRL._AC_SY450_.jpg",
    })

# MASCOT Bundhose ULTIMATE STRETCH schwarz (Art. 18479-311-09) = "Stretchhose grau" im Tool.
# Auftrag vom 23.06.2026, E-Preis 72,10 € netto, 10 % Großbestellungs-Rabatt -> 64,89 €.
# Produkt ist nicht mehr erhaeltlich -> kein Shop-Link.
by_id["stretchhose-grau"]["price"] = 64.89

NOTE = "MASCOT Bundhose ULTIMATE STRETCH schwarz, Art. 18479-311-09 (Auftrag 23.06.2026, 72,10 € −10 %)"
MASCOT_ORDER = [("48", 13), ("50", 13), ("52", 29), ("54", 5), ("56", 13), ("58", 13)]
existing = {(o["articleId"], o.get("size"), o.get("date")) for o in seed["orders"]}
for size, qty in MASCOT_ORDER:
    key = ("stretchhose-grau", size, "2026-06-23")
    if key in existing:
        continue
    seed["orders"].append({
        "articleId": "stretchhose-grau",
        "qty": qty,
        "size": size,
        "status": "Geliefert",
        "date": "2026-06-23",
        "note": NOTE,
    })

json.dump(seed, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
print("Artikel:", len(seed["articles"]), "| Orders:", len(seed["orders"]))
