# Übergabe Arbeitskleidung-Tool an Lisa

Stand 23.09.2026. Ab sofort pflegst du das Arbeitskleidung-Tool: Fehler beheben,
Wünsche von Yesim und dir umsetzen, neue Funktionen bauen und ausliefern. Die Arbeit
machst du mit Claude Code. Claude kennt das Tool über die Datei `CLAUDE.md` im
Projektordner und liest sie bei jedem Start von selbst. Du musst also nichts
auswendig wissen, nur wissen, was du willst.

Diese Seite erklärt, was du schon hast, was du einmal einrichtest und wie der
Alltag aussieht.

## 1. Deine Zugänge

| Was | Stand | Wofür |
| --- | --- | --- |
| Azure-Abonnement | vorhanden, du bist Besitzerin | Ausliefern, Einstellungen der Web-App |
| Entra ID (Firmenverzeichnis) | vorhanden, Cloudanwendungsadministratorin | Personen freischalten, Zustimmung für die Anmeldung |
| Speicherkonto `starbeitskleidung2026` | vorhanden seit 23.09.2026 | Datenstand sichern, einspielen, alte Stände zurückholen |
| Anmeldung am Tool selbst | vorhanden | Tool benutzen |
| GitHub | **fehlt noch** | Code sichern und Änderungen ablegen |
| Claude | **prüfen** | Claude Code braucht einen Platz im Claude-Team-Konto der Firma |

**GitHub:** Das Repo `github.com/Techniker-Feedback-Isotec/arbeitskleidung` gehört dem
gemeinsamen Konto „Techniker-Feedback-Isotec". Lege dir auf github.com ein eigenes
Konto mit deiner Firmenadresse an und schick Yann den Benutzernamen. Er trägt dich im
Repo unter *Settings › Collaborators* ein, danach kommt eine Einladung per Mail, die
du annimmst. Bis dahin kannst du den Code trotzdem schon herunterladen, weil das Repo
öffentlich ist; nur hochladen geht erst danach.

**Claude:** Falls du Claude Code schon für andere Werkzeuge nutzt, ist nichts zu tun.
Sonst lädt Yann dich im Claude-Team-Konto ein.

## 2. Rechner einrichten (einmalig)

Überspring alles, was schon installiert ist. PowerShell öffnen (Windows-Taste,
„PowerShell" tippen, Enter) und nacheinander ausführen:

```powershell
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
winget install -e --id Microsoft.AzureCLI
```

PowerShell schließen und neu öffnen, dann prüfen. Jede Zeile muss eine
Versionsnummer zeigen, bei Node mindestens 24:

```powershell
node --version
git --version
az version
```

Wenn ein Befehl nicht gefunden wird: Rechner neu starten, der Suchpfad wird erst dann
aktualisiert.

Claude Code installieren und einmal starten, dabei mit deinem Claude-Konto anmelden:

```powershell
npm install -g @anthropic-ai/claude-code
claude
```

Bei Azure anmelden (öffnet den Browser, dort mit dem Firmenkonto anmelden):

```powershell
az login
az account set --subscription cea028ba-471f-4500-aa7c-78956ff1e5c2
```

## 3. Projekt auf deinen Rechner holen (einmalig)

```powershell
cd $env:USERPROFILE\Desktop
git clone https://github.com/Techniker-Feedback-Isotec/arbeitskleidung.git
cd arbeitskleidung
npm install
```

Damit liegt das Projekt unter `Desktop\arbeitskleidung`. Git fragt beim ersten
Hochladen nach der GitHub-Anmeldung, das erledigt ein Browserfenster.

## 4. Erster Start mit Claude

Im Projektordner:

```powershell
cd $env:USERPROFILE\Desktop\arbeitskleidung
claude
```

Als erste Nachricht:

> Lies die CLAUDE.md und docs/AZURE.md. Prüfe dann, ob bei mir alles bereit ist: Azure-Anmeldung und Abonnement, Zugriff auf die Web-App, Zugriff auf den Datenstand im Speicherkonto. Lade den aktuellen Datenstand herunter, starte das Tool lokal damit und öffne es mir im Browser.

Wenn das klappt, ist alles eingerichtet.

**Nur im Browser (claude.ai) arbeiten?** Dort kann Claude keinen Code ändern und nichts
ausliefern, aber Fragen beantworten und Umbauten planen. Dafür in einem Projekt auf
claude.ai drei Dateien als Wissen hochladen: `CLAUDE.md`, `docs/AZURE.md` und diese
Datei `docs/UEBERGABE.md`. Für echte Änderungen immer Claude Code.

## 5. Der Alltag

Du sagst Claude in normalen Worten, was du willst. Claude baut es, zeigt es dir lokal
im Browser, und erst wenn du zufrieden bist, geht es live. Beispiele:

- „Yesim möchte in der Warenausgabe nach Nachnamen sortieren können. Bau das und zeig es mir."
- „Leg einen neuen Artikel an: Softshelljacke von Engelbert Strauss, Größen XS bis 3XL, 89,90 Euro."
  (Das geht auch direkt im Tool unter Artikel, ohne Claude.)
- „Die Bestellliste soll oben die Summe der Bestellwerte zeigen."
- „Im Lager steht bei den T-Shirts in M eine falsche Zahl, obwohl alles richtig gebucht wurde. Finde heraus, warum."
- „Schick ausgelöste Bestellungen automatisch als Mail an einkauf@… Wie würdest du das bauen?"
- „Liefere die Änderungen von heute aus."

Ein paar Gewohnheiten, die Claude aus der `CLAUDE.md` schon kennt:

- **Erst lokal, dann live.** Neues siehst du zuerst auf deinem Rechner unter
  `http://localhost:5175`, mit einer Kopie der echten Daten. Live geht es nur, wenn du
  es sagst.
- **Mehrere Änderungen sammeln** und zusammen ausliefern, nicht jede einzeln.
- **Vor dem Livegang Yesim und Yann kurz Bescheid geben.** Die App startet eine Minute
  neu, offene Fenster danach einmal neu laden.
- **Gestaltung am Bild entscheiden.** Wenn du unsicher bist, lass dir zwei Varianten
  bauen und wähle.
- **Claude committet jeden fertigen Schritt** und lädt ihn zu GitHub hoch. Damit ist
  jeder Stand gesichert und lässt sich zurückholen.
- **Keine Passwörter oder Schlüssel in den Chat.** Das Tool braucht keine. Beim
  Intranet meldest du dich immer selbst an.

## 6. Wenn etwas nicht geht

**Jemand kann sich nicht anmelden.** Sag Claude den Namen. Claude liest das
Anmeldeprotokoll in Entra und sagt dir den Grund in einer Minute. Häufigste Ursache
bisher: Die Person war nicht zugewiesen, oder die Zustimmung für die Organisation
fehlte. Das Zweite merkst du mit deinem eigenen Konto nie, weil du
Administratorrechte hast.

**Neue Person soll ins Tool.** „Schalte max.mustermann@isotec-morscheck.de für das
Arbeitskleidung-Tool frei." Claude weist sie zu.

**Das Tool lädt nicht oder zeigt einen Fehler nach dem Ausliefern.** Eine Minute warten,
mit Strg+F5 neu laden. Bleibt es, zu Claude: „Nach dem Livegang geht X nicht. Bau
sofort auf den letzten guten Stand zurück." Erst danach in Ruhe suchen.

**Unten links steht „Speichern fehlgeschlagen".** Auf „erneut" klicken. Die Änderungen
bleiben im Fenster erhalten, solange du es nicht schließt. Hält der Fehler an, Claude
fragen und dabei den Text zeigen, der beim Überfahren mit der Maus erscheint.

**Daten sind versehentlich falsch überschrieben.** Jeder frühere Stand der letzten
30 Tage ist noch da. „Hol den Datenstand von gestern 14 Uhr zurück." Claude listet die
Stände auf, zeigt dir den passenden und spielt ihn nach deiner Bestätigung ein.

**Eine Sicherung zwischendurch.** Im Tool unter Einstellungen den JSON-Export nutzen,
die Datei landet in deinen Downloads.

## 7. Was offen ist

- Mitarbeiterfotos fehlen für Aptula Cholak und Sebastian Dunski, das von Xholian
  Bajrami ist defekt. Direkt im Tool im Mitarbeiterprofil hochladen.
- Nachfolgemodell für die Mascot-„Hose" klären, sobald eines feststeht.
- Status „Geliefert" automatisch aus den Versand- und Lieferbestätigungen im
  Einkaufspostfach setzen.
- Ausgelöste Bestellungen automatisch als Mail an das Einkaufspostfach schicken. Dafür
  fehlt noch die Zieladresse.
- Die Seiten Bestellungen und Einstellungen haben noch erklärende Zeilen, die nach
  heutigem Stil wegkommen.

## 8. Wo was steht

| Datei | Inhalt |
| --- | --- |
| `CLAUDE.md` | Anweisung für Claude: Aufbau, Fachregeln, Gestaltung, Ausliefern, Fallen |
| `docs/AZURE.md` | Betrieb: alle Kennungen, Befehle für Freischalten, Sichern, Zurückholen |
| `README.md` | Kurzbeschreibung |
| `docs/UEBERGABE.md` | Diese Seite |

Bei Fragen, die weder Claude noch diese Dateien beantworten: Yann.
