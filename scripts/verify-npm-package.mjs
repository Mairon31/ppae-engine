import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pack = spawnSync(npm, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  encoding: 'utf8',
  maxBuffer: 12 * 1024 * 1024
});
if (pack.status !== 0) {
  throw new Error('npm pack dry run failed:\n' + (pack.stderr || pack.stdout));
}

let metadata;
try {
  [metadata] = JSON.parse(pack.stdout);
} catch (error) {
  throw new Error('Unable to parse npm pack manifest: ' + error);
}
if (!metadata || !Array.isArray(metadata.files)) throw new Error('Empty npm package manifest');

const fileNames = metadata.files.map(({ path }) => path);
// npm always includes matching root README variants even when "files" is a
// whitelist and .npmignore lists them. Explicitly allow ONLY the two public
// translated READMEs; still block /docs and all application/site artifacts.
const allowed = name =>
  ['package.json', 'README.md', 'README.es.md', 'README.pt-BR.md', 'LICENSE'].includes(name) ||
  /^dist\/library\/.+\.(?:js|mjs|cjs)(?:\.map)?$/.test(name) ||
  /^dist\/(?!demo\/).+\.d\.(?:ts|mts|cts)$/.test(name);

const unexpected = fileNames.filter(name => !allowed(name));
if (unexpected.length) throw new Error(
  'Unexpected files in distributable npm package:\n' + unexpected.join('\n')
);

for (const required of ['package.json', 'README.md', 'LICENSE', 'dist/index.d.ts',
  'dist/library/index.js']) {
  if (!fileNames.includes(required)) throw new Error('Required npm package file missing: ' + required);
}
const forbidden = /(^|\/)(?:demo|docs|tests|scripts|artifacts|coverage|\.github)(\/|$)|\.(?:html|css|png|jpg|svg|woff2?)$/i;
const leaked = fileNames.filter(name => forbidden.test(name));
if (leaked.length) throw new Error('Site/development files leaked into npm package:\n' + leaked.join('\n'));

const maxBytes = 2 * 1024 * 1024;
if (metadata.size > maxBytes) {
  throw new Error('Package exceeds the 2 MiB compressed size budget (' + metadata.size + ' bytes)');
}

console.log('NPM PACK VERIFIED');
console.log('Package:', metadata.name + '@' + metadata.version);
console.log('Files:', fileNames.length);
console.log('Packed bytes:', metadata.size);
console.log('Unpacked bytes:', metadata.unpackedSize);
console.log('Files included:\n' + fileNames.join('\n'));
