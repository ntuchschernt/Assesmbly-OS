# ASSEMBLY OS – Projektplan & Architektur

> The Industrial Operations Platform – Projekte, Montage, Arbeitsanweisungen, Dokumente,
> Qualität und KI-gestütztes Wissen in einem System.

## 1. Ausgangslage (Repository-Analyse)

Zum Start enthielt das Repository nur `README.md` (2 Zeilen) und eine leere `PROJECT_PLAN.md`.
Es gab **keinen bestehenden Code**, keine Abhängigkeiten und nichts, das überschrieben werden konnte.
Die Umgebung bietet Node.js 22 und PostgreSQL 16; die Prisma-Engines sind ladbar.
Damit wurde der bevorzugte Stack 1:1 umgesetzt.

## 2. Technologie-Entscheidungen (ADR-Kurzform)

| # | Entscheidung | Begründung |
|---|---|---|
| ADR-01 | **Next.js 15 (App Router) + React 19 + TypeScript (strict)** | Ein Deployment für UI + API. Server Components lesen Daten direkt, Server Actions schreiben. Bewusst Next 15 (LTS-reif) statt der neuesten Major-Version. |
| ADR-02 | **PostgreSQL + Prisma 6** | Relationales Modell mit vielen Querverweisen (Projekt ↔ Baugruppe ↔ Auftrag ↔ Qualität). Prisma liefert Typsicherheit bis in die UI. |
| ADR-03 | **Tailwind CSS v4 + eigene Komponenten im shadcn/ui-Stil** | shadcn/ui ist kein Paket, sondern ein Kopiermuster. Die Komponenten liegen unter `src/components/ui` (CVA + tailwind-merge + Radix-Primitives für Dialog/Dropdown). So bleibt das Designsystem „Industrial Pro“ vollständig unter eigener Kontrolle. |
| ADR-04 | **Auth: eigene, schlanke Session-Lösung (bcrypt + signiertes JWT-Cookie via `jose`)** statt Auth.js | Auth.js v5 ist weiterhin Beta und für reines Credentials-Login überdimensioniert. Die Lösung ist gleichwertig für das MVP: HttpOnly-, SameSite=Lax-Cookie, HS256-Signatur mit `AUTH_SECRET`, Middleware-Schutz aller Routen. Austausch gegen Auth.js/OIDC ist auf `src/lib/auth/*` beschränkt. |
| ADR-05 | **Schichtentrennung**: `services` (Datenzugriff + Domänenlogik) → `actions` (Server Actions: Auth, Validierung, Revalidierung) → `components` (UI) | Keine Prisma-Aufrufe in UI-Komponenten; Validierung zentral mit Zod in `src/lib/validation`. |
| ADR-06 | **Storage-Abstraktion** `StorageProvider` mit `LocalStorageProvider` | Dateien landen in `./storage/uploads`. Ein S3-Provider ist als Interface-Implementierung vorbereitet (`s3.ts`), wirft aber bewusst einen Konfigurationsfehler, bis Zugangsdaten existieren. |
| ADR-07 | **AI-Modul mit austauschbaren Providern** (`demo`, `anthropic`) + Retriever (RAG-Vorbereitung) | Der Demo-Provider ruft **kein** Sprachmodell auf. Er durchsucht den echten Datenbestand (Keyword-Retriever), baut daraus eine regelbasierte Antwort und kennzeichnet sie als **„Simuliert“**. Ohne Treffer sagt er das – er erfindet nichts. Der Anthropic-Provider ist implementiert, aber nur aktiv mit `AI_PROVIDER=anthropic` + gesetztem `ANTHROPIC_API_KEY`. |
| ADR-08 | **Montageanweisungen: Arbeitskopie + unveränderliche Revisionen** | Der Editor bearbeitet `WorkInstruction`/`WorkStep`. Jeder Statuswechsel schreibt eine `InstructionRevision` (JSON-Snapshot). Freigegebene Ansicht und Montageausführung lesen **ausschließlich** die letzte Revision mit Status `PUBLISHED`. Eine Bearbeitung einer veröffentlichten Anweisung erzeugt automatisch eine neue Draft-Version – die gültige Produktionsversion bleibt unverändert. |
| ADR-09 | **Workspaces** als Mandantengrenze | Alle Top-Level-Entitäten tragen `workspaceId`; der aktive Workspace steht in einem Cookie. Demo: „NordTech Maschinenbau GmbH“ + leerer Workspace „NordTech Service & Retrofit“ (zeigt Leerzustände). |
| ADR-10 | **Diagramme: Recharts**, **Drag & Drop: @dnd-kit/core**, **Toasts: sonner** | Etabliert, klein, React-19-kompatibel. |

## 3. Ordnerstruktur

```
prisma/
  schema.prisma          Datenmodell
  seed.ts                Demo-Daten NordTech Maschinenbau GmbH
src/
  app/
    login/               Anmeldung
    (app)/               geschützter Bereich mit App-Shell
      page.tsx           Overview / Dashboard
      projects/          Liste + [id]
      tasks/             Kanban | Tabelle | Meine Aufgaben, [id]
      assembly/          Maschinen- & Baugruppenhierarchie, assemblies/[id], work-orders/[id](/execute)
      work-instructions/ Liste, new, [id] (Editor), [id]/released
      documents/         Bibliothek + [id]
      quality/           Liste + [id]
      copilot/           ASSEMBLY AI
      reports/           Reporting
      search/            Globale Suche
      notifications/     Alle Benachrichtigungen
      settings/          Profil, Workspace, Integrationen
    api/
      files/[...key]     Authentifizierter Datei-Download
      search/            Schnellsuche (Command Palette)
  actions/               Server Actions je Modul
  components/
    ui/                  Designsystem (Button, Input, Card, Dialog, Dropdown, Table, Badge, …)
    layout/              Sidebar, Topbar, Breadcrumbs, Suche, Notifications, Workspace-Switch
    <modul>/             Modulkomponenten (dashboard, projects, tasks, assembly, …)
  lib/
    db.ts                Prisma-Client
    auth/                Session, Passwort, Kontext
    services/            Datenzugriff & Domänenlogik
    validation/          Zod-Schemas
    storage/             StorageProvider (local, s3-Stub)
    ai/                  Provider, Retriever, Dokumentenverarbeitung
    constants.ts         Status-/Prioritätsdefinitionen (Labels, Farben) – einzige Quelle
    utils.ts             Formatierung, cn()
```

## 4. Datenmodell (Kurzfassung)

```
Workspace ─┬─ Project ── Machine ── Assembly ──(parentId)── Subassembly
           │                          │
           │                          └── WorkOrder ── WorkInstruction ── WorkStep
           │                                 │  └─ TimeEntry, StepExecution
           ├─ Task (→ Project, Assembly, WorkOrder) ── TaskComment, Attachment
           ├─ Document (→ Project, Assembly, WorkInstruction) ── DocumentVersion
           ├─ QualityIssue (→ Project, Machine, Assembly, WorkOrder, Task, Document) ── QualityAction
           ├─ WorkInstruction ── InstructionRevision (Snapshots)
           ├─ Notification (→ User)
           └─ Activity (Audit-/Aktivitätsfeed)
```

Status-Enums exakt nach Vorgabe: ProjectStatus, TaskStatus, InstructionStatus, DocumentStatus, QualityStatus.

## 5. Entwicklungsphasen

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Analyse, Architektur, Designsystem, App-Layout, Auth | ✅ |
| 2 | Dashboard, Navigation, Projekte, Aufgaben, Kanban | ✅ |
| 3 | Assembly Management, Hierarchie, Montageaufträge, Work Instructions (Editor / Freigabe / Ausführung) | ✅ |
| 4 | Dokumente, Qualitätsmanagement, Modulverknüpfungen | ✅ |
| 5 | AI Copilot (Demo-Provider), globale Suche, Notifications, Reporting | ✅ |
| 6 | Fehlerbehebung, Responsiveness, Tests, Dokumentation | ✅ |

Der detaillierte Fortschritt steht in `docs/PROGRESS.md`.

## 6. Abhängigkeiten (bewusst minimal)

Runtime: `next`, `react`, `react-dom`, `@prisma/client`, `zod`, `jose`, `bcryptjs`, `lucide-react`,
`recharts`, `@dnd-kit/core`, `sonner`, `clsx`, `tailwind-merge`, `class-variance-authority`,
`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`.

Dev: `prisma`, `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `tsx`, `vitest`, `eslint`, `eslint-config-next`, Typdefinitionen.

## 7. Bekannte Grenzen / bewusste Alternativen

- **Echte KI**: nicht aktiv ohne API-Schlüssel. Es werden keine KI-Ergebnisse vorgetäuscht – jede Demo-Antwort ist als simuliert gekennzeichnet und referenziert reale Datensätze.
- **Volltext/Vektor-Suche**: MVP nutzt PostgreSQL `ILIKE` bzw. Keyword-Scoring. Die Schnittstelle `Retriever` ist für pgvector/Embeddings vorbereitet.
- **Dokumentenextraktion (PDF/OCR)**: Pipeline-Interface vorhanden (`lib/ai/processing.ts`); hochgeladene Textdateien werden direkt extrahiert, Binärformate werden als „nicht verarbeitet“ markiert.
- **S3**: Interface vorbereitet, nicht implementiert (keine Zugangsdaten).
- **Rollen/Berechtigungen**: Rollen sind modelliert; Freigaben von Montageanweisungen und Dokumenten erfordern Rolle `ADMIN`, `ENGINEER`, `QUALITY` oder `PROJECT_MANAGER` – Techniker können nicht freigeben.
