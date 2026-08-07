# -*- coding: utf-8 -*-
"""Artikelpflege 2026-08-07:
- Mascot-Hose: Preis 72,10 netto, Name -> "Hose"
- Neue Bundhose e.s. motion ten (Engelbert Strauss direkt)
- Aktiv = aktuell genutzt: nur Artikel mit Basisausstattung (+ explizit gewuenschte),
  Rest = Altbestand (inaktiv)
"""
import json, io

P = r"C:\Users\YannFeyen\Desktop\arbeitskleidung\src\data\seed.json"
seed = json.load(io.open(P, encoding="utf-8"))
by_id = {a["id"]: a for a in seed["articles"]}

# Mascot-Hose
hose = by_id["stretchhose-grau"]
hose["name"] = "Hose"
hose["price"] = 72.10

# Neue Bundhose e.s. motion ten (weiss), direkt bei Engelbert Strauss
if "bundhose-motion-ten" not in by_id:
    seed["articles"].append({
        "id": "bundhose-motion-ten",
        "name": "Bundhose e.s. motion ten",
        "category": "Hosen",
        "icon": "👖",
        "sizes": [str(n) for n in range(42, 66, 2)],
        "soll": {},
        "minOrder": 0,
        "price": 89.13,
        "basisQty": 0,
        "active": True,
        "supplier": "Engelbert Strauss",
        "shopUrl": "https://www.strauss.com/de/de/bundhosen/bundhose-e-s-motion-ten-3311140-66091-2.html",
        "imageUrl": "https://cdn.strauss.com/de/assets/pdp/images/Original/product/1.Release.3311140/Bundhose_e_s_motion_ten-205891-0-637624683297450392.png",
    })

# Aktiv-Regel: Basisausstattung > 0 = aktuell genutzt; zusaetzlich explizit aktuelle Artikel
EXTRA_ACTIVE = {"bundhose-motion-ten", "knieschoner-fento"}
for a in seed["articles"]:
    a["active"] = (a.get("basisQty", 0) > 0) or (a["id"] in EXTRA_ACTIVE)

json.dump(seed, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
aktive = [a["name"] for a in seed["articles"] if a["active"]]
print("Aktiv (%d):" % len(aktive), ", ".join(aktive))
print("Altbestand (%d)" % sum(1 for a in seed["articles"] if not a["active"]))
