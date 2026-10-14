/**
 * Live GitHub Pages smoke QA. Runs after actions/deploy-pages, not as a
 * substitute for the local Chromium/render smoke suite.
 */
const PAGE_URL = 'https://mairon31.github.io/ppae-engine/';
const ATTEMPTS = 12;
const DELAY_MS = 5000;
const sha = process.env.GITHUB_SHA ?? 'manual';
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function inspect() {
  const target = new URL(PAGE_URL);
  target.searchParams.set('qa', sha);
  const page = await fetch(target, { headers: { 'Cache-Control': 'no-cache' } });
  if (page.status !== 200) throw new Error('Pages HTML HTTP ' + page.status);
  if (!(page.headers.get('content-type') ?? '').includes('text/html')) {
    throw new Error('Pages HTML has invalid Content-Type: ' + page.headers.get('content-type'));
  }
  const html = await page.text();
  if (!html.includes('id="section-nav"') || !html.includes('id="landing-page"')
      || !html.includes('PPAE Engine — Procedural Pixel Art Engine')) {
    throw new Error('Public Pages missing compiled product landing / engine studio; check Settings → Pages → Source = GitHub Actions');
  }
  const js = html.match(/src="(\/ppae-engine\/assets\/[^"]+\.js)"/)?.[1];
  const css = html.match(/href="(\/ppae-engine\/assets\/[^"]+\.css)"/)?.[1];
  if (!js || !css || html.includes('/src/demo/main.ts') || html.includes('/src/demo/playground.css') || html.includes('/src/demo/landing.css')) {
    throw new Error('Pages HTML does not reference compiled Vite JS/CSS with /ppae-engine/ base');
  }
  for (const [path, mime] of [[js, /javascript/], [css, /text\/css/]]) {
    const asset = new URL(path, PAGE_URL);
    asset.searchParams.set('qa', sha);
    const response = await fetch(asset, { headers: { 'Cache-Control': 'no-cache' } });
    if (response.status !== 200) throw new Error('Asset HTTP ' + response.status + ': ' + path);
    const type = response.headers.get('content-type') ?? '';
    if (!mime.test(type)) throw new Error('Unexpected asset MIME ' + type + ': ' + path);
    if (!(await response.arrayBuffer()).byteLength) throw new Error('Empty compiled asset ' + path);
    console.log('PUBLIC ASSET OK', path, type);
  }
  console.log('PUBLIC PAGES VERIFIED', PAGE_URL, 'source: compiled Vite dist/demo', 'ref:', sha);
}

let lastError;
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try { await inspect(); process.exit(0); }
  catch (error) {
    lastError = error;
    console.error('Public Pages check ' + attempt + '/' + ATTEMPTS + ': ' + String(error.message ?? error));
    if (attempt !== ATTEMPTS) await wait(DELAY_MS);
  }
}
throw lastError;
