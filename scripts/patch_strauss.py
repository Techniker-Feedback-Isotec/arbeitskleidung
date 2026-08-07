# -*- coding: utf-8 -*-
"""Traegt die Strauss-Artikel aus dem ISOTEC-Intranet (de-shop.isotec.info) in seed.json ein.
Stand: 2026-08-07, ausgelesen aus dem Lieferantenbereich STRAUSS."""
import json, io

P = r"C:\Users\YannFeyen\Desktop\arbeitskleidung\src\data\seed.json"
seed = json.load(io.open(P, encoding="utf-8"))

SHOP = "https://de-shop.isotec.info"
INTRA = "Intranet (Strauss)"

# Bestehende Artikel: id -> (shopUrl, imageUrl, preis)
EXISTING = {
    "shirt": ("/T-Shirt-Cotton-E.S.-Active-mit-ISOTEC-Stick/SW10780",
              "/media/66/b3/4a/1760955538/89650%20inkl.%20Logo.png", 20.73),
    "sweatshirt": ("/E.S.-Sweatshirt-Poly-Cotton-mit-ISOTEC-Stick/SW10783",
                   "/media/fa/72/44/1760954299/89330%20inkl.%20Logo.png", 26.73),
    "jacke": ("/Softshelljacke-E.S.-Motion-mit-ISOTEC-Stick/SW10775",
              "/media/9c/67/0f/1760955844/65287%20inkl.%20Logo.png", 84.73),
    "weste": ("/Weste-E.S.-Motion-Ten-mit-ISOTEC-Stick/SW10779",
              "/media/c9/02/ec/1760955797/66114%20inkl.%20Logo.png", 60.73),
    "softshellweste": ("/Softshell-Weste-Dryplexx-Softlight-mit-ISOTEC-Stick/SW10777",
                       "/media/1d/dc/f5/1757336406/77989.png", 40.73),
    "short": ("/Short-E.S.-Motion-mit-ISOTEC-Stick/SW10774",
              "/thumbnail/65/ab/93/1757332957/Shorts_400x400.png", 47.73),
    "bundhose-weiss": ("/Bundhose-E.S.-Motion-mit-ISOTEC-Stick/65181",
                       "/media/e9/22/e8/1760954470/65281%20inkl.%20Logo.png", 60.73),
    "schuhe-low": ("/S3-Sicherheitshalbschuhe-E.S.-Kastra-II-Low/93954",
                   "/thumbnail/f4/84/b0/1757340873/93954_400x400.png", 96.90),
    "schuhe-mid": ("/S3-Sicherheitsschuhe-E.S.-Kastra-II-Mid/93964",
                   "/thumbnail/43/bc/99/1757340694/93964_400x400.png", 106.90),
    "muetze": ("/Strickmuetze-E.S.-Iconic-mit-ISOTEC-Stick/SW10785",
               "/media/54/be/7b/1757339709/7810915.png", 20.73),
    "cap": ("/Cap-E.S.-Classic-mit-ISOTEC-Stick/SW10784",
            "/media/8b/67/94/1760955416/7820811%20inkl.%20Logo.png", 21.73),
}

LETTERS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
TROUSERS = [str(n) for n in range(42, 66, 2)]
SHOES = [str(n) for n in range(38, 51)]

# Neue Artikel aus dem Intranet-Shop
NEW = [
    {"id": "latzhose", "name": "Latzhose E.S. Motion", "category": "Hosen", "icon": "👖",
     "sizes": TROUSERS, "price": 70.73,
     "shopUrl": "/Latzhose-E.S.-Motion-mit-ISOTEC-Stick/SW10773",
     "imageUrl": "/thumbnail/e6/af/bc/1757325797/Latzhose_400x400.png"},
    {"id": "polo-silverfresh", "name": "Funktions Polo-Shirt Silverfresh", "category": "Oberteile", "icon": "👕",
     "sizes": LETTERS, "price": 30.73,
     "shopUrl": "/E.S.-Funktions-Polo-Shirt-Poly-Silverfresh-mit-ISOTEC-Stick/SW10782",
     "imageUrl": "/thumbnail/cf/52/57/1757338479/89263_400x400.png"},
    {"id": "polo-cotton", "name": "Polo-Shirt Cotton E.S. Active", "category": "Oberteile", "icon": "👕",
     "sizes": LETTERS, "price": 28.73,
     "shopUrl": "/Polo-Shirt-Cotton-E.S.-Active-mit-ISOTEC-Stick/SW10781",
     "imageUrl": "/media/82/4c/61/1760955484/89660%20inkl.%20Logo.png"},
    {"id": "softshelljacke-light", "name": "Softshell Jacke Dryplexx Softlight", "category": "Oberteile", "icon": "🧥",
     "sizes": LETTERS, "price": 47.73,
     "shopUrl": "/Softshell-Jacke-Dryplexx-Softlight-mit-ISOTEC-Stick/SW10776",
     "imageUrl": "/media/1b/f0/77/1760955617/78119%20inkl.%20Logo.png"},
    {"id": "kapuzenstrickjacke", "name": "Hybrid Kapuzenstrickjacke Motion Ten", "category": "Oberteile", "icon": "🧥",
     "sizes": LETTERS, "price": 87.73,
     "shopUrl": "/Hybrid-Kapuzenstrickjacke-E.S.-Motion-Ten-mit-ISOTEC-Stick/SW10778",
     "imageUrl": "/media/7e/1e/99/1760955769/66119%20inkl.%20Logo.png"},
    {"id": "schuhe-umbriel-mid", "name": "S3 Sicherheitsschuhe Umbriel II Mid", "category": "Schuhe", "icon": "🥾",
     "sizes": SHOES, "price": 64.90,
     "shopUrl": "/S3-Sicherheitsschuhe-E.S.-Umbriel-II-Mid/93749",
     "imageUrl": "/media/e1/02/a3/1757340052/93749.png"},
    {"id": "schuhe-umbriel-low", "name": "S3 Sicherheitshalbschuhe Umbriel II Low", "category": "Schuhe", "icon": "👟",
     "sizes": SHOES, "price": 56.90,
     "shopUrl": "/S3-Sicherheitshalbschuhe-E.S.-Umbriel-II-Low/93748",
     "imageUrl": "/media/16/65/6a/1757340432/93748.png"},
    {"id": "knieschoner", "name": "Knieschoner Knee Pad Ergonomic", "category": "Zubehör", "icon": "🦵",
     "sizes": ["Einheitsgröße"], "price": 9.90,
     "shopUrl": "/e.s.-Knee-Pad-Ergonomic/8371610",
     "imageUrl": "/thumbnail/27/c4/e1/1757510973/e_s_Knee_Pad_Ergonomic-306494-4-638730484990956191.jpg_400x400.webp"},
]

by_id = {a["id"]: a for a in seed["articles"]}
for aid, (url, img, price) in EXISTING.items():
    a = by_id[aid]
    a["supplier"] = INTRA
    a["shopUrl"] = SHOP + url
    a["imageUrl"] = SHOP + img
    if a.get("price") is None:
        a["price"] = price

for n in NEW:
    if n["id"] in by_id:
        continue
    seed["articles"].append({
        "id": n["id"], "name": n["name"], "category": n["category"], "icon": n["icon"],
        "sizes": n["sizes"], "price": n["price"], "basisQty": 0,
        "soll": {}, "minOrder": 0, "active": True,
        "supplier": INTRA, "shopUrl": SHOP + n["shopUrl"], "imageUrl": SHOP + n["imageUrl"],
    })

json.dump(seed, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
print("Artikel gesamt:", len(seed["articles"]))
