# Azure-Betrieb des Arbeitskleidung-Tools

Eingerichtet am 08.09.2026 nach dem Muster des Urlaubsplaners. Alles in Germany
West Central, Abonnement `cea028ba-471f-4500-aa7c-78956ff1e5c2`, Mandant
`33800607-da7c-4252-b05a-f16843df568f`.

## Was wo liegt

| Was | Wert |
| --- | --- |
| Adresse | https://isotec-arbeitskleidung.azurewebsites.net |
| Ressourcengruppe | `rg-arbeitskleidung-prod` |
| Web-App | `isotec-arbeitskleidung`, Linux, Node 24, Startbefehl `node server/index.mjs` |
| App-Service-Plan | `rp-prod-plan` in `rg-rechnungspruefung-prod2` (B1, mitbenutzt, keine eigenen Plankosten) |
| Speicherkonto | `starbeitskleidung2026`, Container `daten`, Datei `arbeitskleidung.json`, Fotos unter `fotos/` |
| App-Registrierung | `ISOTEC Arbeitskleidung`, Client-ID `28a50a48-e577-46ea-9557-4c5f618d4b68`, Objekt-ID `42c64830-0fb2-4a20-8bde-b85195cb4fd1` |
| Dienstprinzipal | `f073fa27-814b-4848-83cf-5c80d6cb2e7b` |
| Systemseitige Identitaet der App | `e25cdacd-8bef-4f34-a485-cde15ec88ad8` (liest und schreibt den Speicher, Rolle *Storage Blob Data Contributor*) |
| Anmelde-Identitaet | `id-arbeitskleidung-auth`, Client-ID `6046a68e-11a6-45e4-bd09-c4b738e64ec1`, Objekt-ID `69d48c49-4f2b-4965-94f7-25f9a6ea2abd`, Vertrauensbeziehung `mi-easyauth` |

Es liegt **kein** Zugangsschluessel und **kein** Client Secret in den Einstellungen.
Der Speicherzugang laeuft ueber die systemseitige Identitaet, die Anmeldung ueber
die Vertrauensbeziehung der Anmelde-Identitaet (federated identity credential,
laeuft nie ab). Yann hat zusaetzlich selbst die Rolle *Storage Blob Data
Contributor* auf dem Speicherkonto, um den Datenstand von Hand zu sichern oder
einzuspielen.

## Anwendungseinstellungen

| Name | Bedeutung |
| --- | --- |
| `SPEICHER_KONTO` | `starbeitskleidung2026` |
| `SPEICHER_CONTAINER` | `daten` |
| `SPEICHER_BLOB` | `arbeitskleidung.json` |
| `OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID` | Client-ID der Anmelde-Identitaet, slot-sticky |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~24` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false`, es wird fertig gebaut hochgeladen |

## Anmeldung

Easy Auth (`authsettingsV2`), Anbieter Microsoft, Anmeldung erzwungen
(`RedirectToLoginPage`), `/gesund` ausgenommen. **Zuweisung erforderlich ist
eingeschaltet**: nur zugewiesene Personen kommen herein, alle anderen bekommen
eine Fehlermeldung von Microsoft. Zugewiesen sind Yann Feyen, Lisa Morscheck
und Yesim Celik.

Weitere Person hinzufuegen (PowerShell, angemeldet mit `az login`):

```powershell
$spId = 'f073fa27-814b-4848-83cf-5c80d6cb2e7b'
$uid = az ad user show --id vorname.nachname@isotec-morscheck.de --query id -o tsv
$body = @{ principalId = $uid; resourceId = $spId; appRoleId = '00000000-0000-0000-0000-000000000000' } | ConvertTo-Json -Compress
[IO.File]::WriteAllText("$env:TEMP\zuweisung.json", $body)
az rest --method POST --url "https://graph.microsoft.com/v1.0/servicePrincipals/$spId/appRoleAssignedTo" --headers 'Content-Type=application/json' --body "@$env:TEMP\zuweisung.json"
```

Entfernen geht im Portal unter Entra ID > Unternehmensanwendungen > ISOTEC
Arbeitskleidung > Benutzer und Gruppen.

Der Server liest die Anmeldung aus den Kopfzeilen `X-MS-CLIENT-PRINCIPAL` und
`X-MS-CLIENT-PRINCIPAL-NAME` und bietet sie unter `/api/ich` an. Eine
abgelaufene Sitzung (8 Stunden) liefert `fetch` HTML statt JSON; die Anwendung
erkennt das und leitet zur Anmeldung um.

## Datenhaltung

Eine JSON-Datei im Blob, geschrieben mit ETag:

- `GET /api/daten` liefert die Datei mit `ETag`; liegt noch nichts im Speicher,
  kommt der Startbestand aus `server/seed.json` mit der Kopfzeile `X-Startbestand: 1`
- `PUT /api/daten` schreibt mit `If-Match: <etag>`, bei der Erstanlage mit
  `If-None-Match: *`. Bei fremder Aenderung antwortet der Server `412`; die
  Anwendung holt dann den fremden Stand, wendet ihre eigenen, noch nicht
  gesicherten Aktionen darauf erneut an und speichert wieder. Niemand
  ueberschreibt den anderen, und keine Aktion geht verloren.
- Fotos liegen als eigene Blobs unter `fotos/<id>` (`ma-<mitarbeiter>` und
  `artikel-<artikel>`) hinter `/api/foto/<id>`. Die Datendatei bleibt klein.

Die Anwendung speichert gebuendelt 600 ms nach der letzten Aenderung. Beim
Zurueckkehren ins Fenster laedt sie fremde Aenderungen nach (`If-None-Match`,
304 wenn nichts neu ist). Der JSON-Export in den Einstellungen bleibt als
Sicherung.

Datenstand von Hand sichern oder einspielen (PowerShell, mit Yanns Rolle):

```powershell
az storage blob download --account-name starbeitskleidung2026 --container-name daten --name arbeitskleidung.json --file "$env:USERPROFILE\Downloads\arbeitskleidung-sicherung.json" --auth-mode login
az storage blob upload   --account-name starbeitskleidung2026 --container-name daten --name arbeitskleidung.json --file "<Datei>" --auth-mode login --overwrite
```

Nach einem Upload von aussen muessen offene Browser die Seite neu laden, sonst
laeuft ihre naechste Aenderung in den Konfliktfall (der sich von selbst aufloest,
aber eine Meldung zeigt).

## Ausliefern

Das Repo liegt weiter auf GitHub (`Techniker-Feedback-Isotec/arbeitskleidung`),
ausgeliefert wird aber direkt vom Rechner. Die alte GitHub-Pages-Adresse leitet
nur noch auf Azure um.

```powershell
cd C:\Users\YannFeyen\Desktop\arbeitskleidung
npm run build
Compress-Archive -Path 'dist','server','package.json' -DestinationPath "$env:TEMP\arbeitskleidung-paket.zip" -Force
az webapp deploy --name isotec-arbeitskleidung --resource-group rg-arbeitskleidung-prod --src-path "$env:TEMP\arbeitskleidung-paket.zip" --type zip
```

Der Server nutzt nur Node-Bordmittel, es werden keine Pakete nachgeladen.
Pruefen ohne Anmeldung: `https://isotec-arbeitskleidung.azurewebsites.net/gesund`
antwortet `ok`. Ein 401 auf andere Pfade per `curl` ist normal, Easy Auth leitet
nur Browser um.

## Lokal entwickeln

Zwei Fenster: `npm run server` (Node mit `.env.entwicklung`: Datenstand in
`.daten/arbeitskleidung.json`, Fotos in `.daten/fotos/`, feste Anmeldung als
Entwicklung) und `npm run dev` (Vite auf Port 5175, leitet `/api` an Port 8080).
Der Ordner `.daten/` ist nicht im Repo.
