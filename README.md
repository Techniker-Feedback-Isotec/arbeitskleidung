# Arbeitskleidung – ISOTEC Morscheck

Verwaltung der Arbeitskleidung für die Techniker: Lagerbestand, Bestellliste,
Bestellungen mit Lieferprüfung, Warenausgabe, Mitarbeiter mit Konfektionsgrößen,
Artikelstamm und Dashboard.

**Betrieb:** https://isotec-arbeitskleidung.azurewebsites.net (Anmeldung mit dem
ISOTEC-Konto, nur zugewiesene Personen). Einrichtung und Ausliefern in
`docs/AZURE.md`.

## Aufbau

- `src/` – Oberfläche (Vite, React, TypeScript, ISOTEC-Design). Alle
  Datenänderungen laufen durch den Reducer in `src/store.tsx`; der Provider dort
  lädt den Datenstand vom Server, speichert gebündelt und löst Konflikte auf.
- `server/index.mjs` – Node-Server ohne Pakete: liefert `dist/` aus (Gzip
  vorgerechnet, ETag), hält den Datenstand als JSON-Datei im Blob-Speicher
  (ETag gegen gegenseitiges Überschreiben), speichert Fotos als eigene Dateien
  und meldet, wer angemeldet ist.
- `server/seed.json` – Startbestand aus der Excel `Arbeitsausstattung neu.xlsm`
  (Stand 06.08.2026) plus nachgetragene Strauss-Belege. Wird nur gebraucht,
  solange im Speicher noch nichts liegt. `scripts/` enthält die Skripte, mit
  denen er erzeugt wurde.
- `public/artikel/` – Produktfotos, lokal gebündelt (kein Intranet-Login nötig).
- `src/assets/mitarbeiter/` – Mitarbeiterfotos, 256 px, Kennung = Dateiname.

## Lokal entwickeln

```bash
npm install
npm run server   # Node-Server mit Datei-Speicher in .daten/ (Fenster 1)
npm run dev      # Vite auf http://localhost:5175, /api geht an den Server (Fenster 2)
```

## Fachliche Logik

- **Bestand** wird direkt fortgeschrieben: Warenausgabe bucht ab, gelieferte
  Bestellungen buchen zu, Rücksendungen buchen ab, Inventurmodus setzt direkt.
- **Bestellliste**: Fehlmenge = Soll − Ist − bereits bestellt (je Artikel und
  Größe), Bestellmenge anpassbar. Die Mindestbestellmenge gilt je Artikel über
  alle Größen zusammen.
- **Bestellungen** ist Übersicht: Wareneingang buchen, Lieferung bestätigen oder
  Abweichung erfassen (korrigiert den Bestand, Fehlmenge optional als
  Nachlieferung).
- **Aktive Artikel** sind die aktuell genutzte Kleidung, deaktivierte sind
  Altbestand (im Lager sichtbar, nicht in Bestellliste und Warenausgabe).
- Historische Einträge aus der Excel tragen `seed: true`; ihr Löschen oder
  Korrigieren verändert den Bestand nicht, weil der Excel-Bestand sie schon
  enthielt.
