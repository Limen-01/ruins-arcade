import { chromium } from '@playwright/test';

const root = process.env.PAGES_TEST_URL || 'http://127.0.0.1:4173/ruins-arcade/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const badResponses = [];
page.on('response', response => {
  if (response.status() >= 400) badResponses.push([response.status(), response.url()]);
});

try {
  await page.goto(root);
  await page.locator('#play').waitFor();
  const manifest = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
  const worker = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return { scope: registration.scope, controlled: Boolean(navigator.serviceWorker.controller) };
  });
  const assets = await page.evaluate(async () => {
    const list = await (await fetch('./asset-list.json')).json();
    const statuses = await Promise.all(list.map(async path => [path, (await fetch(path)).status]));
    return { count: list.length, bad: statuses.filter(([, status]) => status !== 200) };
  });

  await page.evaluate(() => localStorage.setItem('ruins-arcade-v1', JSON.stringify({ sound: true, haptic: false, reduced: true, tutorial: true })));
  await page.reload();
  await page.locator('#play').click();
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  await page.locator('#sound').click();
  const sound = await page.locator('#sound').getAttribute('aria-pressed');

  const stages = [];
  for (const [pattern, label] of [
    ['arrow-volley', '古代弩機'],
    ['lightning-scatter', '落雷機關'],
    ['flame-multi-line', '獸首火焰'],
    ['ground-fire-islands', '地面火焰']
  ]) {
    await page.goto(`${root}?capture=pattern&pattern=${pattern}`);
    await page.locator('#overlay').waitFor({ state: 'hidden' });
    stages.push({ label, available: (await page.locator('#stage').textContent()).includes(label) });
  }
  await page.goto(`${root}?capture=mixed`);
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  stages.push({ label: '混合機關', available: (await page.locator('#stage').textContent()).includes('混合機關') });

  await page.goto(root);
  await page.locator('#play').waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.locator('#play').waitFor();
  const offlineControlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));

  const result = { url: page.url(), manifest, worker, offlineControlled, assets, sound, stages, badResponses };
  console.log(JSON.stringify(result, null, 2));
  if (!worker.scope.endsWith('/ruins-arcade/') || !offlineControlled || assets.bad.length || badResponses.length || sound !== 'false' || stages.some(stage => !stage.available)) process.exitCode = 1;
} finally {
  await browser.close();
}
