import { MARKETING_TRANSLATIONS } from './i18n-marketing';
import { CATALOG_TRANSLATIONS } from './i18n-catalog';
import { STUDIO_TRANSLATIONS } from './i18n-studio';

export type SiteLocale = 'en' | 'es' | 'pt';
const LANG_KEY = 'ppae.locale';
const localeTable: Readonly<Record<string, readonly [string, string]>> = {
  ...MARKETING_TRANSLATIONS, ...CATALOG_TRANSLATIONS, ...STUDIO_TRANSLATIONS
};

export function currentLocale(): SiteLocale {
  if (typeof window === 'undefined') return 'en';
  const explicit = new URLSearchParams(window.location.search).get('lang');
  if (explicit === 'en' || explicit === 'es' || explicit === 'pt') return explicit;
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'es' || saved === 'pt') return saved;
  } catch { /* Storage may be unavailable in private browsing. */ }
  return 'en';
}
export function tr(english: string): string {
  const locale = currentLocale();
  if (locale === 'en') return english;
  return localeTable[english]?.[locale === 'es' ? 0 : 1] ?? english;
}
export function translatedLiteral(english: string, locale: SiteLocale): string {
  if (locale === 'en') return english;
  return localeTable[english]?.[locale === 'es' ? 0 : 1] ?? english;
}

/** Translate leaf text without destroying nested Pixelarticons SVGs, spans, or links. */
export function localizeDocument(root: ParentNode = document): void {
  document.documentElement.lang = currentLocale();
  if (currentLocale() === 'en') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('style,script,svg,code,pre')) continue;
    const source = node.textContent ?? '';
    const text = source.trim();
    if (!text) continue;
    const translated = tr(text);
    if (translated !== text) node.textContent = source.replace(text, translated);
  }
  for (const element of root.querySelectorAll<HTMLElement>('[aria-label],[title],[placeholder]')) {
    for (const name of ['aria-label','title','placeholder']) {
      const value = element.getAttribute(name);
      if (value) element.setAttribute(name, tr(value));
    }
  }
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="description"],meta[property="og:description"]'))
    meta.content = tr(meta.content);
}

/** Language selection persists across reloads and preserves the active #lab fragment. */
export function initializeLanguageControls(): void {
  const locale = currentLocale();
  for (const select of document.querySelectorAll<HTMLSelectElement>('[data-language-select]')) {
    select.value = locale;
    select.addEventListener('change', () => {
      const next = select.value;
      if (next !== 'en' && next !== 'es' && next !== 'pt') return;
      try { localStorage.setItem(LANG_KEY,next); } catch { /* optional persistence */ }
      const url = new URL(window.location.href);
      if (next === 'en') url.searchParams.delete('lang');
      else url.searchParams.set('lang', next);
      window.location.assign(url.href);
    });
  }
  localizeDocument();
}
