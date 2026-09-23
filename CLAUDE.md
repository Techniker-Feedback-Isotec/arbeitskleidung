# Arbeitskleidung-Tool: Arbeitsanweisung für Claude

Dieses Projekt ist das Arbeitskleidung-Tool von ISOTEC Morscheck. Es ersetzt die
Excel `Arbeitsausstattung neu.xlsm` und verwaltet die Arbeitskleidung der
Techniker: Lager, Bestellliste, Bestellungen, Warenausgabe, Mitarbeiter mit
Konfektionsgrößen, Artikelstamm und Dashboard.

- **Live:** https://isotec-arbeitskleidung.azurewebsites.net (Anmeldung mit dem ISOTEC-Konto)
- **Softwarepflege:** seit 23.09.2026 **Lisa Morscheck** (Finanzen und Einkauf).
  Gebaut und bis dahin gepflegt hat es Yann Feyen (stellvertretender Geschäftsführer).
- **Nutzerinnen und Nutzer:** Lisa Morscheck (Bestellung, Einkauf), Yesim Celik
  (Technischer Innendienst, Ausgabe und Organisation), Yann Feyen. Parallel wird
  selten bis nie gearbeitet.
- **Betrieb, Kennungen, Befehle:** `docs/AZURE.md`. **Übergabe und Einstieg:** `docs/UEBERGABE.md`.

## So arbeitest du mit Lisa

- Deutsch, sachlich, ohne Fachjargon. Fachbegriffe beim ersten Mal in einem Halbsatz erklären.
- **Selbst ausführen statt Befehle zum Abtippen geben.** Wenn Lisa doch etwas selbst
  ausführen muss, immer dazusagen wo (PowerShell auf ihrem Rechner, Azure-Portal im
  Browser) und fertige Befehle ohne Platzhalter liefern.
- Ein Schritt auf einmal bei allem, was sie selbst tun muss. Zu jedem Schritt sagen,
  was zu tun ist, wenn er nicht klappt.
- **Geheimnisse gehören nie in den Chat**, auch nicht in Befehle oder Dateien im
  Projekt. Das Tool braucht keine: Speicher und Anmeldung laufen über verwaltete
  Identitäten. Kennnummern (Client-ID, Mandant, Abonnement) sind keine Geheimnisse.
- **Gestaltungsfragen am Bild entscheiden lassen:** Varianten bauen und im
  Entwicklungsserver zeigen statt beschreiben. Verworfenes sauber zurückbauen.
- Bedenken in einem Satz nennen, dann trotzdem umsetzen, wenn sie es so will.
- Am Ende jeder Antwort in zwei, drei Sätzen: was geändert wurde, was geprüft
  wurde, was offen ist.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/App.tsx` | Rahmen: Seitenleiste mit Navigation, Speicherstand, angemeldete Person, Ansprechpartnerinnen |
| `src/store.tsx` | **Alle Datenänderungen** laufen durch den Reducer hier (`Action`-Typen oben). Der Provider lädt vom Server, speichert gebündelt, löst Konflikte |
| `src/types.ts` | Datenmodell (`Article`, `Employee`, `Issue`, `Order`, `DB`), Lieferanten, Größenraster, Ansprechpartnerinnen |
| `src/lib/selectors.ts` | Berechnungen: Bestand, Fehlmengen, Lagerwert, Ausstattung je Mitarbeiter, Ausgaben je Monat |
| `src/lib/api.ts` | Aufrufe an den Server, Erkennen einer abgelaufenen Anmeldung |
| `src/lib/text.ts`, `image.ts` | `slugify`, `today`, `uid`; Fotos vor dem Hochladen verkleinern |
| `src/components/` | Eine Datei je Seite (`Dashboard`, `Bestand`, `Bestellliste`, `Bestellungen`, `Warenausgabe`, `Mitarbeiter`, `MitarbeiterDetail`, `Artikel`, `Einstellungen`), dazu `ui.tsx` (Modal, Toast, Avatar, ArtThumb, ContactChip), `icons.tsx` (alle Symbole), `charts.tsx` |
| `src/styles.css` | Das gesamte Design, Farben als Variablen ganz oben |
| `src/assets/mitarbeiter/` | Mitarbeiterfotos, 256 px JPEG, **Dateiname = Mitarbeiter-Kennung** (`dzevit.jpg`, `yesim-celik.jpg`) |
| `public/artikel/` | Produktfotos, lokal gebündelt |
| `server/index.mjs` | Node-Server **ohne Pakete**: liefert die gebaute Seite aus, `/api/daten`, `/api/foto/<id>`, `/api/ich`, `/gesund` |
| `server/seed.json`, `seed.mjs` | Startbestand aus der Excel (06.08.2026) plus Strauss-Belege. Nur relevant, solange im Speicher nichts liegt, also praktisch nie mehr |
| `scripts/*.py` | Historische Skripte, mit denen der Startbestand erzeugt wurde. **Nicht mehr ausführen**, sie ändern nur `seed.json`, nicht den Live-Stand |
| `docs/AZURE.md` | Alles zum Betrieb |

Technik: Vite 5, React 18, TypeScript (strict). Keine Router-Bibliothek, die Seite
steht im Zustand `page` in `App.tsx`. Keine weiteren Abhängigkeiten, und das soll so
bleiben: neue Pakete nur mit gutem Grund und nach Rückfrage.

## Datenhaltung in einem Satz

Der gesamte Datenstand ist **eine JSON-Datei** (`arbeitskleidung.json`) im
Azure-Blob-Speicher. Die Oberfläche hält sie im Speicher, jede Aktion geht durch den
Reducer, 600 ms nach der letzten Änderung wird die ganze Datei mit ETag gespeichert.
Hat inzwischen jemand anderes gespeichert (412), holt die Oberfläche den fremden
Stand, wendet ihre eigenen offenen Aktionen darauf erneut an und speichert wieder.
Fotos liegen als eigene Dateien unter `fotos/` daneben. Soft Delete hält jeden
überschriebenen Stand 30 Tage lang vor.

Daraus folgt für jede Änderung am Code:

- **Neue Datenänderungen immer als neue `Action` im Reducer**, nie `db` direkt
  verändern und nie am Reducer vorbei speichern. Nur so funktioniert die
  Konfliktauflösung, denn sie spielt Aktionen erneut ab.
- Der Reducer muss **rein** sein (keine Zufallswerte außer `uid()` für neue Einträge,
  keine Aufrufe, kein Datum von außen ohne Parameter). Das Datum kommt als Feld in der
  Action mit (`today()` beim Auslösen), damit das erneute Abspielen dasselbe ergibt.
- Gibt eine Action keinen neuen Stand zurück (`return db`), wird nichts gespeichert.
- Neue Felder im Datenmodell **optional** anlegen (`feld?: typ`), weil der Live-Stand
  sie noch nicht hat. Es gibt keine Migrationen mehr; wer vorhandene Daten umbauen
  muss, macht das einmalig am Live-Stand (siehe unten), nicht beim Laden im Code.
- Das Feld `migrations` im Live-Stand stammt aus der Zeit vor Azure. Stehen lassen.
- Das Feld `icon` an Artikeln enthält alte Emojis. **Nie anzeigen.**

## Fachregeln (nicht ohne Rücksprache ändern)

- **Bestand wird direkt fortgeschrieben**, nicht aus der Historie berechnet:
  Warenausgabe bucht ab, Rückgabe bucht zu, gelieferte Bestellung bucht zu,
  Rücksendung bucht ab, der Inventurmodus im Lager setzt die Zahl direkt.
- **`seed: true`** markiert Einträge aus der Excel und den Strauss-Belegen. Der
  Excel-Bestand enthielt sie schon. Deshalb verändern Löschen oder Korrigieren
  solcher Einträge den Bestand **nicht**. Bei allen neuen Buchungen gilt die normale
  Bestandswirkung.
- **Aktiv = aktuell genutzte Kleidung.** Deaktivierte Artikel sind Altbestand: im
  Lager in einem eigenen Bereich sichtbar (nur mit Restbestand), nicht in
  Bestellliste und Warenausgabe. Ein Artikel mit Basisausstattung gehört aktiv
  gesetzt; das ist eine Vereinbarung, der Code erzwingt es nicht.
- **Löschen mit Historie deaktiviert nur.** Artikel oder Mitarbeiter mit Ausgaben oder
  Bestellungen werden beim Löschen auf inaktiv gesetzt, nicht entfernt.
- **Bestellliste:** Fehlmenge = Soll − Ist − bereits bestellt, je Artikel und Größe.
  Die Bestellmenge ist je Zeile änderbar, Vorgabe ist die Fehlmenge. Die
  **Mindestbestellmenge gilt je Artikel über alle Größen zusammen** (2 × M + 3 × L = 5
  erfüllt eine Mindestmenge von 4). Nur die Bestellliste löst Bestellungen aus.
- **Bestellungen ist eine Übersicht**, dort wird nichts neu bestellt. Standardfilter
  „Geliefert". Bestellt → „Geliefert" bucht den Wareneingang. Gelieferte Positionen
  werden mit „Lieferung bestätigen" geprüft oder über „Abweichung" korrigiert: Die
  tatsächliche Menge ersetzt die bestellte, der Bestand wird angepasst, die Fehlmenge
  wird auf Wunsch als offene Nachlieferung angelegt. „Zurückgesendet" steht für
  Rücksendungen und Falschbestellungen, „Storniert" für nie gelieferte.
- **Warenausgabe** (Ausgabe oder Rückgabe) schlägt die Größe aus dem
  Mitarbeiterprofil vor. Im Mitarbeiterprofil lässt sich die Basisausstattung
  (`basisQty` je aktivem Artikel) einem neuen Mitarbeiter in einem Rutsch ausgeben.
- **Fotos:** Mitarbeiterfoto aus `src/assets/mitarbeiter/<kennung>.jpg`, ein im Tool
  hochgeladenes Foto (`api/foto/ma-<kennung>`) hat Vorrang. Artikelfotos entweder
  lokal (`artikel/<datei>`), hochgeladen (`api/foto/artikel-<id>`) oder als Adresse.
  Ohne Foto erscheint das Kategorie-Symbol.
- **Bestellwege** (`SUPPLIERS` in `types.ts`): Intranet (Strauss-Lieferantenbereich,
  Anmeldung im Intranet nötig), Engelbert Strauss direkt, Mascot (über WS Bau Handel),
  Amazon, Sonstige.
- Die „Hose" (Kennung `stretchhose-grau`) ist die MASCOT Bundhose ULTIMATE STRETCH
  18479-311-09, 72,10 € netto, nicht mehr lieferbar. Die Kennungen sind historisch,
  Namen dürfen sich ändern, **Kennungen nie**, sonst reißt die Historie ab.

## Gestaltungsregeln

- **ISOTEC-Design:** Rot `#d51317`, Braunschwarz `#564a44`, Segoe UI, weiße Karten auf
  hellgrauem Grund. Farben nur über die Variablen in `src/styles.css`.
- **Keine Emojis und keine gelben Symbole**, nirgends. Symbole sind schlichte
  SVG-Linien-Symbole im Stil von `src/components/icons.tsx`; neue dort ergänzen, im
  selben Strich.
- **Keine Erklärtexte in der Oberfläche.** Bedienung ergibt sich aus Beschriftung und
  Platzhalter. Erlaubt sind Zustände („Gespeichert") und Fehlermeldungen. Braucht etwas
  eine Erklärung, den Aufbau ändern. Einige ältere Seiten (Bestellungen,
  Einstellungen) haben noch erklärende Zeilen; beim nächsten Umbau dort mit entfernen.
- **Die Nutzer werden geduzt.** Grüße ohne Tageszeit.
- **Erst die PC-Ansicht fertig bauen**, Handy (375 px) und Tablet (768 px) erst am Ende
  eines Umbaus in einem Zug glattziehen. Vorhandene Handy-Regeln nicht zerstören. Für
  breite Tabellen gibt es eine beim Scrollen stehende Aktionsspalte.
- Das App-Symbol (weißes Shirt auf Rot) und das Web-App-Manifest liegen in `public/`.

## Lokal entwickeln

Zwei PowerShell-Fenster im Projektordner:

```powershell
npm run server   # lokaler Server auf Port 8080, Datenstand in .daten/, keine Anmeldung
npm run dev      # Oberfläche auf http://localhost:5175, /api geht an den Server
```

Beim ersten Mal vorher `npm install`. Liegt in `.daten/` noch nichts, startet der
lokale Server mit dem Startbestand. Mit echten Daten testen: den Live-Stand
herunterladen (Befehl in `docs/AZURE.md`) und als `.daten/arbeitskleidung.json`
ablegen. `.daten/` ist nicht im Repo und darf nie hinein.

Vor jedem Livegang: `npm run build` muss ohne Fehler durchlaufen (prüft auch die
Typen), dann im Browser mit dem echten Datenstand die geänderten Seiten durchklicken.

## Ausliefern (Livegang)

Nur wenn Lisa es sagt. Mehrere Änderungen sammeln und zusammen ausliefern. Vorher
Yesim und Yann Bescheid geben, weil die App eine Minute neu startet und offene
Fenster danach neu geladen werden sollten.

```powershell
npm run build
Compress-Archive -Path 'dist','server','package.json' -DestinationPath "$env:TEMP\arbeitskleidung-paket.zip" -Force
az webapp deploy --name isotec-arbeitskleidung --resource-group rg-arbeitskleidung-prod --src-path "$env:TEMP\arbeitskleidung-paket.zip" --type zip
```

Danach prüfen: `https://isotec-arbeitskleidung.azurewebsites.net/gesund` antwortet
`ok`, dann die Seite im Browser öffnen (Strg+F5). Geht etwas nicht: eine Minute warten
und neu laden, bleibt der Fehler, **sofort zurückbauen** (letzten guten Commit
auschecken, bauen, ausliefern, dann `git switch main`) und in Ruhe lokal suchen.
Gut ist, vor dem Livegang ein Git-Tag zu setzen (`git tag live-JJJJ-MM-TT`), dann ist
der Rückweg eindeutig.

## Daten am Live-Stand ändern

Für Massenkorrekturen, die in der Oberfläche zu mühsam wären. Selten nötig.

1. Die beiden anderen bitten, das Tool zu schließen.
2. Live-Stand herunterladen (Befehl in `docs/AZURE.md`), eine Kopie als Sicherung behalten.
3. Mit einem **Node-Skript** ändern, nicht mit PowerShell `ConvertFrom-Json`, das
   verändert Datumswerte. Skript im Temp-Ordner, nicht im Projekt.
4. Ergebnis prüfen: gültiges JSON, `version: 1`, Zahl der Einträge plausibel.
5. Hochladen mit `--content-type "application/json; charset=utf-8"`, danach alle neu laden lassen.

Soft Delete ist das Sicherheitsnetz, falls doch etwas schiefgeht (Rückholweg in
`docs/AZURE.md`).

## Anmeldung und Zugänge

- Easy Auth mit Microsoft, **Zuweisung erforderlich** ist an: nur zugewiesene
  Personen kommen herein. Person hinzufügen: Befehl in `docs/AZURE.md`.
- **Die Zustimmung für die Organisation muss erteilt bleiben.** Ohne sie kommt niemand
  ohne Administratorrolle herein, auch zugewiesene Personen nicht (Fehler 90094). Lisa
  und Yann merken das nie selbst, weil sie Administratorrollen haben. Ein Anmeldetest
  mit dem eigenen Konto beweist deshalb nichts über die anderen.
- **Kann sich jemand nicht anmelden, zuerst das Anmeldeprotokoll lesen** (Befehl in
  `docs/AZURE.md`), nicht raten. 90094 = Zustimmung fehlt, 50105 = Zuweisung fehlt,
  50140 ist harmlos.
- Lisa ist Besitzerin des Azure-Abonnements, Cloudanwendungsadministratorin in Entra
  und hat Datenzugriff auf das Speicherkonto. Damit kann sie alles, was dieses Tool braucht.

## Bekannte Fallen

- **Abgelaufene Anmeldung sieht für `fetch` wie ein Erfolg aus.** Nach acht Stunden
  liefert Easy Auth die Anmeldeseite als HTML mit Status 200. `sicherJson()` in
  `src/lib/api.ts` fängt das ab. Jeder neue Serveraufruf muss darüber laufen.
- **Nicht `/.auth/me` benutzen**, das braucht den Tokenspeicher. Wer angemeldet ist,
  kommt über `/api/ich` aus den Kopfzeilen `X-MS-CLIENT-PRINCIPAL*`.
- **Der Server nutzt nur Node-Bordmittel.** Auf Azure wird nichts installiert
  (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`). Ein `import` eines npm-Pakets im Server
  bricht den Start ab. Pakete gehören nur in die Oberfläche.
- **Nach einem Hochladen des Datenstands von außen** laufen offene Browser in den
  Konfliktfall. Der löst sich selbst, zeigt aber eine Meldung. Deshalb vorher schließen lassen.
- **Beim Auflisten alter Stände `--include ds`**, mit `d` allein erscheinen die
  Momentaufnahmen nicht.
- **Mitarbeiterfotos klein halten.** Originalfotos blähen die App auf (einmal 17 MB).
  Neue Fotos auf 256 px verkleinern, bevor sie nach `src/assets/mitarbeiter/` kommen,
  oder direkt im Tool hochladen, dort wird automatisch verkleinert.
- **Intranet:** Auf der Anmeldeseite des ISOTEC-Intranets ist der Knopf mit der
  Beschriftung „Benutzername::" der **Abmelden**-Knopf. Nie klicken. Anmelden im
  Intranet macht Lisa immer selbst, Claude gibt dort nie Zugangsdaten ein.
- Die Seite ist eine Web-App zum Installieren. Nach größeren Änderungen am Manifest
  oder Symbol muss die installierte App einmal neu installiert werden.

## Git

- Der Projektordner liegt **nur bei Lisa**, Zweig `main`, mit der vollständigen
  Historie. Es gibt **keinen Remote** und kein `git push`. Das alte GitHub-Repo
  `Techniker-Feedback-Isotec/arbeitskleidung` ist Yanns Stand bis zum 23.09.2026, wird
  nicht weitergeführt und ist öffentlich; dorthin nichts hochladen.
- Keine Live-Daten, keine Sicherungsdateien und nie Zugangsdaten einchecken.
- **Nach jedem abgeschlossenen Schritt committen**, ohne dass Lisa darum bitten muss.
  Deutsche Betreffzeile ohne Präfix, darunter kurz das **Warum**, nicht nur das Was.
  Umlaute im Commit-Text als ae/oe/ue schreiben, so hält es die Historie. Vor dem
  Commit `git diff` auf Zugangsdaten und Personendaten prüfen.
- **Sicherung des Codes:** Weil der Ordner nur auf einem Rechner liegt, nach jedem
  Livegang (und wenn Lisa darum bittet) eine Zip-Datei ohne `node_modules`, `dist`
  und `.daten` in ihr OneDrive legen, Name mit Datum, zum Beispiel
  `OneDrive - ISOTEC Morscheck\Sicherungen\arbeitskleidung-JJJJ-MM-TT.zip`. Den
  genauen OneDrive-Pfad vorher mit `$env:OneDriveCommercial` ermitteln. Unter Windows
  mit `tar -a -c -f <ziel>.zip --exclude=node_modules --exclude=dist --exclude=.daten arbeitskleidung`
  aus dem Desktop heraus, das nimmt auch den versteckten Ordner `.git` mit. Den
  Projektordner selbst nicht in OneDrive verschieben.
- Ausgeliefert wird direkt vom Rechner.

## Offene Punkte (Stand 23.09.2026)

- Mitarbeiterfotos fehlen für Aptula Cholak und Sebastian Dunski, das von Xholian
  Bajrami ist defekt. Lassen sich direkt im Tool hochladen.
- Nachfolgemodell für die Mascot-„Hose" klären, sobald eines feststeht.
- Status „Geliefert" automatisch aus Versand- und Lieferbestätigungen im
  Einkaufspostfach setzen.
- Ausgelöste Bestellungen automatisch als Mail an das Einkaufspostfach schicken,
  sobald die Zieladresse feststeht.
- Erklärende Zeilen auf den Seiten Bestellungen und Einstellungen entfernen.
