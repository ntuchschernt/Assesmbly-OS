# Entwicklungsfortschritt

Stand: Abschluss MVP (Phasen 1–6). Jede Phase wurde mit Typecheck, Lint, Tests und Sichtprüfung (Screenshots) abgeschlossen.

## Phase 1 – Analyse, Architektur, Designsystem, Layout ✅
- Repository analysiert: leer bis auf README. Kein Bestandscode, der überschrieben werden konnte.
- Architekturentscheidungen ADR-01 bis ADR-10 stehen in `PROJECT_PLAN.md`.
- Designsystem „Industrial Pro“ als Tokens in `globals.css`, Komponenten in `src/components/ui` (Button, Input/Select/Textarea/Field, Card, Badge, Dialog, Dropdown, Table, Toast, Avatar, Progress, EmptyState, Skeleton, PageHeader, SegmentedLinks, PriorityIndicator, FilterBar, ConfirmButton).
- App-Shell: einklappbare Sidebar (Zustand in localStorage), Mobile-Drawer, Breadcrumbs, Schnellsuche, Benachrichtigungen, Workspace-Auswahl, Benutzermenü.
- Auth: Login, Middleware, Sessions per Cookie.

## Phase 2 – Dashboard, Projekte, Aufgaben, Kanban ✅
- Dashboard mit 6 KPIs und 6 Bereichen, alle Werte aus der Datenbank.
- Projekte: CRUD, Archivierung, Detailseite.
- Aufgaben: Kanban mit Drag & Drop (Status + Reihenfolge per Fractional Indexing), Tabelle, Meine Aufgaben, Filter, Kommentare, Anhänge, Löschen.

## Phase 3 – Assembly & Work Instructions ✅
- Hierarchie Projekt → Maschine → Baugruppe → Unterbaugruppe (2 Ebenen, validiert).
- Montageaufträge mit Statusregeln (unit-getestet), Zeiterfassung, Problemmeldung.
- Montageanweisungen: Editor, Freigabe-Workflow, Vier-Augen-Prinzip, Revisions-Snapshots, freigegebene Ansicht, Archivansicht, Ausführung.
- Sicherheitsregel: Nicht freigegebene Inhalte werden nie als Produktionsanweisung gezeigt. Start und Ausführung sind ohne veröffentlichte Version gesperrt.

## Phase 4 – Dokumente & Qualität ✅
- Dokumentenbibliothek mit Upload, Versionen, Status, Vorschau und Textextraktion.
- Qualitätsmanagement mit Maßnahmen und Prüfungen, Regeln für den Abschluss (Ursache Pflicht, Maßnahmen erledigt).
- Querverweise zwischen allen Modulen (Projekt, Maschine, Baugruppe, Auftrag, Aufgabe, Dokument).

## Phase 5 – KI, Suche, Benachrichtigungen, Reporting ✅
- ASSEMBLY AI: Demo-Provider (simuliert, quellenbasiert) und Anthropic-Provider (vorbereitet), Retriever, Dokumentenpipeline.
- Globale Suche (Command Palette und Ergebnisseite).
- Benachrichtigungen werden bei Zuweisung, QM-Meldung, Freigabeanfrage, Kommentar und Auftragsabschluss erzeugt.
- Reporting mit Filtern nach Projekt und Zeitraum.

## Phase 6 – Tests, Fehlerbehebung, Responsiveness, Dokumentation ✅
- 29 Unit-Tests (`npm test`): Fortschrittsberechnung, Workflow-Regeln, Validierung, Tokenizer und Retrieval, Report-Mathematik.
- End-to-End-Smoke-Test (`npm run test:e2e`), 32 Prüfungen gegen den Produktions-Build, dreimal in Folge grün.
- Gefundene und behobene Fehler:
  - Server-Seite rief eine Client-Funktion auf (`emptyStep`): Hilfsfunktion in ein gemeinsames Modul verschoben.
  - Konstante aus einem Client-Modul in einer Server-Seite (`SERIES`): in `palette.ts` verschoben.
  - React-Effekt gab ein Promise zurück (`scrollIntoView` liefert in Chromium ein Promise).
  - Tokenizer trennte Wörter am „ß“ (durch Unit-Test gefunden).
  - Toter Breadcrumb-Link `/assembly/work-orders`.
  - KI-Intent „Montageanweisung vorbereiten“ erkannte die Formulierung „bereite … vor“ nicht.
- Responsiveness geprüft (iPhone 13): kein horizontaler Seiten-Overflow, Drawer-Navigation funktioniert.
- README mit Installationsanleitung.

## Abschlusskriterien

| # | Kriterium | Nachweis |
|---|---|---|
| 1 | App startet lokal | `npm run build && npm start` |
| 2 | Dashboard funktioniert | E2E „dashboard loads“ |
| 3 | Alle Hauptmodule erreichbar | Sidebar und Build-Routenliste (26 Routen) |
| 4 | Projekte erstellen und bearbeiten | E2E „project created/edited/archived“ |
| 5 | Aufgaben erstellen und verschieben | E2E „task created“, „kanban drag changes status“ |
| 6 | Montageaufträge dargestellt | /assembly, Auftragsdetail, Ausführung |
| 7 | Montageanweisungen erstellen | E2E „instruction draft created“ |
| 8 | Dokumente verwalten | E2E „document uploaded/approved“ |
| 9 | Qualitätsmeldungen erstellen | E2E „quality issue created“ |
| 10 | KI-Demoassistent funktioniert | E2E „copilot answers with sources“ |
| 11 | Globale Suche liefert Ergebnisse | E2E „global search returns categorized hits“ |
| 12 | Responsive | E2E „mobile … no horizontal page overflow“ |
| 13 | Keine offensichtlichen UI-Fehler | E2E: 0 Page-Errors, Screenshot-Review |
| 14 | README und Installationsanleitung | `README.md` |

## Mögliche nächste Schritte
- pgvector-Retriever und PDF/OCR-Extraktion
- S3-Storage-Treiber
- Benutzer- und Rollenverwaltung in der UI, SSO (OIDC)
- Benachrichtigungen per E-Mail, geplanter Job für Überfälligkeiten
- PDF-Export freigegebener Montageanweisungen serverseitig
