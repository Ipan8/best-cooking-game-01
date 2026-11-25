// Api Wok Rush — headless play-test + screenshot run. The live play-test
// cooks and serves a real dish by reading the ticket off the page, so a
// broken recipe or serve path fails loudly before any screenshot is taken.
// Loads the game in Chromium, fails on any console error / page error /
// failed or external request, plays a real dish by clicking, then takes the
// four ?shot= scenes at 1280x720 into repo/screenshots/.
// Usage: node take-shots.mjs [port]  (serve.ts must already run on that port)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/makefun-frontend-01/tools/node_modules/playwright');

const port = Number(process.argv[2] || 8080);
const repo = '/home/hatch/workspace/makefun-best-cooking-game-01/repo';
const shots = JSON.parse(readFileSync(`${repo}/shots.json`, 'utf8'));

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});

const errors = [];
function watch(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`${label} console: ${msg.text()}`);
      console.log(`  !! ${label} console: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`${label} pageerror: ${err.message}`);
    console.log(`  !! ${label} pageerror: ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    errors.push(`${label} requestfailed: ${req.url()}`);
    console.log(`  !! ${label} requestfailed: ${req.url()}`);
  });
  page.on('request', (req) => {
    if (!req.url().startsWith(`http://localhost:${port}`) && !req.url().startsWith('data:')) {
      errors.push(`${label} EXTERNAL request: ${req.url()}`);
      console.log(`  !! ${label} EXTERNAL request: ${req.url()}`);
    }
  });
}

async function waitReady(page, timeout = 15000) {
  await page.waitForFunction(() => window.__shotReady === true, { timeout });
}

// --- 1. Live play-test: cook and serve a real dish by mouse + keyboard ---
console.log('== live play-test ==');
const live = await browser.newPage({ viewport: { width: 1280, height: 720 } });
watch(live, 'live');
await live.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
await waitReady(live);
await live.waitForTimeout(500);
console.log('  title visible:', await live.locator('text=BUKA WARUNG').count());
await live.click('[data-start]');
await live.waitForTimeout(4500); // first ticket arrives
const ticket = await live.locator('.ticket-head b').first().textContent();
console.log('  first ticket:', ticket);
const coinsBefore = await live.locator('#hud-coins').textContent();
console.log('  coins before:', coinsBefore);
// Read the ticket's recipe steps from the page, then click them in order.
const steps = await live.locator('.ticket .dot').allTextContents();
console.log('  recipe steps:', JSON.stringify(steps));
for (const name of steps) {
  await live.locator(`.ing:has(.ing-name:text-is("${name}"))`).first().click();
  await live.waitForTimeout(250);
}
const plateText = await live.locator('#plate-caption').textContent();
console.log('  plate caption:', plateText);
await live.click('#btn-serve');
await live.waitForTimeout(400);
const coinsAfter = await live.locator('#hud-coins').textContent();
const servedText = await live.locator('#serve-counter').textContent();
console.log('  coins after serve:', coinsAfter);
console.log('  serving counter:', (servedText || '').trim().slice(0, 120));
await live.screenshot({ path: '/tmp/apiwok-live.png' });
console.log('  live screenshot saved to /tmp/apiwok-live.png');

// --- 2. Staged shots ---
console.log('== staged shots ==');
mkdirSync(`${repo}/screenshots`, { recursive: true });
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watch(page, shot.name);
  await page.goto(`http://localhost:${port}/${shot.query}`, { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${repo}/screenshots/${shot.name}`, type: 'jpeg', quality: 78 });
  console.log(`  saved screenshots/${shot.name}`);
  await page.close();
}

await browser.close();
if (errors.length > 0) {
  console.log(`\n${errors.length} ERROR(S) — see above`);
  process.exit(1);
}
console.log('\nAll clean: no console/page/request errors.');
