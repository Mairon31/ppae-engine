import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
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
  if (total < 30) {
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
    throw new Error('Only ' + total + ' navigation sections; expected 30. ' +
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
  await nav.filter({ hasText: 'Bestiario' }).click();
  await page.locator('#age-select').selectOption('juvenile');
  await page.locator('#health-select').selectOption('wounded');
  await page.locator('#direction-select').selectOption('SW');
  await page.waitForFunction(() => document.querySelector('#stage-action')?.textContent?.startsWith('CREATURES /'), null, { timeout: 30000 });
  await page.screenshot({ path: join(output, '19-creatures-juvenile-wounded-SW.png'), fullPage: true });

  // Actual avatar editor: interactive rig/equipment/color customization, seeded
  // randomizer, and a downloadable source definition from the edited state.
  await nav.filter({ hasText: 'Creador de personajes' }).click();
  if (await page.locator('#play-toggle').getAttribute('aria-pressed') === 'true')
    await page.locator('#play-toggle').click();
  await page.locator('#avatar-helmet').selectOption('none');
  await page.locator('#avatar-hairStyle').selectOption('mohawk');
  await page.locator('#avatar-armor').selectOption('mage_robe');
  await page.locator('#avatar-skinColorHex').fill('#b97a45');
  await page.waitForTimeout(250);
  const edited = await page.locator('#world-stage').evaluate(canvas => canvas.toDataURL());
  await page.locator('#avatar-randomize').click();
  await page.waitForTimeout(250);
  const rerolled = await page.locator('#world-stage').evaluate(canvas => canvas.toDataURL());
  if (edited === rerolled) throw new Error('Avatar randomizer did not change generated pixels');
  const [avatarDownload] = await Promise.all([
    page.waitForEvent('download'), page.locator('#avatar-export-json').click()
  ]);
  const avatarPath = join(output, 'avatar-definition.json');
  await avatarDownload.saveAs(avatarPath);
  const avatarJson = JSON.parse(readFileSync(avatarPath, 'utf8'));
  if (!avatarJson.appearance?.hairStyle || !avatarJson.equipment?.armor)
    throw new Error('Avatar JSON definition missing appearance or equipment');
  await page.screenshot({ path: join(output, '31-avatar-customizer.png'), fullPage: true });
  console.log('AVATAR LAB OK: edited attributes, reroll, definition JSON');

  await nav.filter({ hasText: 'Diversidad de NPCs' }).click();
  await page.locator('#catalog-search').fill('town_guard');
  await page.waitForFunction(() => document.querySelector('#gallery-range')?.textContent?.includes('de 8'));
  if (await page.locator('.asset-card').count() !== 6) throw new Error('Filtered NPC gallery count mismatch');
  await page.locator('#catalog-search').fill('');
  await nav.filter({ hasText: 'Autotiling 8 vecinos' }).click();
  await page.locator('#catalog-search').fill('255');
  if (await page.locator('.asset-card').count() !== 1) throw new Error('Mask search failed');
  await page.locator('#catalog-search').fill('');

  await nav.filter({ hasText: 'Variantes de criaturas' }).click();
  await page.locator('.asset-card').nth(1).click();
  const [variantExport] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  await variantExport.saveAs(join(output, 'creature-variant-atlas.json'));
  if (await variantExport.failure()) throw new Error('Variant atlas export failed');
  await page.screenshot({ path: join(output, '32-creature-variants.png'), fullPage: true });
  console.log('EXTENDED CATALOG OK: NPC filter, canonical masks, variant atlas');
  
  await nav.filter({ hasText: 'Ciclos de árboles' }).click();
  const firstTree = await page.locator('.asset-card strong').first().innerText();
  await page.locator('#gallery-next').click();
  const nextTree = await page.locator('.asset-card strong').first().innerText();
  if (nextTree === firstTree) throw new Error('Large lifecycle catalog pagination did not advance');
  await page.locator('.asset-card').first().click();
  const [nativeSprite] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-sprite').click()
  ]);
  const nativePath = join(output, 'native-tree-sprite.png');
  await nativeSprite.saveAs(nativePath);
  const bytes = readFileSync(nativePath);
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      bytes.readUInt32BE(16) === 0 || bytes.readUInt32BE(20) === 0)
    throw new Error('Native generated PNG is not a valid non-empty PNG');
  const [metadata] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const metadataPath = join(output, 'tree-morphology-metadata.json');
  await metadata.saveAs(metadataPath);
  const payload = JSON.parse(readFileSync(metadataPath, 'utf8'));
  if (!payload.morphology?.skeleton || !payload.pivotTexel ||
      payload.section !== 'tree-lifecycle')
    throw new Error('Engine tree JSON did not expose actual morphology and pivot');
  await nav.filter({ hasText: 'Paletas del motor' }).click();
  const [paletteFile] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const palettePath = join(output, 'engine-palette.json');
  await paletteFile.saveAs(palettePath);
  if (!JSON.parse(readFileSync(palettePath,'utf8')).palette?.ramps?.foliage)
    throw new Error('Palette section did not export actual registered palette ramps');
  await nav.filter({ hasText: 'Comparador multirresolución' }).click();
  await page.locator('.asset-card').last().click();
  if (await page.locator('#engine-live').innerText() !== 'RENDER OK')
    throw new Error('Native resolution comparator failed to render');
  await page.screenshot({ path: join(output, '34-native-profile-comparator.png'), fullPage: true });
  console.log('NATIVE OUTPUT QA OK: catalog pagination, PNG signature, morphology, palette and profile');
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#toggle-sidebar').click();
  if (await page.locator('#toggle-sidebar').getAttribute('aria-expanded') !== 'true')
    throw new Error('Mobile navigation did not open');
  await nav.filter({ hasText: 'Partículas' }).click();
  if (await page.locator('#toggle-sidebar').getAttribute('aria-expanded') !== 'false')
    throw new Error('Mobile navigation did not close on selection');
  await page.waitForFunction(() => document.querySelector('#stage-action')?.textContent?.startsWith('PARTICLES /'), null, { timeout: 30000 });
  await page.screenshot({ path: join(output, '33-mobile-vfx.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error('Horizontal overflow on mobile: ' + overflow + 'px');
  if (errors.length) throw new Error('Browser errors:\n' + errors.join('\n'));
  console.log('BROWSER QA PASS: ' + total + ' sections, customizable avatar + JSON, variants and sprite exports, mobile');
} finally {
  await browser.close();
}
