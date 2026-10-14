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
  await page.waitForFunction(() => {
    const landing = document.getElementById('landing-page');
    const c = document.getElementById('landing-world');
    if (!landing || landing.hidden || !c || document.getElementById('playground-app')?.hidden !== true) return false;
    const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return pixels[3] > 0;
  },null,{timeout:30000});
  const landingVisual = await page.locator('#landing-page').evaluate(node => {
    const style = getComputedStyle(node);
    const title = document.getElementById('lp-headline');
    return {background:style.backgroundColor, font:getComputedStyle(title).fontFamily,
      title:title?.textContent, width:node.getBoundingClientRect().width};
  });
  if (!landingVisual.title?.includes('ENDLESS') || !landingVisual.font.includes('Pixelify Sans'))
    throw new Error('Product landing typography or hero headline did not load: '+JSON.stringify(landingVisual));
  if (await page.locator('#landing-page .lp-showcase-card').count() !== 4)
    throw new Error('Product landing is missing generated engine showcases');
  const landingIcons = await page.evaluate(() => ({
    remainingSlots: document.querySelectorAll('[data-px-icon]').length,
    count: document.querySelectorAll('#landing-page svg.px-icon').length,
    grid: document.querySelector('.lp-logo-glyph svg.px-icon')?.getAttribute('viewBox'),
    dimension: document.querySelector('.lp-logo-glyph svg.px-icon')?.getBoundingClientRect().width,
    paths: document.querySelector('.lp-logo-glyph svg.px-icon')?.querySelectorAll('path').length
  }));
  if (landingIcons.remainingSlots !== 0 || landingIcons.count < 18
      || landingIcons.grid !== '0 0 24 24' || landingIcons.paths < 1)
    throw new Error('Pixelarticons were not hydrated with original SVG paths: '
      + JSON.stringify(landingIcons));
  await page.screenshot({path:join(output,'00-product-landing-desktop.png'),fullPage:true});
  console.log('LANDING OK: compiled styles, engine canvas, four real generators');
  await page.locator('.lp-hero .lp-cta-primary').click();
  await page.waitForFunction(() => !document.getElementById('playground-app')?.hidden
    && document.getElementById('landing-page')?.hidden);
  const nav = page.locator('#section-nav .nav-link');
  const total = await nav.count();
  const iconsInNav = await page.locator('#section-nav svg.px-icon').count();
  if (iconsInNav !== total) throw new Error('Pixelarticons missing from navigation: '
    + iconsInNav + '/' + total);
  const playButton = page.locator('#play-toggle');
  if (await playButton.locator('svg.px-icon').count() !== 1)
    throw new Error('Player controls must use Pixelarticons SVG, not text glyphs');
  if (total < 32) {
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
    throw new Error('Only ' + total + ' navigation sections; expected 32. ' +
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



  // Phase 12 — real integrated scene controls, quality reports and exports.
  await nav.filter({ hasText: 'Production Scene Inspector' }).click();
  await page.waitForFunction(() =>
    document.querySelector('#stage-action')?.textContent === 'INTEGRATED-SCENE / INTEGRATED_WORLD' &&
    document.querySelector('#engine-live')?.textContent === 'RENDER OK' &&
    document.querySelector('#showcase-live-metrics')?.textContent?.includes('SHADOW PIXELS'));
  const sceneBeforeHour = await page.locator('#world-stage').evaluate(c => c.toDataURL());
  await page.screenshot({ path: join(output, '49-phase12-production-scene.png'), fullPage: true });
  await page.locator('#lab-showcase-hour').evaluate(el => {
    el.value = '6'; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(before => {
    const stage = document.querySelector('#world-stage');
    return !!stage && stage.toDataURL() !== before &&
      document.querySelector('#engine-live')?.textContent === 'RENDER OK';
  }, sceneBeforeHour);
  await page.screenshot({ path: join(output, '50-phase12-solar-dawn.png'), fullPage: true });
  await page.locator('#lab-showcase-structure').selectOption('blue_slate_manor_01');
  await page.locator('#lab-showcase-roof').check();
  await page.waitForFunction(() => document.querySelector('#engine-live')?.textContent === 'RENDER OK');
  const [sceneDownload] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const scenePath = join(output, 'phase12-integrated-scene.json');
  await sceneDownload.saveAs(scenePath);
  const sceneMeta = JSON.parse(readFileSync(scenePath, 'utf8'));
  if (sceneMeta.config?.featuredStructureId !== 'blue_slate_manor_01' ||
      !sceneMeta.config?.isRoofCutaway ||
      !sceneMeta.telemetry?.heroDimensionSpec?.artCompositionUnits ||
      sceneMeta.catalog?.goldenSeedsCount < 10 ||
      !/^[0-9a-f]{8}$/.test(sceneMeta.nativePreview?.rgbaHash ?? ''))
    throw new Error('Phase 12 integrated scene does not expose real editable metadata: ' +
      JSON.stringify(sceneMeta).slice(0,900));
  await nav.filter({ hasText: 'Art Quality Inspector' }).click();
  await page.waitForFunction(() =>
    document.querySelector('#stage-action')?.textContent === 'QUALITY-INSPECTOR / HERO' &&
    document.querySelector('#quality-live-metrics')?.textContent?.includes('detailed-32x32') &&
    document.querySelector('#engine-live')?.textContent === 'RENDER OK');
  await page.screenshot({ path: join(output, '51-phase12-native-quality-strip.png'), fullPage: true });
  await page.locator('#catalog-search').fill('golden_registry');
  await page.waitForFunction(() => document.querySelectorAll('.asset-card').length === 1);
  await page.locator('.asset-card').first().click();
  await page.waitForFunction(() =>
    document.querySelector('#stage-action')?.textContent === 'QUALITY-INSPECTOR / GOLDEN_REGISTRY' &&
    document.querySelector('#quality-live-metrics')?.textContent?.includes('golden_tree_birch'));
  const [qualityDownload] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const qualityPath = join(output, 'phase12-golden-quality.json');
  await qualityDownload.saveAs(qualityPath);
  const qualityMeta = JSON.parse(readFileSync(qualityPath, 'utf8'));
  if (qualityMeta.goldenReferences?.length !== 10 ||
      qualityMeta.goldenReferences.some(ref => ref.defects.length !== 0 ||
        ref.rgbaHash !== ref.expectedPixelHash))
    throw new Error('Phase 12 golden registry JSON does not match the locked baseline');
  await page.screenshot({ path: join(output, '52-phase12-golden-registry.png'), fullPage: true });
  await page.locator('#catalog-search').fill('');
  console.log('PHASE 12 BROWSER OK: real scene, editable sun/roof/structure, live metrics, five native tiers and locked golden exports');


  // Phase 9 actual new structures and interior layout smoke/PNG evidence.
  await nav.filter({ hasText: 'Structures' }).click();
  for (const [id, filename] of [
    ['grain_windmill_01', '38-phase9-windmill.png'],
    ['ancient_mossy_ruins_01', '39-phase9-ruins.png'],
    ['blue_slate_manor_01', '40-phase9-slate-manor.png']
  ]) {
    await page.locator('#catalog-search').fill(id);
    await page.waitForFunction(() => document.querySelectorAll('.asset-card').length === 1);
    await page.locator('.asset-card').first().click();
    await page.waitForFunction(() => document.querySelector('#engine-live')?.textContent === 'RENDER OK');
    await page.screenshot({ path: join(output, filename), fullPage: true });
  }
  await page.locator('#catalog-search').fill('');
  await nav.filter({ hasText: 'Interiors' }).click();
  for (const [id, filename] of [
    ['forge_interior', '41-phase9-forge-interior.png'],
    ['alchemy_interior', '42-phase9-alchemy-interior.png']
  ]) {
    await page.locator('#catalog-search').fill(id);
    await page.waitForFunction(() => document.querySelectorAll('.asset-card').length === 1);
    await page.locator('.asset-card').first().click();
    await page.waitForFunction(() => document.querySelector('#engine-live')?.textContent === 'RENDER OK');
    await page.screenshot({ path: join(output, filename), fullPage: true });
  }
  const [interiorDownload] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const interiorPath = join(output, 'phase9-alchemy-interior.json');
  await interiorDownload.saveAs(interiorPath);
  const interiorJson = JSON.parse(readFileSync(interiorPath, 'utf8'));
  if (interiorJson.definition?.interiorId !== 'interior_alchemy_01' ||
      !interiorJson.collisionRects?.length ||
      !interiorJson.walkabilityGrid?.length)
    throw new Error('Phase 9 alchemy lab does not export real interior metadata');
  await page.locator('#catalog-search').fill('');
  console.log('PHASE 9 BROWSER OK: windmill/ruins/manor, forge/alchemy, real interior metadata');


  // Phase 10: real solar oak-shadow outputs, storm/fog and shaped pixel VFX.
  await nav.filter({ hasText: 'Lighting' }).click();
  await page.locator('#catalog-search').fill('dawn');
  await page.waitForFunction(() => document.querySelectorAll('.asset-card').length === 1);
  await page.locator('.asset-card').first().click();
  await page.waitForFunction(() =>
    document.querySelector('#stage-action')?.textContent === 'LIGHTING / DAWN' &&
    document.querySelector('#engine-live')?.textContent === 'RENDER OK');
  const dawnCanvas = await page.locator('#world-stage').evaluate(c => c.toDataURL());
  await page.screenshot({ path: join(output, '43-phase10-dawn-shadow.png'), fullPage: true });
  const [dawnFile] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const dawnPath = join(output, 'phase10-dawn-vector.json');
  await dawnFile.saveAs(dawnPath);
  if (!(JSON.parse(readFileSync(dawnPath, 'utf8')).solarShadowVector?.dirX < -0.5))
    throw new Error('Phase 10 dawn solar shadow vector not exported correctly');
  await page.locator('#catalog-search').fill('dusk');
  await page.waitForFunction(() => document.querySelectorAll('.asset-card').length === 1);
  await page.locator('.asset-card').first().click();
  await page.waitForFunction(() =>
    document.querySelector('#stage-action')?.textContent === 'LIGHTING / DUSK' &&
    document.querySelector('#engine-live')?.textContent === 'RENDER OK');
  const duskCanvas = await page.locator('#world-stage').evaluate(c => c.toDataURL());
  if (dawnCanvas === duskCanvas) throw new Error('Solar shadow preview did not change between dawn and dusk');
  await page.screenshot({ path: join(output, '44-phase10-dusk-shadow.png'), fullPage: true });
  await page.locator('#catalog-search').fill('');
  await nav.filter({ hasText: 'Weather & Wind' }).click();
  for (const [name, shot] of [
    ['thunderstorm', '45-phase10-branched-lightning.png'],
    ['dense_fog', '46-phase10-layered-fog.png']
  ]) {
    await page.locator('#catalog-search').fill(name);
    await page.waitForFunction(() => document.querySelectorAll('.asset-card').length === 1);
    await page.locator('.asset-card').first().click();
    await page.waitForFunction(target =>
      document.querySelector('#stage-action')?.textContent === target &&
      document.querySelector('#engine-live')?.textContent === 'RENDER OK',
      name === 'thunderstorm' || name === 'dense_fog'
        ? 'WEATHER / ' + name.toUpperCase()
        : 'PARTICLES / ' + name.toUpperCase());
    await page.screenshot({ path: join(output, shot), fullPage: true });
  }
  await page.locator('#catalog-search').fill('');
  await nav.filter({ hasText: 'Particles & VFX' }).click();
  for (const [name, shot] of [
    ['frost_shards', '47-phase10-frost-shards.png'],
    ['poison_bubbles', '48-phase10-poison-rings.png']
  ]) {
    await page.locator('#catalog-search').fill(name);
    await page.waitForFunction(() => document.querySelectorAll('.asset-card').length === 1);
    await page.locator('.asset-card').first().click();
    await page.waitForFunction(target =>
      document.querySelector('#stage-action')?.textContent === target &&
      document.querySelector('#engine-live')?.textContent === 'RENDER OK',
      name === 'thunderstorm' || name === 'dense_fog'
        ? 'WEATHER / ' + name.toUpperCase()
        : 'PARTICLES / ' + name.toUpperCase());
    await page.screenshot({ path: join(output, shot), fullPage: true });
  }
  const [vfxFile] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const vfxPath = join(output, 'phase10-poison-emitter.json');
  await vfxFile.saveAs(vfxPath);
  if (JSON.parse(readFileSync(vfxPath, 'utf8')).emitterPreset?.particleShape !== 'hollow_ring')
    throw new Error('Poison emitter JSON missing its real hollow-ring geometry');
  await page.locator('#catalog-search').fill('');
  console.log('PHASE 10 BROWSER OK: real dawn/dusk shadows, lightning, fog, shaped VFX');

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
  await nav.filter({ hasText: 'Bestiary' }).click();
  await page.locator('#age-select').selectOption('juvenile');
  await page.locator('#health-select').selectOption('wounded');
  await page.locator('#direction-select').selectOption('SW');
  await page.waitForFunction(() => document.querySelector('#stage-action')?.textContent?.startsWith('CREATURES /'), null, { timeout: 30000 });
  await page.screenshot({ path: join(output, '19-creatures-juvenile-wounded-SW.png'), fullPage: true });

  // Actual avatar editor: interactive rig/equipment/color customization, seeded
  // randomizer, and a downloadable source definition from the edited state.
  await nav.filter({ hasText: 'Character Creator' }).click();
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

  await nav.filter({ hasText: 'NPC Diversity' }).click();
  await page.locator('#catalog-search').fill('town_guard');
  await page.waitForFunction(() => document.querySelector('#gallery-range')?.textContent?.includes('of 8'));
  if (await page.locator('.asset-card').count() !== 6) throw new Error('Filtered NPC gallery count mismatch');
  await page.locator('#catalog-search').fill('');
  await nav.filter({ hasText: '8-Neighbor Autotiling' }).click();
  await page.locator('#catalog-search').fill('255');
  if (await page.locator('.asset-card').count() !== 1) throw new Error('Mask search failed');
  await page.locator('#catalog-search').fill('');

  await nav.filter({ hasText: 'Creature Variants' }).click();
  await page.locator('.asset-card').nth(1).click();
  const [variantExport] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  await variantExport.saveAs(join(output, 'creature-variant-atlas.json'));
  if (await variantExport.failure()) throw new Error('Variant atlas export failed');
  await page.screenshot({ path: join(output, '32-creature-variants.png'), fullPage: true });
  console.log('EXTENDED CATALOG OK: NPC filter, canonical masks, variant atlas');
  
  await nav.filter({ hasText: 'Tree Lifecycles' }).click();
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
  await nav.filter({ hasText: 'Engine Palettes' }).click();
  const [paletteFile] = await Promise.all([
    page.waitForEvent('download'), page.locator('#download-json').click()
  ]);
  const palettePath = join(output, 'engine-palette.json');
  await paletteFile.saveAs(palettePath);
  if (!JSON.parse(readFileSync(palettePath,'utf8')).palette?.ramps?.foliage)
    throw new Error('Palette section did not export actual registered palette ramps');
  await nav.filter({ hasText: 'Resolution Comparison' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.asset-thumb canvas')]
    .every(canvas => canvas.getContext('2d').getImageData(0,0,1,1).data[3] === 255),
    null, { timeout: 30000 });
  const before = await page.locator('.asset-thumb canvas').evaluateAll(canvases =>
    canvases.map(canvas => canvas.toDataURL()));
  await page.locator('.asset-card').last().click();
  if (await page.locator('#engine-live').innerText() !== 'RENDER OK')
    throw new Error('Native resolution comparator failed to render');
  const after = await page.locator('.asset-thumb canvas').evaluateAll(canvases =>
    canvases.map(canvas => canvas.toDataURL()));
  if (before.length !== after.length || before.some((value,index) => value !== after[index]))
    throw new Error('Selecting a profile changed or cleared existing catalog thumbnails');
  await page.screenshot({ path: join(output, '34-native-profile-comparator.png'), fullPage: true });
  console.log('NATIVE OUTPUT QA OK: catalog pagination, PNG signature, morphology, palette and profile');
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#toggle-inspector').click();
  if (await page.locator('#toggle-inspector').getAttribute('aria-expanded') !== 'true'
    || !await page.locator('#playground-app').evaluate(node=>node.classList.contains('inspector-open')))
    throw new Error('Mobile inspector drawer did not open');
  await page.locator('#close-inspector').click();
  if (await page.locator('#toggle-inspector').getAttribute('aria-expanded') !== 'false')
    throw new Error('Mobile inspector drawer did not close');
  await page.locator('#toggle-sidebar').click();
  if (await page.locator('#toggle-sidebar').getAttribute('aria-expanded') !== 'true')
    throw new Error('Mobile navigation did not open');
  await nav.filter({ hasText: 'Particles & VFX' }).click();
  if (await page.locator('#toggle-sidebar').getAttribute('aria-expanded') !== 'false')
    throw new Error('Mobile navigation did not close on selection');
  await page.waitForFunction(() => document.querySelector('#stage-action')?.textContent?.startsWith('PARTICLES /'), null, { timeout: 30000 });
  await page.screenshot({ path: join(output, '33-mobile-vfx.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error('Horizontal overflow on mobile: ' + overflow + 'px');
  await page.locator('.studio-top-home').click();
  await page.waitForFunction(() => !document.getElementById('landing-page')?.hidden
    && document.getElementById('playground-app')?.hidden);
  const landingOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (landingOverflow > 1) throw new Error('Mobile landing horizontal overflow: ' + landingOverflow);
  await page.screenshot({path:join(output,'35-product-landing-mobile.png'),fullPage:true});
  await page.locator('#landing-reroll').click();
  const homepageCanvas = await page.locator('#landing-world').evaluate(node=>node.toDataURL());
  if (!homepageCanvas.startsWith('data:image/png;base64,')) throw new Error('Live landing variant could not render');
  console.log('MOBILE LANDING OK: navigation, reroll, responsive layout');
  // Confirm localized deep links, UI translations and language persistence.
  const localePage = await browser.newPage({ viewport:{width:390,height:844} });
  localePage.on('pageerror', err => errors.push('locale-pageerror: '+err.message));
  await localePage.goto(url + '?lang=es#trees', { waitUntil:'domcontentloaded' });
  await localePage.waitForFunction(() =>
    document.documentElement.lang === 'es' &&
    document.getElementById('page-title')?.textContent === 'Árboles' &&
    !document.getElementById('playground-app')?.hidden);
  if ((await localePage.locator('#section-nav .nav-link').count()) !== 32)
    throw new Error('ES deep-link catalog did not render all 32 sections');
  await localePage.locator('#playground-app [data-language-select]').selectOption('pt');
  await localePage.waitForURL(/\\?lang=pt#trees$/);
  await localePage.waitForFunction(() =>
    document.documentElement.lang === 'pt' &&
    document.getElementById('page-title')?.textContent === 'Árvores');
  await localePage.screenshot({path:join(output,'36-playground-portuguese-mobile.png'),fullPage:true});
  // The sidebar is intentionally collapsed on phones; open it before
  // using a link to test real touch navigation rather than a hidden click.
  await localePage.locator('#toggle-sidebar').click();
  await localePage.waitForFunction(() =>
    document.querySelector('.studio')?.classList.contains('nav-open') &&
    document.querySelector('#toggle-sidebar')?.getAttribute('aria-expanded') === 'true');
  await localePage.locator('#section-nav .nav-link')
    .filter({ hasText: 'Inspetor de qualidade artística' }).click();
  await localePage.waitForFunction(() =>
    location.search.includes('lang=pt') &&
    location.hash === '#quality-inspector' &&
    !document.querySelector('.studio')?.classList.contains('nav-open'));
  await localePage.waitForFunction(() =>
    document.getElementById('page-title')?.textContent === 'Inspetor de qualidade artística' &&
    document.getElementById('quality-live-metrics')?.textContent?.includes('detailed-32x32'));
  await localePage.screenshot({path:join(output,'53-phase12-mobile-quality-pt.png'),fullPage:true});
  await localePage.locator('.studio-top-home').click();
  await localePage.waitForFunction(() =>
    location.hash === '#home' &&
    location.search.includes('lang=pt') &&
    !document.getElementById('landing-page')?.hidden);
  const ptOverflow = await localePage.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ptOverflow > 1) throw new Error('Portuguese landing overflow: '+ptOverflow);
  await localePage.screenshot({path:join(output,'37-landing-portuguese-mobile.png'),fullPage:true});
  await localePage.locator('#landing-page [data-language-select]').selectOption('en');
  await localePage.waitForFunction(() =>
    document.documentElement.lang === 'en' &&
    !location.search.includes('lang=') &&
    document.getElementById('lp-headline')?.textContent?.includes('ONE ENGINE.'));
  await localePage.close();
  console.log('LOCALE QA OK: Spanish deep link, Portuguese switch and mobile landing, English default');
  if (errors.length) throw new Error('Browser errors:\n' + errors.join('\n'));
  console.log('BROWSER QA PASS: product landing, ' + total + ' engine labs, avatar, native exports and 390px mobile');
} finally {
  await browser.close();
}
