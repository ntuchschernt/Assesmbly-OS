/**
 * Demo environment: NordTech Maschinenbau GmbH – Vakuumanlage VX-400.
 * Dates are relative to the seed time so overdue/upcoming states stay realistic.
 * Login for all demo users: password "demo1234".
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildSnapshot } from "../src/lib/services/instruction-snapshot";

const db = new PrismaClient();
const NOW = new Date();
const day = (offset: number, hour = 9) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function reset() {
  // Order respects FK constraints (children first).
  await db.$transaction([
    db.activity.deleteMany(),
    db.notification.deleteMany(),
    db.qualityAction.deleteMany(),
    db.qualityIssue.deleteMany(),
    db.documentVersion.deleteMany(),
    db.document.deleteMany(),
    db.attachment.deleteMany(),
    db.taskComment.deleteMany(),
    db.task.deleteMany(),
    db.stepExecution.deleteMany(),
    db.timeEntry.deleteMany(),
    db.workOrder.deleteMany(),
    db.instructionRevision.deleteMany(),
    db.workStep.deleteMany(),
    db.workInstruction.deleteMany(),
    db.assembly.deleteMany({ where: { parentId: { not: null } } }),
    db.assembly.deleteMany(),
    db.machine.deleteMany(),
    db.project.deleteMany(),
    db.workspace.deleteMany(),
    db.user.deleteMany(),
  ]);
}

async function main() {
  await reset();
  const passwordHash = await bcrypt.hash("demo1234", 10);

  // ------------------------------------------------------------ Users
  const mk = (email: string, name: string, role: Prisma.UserCreateInput["role"], title: string) =>
    db.user.create({ data: { email, name, role, title, passwordHash } });
  const weber = await mk("m.weber@nordtech.demo", "Markus Weber", "PROJECT_MANAGER", "Projektleiter Anlagenbau");
  const hoffmann = await mk("j.hoffmann@nordtech.demo", "Julia Hoffmann", "ENGINEER", "Konstrukteurin Vakuumtechnik");
  const krueger = await mk("s.krueger@nordtech.demo", "Stefan Krüger", "TECHNICIAN", "Montageleiter");
  const schmidt = await mk("l.schmidt@nordtech.demo", "Lena Schmidt", "QUALITY", "Qualitätsingenieurin");
  const braun = await mk("t.braun@nordtech.demo", "Tobias Braun", "TECHNICIAN", "Industriemechaniker");
  const fischer = await mk("a.fischer@nordtech.demo", "Anna Fischer", "ADMIN", "IT & Prozessmanagement");

  // ------------------------------------------------------------ Workspaces
  const ws = await db.workspace.create({
    data: { name: "NordTech Maschinenbau GmbH", slug: "nordtech", description: "Sondermaschinen- und Vakuumanlagenbau, Werk Bremen" },
  });
  await db.workspace.create({
    data: { name: "NordTech Service & Retrofit", slug: "nordtech-service", description: "Service, Wartung und Modernisierung von Bestandsanlagen" },
  });
  const workspaceId = ws.id;

  // ------------------------------------------------------------ Projects
  const vx = await db.project.create({
    data: {
      workspaceId,
      key: "VX4",
      name: "Vakuumanlage VX-400",
      customer: "Helios Coating Systems AG",
      description:
        "Lieferung einer schlüsselfertigen Hochvakuum-Beschichtungsanlage VX-400 inkl. Pumpeneinheit PU-20 und Steuerung CU-10. Werksabnahme (FAT) geplant in KW 6.",
      status: "ACTIVE",
      priority: "HIGH",
      startDate: day(-75),
      endDate: day(95),
      ownerId: weber.id,
    },
  });
  const hp = await db.project.create({
    data: {
      workspaceId,
      key: "HP2",
      name: "Retrofit Hydraulikpresse HP-250",
      customer: "Bergmann Umformtechnik GmbH",
      description: "Modernisierung der Hydraulik und Steuerung einer 250-t-Presse, Austausch Sicherheitstechnik nach aktueller Maschinenrichtlinie.",
      status: "PLANNING",
      priority: "MEDIUM",
      startDate: day(28),
      endDate: day(150),
      ownerId: hoffmann.id,
    },
  });
  const ps = await db.project.create({
    data: {
      workspaceId,
      key: "PS8",
      name: "Lecktest-Prüfstand PS-80",
      customer: "intern – Qualitätssicherung",
      description: "Interner Helium-Lecktest-Prüfstand für die Endprüfung von Vakuumkomponenten.",
      status: "COMPLETED",
      priority: "LOW",
      startDate: day(-160),
      endDate: day(-20),
      ownerId: schmidt.id,
    },
  });

  // ------------------------------------------------------------ Machines & assemblies
  const mVx = await db.machine.create({
    data: { projectId: vx.id, code: "VX-400", name: "Vacuum System VX-400", serialNumber: "NT-VX400-2026-007", status: "IN_ASSEMBLY", description: "Hochvakuum-Kammer mit Rahmen, Rohrleitungen und Ventilblock." },
  });
  const mPu = await db.machine.create({
    data: { projectId: vx.id, code: "PU-20", name: "Pump Unit PU-20", serialNumber: "NT-PU20-2026-019", status: "IN_ASSEMBLY", description: "Drehschieber-Vakuumpumpeneinheit, 250 m³/h." },
  });
  const mCu = await db.machine.create({
    data: { projectId: vx.id, code: "CU-10", name: "Control Unit CU-10", serialNumber: "NT-CU10-2026-004", status: "PLANNED", description: "SPS-Steuerung mit HMI und Sicherheitstechnik." },
  });

  const asm = (data: Prisma.AssemblyUncheckedCreateInput) => db.assembly.create({ data });
  const aRahmen = await asm({ machineId: mVx.id, code: "VX4-100", name: "Grundrahmen", status: "COMPLETED", responsibleId: krueger.id, description: "Geschweißter Stahlrahmen S355, verzinkt, mit Nivellierfüßen." });
  await asm({ machineId: mVx.id, parentId: aRahmen.id, code: "VX4-110", name: "Schweißrahmen", status: "COMPLETED", responsibleId: krueger.id, description: "Schweißbaugruppe, extern gefertigt." });
  await asm({ machineId: mVx.id, parentId: aRahmen.id, code: "VX4-120", name: "Nivellierelemente", status: "COMPLETED", responsibleId: braun.id, description: "6× Gelenkfuß M20, Ausrichtung auf ±0,3 mm/m." });
  const aRohr = await asm({ machineId: mVx.id, code: "VX4-300", name: "Rohrleitungssystem", status: "IN_PROGRESS", responsibleId: braun.id, description: "Vakuumleitungen DN100 / DN40, Edelstahl 1.4404, ISO-K/KF-Flansche." });
  const aVentil = await asm({ machineId: mVx.id, code: "VX4-400", name: "Ventileinheit", status: "BLOCKED", responsibleId: braun.id, description: "Pneumatischer Ventilblock mit Plattenventil DN100 und Belüftungsventil." });
  const aPumpe = await asm({ machineId: mPu.id, code: "PU20-200", name: "Vakuumpumpe", status: "IN_PROGRESS", responsibleId: krueger.id, description: "Drehschieberpumpe 250 m³/h mit 5,5-kW-Motor auf Pumpenkonsole." });
  const aKupplung = await asm({ machineId: mPu.id, parentId: aPumpe.id, code: "PU20-210", name: "Motor-Pumpen-Kupplung", status: "PLANNED", responsibleId: krueger.id, description: "Elastische Klauenkupplung inkl. Ausrichtung." });
  const aSteuer = await asm({ machineId: mCu.id, code: "CU10-500", name: "Steuerungseinheit", status: "PLANNED", responsibleId: hoffmann.id, description: "Schaltschrank 1200×800×400 mit SPS, HMI und Sicherheitsrelais." });
  await asm({ machineId: mCu.id, parentId: aSteuer.id, code: "CU10-510", name: "Schaltschrank-Verdrahtung", status: "PLANNED", responsibleId: hoffmann.id, description: "Innenverdrahtung nach Schaltplan CU-10 Rev. B." });

  // ------------------------------------------------------------ Work instructions (10 steps total)
  const wiRahmen = await db.workInstruction.create({
    data: {
      workspaceId,
      number: "WI-0001",
      title: "Grundrahmen VX-400 montieren und nivellieren",
      description: "Aufstellung des Grundrahmens in Montagehalle 2, Montage der Nivellierelemente und Ausrichtung als Basis für Kammer und Pumpeneinheit.",
      assemblyId: aRahmen.id,
      status: "PUBLISHED",
      version: 2,
      tools: ["Hallenkran 5 t", "Drehmomentschlüssel 40–200 Nm", "Präzisions-Wasserwaage 0,02 mm/m"],
      materials: ["Gelenkfuß M20 (6×)", "Sechskantschraube M16×60 8.8 (12×)", "Unterlegplatten"],
      safetyNotes: "Schwebende Lasten: Aufenthalt unter dem Rahmen verboten. Anschlagmittel vor Gebrauch prüfen. PSA: Sicherheitsschuhe S3, Helm, Handschuhe.",
      authorId: hoffmann.id,
      approvedById: schmidt.id,
      approvedAt: day(-45),
      steps: {
        create: [
          { order: 1, title: "Rahmen anschlagen und absetzen", description: "Rahmen an den vier gekennzeichneten Anschlagpunkten anschlagen und auf der markierten Aufstellfläche absetzen.", tools: ["Hallenkran 5 t", "Rundschlingen 2 t (4×)"], parts: ["Schweißrahmen VX4-110"], expectedResult: "Rahmen steht spannungsfrei auf Markierung.", safetyCritical: true, responsibleId: krueger.id },
          { order: 2, title: "Nivellierelemente montieren", description: "Gelenkfüße M20 einschrauben und mit Kontermutter sichern. Grundeinstellung 40 mm Gewindeüberstand.", tools: ["Gabelschlüssel SW30"], parts: ["Gelenkfuß M20 (6×)"], expectedResult: "Alle 6 Füße montiert, gekontert.", responsibleId: braun.id },
          { order: 3, title: "Rahmen ausrichten", description: "Ebenheit an den Messpunkten P1–P6 mit Präzisions-Wasserwaage prüfen und über Gelenkfüße einstellen.", tools: ["Präzisions-Wasserwaage 0,02 mm/m"], parts: [], expectedResult: "Ebenheit ≤ 0,3 mm/m an allen Messpunkten, Werte im Prüfprotokoll DOC-0007 eintragen.", isCheckpoint: true, responsibleId: krueger.id },
          { order: 4, title: "Verschraubung anziehen", description: "Kontermuttern und Konsolenverschraubung M16 über Kreuz anziehen.", tools: ["Drehmomentschlüssel 40–200 Nm"], parts: ["Sechskantschraube M16×60 8.8 (12×)"], expectedResult: "Anzugsmoment M16: 195 Nm, Schrauben mit Lackstift markiert.", isCheckpoint: true, responsibleId: braun.id },
        ],
      },
    },
    include: { steps: { include: { responsible: true } }, assembly: true, approvedBy: true },
  });

  const wiPumpe = await db.workInstruction.create({
    data: {
      workspaceId,
      number: "WI-0002",
      title: "Vakuumpumpe PU-20 auf Pumpenkonsole montieren",
      description: "Montage der Drehschieberpumpe mit Motor auf der Pumpenkonsole, Ausrichtung der Kupplung und Ölbefüllung.",
      assemblyId: aPumpe.id,
      status: "PUBLISHED",
      version: 1,
      tools: ["Gabelstapler", "Drehmomentschlüssel 20–100 Nm", "Messuhr mit Magnetstativ"],
      materials: ["Vakuumpumpenöl VG100 (4,5 l)", "Schwingungsdämpfer M12 (4×)"],
      safetyNotes: "Pumpe nur im spannungsfreien Zustand montieren (LOTO). Öl nicht in die Kanalisation gelangen lassen.",
      authorId: hoffmann.id,
      approvedById: weber.id,
      approvedAt: day(-12),
      steps: {
        create: [
          { order: 1, title: "Schwingungsdämpfer setzen", description: "Schwingungsdämpfer M12 in die Konsolenbohrungen einsetzen.", tools: ["Ringschlüssel SW19"], parts: ["Schwingungsdämpfer M12 (4×)"], expectedResult: "Dämpfer fest, ohne Spiel.", responsibleId: krueger.id },
          { order: 2, title: "Pumpe absetzen und verschrauben", description: "Pumpe mit Gabelstapler auf Konsole setzen, Fußschrauben M12 einsetzen.", tools: ["Gabelstapler", "Drehmomentschlüssel 20–100 Nm"], parts: ["Vakuumpumpe 250 m³/h"], expectedResult: "Fußschrauben M12 mit 85 Nm angezogen (lt. Datenblatt DOC-0004).", isCheckpoint: true, safetyCritical: true, responsibleId: krueger.id },
          { order: 3, title: "Kupplung ausrichten", description: "Motor-Pumpen-Kupplung radial und axial mit Messuhr ausrichten.", tools: ["Messuhr mit Magnetstativ"], parts: ["Klauenkupplung"], expectedResult: "Radialversatz ≤ 0,1 mm, Winkelversatz ≤ 0,1°.", isCheckpoint: true, responsibleId: braun.id },
          { order: 4, title: "Öl einfüllen", description: "Vakuumpumpenöl bis Mitte Schauglas einfüllen.", tools: ["Trichter"], parts: ["Vakuumpumpenöl VG100 (4,5 l)"], expectedResult: "Ölstand Mitte Schauglas.", responsibleId: braun.id },
        ],
      },
    },
    include: { steps: { include: { responsible: true } }, assembly: true, approvedBy: true },
  });

  const wiRohr = await db.workInstruction.create({
    data: {
      workspaceId,
      number: "WI-0003",
      title: "Rohrleitungen DN100 verlegen und abdichten",
      description: "Verlegung der Hauptsaugleitung DN100 zwischen Kammer und Ventileinheit inkl. Dichtheitsprüfung.",
      assemblyId: aRohr.id,
      status: "IN_REVIEW",
      version: 1,
      tools: ["Drehmomentschlüssel 10–60 Nm", "Helium-Lecksucher"],
      materials: ["Zentrierring ISO-K DN100 FKM", "Pratzenschrauben"],
      safetyNotes: "Dichtflächen nicht mit bloßen Händen berühren (Fett-/Partikeleintrag). Nitrilhandschuhe tragen.",
      authorId: hoffmann.id,
      steps: {
        create: [
          { order: 1, title: "Dichtflächen prüfen und reinigen", description: "Alle ISO-K-Flansche auf Kratzer prüfen und mit Isopropanol reinigen.", tools: ["Fusselfreie Tücher", "Isopropanol"], parts: [], expectedResult: "Keine sichtbaren Kratzer radial zur Dichtfläche.", isCheckpoint: true, responsibleId: braun.id },
          { order: 2, title: "Leitung montieren und Lecktest", description: "Rohrsegmente mit Zentrierringen und Pratzen verbinden, anschließend Helium-Lecktest.", tools: ["Drehmomentschlüssel 10–60 Nm", "Helium-Lecksucher"], parts: ["Zentrierring ISO-K DN100 FKM"], expectedResult: "Leckrate ≤ 1×10⁻⁶ mbar·l/s.", isCheckpoint: true, safetyCritical: true, responsibleId: braun.id },
        ],
      },
    },
    include: { steps: { include: { responsible: true } }, assembly: true, approvedBy: true },
  });

  // Revision history: v1 + v2 of WI-0001 published, v1 of WI-0002 published, WI-0003 in review.
  const snapRahmenV2 = buildSnapshot(wiRahmen);
  const snapRahmenV1 = { ...snapRahmenV2, version: 1, steps: snapRahmenV2.steps.map((s) => (s.order === 4 ? { ...s, expectedResult: "Anzugsmoment M16: 180 Nm." } : s)) };
  await db.instructionRevision.createMany({
    data: [
      { instructionId: wiRahmen.id, version: 1, status: "PUBLISHED", snapshot: snapRahmenV1, changeNote: "Erstfreigabe", createdById: schmidt.id, createdAt: day(-60) },
      { instructionId: wiRahmen.id, version: 2, status: "IN_REVIEW", snapshot: snapRahmenV2, changeNote: "Anzugsmoment M16 auf 195 Nm korrigiert (Konstruktionsänderung KÄ-112)", createdById: hoffmann.id, createdAt: day(-47) },
      { instructionId: wiRahmen.id, version: 2, status: "APPROVED", snapshot: snapRahmenV2, changeNote: "Fachlich geprüft", createdById: schmidt.id, createdAt: day(-45) },
      { instructionId: wiRahmen.id, version: 2, status: "PUBLISHED", snapshot: snapRahmenV2, changeNote: "Für Produktion freigegeben", createdById: schmidt.id, createdAt: day(-45, 14) },
      { instructionId: wiPumpe.id, version: 1, status: "APPROVED", snapshot: buildSnapshot(wiPumpe), changeNote: "Freigabe Projektleitung", createdById: weber.id, createdAt: day(-12) },
      { instructionId: wiPumpe.id, version: 1, status: "PUBLISHED", snapshot: buildSnapshot(wiPumpe), changeNote: "Für Produktion freigegeben", createdById: weber.id, createdAt: day(-12, 15) },
      { instructionId: wiRohr.id, version: 1, status: "IN_REVIEW", snapshot: buildSnapshot(wiRohr), changeNote: "Zur Prüfung eingereicht", createdById: hoffmann.id, createdAt: day(-2) },
    ],
  });

  // ------------------------------------------------------------ Work orders (5)
  const wo1 = await db.workOrder.create({
    data: { number: "WO-2026-0141", assemblyId: aRahmen.id, workInstructionId: wiRahmen.id, title: "Grundrahmen montieren und ausrichten", status: "COMPLETED", priority: "HIGH", assigneeId: krueger.id, plannedHours: 16, dueDate: day(-38), startedAt: day(-42, 7), completedAt: day(-38, 15), createdAt: day(-50) },
  });
  const wo2 = await db.workOrder.create({
    data: { number: "WO-2026-0142", assemblyId: aPumpe.id, workInstructionId: wiPumpe.id, title: "Vakuumpumpe PU-20 montieren", status: "IN_PROGRESS", priority: "HIGH", assigneeId: krueger.id, plannedHours: 12, dueDate: day(3), startedAt: day(-4, 7), createdAt: day(-14) },
  });
  const wo3 = await db.workOrder.create({
    data: { number: "WO-2026-0143", assemblyId: aRohr.id, workInstructionId: wiRohr.id, title: "Rohrleitungssystem DN100 verlegen", status: "RELEASED", priority: "MEDIUM", assigneeId: braun.id, plannedHours: 20, dueDate: day(12), createdAt: day(-6) },
  });
  const wo4 = await db.workOrder.create({
    data: { number: "WO-2026-0144", assemblyId: aVentil.id, title: "Ventileinheit vormontieren", description: "Pausiert wegen Qualitätsmeldung QM-0001 (Dichtfläche beschädigt).", status: "PAUSED", priority: "HIGH", assigneeId: braun.id, plannedHours: 8, dueDate: day(-1), startedAt: day(-8, 7), createdAt: day(-15) },
  });
  const wo5 = await db.workOrder.create({
    data: { number: "WO-2026-0145", assemblyId: aSteuer.id, title: "Steuerungseinheit CU-10 verdrahten", status: "PLANNED", priority: "MEDIUM", assigneeId: hoffmann.id, plannedHours: 24, dueDate: day(25), createdAt: day(-3) },
  });

  await db.timeEntry.createMany({
    data: [
      { workOrderId: wo1.id, userId: krueger.id, minutes: 480, note: "Rahmen gestellt, Füße montiert", date: day(-42) },
      { workOrderId: wo1.id, userId: braun.id, minutes: 360, note: "Ausrichtung P1–P6", date: day(-41) },
      { workOrderId: wo1.id, userId: krueger.id, minutes: 210, note: "Nacharbeit Messpunkt P3, Endkontrolle", date: day(-38) },
      { workOrderId: wo2.id, userId: krueger.id, minutes: 300, note: "Dämpfer gesetzt, Pumpe abgesetzt", date: day(-4) },
      { workOrderId: wo2.id, userId: braun.id, minutes: 150, note: "Bohrbild Konsole geprüft – Abweichung gemeldet", date: day(-3) },
      { workOrderId: wo4.id, userId: braun.id, minutes: 240, note: "Vormontage Ventilblock bis Befund Dichtfläche", date: day(-8) },
    ],
  });

  const stepsR = snapRahmenV2.steps;
  const stepsP = buildSnapshot(wiPumpe).steps;
  await db.stepExecution.createMany({
    data: [
      ...stepsR.map((s, i) => ({ workOrderId: wo1.id, stepId: s.id, version: 2, status: "DONE" as const, completedById: i % 2 ? braun.id : krueger.id, completedAt: day(-41 + Math.min(i, 3)), resultNote: s.order === 3 ? "Max. 0,18 mm/m nach Nacharbeit P3" : s.order === 4 ? "195 Nm, markiert" : null })),
      { workOrderId: wo2.id, stepId: stepsP[0]!.id, version: 1, status: "DONE", completedById: krueger.id, completedAt: day(-4, 11), resultNote: null },
      { workOrderId: wo2.id, stepId: stepsP[1]!.id, version: 1, status: "DONE", completedById: krueger.id, completedAt: day(-3, 10), resultNote: "85 Nm, 2 Bohrungen nachgesetzt (siehe QM-0002)" },
    ],
  });

  // ------------------------------------------------------------ Tasks (15)
  const taskDefs: Array<Omit<Prisma.TaskUncheckedCreateInput, "workspaceId" | "number">> = [
    { title: "FAT-Prüfplan für VX-400 erstellen", status: "IN_PROGRESS", priority: "HIGH", projectId: vx.id, assigneeId: schmidt.id, dueDate: day(10), labels: ["FAT", "Qualität"], description: "Prüfplan für die Werksabnahme inkl. Leckraten- und Enddruckmessung abstimmen." },
    { title: "Ersatz-Ventilflansch DN100 bestellen", status: "IN_PROGRESS", priority: "CRITICAL", projectId: vx.id, assemblyId: aVentil.id, workOrderId: wo4.id, assigneeId: weber.id, dueDate: day(-2), labels: ["Einkauf", "QM-0001"], description: "Beschädigten Flansch (QM-0001) ersetzen. Lieferzeit beim Hersteller anfragen, Express prüfen." },
    { title: "Bohrbild Pumpenkonsole mit Lieferant klären", status: "REVIEW", priority: "HIGH", projectId: vx.id, assemblyId: aPumpe.id, workOrderId: wo2.id, assigneeId: hoffmann.id, dueDate: day(1), labels: ["Lieferant", "QM-0002"] },
    { title: "Kupplung PU-20 ausrichten", status: "OPEN", priority: "MEDIUM", projectId: vx.id, assemblyId: aKupplung.id, workOrderId: wo2.id, assigneeId: braun.id, dueDate: day(2), labels: ["Montage"] },
    { title: "Montageanweisung WI-0003 prüfen und freigeben", status: "REVIEW", priority: "HIGH", projectId: vx.id, assemblyId: aRohr.id, assigneeId: schmidt.id, dueDate: day(-1), labels: ["Freigabe"], description: "Fachliche Prüfung der Montageanweisung Rohrleitungen DN100." },
    { title: "Schweißnahtporen Rohrbogen bewerten", status: "BLOCKED", priority: "CRITICAL", projectId: vx.id, assemblyId: aRohr.id, assigneeId: schmidt.id, dueDate: day(-3), labels: ["Wareneingang", "QM-0005"], description: "Blockiert: Röntgenbefund vom Lieferanten steht aus." },
    { title: "Schaltplan CU-10 Rev. B freigeben", status: "OPEN", priority: "HIGH", projectId: vx.id, assemblyId: aSteuer.id, assigneeId: hoffmann.id, dueDate: day(6), labels: ["Elektro", "Freigabe"] },
    { title: "Kabelkanäle nachbestellen", status: "BLOCKED", priority: "MEDIUM", projectId: vx.id, assemblyId: aSteuer.id, assigneeId: weber.id, dueDate: day(4), labels: ["Einkauf", "QM-0004"] },
    { title: "Ebenheitsprotokoll Grundrahmen archivieren", status: "DONE", priority: "LOW", projectId: vx.id, assemblyId: aRahmen.id, workOrderId: wo1.id, assigneeId: krueger.id, dueDate: day(-35), completedAt: day(-36), labels: ["Doku"] },
    { title: "Hallenkran-Slot für Kammermontage reservieren", status: "DONE", priority: "MEDIUM", projectId: vx.id, assigneeId: krueger.id, dueDate: day(-10), completedAt: day(-11), labels: ["Logistik"] },
    { title: "Kundentermin Helios: Zwischenstand Montage", status: "OPEN", priority: "MEDIUM", projectId: vx.id, assigneeId: weber.id, dueDate: day(8), labels: ["Kunde"] },
    { title: "Hydraulikschema HP-250 aufnehmen", status: "OPEN", priority: "MEDIUM", projectId: hp.id, assigneeId: hoffmann.id, dueDate: day(20), labels: ["Bestandsaufnahme"] },
    { title: "Risikobeurteilung Retrofit HP-250", status: "IN_PROGRESS", priority: "HIGH", projectId: hp.id, assigneeId: schmidt.id, dueDate: day(14), labels: ["CE", "Sicherheit"] },
    { title: "Prüfstand PS-80 Abschlussdokumentation", status: "DONE", priority: "LOW", projectId: ps.id, assigneeId: schmidt.id, dueDate: day(-22), completedAt: day(-21), labels: ["Doku"] },
    { title: "Werkzeugliste Montage VX-400 aktualisieren", status: "IN_PROGRESS", priority: "LOW", projectId: vx.id, assigneeId: braun.id, dueDate: day(-5), labels: ["Montage", "Werkzeug"] },
  ];
  const tasks = [];
  for (const [i, t] of taskDefs.entries()) {
    tasks.push(await db.task.create({ data: { ...t, workspaceId, number: i + 1, position: i * 1000, reporterId: t.reporterId ?? weber.id, createdAt: day(-30 + i) } }));
  }
  await db.taskComment.createMany({
    data: [
      { taskId: tasks[1]!.id, authorId: weber.id, body: "Hersteller meldet 10 Arbeitstage Standardlieferzeit. Express-Option angefragt.", createdAt: day(-2, 11) },
      { taskId: tasks[1]!.id, authorId: schmidt.id, body: "Bitte Werkstoffzeugnis 3.1 mitbestellen.", createdAt: day(-1, 9) },
      { taskId: tasks[2]!.id, authorId: hoffmann.id, body: "Lieferant bestätigt Fehler in der CAM-Programmierung. Korrigierte Konsole folgt.", createdAt: day(-1, 15) },
      { taskId: tasks[5]!.id, authorId: schmidt.id, body: "Röntgenprüfung beim Lieferanten beauftragt.", createdAt: day(-3, 14) },
    ],
  });

  // ------------------------------------------------------------ Documents (10, metadata only)
  type DocDef = Omit<Prisma.DocumentUncheckedCreateInput, "workspaceId"> & { file: string; mime: string; size: number };
  const docDefs: DocDef[] = [
    { number: "DOC-0001", title: "Aufstellungsplan VX-400", type: "DRAWING", status: "APPROVED", category: "Layout", projectId: vx.id, ownerId: hoffmann.id, tags: ["Layout", "Halle 2"], file: "VX400_Aufstellungsplan_RevB.pdf", mime: "application/pdf", size: 2_480_000, currentVersion: 2, extractedText: "Aufstellungsplan Vakuumanlage VX-400. Stellfläche 6,2 m × 3,8 m in Montagehalle 2. Kranhakenhöhe mind. 4,5 m. Bodenbelastung max. 25 kN/m². Pumpeneinheit PU-20 links neben der Kammer, Schaltschrank CU-10 an der Hallenwand." },
    { number: "DOC-0002", title: "Zeichnung Grundrahmen VX4-100 Rev. C", type: "DRAWING", status: "APPROVED", category: "Konstruktion", projectId: vx.id, assemblyId: aRahmen.id, ownerId: hoffmann.id, tags: ["Rahmen", "S355"], file: "VX4-100_Grundrahmen_RevC.dwg", mime: "application/acad", size: 5_120_000, currentVersion: 3, extractedText: "Grundrahmen VX4-100, Werkstoff S355J2, feuerverzinkt. Gesamtmasse 1.840 kg. Anschlagpunkte 4× Ø40. Nivellierelemente 6× Gelenkfuß M20. Ebenheitstoleranz 0,3 mm/m. Verschraubung Konsole M16 8.8, Anzugsmoment 195 Nm." },
    { number: "DOC-0003", title: "Stückliste Grundrahmen VX4-100", type: "BOM", status: "APPROVED", category: "Stückliste", projectId: vx.id, assemblyId: aRahmen.id, ownerId: hoffmann.id, tags: ["BOM"], file: "VX4-100_Stueckliste.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 84_000, extractedText: "Stückliste VX4-100: Pos.1 Schweißrahmen VX4-110 (1×), Pos.2 Gelenkfuß M20 (6×), Pos.3 Sechskantschraube M16×60 8.8 (12×), Pos.4 Unterlegplatte 5 mm (12×)." },
    { number: "DOC-0004", title: "Datenblatt Vakuumpumpe PU-20", type: "PDF", status: "APPROVED", category: "Datenblatt", projectId: vx.id, assemblyId: aPumpe.id, ownerId: hoffmann.id, tags: ["Pumpe", "Hersteller"], file: "PU-20_Datenblatt.pdf", mime: "application/pdf", size: 1_150_000, extractedText: "Datenblatt Drehschieber-Vakuumpumpe PU-20. Saugvermögen 250 m³/h. Enddruck 5×10⁻² mbar. Motorleistung 5,5 kW, 400 V, 50 Hz. Ölfüllmenge 4,5 l Vakuumpumpenöl VG100. Gewicht 210 kg. Befestigung: 4× Fußschrauben M12, Anzugsmoment 85 Nm, auf Schwingungsdämpfern. Kupplungsausrichtung radial max. 0,1 mm." },
    { number: "DOC-0005", title: "R&I-Schema Rohrleitungssystem", type: "DRAWING", status: "REVIEW", category: "Verfahrenstechnik", projectId: vx.id, assemblyId: aRohr.id, ownerId: hoffmann.id, tags: ["R&I", "DN100"], file: "VX400_RI_Schema_RevA.pdf", mime: "application/pdf", size: 960_000, extractedText: "R&I-Schema VX-400. Hauptsaugleitung DN100 ISO-K, Werkstoff 1.4404. Vorvakuumleitung DN40 KF. Dichtungen: Zentrierringe FKM. Zulässige Leckrate gesamt ≤ 1×10⁻⁶ mbar·l/s. Plattenventil V1 DN100 pneumatisch, Belüftungsventil V2 DN16." },
    { number: "DOC-0006", title: "Montagezeichnung Ventileinheit VX4-400", type: "DRAWING", status: "DRAFT", category: "Konstruktion", projectId: vx.id, assemblyId: aVentil.id, ownerId: hoffmann.id, tags: ["Ventil"], file: "VX4-400_Ventileinheit_Entwurf.pdf", mime: "application/pdf", size: 1_720_000, extractedText: "Entwurf Ventileinheit VX4-400. Plattenventil DN100, Steuerdruck 6 bar. Dichtfläche Rz ≤ 1,6 µm, kratzerfrei." },
    { number: "DOC-0007", title: "Prüfprotokoll Ebenheit Grundrahmen", type: "INSPECTION_REPORT", status: "APPROVED", category: "Prüfprotokoll", projectId: vx.id, assemblyId: aRahmen.id, ownerId: schmidt.id, tags: ["Messprotokoll"], file: "PP_VX4-100_Ebenheit.pdf", mime: "application/pdf", size: 310_000, extractedText: "Prüfprotokoll Ebenheit Grundrahmen VX4-100. Messpunkte P1 0,12 / P2 0,15 / P3 0,18 (nach Nacharbeit, vorher 0,42) / P4 0,10 / P5 0,14 / P6 0,11 mm/m. Toleranz 0,3 mm/m. Ergebnis: in Ordnung. Prüfer: L. Schmidt." },
    { number: "DOC-0008", title: "Schaltplan Steuerung CU-10 Rev. B", type: "PDF", status: "REVIEW", category: "Elektrotechnik", projectId: vx.id, assemblyId: aSteuer.id, ownerId: hoffmann.id, tags: ["Elektro", "Sicherheit"], file: "CU-10_Schaltplan_RevB.pdf", mime: "application/pdf", size: 3_900_000, currentVersion: 2, extractedText: "Schaltplan CU-10 Rev. B. SPS mit dezentraler Peripherie, Versorgung 400 V / 24 V DC. Not-Halt Kategorie 3, PL d nach EN ISO 13849-1. HMI 15 Zoll. Schaltschrank 1200×800×400 mm, IP54." },
    { number: "DOC-0009", title: "Montageanweisung Grundrahmen (PDF-Export)", type: "WORK_INSTRUCTION", status: "APPROVED", category: "Montage", projectId: vx.id, assemblyId: aRahmen.id, workInstructionId: wiRahmen.id, ownerId: hoffmann.id, tags: ["WI-0001"], file: "WI-0001_v2.pdf", mime: "application/pdf", size: 640_000, extractedText: "PDF-Export der freigegebenen Montageanweisung WI-0001 Version 2." },
    { number: "DOC-0010", title: "Fotodokumentation Dichtfläche Ventilflansch", type: "IMAGE", status: "DRAFT", category: "Befund", projectId: vx.id, assemblyId: aVentil.id, ownerId: braun.id, tags: ["QM-0001", "Foto"], file: "Befund_Ventilflansch_01.jpg", mime: "image/jpeg", size: 2_210_000, extractedText: "Foto: radialer Kratzer ca. 6 mm Länge auf der Dichtfläche des Ventilflansches DN100, Position 2 Uhr." },
  ];
  const docs: Record<string, { id: string }> = {};
  for (const [i, d] of docDefs.entries()) {
    const { file, mime, size, ...data } = d;
    const version = data.currentVersion ?? 1;
    docs[d.number] = await db.document.create({
      data: {
        ...data,
        workspaceId,
        createdAt: day(-60 + i * 5),
        versions: {
          create: Array.from({ length: version }, (_, v) => ({
            version: v + 1,
            fileName: file,
            mimeType: mime,
            size: Math.round(size * (0.9 + v * 0.05)),
            storageKey: null,
            changeNote: v === 0 ? "Erstausgabe" : `Revision ${String.fromCharCode(65 + v)}`,
            uploadedById: data.ownerId,
            createdAt: day(-60 + i * 5 + v * 6),
          })),
        },
      },
    });
  }

  // ------------------------------------------------------------ Quality issues (5)
  const q1 = await db.qualityIssue.create({
    data: {
      workspaceId, number: "QM-0001", title: "Dichtfläche Ventilflansch DN100 beschädigt", type: "DEFECT", severity: "MAJOR", status: "ACTION_REQUIRED",
      description: "Bei der Vormontage der Ventileinheit wurde ein radialer Kratzer (ca. 6 mm) auf der Dichtfläche des Ventilflansches festgestellt. Dichtheit nicht gewährleistet.",
      rootCause: "Vermutlich Transportschaden – Schutzkappe fehlte bei Wareneingang.",
      reporterId: braun.id, assigneeId: weber.id, dueDate: day(5), projectId: vx.id, machineId: mVx.id, assemblyId: aVentil.id, workOrderId: wo4.id, taskId: tasks[1]!.id, documentId: docs["DOC-0010"]!.id, createdAt: day(-8, 13),
      actions: { create: [
        { title: "Flansch sperren und kennzeichnen", type: "CONTAINMENT", assigneeId: braun.id, dueDate: day(-8), done: true, result: "Gesperrt, Sperrzettel angebracht." },
        { title: "Ersatzflansch beschaffen", type: "CORRECTIVE", assigneeId: weber.id, dueDate: day(3) },
        { title: "Wareneingangsprüfung um Schutzkappen-Check erweitern", type: "PREVENTIVE", assigneeId: schmidt.id, dueDate: day(14) },
      ] },
    },
  });
  await db.qualityIssue.create({
    data: {
      workspaceId, number: "QM-0002", title: "Bohrbild Pumpenkonsole weicht ab", type: "DEVIATION", severity: "MAJOR", status: "IN_REVIEW",
      description: "Bohrungen der Pumpenkonsole weichen um ca. 1,5 mm vom Fußbild der Pumpe ab. Zwei Bohrungen wurden nach Rücksprache mit der Konstruktion nachgesetzt.",
      rootCause: "Fehler in der CAM-Programmierung beim Lieferanten.",
      reporterId: braun.id, assigneeId: hoffmann.id, dueDate: day(2), projectId: vx.id, machineId: mPu.id, assemblyId: aPumpe.id, workOrderId: wo2.id, taskId: tasks[2]!.id, documentId: docs["DOC-0004"]!.id, createdAt: day(-3, 11),
      actions: { create: [
        { title: "Bohrungen nachsetzen (Freigabe Konstruktion)", type: "CORRECTIVE", assigneeId: krueger.id, dueDate: day(-3), done: true, result: "2 Bohrungen Ø13 nachgesetzt." },
        { title: "Lieferantenreklamation 8D anfordern", type: "PREVENTIVE", assigneeId: hoffmann.id, dueDate: day(7) },
      ] },
    },
  });
  await db.qualityIssue.create({
    data: {
      workspaceId, number: "QM-0003", title: "Ebenheit Grundrahmen an P3 außerhalb Toleranz", type: "INSPECTION", severity: "MINOR", status: "RESOLVED",
      description: "Messpunkt P3: 0,42 mm/m bei Toleranz 0,3 mm/m.", rootCause: "Unebenheit Hallenboden im Bereich P3.",
      reporterId: schmidt.id, assigneeId: krueger.id, dueDate: day(-38), resolvedAt: day(-38, 14), projectId: vx.id, machineId: mVx.id, assemblyId: aRahmen.id, workOrderId: wo1.id, documentId: docs["DOC-0007"]!.id, createdAt: day(-40, 10),
      actions: { create: [
        { title: "Unterlegplatte 2 mm an P3 setzen und nachmessen", type: "CORRECTIVE", assigneeId: krueger.id, dueDate: day(-38), done: true, result: "Nachmessung P3: 0,18 mm/m – i.O." },
        { title: "Nachmessung dokumentieren", type: "VERIFICATION", assigneeId: schmidt.id, dueDate: day(-38), done: true, result: "Im Prüfprotokoll DOC-0007 dokumentiert." },
      ] },
    },
  });
  await db.qualityIssue.create({
    data: {
      workspaceId, number: "QM-0004", title: "Lieferung Kabelkanäle unvollständig", type: "COMPLAINT", severity: "MINOR", status: "NEW",
      description: "Lieferschein 4471-22: Es fehlen 6 von 20 Kabelkanälen 60×80 mm.", reporterId: hoffmann.id, assigneeId: weber.id, dueDate: day(6), projectId: vx.id, machineId: mCu.id, assemblyId: aSteuer.id, taskId: tasks[7]!.id, createdAt: day(-1, 16),
    },
  });
  await db.qualityIssue.create({
    data: {
      workspaceId, number: "QM-0005", title: "Schweißnahtporen an Rohrbogen DN100 (Wareneingang)", type: "DEFECT", severity: "CRITICAL", status: "INVESTIGATING",
      description: "Sichtprüfung im Wareneingang: Porennest an der Rundnaht von Rohrbogen DN100 90°, Charge 2026-447. Für Vakuumanwendung potenziell undicht.",
      reporterId: schmidt.id, assigneeId: schmidt.id, dueDate: day(-1), projectId: vx.id, machineId: mVx.id, assemblyId: aRohr.id, taskId: tasks[5]!.id, documentId: docs["DOC-0005"]!.id, createdAt: day(-5, 9),
      actions: { create: [
        { title: "Charge 2026-447 sperren", type: "CONTAINMENT", assigneeId: schmidt.id, dueDate: day(-5), done: true, result: "3 Rohrbögen gesperrt." },
        { title: "Röntgenprüfung beim Lieferanten", type: "VERIFICATION", assigneeId: schmidt.id, dueDate: day(2) },
      ] },
    },
  });

  // ------------------------------------------------------------ Notifications (10)
  await db.notification.createMany({
    data: [
      { workspaceId, userId: weber.id, type: "QUALITY_ISSUE_CREATED", title: "Neue Qualitätsmeldung QM-0004", body: "Lieferung Kabelkanäle unvollständig", link: "/quality/" + (await idOf("QM-0004")), createdAt: day(-1, 16) },
      { workspaceId, userId: weber.id, type: "TASK_OVERDUE", title: "Aufgabe überfällig: TSK-2", body: "Ersatz-Ventilflansch DN100 bestellen", link: `/tasks/${tasks[1]!.id}`, createdAt: day(0, 7) },
      { workspaceId, userId: weber.id, type: "INSTRUCTION_REVIEW", title: "Montageanweisung zur Freigabe eingereicht", body: "WI-0003 Rohrleitungen DN100 verlegen und abdichten", link: `/work-instructions/${wiRohr.id}`, createdAt: day(-2, 10) },
      { workspaceId, userId: weber.id, type: "DOCUMENT_REVIEW", title: "Dokument zur Freigabe eingereicht", body: "DOC-0008 Schaltplan Steuerung CU-10 Rev. B", link: `/documents/${docs["DOC-0008"]!.id}`, createdAt: day(-2, 15) },
      { workspaceId, userId: weber.id, type: "TASK_ASSIGNED", title: "Neue Aufgabe zugewiesen: TSK-8", body: "Kabelkanäle nachbestellen", link: `/tasks/${tasks[7]!.id}`, createdAt: day(-1, 17) },
      { workspaceId, userId: weber.id, type: "COMMENT", title: "Neuer Kommentar von Lena Schmidt", body: "Bitte Werkstoffzeugnis 3.1 mitbestellen.", link: `/tasks/${tasks[1]!.id}`, createdAt: day(-1, 9) },
      { workspaceId, userId: weber.id, type: "WORK_ORDER_COMPLETED", title: "Montageauftrag abgeschlossen", body: "WO-2026-0141 Grundrahmen montieren und ausrichten", link: `/assembly/work-orders/${wo1.id}`, createdAt: day(-38, 15), readAt: day(-37) },
      { workspaceId, userId: weber.id, type: "QUALITY_ISSUE_CREATED", title: "Kritische Qualitätsmeldung QM-0005", body: "Schweißnahtporen an Rohrbogen DN100", link: "/quality/" + (await idOf("QM-0005")), createdAt: day(-5, 9), readAt: day(-5, 10) },
      { workspaceId, userId: schmidt.id, type: "INSTRUCTION_REVIEW", title: "Prüfung angefordert: WI-0003", body: "Rohrleitungen DN100 verlegen und abdichten", link: `/work-instructions/${wiRohr.id}`, createdAt: day(-2, 10) },
      { workspaceId, userId: braun.id, type: "TASK_ASSIGNED", title: "Neue Aufgabe zugewiesen: TSK-4", body: "Kupplung PU-20 ausrichten", link: `/tasks/${tasks[3]!.id}`, createdAt: day(-3, 8) },
    ],
  });

  // ------------------------------------------------------------ Activity feed
  await db.activity.createMany({
    data: [
      { workspaceId, actorId: hoffmann.id, entityType: "quality", entityId: (await idOf("QM-0004"))!, action: "created", summary: "hat QM-0004 „Lieferung Kabelkanäle unvollständig“ gemeldet", link: "/quality/" + (await idOf("QM-0004")), createdAt: day(-1, 16) },
      { workspaceId, actorId: hoffmann.id, entityType: "task", entityId: tasks[2]!.id, action: "status", summary: "hat TSK-3 nach Review verschoben", link: `/tasks/${tasks[2]!.id}`, createdAt: day(-1, 15) },
      { workspaceId, actorId: hoffmann.id, entityType: "instruction", entityId: wiRohr.id, action: "review", summary: "hat WI-0003 zur Prüfung eingereicht", link: `/work-instructions/${wiRohr.id}`, createdAt: day(-2, 10) },
      { workspaceId, actorId: krueger.id, entityType: "workOrder", entityId: wo2.id, action: "step", summary: "hat Schritt 2 in WO-2026-0142 abgeschlossen", link: `/assembly/work-orders/${wo2.id}`, createdAt: day(-3, 10) },
      { workspaceId, actorId: braun.id, entityType: "quality", entityId: (await idOf("QM-0002"))!, action: "created", summary: "hat QM-0002 „Bohrbild Pumpenkonsole weicht ab“ gemeldet", link: "/quality/" + (await idOf("QM-0002")), createdAt: day(-3, 11) },
      { workspaceId, actorId: schmidt.id, entityType: "quality", entityId: (await idOf("QM-0005"))!, action: "created", summary: "hat QM-0005 „Schweißnahtporen an Rohrbogen DN100“ gemeldet", link: "/quality/" + (await idOf("QM-0005")), createdAt: day(-5, 9) },
      { workspaceId, actorId: braun.id, entityType: "quality", entityId: q1.id, action: "created", summary: "hat QM-0001 „Dichtfläche Ventilflansch DN100 beschädigt“ gemeldet", link: `/quality/${q1.id}`, createdAt: day(-8, 13) },
      { workspaceId, actorId: weber.id, entityType: "instruction", entityId: wiPumpe.id, action: "published", summary: "hat WI-0002 v1 für die Produktion freigegeben", link: `/work-instructions/${wiPumpe.id}`, createdAt: day(-12, 15) },
      { workspaceId, actorId: krueger.id, entityType: "workOrder", entityId: wo1.id, action: "completed", summary: "hat WO-2026-0141 abgeschlossen", link: `/assembly/work-orders/${wo1.id}`, createdAt: day(-38, 15) },
    ],
  });

  async function idOf(number: string) {
    return (await db.qualityIssue.findFirst({ where: { workspaceId, number }, select: { id: true } }))?.id;
  }

  console.log("✔ Seed complete: NordTech Maschinenbau GmbH");
  console.log("  Login: m.weber@nordtech.demo / demo1234 (weitere Benutzer siehe README)");
  void fischer;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
