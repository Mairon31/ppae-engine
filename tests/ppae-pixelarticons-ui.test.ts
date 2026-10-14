import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PIXEL_ICON_PATHS } from '../src/demo/pixelarticons';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/demo/main.ts', import.meta.url), 'utf8');

describe('Landing and studio native Pixelarticons', () => {
  it('bundles the actual MIT pixel icon paths with no CSS font/CDN dependency', () => {
    expect(Object.keys(PIXEL_ICON_PATHS).length).toBeGreaterThanOrEqual(28);
    for (const [name, paths] of Object.entries(PIXEL_ICON_PATHS)) {
      expect(name, 'unrecognized pixel icon name').toMatch(/^[a-z0-9-]+$/);
      expect(paths.length, name).toBeGreaterThan(0);
      for (const path of paths) {
        expect(path.length).toBeGreaterThan(8);
        expect(path).toMatch(/[MLHVZmhlvz]/);
        expect(path).not.toMatch(/<|>|script/);
      }
    }
    expect(readFileSync(new URL('../src/demo/PIXELARTICONS_LICENSE.txt', import.meta.url),'utf8'))
      .toContain('MIT License');
    expect(html).not.toContain('bootstrap-icons');
    expect(html).not.toContain('pixelart-icons-font');
  });

  it('replaces decorative Unicode icons in authored UI while keeping accessible controls', () => {
    const body = html.split('<body>')[1] ?? '';
    expect(body).toContain('data-px-icon="play"');
    expect(body).toContain('data-px-icon="pause"');
    expect(body).toContain('data-px-icon="download"');
    expect(body).toContain('data-px-icon="menu"');
    expect(body).toContain('data-px-icon="external-link"');
    expect(body).not.toMatch(/[✦✳▦◈⌘▶Ⅱ↗↻⚙☰←]/u);
    expect(source).not.toContain("const glyphs = [");
    expect(source).toContain('hydratePixelIcons()');
    expect(source).toContain("pixelIcon(state.playing ? 'pause' : 'play')");
    expect(body).toContain('aria-label="Pause or play"');
  });
});
