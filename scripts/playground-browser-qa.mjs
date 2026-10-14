import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const output = 'artifacts/playground';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
page.on('pageerror', err => errors.push('pageerror: ' + err.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
page.on('response', response => {
  if (response.status() >= 400 && !response.url().endsWith('/favicon.ico'))
    errors.push('HTTP ' + response.status() + ': ' + response.url());
});

try {
  const url = 'http://127.0.0.1:4173/ppae-engine/';
  let loaded = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    try { await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 }); loaded = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 650)); }
  }
  if (!loaded) throw new Error('Vite preview never served compiled /ppae-engine/ assets');
  const nav = page.locator('#section-nav .nav-link');
  const total = await nav.count();
  if (total < 17) {
    await page.screenshot({ path: join(output, '00-diagnostic.png'), fullPage: true });
    const pageHtml = (await page.content()).slice(0, 3000);
    const failed = errors.join(' | ');
    const navigation = await page.evaluate(() => ({
      location: location.href,
      title: document.title,
      ready: document.readyState,
      sectionNav: !!document.getElementById('section-nav'),
      scriptUrls: [...document.querySelectorAll('script')].map(el => el.src),
      previewText: document.getElementById('engine-live')?.textContent,
      mainText: document.body.innerText.slice(0, 800)
    }));
    throw new Error('Only ' + total + ' navigation sections; expected 17. ' +
      'diagnostic=' + JSON.stringify(navigation) + '; browser errors=' + failed +
      '; HTML=' + pageHtml);
  }

  for (let index = 0; index < total; index++) {
    await nav.nth(index).click();
    const section = new URL(page.url()).hash.replace('#', '');
    await page.waitForFunction(id => {
      const action = document.querySelector('#stage-action')?.textContent || '';
      return action.startsWith(id.toUpperCase() + ' /') &&
        document.querySelector('#engine-live')?.textContent === 'RENDER OK';
    }, section, { timeout: 30000 });
    await page.waitForFunction(() => {
      const tiles = [...document.querySelectorAll('.asset-thumb canvas')];
      return tiles.length > 0 && tiles.every(canvas =>
        canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0);
    }, null, { timeout: 30000 });
    if (await page.locator('.error-banner').count())
      throw new Error('Gallery generation failed in section ' + section);
    await page.screenshot({ path: join(output, String(index + 1).padStart(2, '0') + '-' + section + '.png'), fullPage: true });
    console.log('BROWSER OK', index + 1, '/', total, section,
      (await page.locator('#render-stats').innerText()).trim());
  }

  await page.locator('#section-nav .nav-link').nth(1).click();
  await page.locator('#direction-select').selectOption('NE');
  await page.locator('#action-select').selectOption('walk');
  await page.locator('#profile-select').selectOption('detailed-32x32');
  await page.waitForFunction(() => document.querySelector('#render-stats')?.textContent?.includes('detailed-32x32'), null, { timeout: 30000 });
  await page.screenshot({ path: join(output, '18-player-32px-NE.png'), fullPage: true });

  for (const [selector, filename] of [
    ['#download-png', 'export-preview.png'],
    ['#download-atlas', 'export-atlas.png'],
    ['#download-json', 'export-atlas.json']
  ]) {
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 45000 }), page.locator(selector).click()]);
    if (await download.failure()) throw new Error('Download failed: ' + selector);
    await download.saveAs(join(output, filename));
    console.log('DOWNLOAD OK', selector, download.suggestedFilename());
  }

  await page.locator('#profile-select').selectOption('micro-6x6');
  await page.locator('#section-nav .nav-link').nth(3).click();
  await page.locator('#age-select').selectOption('juvenile');
  await page.locator('#health-select').selectOption('wounded');
  await page.locator('#direction-select').selectOption('SW');
  await page.waitForFunction(() => document.querySelector('#stage-action')?.textContent?.startsWith('CREATURES /'), null, { timeout: 30000 });
  await page.screenshot({ path: join(output, '19-creatures-juvenile-wounded-SW.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#toggle-sidebar').click();
  if (await page.locator('#toggle-sidebar').getAttribute('aria-expanded') !== 'true')
    throw new Error('Mobile navigation did not open');
  await page.locator('#section-nav .nav-link').nth(14).click();
  if (await page.locator('#toggle-sidebar').getAttribute('aria-expanded') !== 'false')
    throw new Error('Mobile navigation did not close on selection');
  await page.waitForFunction(() => document.querySelector('#stage-action')?.textContent?.startsWith('PARTICLES /'), null, { timeout: 30000 });
  await page.screenshot({ path: join(output, '20-mobile-vfx.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error('Horizontal overflow on mobile: ' + overflow + 'px');
  if (errors.length) throw new Error('Browser errors:\n' + errors.join('\n'));
  console.log('BROWSER QA PASS: ' + total + ' sections, spritesheet and PNG/JSON exports, 32px, creature variants, 390px mobile');
} finally {
  await browser.close();
}
