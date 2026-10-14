import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('dist');
const declarationFiles = [];

async function collectDeclarations(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectDeclarations(path);
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      declarationFiles.push(path);
    }
  }
}

await collectDeclarations(root);

for (const path of declarationFiles) {
  const source = await readFile(path, 'utf8');
  const normalized = source.replace(
    /((?:\bfrom\s*|\bimport\s*\(\s*)['"])(\.\.?\/[^'"]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      if (/\.(?:js|mjs|cjs|json)$/.test(specifier)) return match;
      return `${prefix}${specifier}.js${suffix}`;
    }
  );
  if (normalized !== source) await writeFile(path, normalized, 'utf8');
}
