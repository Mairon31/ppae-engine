import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLAYGROUND_SECTIONS, formatPlaygroundLabel } from '../src/demo/playground-catalog';
import { translatedLiteral } from '../src/demo/i18n';

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
    expect(html).toContain('data-language-select');
    expect(html).toContain('<option value="es">Español</option>');
    expect(html).toContain('<option value="pt">Português</option>');
    expect(html).not.toContain('SON PIXELS');
  });

  it('localizes every catalog group and category with stable route IDs', () => {
    expect(PLAYGROUND_SECTIONS).toHaveLength(32);
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

  it('translates real marketing, 32 catalog sections and player controls to ES/PT', () => {
    for (const section of PLAYGROUND_SECTIONS) {
      for (const locale of ['es','pt'] as const) {
        expect(translatedLiteral(section.label,locale),section.id).not.toBe(section.label);
        expect(translatedLiteral(section.description,locale),section.id).not.toBe(section.description);
      }
    }
    expect(translatedLiteral('ONE ENGINE.','es')).toBe('UN MOTOR.');
    expect(translatedLiteral('ONE ENGINE.','pt')).toBe('UM MOTOR.');
    expect(translatedLiteral('Randomize character','es')).toBe('Aleatorizar personaje');
    expect(translatedLiteral('Randomize character','pt')).toBe('Gerar personagem aleatório');
    expect(translatedLiteral('LIVE GENERATION','pt')).toBe('GERAÇÃO AO VIVO');
    expect(translatedLiteral('ONE ENGINE.','en')).toBe('ONE ENGINE.');
  });

  it('keeps README translations separate and excluded from npm', () => {
    const readme = sourceFile('README.md');
    expect(readme).toContain('(README.es.md)');
    expect(readme).toContain('(README.pt-BR.md)');
    expect(readme).not.toContain('docs/');
    expect(readme).not.toContain('<summary><strong>Español');
    for (const file of ['README.es.md','README.pt-BR.md']) {
      const translated = sourceFile(file);
      expect(translated).toContain('PPAE Engine');
      expect(translated).toContain('npm run build');
      expect(translated).toContain('Spr​​itesheetCompiler'.replace(/\u200b/g,''));
      expect(translated).toContain('README.md');
    }
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
