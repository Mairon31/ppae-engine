import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLAYGROUND_SECTIONS, formatPlaygroundLabel } from '../src/demo/playground-catalog';

const sourceFile = (file: string) =>
  readFileSync(new URL('../' + file, import.meta.url), 'utf8');

describe('International PPAE landing and Playground language', () => {
  it('serves English document metadata, navigation and marketing content', () => {
    const html = sourceFile('index.html');
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toContain('ONE ENGINE.');
    expect(html).toContain('ENDLESS');
    expect(html).toContain('ACTUAL GENERATED PIXELS.');
    expect(html).toContain('OPEN PLAYGROUND');
    expect(html).not.toMatch(/[áéíóúñ¿¡]/i);
    expect(html).not.toContain('SON PIXELS');
  });

  it('localizes every catalog group and category with stable route IDs', () => {
    expect(PLAYGROUND_SECTIONS).toHaveLength(30);
    const allowedGroups = new Set(['Worlds','Entities','Nature','World','Systems','Art Diagnostics']);
    for (const section of PLAYGROUND_SECTIONS) {
      expect(allowedGroups.has(section.group), section.id).toBe(true);
      expect(section.label.length,section.id).toBeGreaterThan(2);
      expect(section.description.length,section.id).toBeGreaterThan(10);
      expect(section.label + section.description).not.toMatch(/[áéíóúñ¿¡]/i);
    }
    expect(formatPlaygroundLabel('ancient_crystal_colossus')).toBe('Crystal Colossus');
    expect(formatPlaygroundLabel('255')).toBe('Mask 255');
  });

  it('keeps developer controls, diagnostics and exports in English', () => {
    const studio = sourceFile('src/demo/main.ts');
    expect(studio).toContain('PLAYER CUSTOMIZATION');
    expect(studio).toContain('LIVE GENERATION');
    expect(studio).toContain('Randomize character');
    expect(studio).toContain('No results match this filter.');
    expect(studio).not.toMatch(/[áéíóúñ¿¡]/i);
  });
});
