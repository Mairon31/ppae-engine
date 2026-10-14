import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.cwd(), 'dist/demo');
const htmlPath = resolve(output, 'index.html');
if (!existsSync(htmlPath)) throw new Error('Pages build is missing dist/demo/index.html');
const html = readFileSync(htmlPath, 'utf8');
const base = '/ppae-engine/';
const urls = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
const bundled = urls.filter(url => url.startsWith(base + 'assets/'));
if (!bundled.some(url => /\.js(?:$|[?#])/.test(url))) {
  throw new Error('Missing compiled JavaScript entry under /ppae-engine/assets/');
}
if (!bundled.some(url => /\.css(?:$|[?#])/.test(url))) {
  throw new Error('Missing compiled CSS under /ppae-engine/assets/');
}
if (urls.some(url => url.startsWith('/src/') || url.startsWith('/assets/')) ||
    html.includes('/src/demo/main.ts') || html.includes('/src/demo/playground.css')) {
  throw new Error('Uncompiled or root-relative development assets remain in Pages HTML');
}
for (const url of bundled) {
  const assetPath = resolve(output, url.slice(base.length).split(/[?#]/, 1)[0]);
  if (!existsSync(assetPath)) throw new Error('Missing generated Pages asset: ' + assetPath);
}
console.log('Pages output verified: ' + bundled.length + ' compiled assets, base ' + base);
