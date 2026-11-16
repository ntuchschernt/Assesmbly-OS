# ASSEMBLY OS

**The Industrial Operations Platform.** Eine Plattform für Projekte, Aufgaben, Maschinenmontage, digitale Montageanweisungen, technische Dokumente, Qualitätsmanagement und KI-gestütztes Wissen. Sie richtet sich an Maschinen-, Sondermaschinen- und Anlagenbauer.

Die Demo-Umgebung bildet die **NordTech Maschinenbau GmbH** mit dem Projekt **Vakuumanlage VX-400** ab.

---

## Funktionsumfang (MVP)

| Modul | Was funktioniert |
|---|---|
| **Overview** | KPI-Karten (aktive Projekte, offene/überfällige Aufgaben, Montagefortschritt, offene QM-Meldungen, abgeschlossene Aufträge), Projekt- und Montagefortschritt, Aufgabenübersicht, Qualitätsmeldungen, Aktivitätsfeed, regelbasierte KI-Hinweise. Alle Werte werden live aus der Datenbank berechnet. |
| **Projects** | Projekte anlegen, bearbeiten, archivieren und wiederherstellen. Status, Priorität, Verantwortliche, Zeitraum. Detailseite mit Maschinen und Baugruppen, Aufgaben, Montageaufträgen, Dokumenten und QM-Meldungen. |
| **Tasks** | Ansichten Kanban (Drag & Drop, Reihenfolge wird gespeichert), Tabelle und „Meine Aufgaben“ (gruppiert nach Fälligkeit). Filter, Kommentare, Datei-Anhänge, Labels und Verknüpfungen zu Projekt, Baugruppe und Montageauftrag. Aufgaben lassen sich löschen. |
| **Assembly** | Hierarchie Projekt → Maschine → Baugruppe → Unterbaugruppe. Montageaufträge mit Status-Workflow, Zeiterfassung, Fortschritt und Problemmeldung. Die **Montageausführung** ist eine Shop-Floor-Ansicht mit Schritt-Quittierung: Prüfpunkte verlangen einen Messwert, „nicht i.O.“ führt zur Qualitätsmeldung. |
| **Work Instructions** | Editor mit Schritten, Werkzeugen, Material, Prüfergebnissen, Sicherheitshinweisen und Bildern. Workflow Draft → In Review → Approved → Published mit Vier-Augen-Prinzip und Versionshistorie (unveränderliche Snapshots). Getrennte Ansichten: Editor, freigegebene Version und Ausführung. |
| **Documents** | Upload per Drag & Drop, Typen und Kategorien, Zuordnung zu Projekt und Baugruppe, Versionen, Status-Workflow (Draft/Review/Approved/Archived), Vorschau für PDF und Bild sowie Textextraktion für Suche und KI. |
| **Quality Management** | Meldungen (Fehler, Abweichung, Prüfbefund, Reklamation) mit Schweregrad, Ursache, Maßnahmen und Prüfungen, Fristen und Status-Workflow. Verknüpfbar mit Projekt, Maschine, Baugruppe, Auftrag, Aufgabe und Dokument. Aus einer Meldung lässt sich direkt eine Aufgabe erstellen. |
| **AI Copilot** | ASSEMBLY AI mit Quellenangaben, Sicherheitsstufe und Warnhinweisen. Der Demo-Provider ruft kein Sprachmodell auf und kennzeichnet seine Antworten als *simuliert*. Ein Anthropic-Provider (Claude) ist vorbereitet. Vorgeschlagene Aufgaben und Entwürfe werden erst nach Bestätigung angelegt. |
| **Suche** | Globale Suche (⌘K / Strg+K) über alle Module, kategorisiert und anklickbar, plus Volltext-Ergebnisseite. |
| **Benachrichtigungen** | Zuweisungen, Überfälligkeit, abgeschlossene Aufträge, neue QM-Meldungen, Freigabeanfragen und Kommentare, mit Gelesen-Status. |
| **Reports** | Projekt- und Montagefortschritt, Aufgabenstatus, Trend (erstellt/erledigt), Fehlerquote, offene QM-Meldungen, Durchlaufzeiten und Plan-/Ist-Stunden. Filterbar nach Projekt und Zeitraum. |
| **Settings** | Profil, Passwort, Workspace bearbeiten und anlegen, Benutzer und Rollen, Status der Integrationen. |

---

## Schnellstart

### Voraussetzungen
- Node.js **≥ 20** (getestet mit 22)
- PostgreSQL **≥ 14** (getestet mit 16)

### 1. Datenbank anlegen
```bash
# Beispiel mit lokalem PostgreSQL
sudo -u postgres psql -c "CREATE USER assembly WITH PASSWORD 'assembly' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE assembly_os OWNER assembly;"

# oder per Docker
docker run -d --name assembly-db -e POSTGRES_USER=assembly -e POSTGRES_PASSWORD=assembly \
  -e POSTGRES_DB=assembly_os -p 5432:5432 postgres:16
```

### 2. Konfiguration
```bash
cp .env.example .env
# AUTH_SECRET setzen (mind. 32 Zeichen):
openssl rand -base64 48
```

### 3. Installieren, Schema anlegen, Demo-Daten laden
```bash
npm install
npm run setup        # prisma db push + Seed
```

### 4. Starten
```bash
npm run dev          # Entwicklung: http://localhost:3000
# oder produktiv
npm run build && npm start
```

### Demo-Zugänge (Passwort für alle: `demo1234`)

| Benutzer | E-Mail | Rolle | Freigaberecht |
|---|---|---|---|
| Markus Weber | m.weber@nordtech.demo | Projektleitung | ✔ |
| Julia Hoffmann | j.hoffmann@nordtech.demo | Konstruktion | ✔ |
| Lena Schmidt | l.schmidt@nordtech.demo | Qualität | ✔ |
| Stefan Krüger | s.krueger@nordtech.demo | Montageleitung | – |
| Tobias Braun | t.braun@nordtech.demo | Industriemechaniker | – |
| Anna Fischer | a.fischer@nordtech.demo | Administrator | ✔ |

Den Demo-Datenbestand setzt `npm run db:reset` jederzeit zurück. Datumswerte werden relativ zum Seed-Zeitpunkt erzeugt, damit Überfälligkeiten realistisch bleiben.

---

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` / `npm start` | Produktions-Build / -Server |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run lint` | ESLint |
| `npm test` | Unit-Tests (Vitest) für Domänenlogik, Validierung und KI-Retrieval |
| `npm run test:e2e` | End-to-End-Smoke-Test (32 Prüfungen, Playwright erforderlich, App muss laufen und frisch geseedet sein) |
| `npm run setup` | Schema anlegen und Demo-Daten laden |
| `npm run db:reset` | Datenbank zurücksetzen und neu seeden |

---

## KI-Integration (ASSEMBLY AI)

Standardmäßig läuft der **Demo-Provider** (`AI_PROVIDER=demo`). Er ruft **kein** Sprachmodell auf. Stattdessen durchsucht er den Datenbestand (Dokumente inklusive extrahiertem Text, Baugruppen, QM-Meldungen, veröffentlichte Anweisungen und Aufgaben) und setzt die Antwort regelbasiert aus echten Datensätzen zusammen. Jede Antwort ist als „Simuliert“ gekennzeichnet, nennt ihre Quellen und gibt eine Sicherheitsstufe an. Findet der Provider nichts, sagt er das und erfindet keine Werte.

So wird ein echtes LLM aktiviert:
```bash
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="…"            # eigener Schlüssel, niemals committen
ANTHROPIC_MODEL="claude-opus-5-5" # Standard
```
Der Anthropic-Provider (`src/lib/ai/providers/anthropic.ts`) nutzt das offizielle `@anthropic-ai/sdk`, denselben Retriever und einen System-Prompt mit den Sicherheitsregeln (Quellenpflicht, keine erfundenen Werte, keine Freigaben). Lehnt das Modell eine Anfrage ab, greift ein serverseitiger Fallback.

Für **RAG** ist alles vorbereitet:
- `Retriever`-Interface mit dem `KeywordRetriever` als MVP-Implementierung. Ein Austausch gegen pgvector oder Embeddings ist ohne UI-Änderung möglich.
- Dokumentenpipeline `extractText → chunkText → (embed)` in `src/lib/ai/processing.ts`. Textformate werden extrahiert, PDF und OCR sind über das `TextExtractor`-Interface andockbar.

**Sicherheitsregeln (technisch durchgesetzt):** Die KI kann nichts freigeben und nichts ändern. Vorschläge (Aufgaben, Anweisungsentwürfe) werden erst angelegt, wenn ein Mensch klickt. Entwürfe entstehen immer im Status *Draft*.

---

## Architektur in Kürze

- **Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4.** Die Komponenten folgen dem shadcn/ui-Muster und liegen in `src/components/ui`.
- **PostgreSQL + Prisma 6.** Das Datenmodell steht in `prisma/schema.prisma`.
- **Schichten:** `lib/services` (Datenzugriff und Domänenlogik) → `actions` (Server Actions mit Auth, Zod-Validierung und Revalidierung) → `components` (UI).
- **Auth:** bcrypt und ein signiertes JWT in einem HttpOnly-Cookie (`jose`). Die Middleware schützt alle Routen, Rollen steuern die Freigaberechte.
- **Storage:** Das `StorageProvider`-Interface hat einen lokalen Treiber (`./storage/uploads`), ein S3-Treiber ist vorbereitet. Downloads laufen nur authentifiziert und workspace-gebunden über `/api/files/…`.
- **Gültigkeit von Montageanweisungen:** Produktion und Ausführung lesen ausschließlich die letzte *Published*-Revision, einen unveränderlichen Snapshot. Wird eine veröffentlichte Anweisung bearbeitet, entsteht automatisch eine neue Draft-Version.

Details, Architekturentscheidungen (ADRs) und Datenmodell: [`PROJECT_PLAN.md`](PROJECT_PLAN.md). Entwicklungsstand: [`docs/PROGRESS.md`](docs/PROGRESS.md).

```
prisma/            Schema + Seed
src/app/           Routen (login, (app)/…, api/files, api/search)
src/actions/       Server Actions je Modul
src/components/    ui/ (Designsystem), layout/, Modul-Komponenten
src/lib/           auth/, services/, validation/, storage/, ai/, constants.ts, utils.ts
scripts/           e2e-smoke.cjs
```

---

## Bekannte Grenzen

- Kein echter LLM-Aufruf ohne API-Schlüssel. Das ist bewusst so: Der Demo-Modus ist klar gekennzeichnet.
- Textextraktion nur für Textformate. PDF und OCR sind vorbereitet, aber nicht implementiert.
- Die S3-Anbindung ist vorbereitet, aber nicht implementiert.
- Die Suche nutzt `ILIKE` und Keyword-Scoring statt Volltextindex oder Vektorsuche.
- Benutzerverwaltung (Einladen, Rollen ändern) ist nur lesend. Benutzer werden über den Seed angelegt.
- Die Kanban-Spalten sind horizontal scrollbar. Auf schmalen Desktop-Fenstern liegen deshalb nicht alle Spalten gleichzeitig im Bild.
