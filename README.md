# Arbeitskleidung – ISOTEC Morscheck

Verwaltung der Arbeitskleidung für die Techniker: Lagerbestand, Bestellliste,
Warenausgabe, Mitarbeiter mit Konfektionsgrößen und Dashboard.

## Start (lokal)

```bash
npm install
npm run dev
```

Läuft dann unter http://localhost:5175.

## Datenhaltung

- Alle Daten liegen im Browser (localStorage) – keine externen Requests.
- Startbestand wurde aus `Arbeitsausstattung neu.xlsm` übernommen
  (Skript: `scripts/extract_seed.py` → `src/data/seed.json`).
- Backup/Restore als JSON unter „Einstellungen".
- „Auf Excel-Stand zurücksetzen" stellt den Seed wieder her.

## Logik

- **Bestand** wird direkt fortgeschrieben: Warenausgabe bucht ab, gelieferte
  Bestellungen buchen zu, Inventur-Modus erlaubt Direktkorrektur.
- **Bestellliste**: Fehlmenge = Soll − Ist − bereits bestellt (je Artikel + Größe).
  Soll-Bestände und Mindestbestellmengen werden am Artikel gepflegt.
- **Historische Einträge aus der Excel** sind mit `seed: true` markiert – ihr Löschen
  verändert den Bestand nicht (der Excel-Bestand enthielt sie bereits).

## Stack

Vite + React + TypeScript, keine weiteren Laufzeit-Abhängigkeiten.
Design nach ISOTEC CD (Rot #D51317, Braunschwarz #564A44), wie das
Fotodoku-Tool (`analysetermin-fotodoku`).
