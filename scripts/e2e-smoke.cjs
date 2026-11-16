const { chromium } = require('playwright');
/**
 * End-to-end smoke test (36 checks) for ASSEMBLY OS.
 * Requires a running app with FRESHLY SEEDED demo data (npm run db:reset) and Playwright:
 *   npm run build && npm start     # in one terminal
 *   node scripts/e2e-smoke.cjs     # in another (BASE_URL defaults to http://localhost:3000)
 * Note: the test modifies demo data – run `npm run db:reset` afterwards.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const DOC = path.join(os.tmpdir(), 'e2e-doc.txt');
fs.writeFileSync(DOC, 'Testinhalt Ventileinheit: Drehmoment Flanschschrauben 42 Nm. Dichtung FKM.');
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const toast = async () => { const t = page.locator('[data-sonner-toast]').last(); await t.waitFor({ timeout: 15000 }); const s = await t.innerText(); return s; };
  const vis = (loc, t = 15000) => loc.first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
  const toastHas = (text) => vis(page.locator('[data-sonner-toast]', { hasText: text }));

  // 1 Login (wrong password, then right)
  await page.goto(BASE + '/login');
  await page.fill('#password', 'falsch');
  await page.click('button[type=submit]');
  ok('login rejects wrong password', await vis(page.getByText('E-Mail oder Passwort ist falsch')));
  await page.fill('#password', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL(BASE + '/');
  ok('dashboard loads', await vis(page.getByText('Active Projects')));

  // 2 Create project (with validation)
  await page.goto(BASE + '/projects?new=1');
  await page.getByRole('button', { name: 'Projekt anlegen' }).click();
  ok('project validation shows errors', await vis(page.getByText('Projektname ist erforderlich')));
  await page.fill('#name', 'E2E Testanlage TX-1');
  await page.fill('#key', 'E2E');
  await page.fill('#customer', 'Testkunde GmbH');
  await page.getByRole('button', { name: 'Projekt anlegen' }).click();
  await page.waitForURL(/\/projects\/c/, { timeout: 20000, waitUntil: 'commit' });
  ok('project created', await vis(page.getByRole('heading', { name: 'E2E Testanlage TX-1' })));
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  await page.fill('#customer', 'Geänderter Kunde AG');
  await page.getByRole('button', { name: 'Speichern' }).click();
  ok('project edited', await toastHas('Projekt aktualisiert'));
  await page.waitForTimeout(800);
  ok('project edit visible', await vis(page.getByText('Geänderter Kunde AG')));
  await page.getByRole('button', { name: 'Archivieren' }).click();
  ok('project archived', await toastHas('archiviert'));

  // 3 Task create + comment + attachment + status
  await page.goto(BASE + '/tasks?view=table');
  await page.getByRole('button', { name: 'Neue Aufgabe' }).click();
  await page.fill('#title', 'E2E Aufgabe Drehmoment prüfen');
  await page.selectOption('#priority', 'HIGH');
  await page.getByRole('button', { name: 'Aufgabe erstellen' }).click();
  await page.waitForURL(/\/tasks\/c/, { timeout: 20000, waitUntil: 'commit' });
  ok('task created', await vis(page.getByRole('heading', { name: 'E2E Aufgabe Drehmoment prüfen' })));
  await page.fill('textarea[aria-label=Kommentar]', 'E2E Kommentar');
  await page.getByRole('button', { name: 'Kommentieren' }).click();
  ok('comment added', await vis(page.getByText('E2E Kommentar')));
  await page.setInputFiles('input[type=file]', DOC);
  ok('attachment uploaded', await vis(page.getByText('e2e-doc.txt')));
  await page.selectOption('select[aria-label="Status ändern"]', 'REVIEW');
  ok('task status changed', await toastHas('gespeichert'));

  // 4 Kanban drag & drop
  await page.goto(BASE + '/tasks');
  const card = page.locator('article', { hasText: 'Kupplung PU-20 ausrichten' });
  const target = page.locator('section', { has: page.getByRole('heading', { name: 'Review', exact: true }) }).locator('div.min-h-40');
  await card.waitFor(); await target.waitFor();
  const cb = await card.boundingBox(); const tb = await target.boundingBox();
  await page.mouse.move(cb.x + 40, cb.y + 20); await page.mouse.down();
  await page.mouse.move(cb.x + 60, cb.y + 40, { steps: 5 });
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height - 20, { steps: 20 });
  await page.mouse.up();
  ok('kanban drag changes status', await toastHas('→ Review'));

  // 5 Quality issue
  await page.goto(BASE + '/quality?new=1');
  await page.fill('#title', 'E2E Kratzer an Flansch');
  await page.fill('#description', 'Kratzer 3 mm festgestellt.');
  await page.getByRole('button', { name: 'Meldung erstellen' }).click();
  await page.waitForURL(/\/quality\/c/, { timeout: 20000, waitUntil: 'commit' });
  ok('quality issue created', await vis(page.getByRole('heading', { name: 'E2E Kratzer an Flansch' })));
  await page.getByRole('button', { name: 'Closed' }).click();
  ok('close without root cause blocked', await toastHas('Ursache'));

  // 6 Document upload + review + approve
  await page.goto(BASE + '/documents?upload=1');
  await page.setInputFiles('input[type=file]', DOC);
  await page.getByRole('button', { name: 'Hochladen' }).last().click();
  await page.waitForURL(/\/documents\/c/, { timeout: 20000, waitUntil: 'commit' });
  ok('document uploaded', await vis(page.getByText('Testinhalt Ventileinheit')));
  await page.getByRole('button', { name: 'Zur Freigabe einreichen' }).click();
  await page.getByRole('button', { name: 'Freigeben' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Freigeben' }).click();
  await page.waitForTimeout(1500);
  ok('document approved', await vis(page.getByText('Approved')));

  // 7 Work instruction create + review + four-eyes
  await page.goto(BASE + '/work-instructions/new');
  await page.getByPlaceholder('z. B. Ventileinheit DN100 montieren').fill('E2E Anweisung Flansch montieren');
  await page.locator('li input').first().fill('Flansch reinigen');
  await page.locator('li textarea').first().fill('Mit Isopropanol reinigen.');
  await page.getByRole('button', { name: 'Entwurf anlegen' }).click();
  await page.waitForURL(/\/work-instructions\/c/, { timeout: 20000, waitUntil: 'commit' });
  ok('instruction draft created', await vis(page.getByText('Editor-Ansicht – kein gültiges Produktionsdokument')));
  await page.getByRole('button', { name: 'Zur Prüfung einreichen' }).click();
  await page.getByRole('button', { name: 'Fachlich freigeben' }).waitFor({ timeout: 15000 });
  ok('four-eyes: author cannot approve', await page.getByRole('button', { name: 'Fachlich freigeben' }).isDisabled());
  const wiUrl = page.url();
  await page.goto(wiUrl + '/released');
  ok('unreleased instruction not shown as production', await vis(page.getByText('Keine freigegebene Version')));

  // 8 Execution rules
  await page.goto(BASE + '/assembly?q=0143', { waitUntil: 'load' });
  await page.goto(BASE + await page.getByRole('link', { name: /Rohrleitungssystem DN100/ }).first().getAttribute('href'), { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Starten' }).click();
  ok('start blocked without published instruction', await toastHas('nicht veröffentlicht'));
  await page.goto(BASE + '/assembly?q=0142', { waitUntil: 'load' });
  await page.goto(BASE + await page.getByRole('link', { name: /Vakuumpumpe PU-20 montieren/ }).first().getAttribute('href'), { waitUntil: 'load' });
  await page.goto(BASE + await page.getByRole('link', { name: 'Montage ausführen' }).getAttribute('href'));
  await page.getByRole('button', { name: 'Schritt i.O.' }).first().click();
  ok('checkpoint requires result', await vis(page.getByText('Prüfpunkt: Messwert / Ergebnis eintragen.')));
  await page.locator('textarea[aria-label="Ergebnis Schritt 3"]').fill('Radial 0,05 mm');
  await page.getByRole('button', { name: 'Schritt i.O.' }).first().click();
  ok('step recorded', await toastHas('Schritt 3 i.O.'));

  // 9 Search + copilot + reports + notifications
  const sr = await page.request.get(BASE + '/api/search?q=Pumpe');
  const hits = (await sr.json()).hits || [];
  ok('global search returns categorized hits', hits.length > 2, `${hits.length} hits: ${[...new Set(hits.map(h => h.category))].join(',')}`);
  await page.goto(BASE + '/search?q=DN100');
  ok('search page shows results', await vis(page.getByText(/Treffer für „DN100“/)));
  await page.goto(BASE + '/copilot');
  await page.fill('textarea[aria-label="Frage an ASSEMBLY AI"]', 'Fasse die offenen Qualitätsmeldungen zusammen');
  await page.keyboard.press('Enter');
  ok('copilot answers with sources', await vis(page.getByText('Quellen')));
  await page.goto(BASE + '/reports?period=all');
  ok('reports render', await vis(page.getByText('Fehlerquote Aufträge')));
  await page.goto(BASE + '/notifications');
  ok('notifications page', await vis(page.getByText('ungelesen')));

  // 10 workspace switch -> empty state
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: /NordTech Maschinenbau/ }).click();
  await page.getByRole('menuitem', { name: /Service & Retrofit/ }).click();
  ok('workspace switch shows empty state', await vis(page.getByText('Dieser Workspace enthält noch keine Projekte')));
  await page.getByRole('button', { name: /Service & Retrofit/ }).click();
  await page.getByRole('menuitem', { name: /NordTech Maschinenbau GmbH/ }).click();
  await page.waitForTimeout(1500);

  // 11 Mobile
  const m = await browser.newPage({ ...require('playwright').devices['iPhone 13'] });
  m.on('pageerror', e => errors.push('mobile: ' + e.message));
  await m.context().addCookies(await page.context().cookies());
  for (const p of ['/', '/tasks', '/assembly']) {
    await m.goto(BASE + p, { waitUntil: 'load' });
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`mobile ${p} no horizontal page overflow`, overflow <= 1, `overflow=${overflow}`);
      }
  await m.getByRole('button', { name: 'Menü öffnen' }).click();
  ok('mobile drawer opens', await vis(m.getByRole('link', { name: 'Work Instructions' })));

  console.log(results.join('\n'));
  console.log('page errors:', errors.length ? errors.slice(0, 5).join('\n') : 'none');
  if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exitCode = 1;
  await browser.close();
})().catch(e => { console.log(results.join('\n')); console.error('ABORTED', e.message); process.exit(1); });
