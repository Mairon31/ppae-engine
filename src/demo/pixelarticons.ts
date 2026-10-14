/** Pixelarticons original SVG paths © Gerrit Halfmann, MIT license.
 * See PIXELARTICONS_LICENSE.txt. Bundled at build time; no CDN or webfont.
 */
export const PIXEL_ICON_PATHS = {
  "sparkles": ["M11 1h2v4h-2zm0 22h2v-4h-2zM9 5h2v4H9zm0 14h2v-4H9zm4-14h2v4h-2zm0 14h2v-4h-2zM5 9h4v2H5zm14 0h-4v2h4zM1 11h4v2H1zm22 0h-4v2h4zM5 13h4v2H5zm14 0h-4v2h4zm0-12h2v6h-2z","M17 3h6v2h-6zM3 17h2v2H3zm-2 2h2v2H1zm2 2h2v2H3zm2-2h2v2H5z"],
  "external-link": ["M11 5H5v2h6V5ZM5 7H3v12h2V7Zm12 12H5v2h12v-2Zm2-6h-2v6h2v-6Zm-8 0H9v2h2v-2Zm2-2h-2v2h2v-2Zm2-2h-2v2h2V9Zm2-2h-2v2h2V7Zm2-2h-2v2h2V5Zm2-2h-2v8h2V3Z","M21 3h-8v2h8V3Z"],
  "play": ["M15 11h-2V9h2zm0 4h-2v-2h2zm-2 2h-2v-2h2zm0-8h-2V7h2zm-2-2H9V5h2zM9 21H7V3h2zm6-8h2v-2h-2zm-6 4h2v2H9z"],
  "pause": ["M10 20H4V4h6v16Zm8-16v16h-6V4h6Zm-4 2v12h2V6h-2ZM6 18h2V6H6v12Z"],
  "refresh": ["M13 20H9V18H13V20ZM19 16H21V18H19V20H17V18H15V16H17V8H19V16ZM9 18H7V16H9V18ZM7 6H9V8H7V16H5V8H3V6H5V4H7V6ZM15 16H13V14H15V16ZM23 16H21V14H23V16ZM3 10H1V8H3V10ZM11 10H9V8H11V10ZM17 8H15V6H17V8ZM15 6H11V4H15V6Z"],
  "grid-3x3": ["M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM4 8h16v2H4zm0 6h16v2H4z","M8 4h2v16H8zm6 0h2v16h-2z"],
  "download": ["M21 15v4h-2v-4zm-2 4v2H5v-2zM5 15v4H3v-4zm8-12v14h-2V3z","M7 11v2h10v-2zm2 2v2h2v-2zm4 0v2h2v-2z","M15 11v2h2v-2z"],
  "arrow-left": ["M20 11v2H4v-2zM8 13v2H6v-2zm2 2v2H8v-2zm2 2v2h-2v-2zm-4-6V9H6v2z","M10 15V7H8v8zm2 2V5h-2v12z"],
  "arrow-right": ["M4 11v2h16v-2zm12 2v2h2v-2zm-2 2v2h2v-2zm-2 2v2h2v-2zm4-6V9h2v2z","M14 15V7h2v8zm-2 2V5h2v12z"],
  "gear": ["M18 22H13V24H11V22H6V20H18V22ZM4 22H2V20H4V22ZM22 22H20V20H22V22ZM6 20H4V18H6V20ZM20 20H18V18H20V20ZM4 18H2V13H0V11H2V6H4V18ZM8 18H6V16H8V18ZM22 11H24V13H22V18H20V13H16V16H8V8H16V11H20V6H22V11ZM10 10V14H14V10H10ZM8 8H6V6H8V8ZM6 6H4V4H6V6ZM20 6H18V4H20V6ZM4 4H2V2H4V4ZM13 2H18V4H6V2H11V0H13V2ZM22 4H20V2H22V4Z"],
  "menu": ["M20 18H4v-2h16v2Zm0-5H4v-2h16v2Zm0-5H4V6h16v2Z"],
  "close": ["M7 19H5V17H7V19ZM19 19H17V17H19V19ZM9 15V17H7V15H9ZM17 17H15V15H17V17ZM11 15H9V13H11V15ZM15 15H13V13H15V15ZM13 13H11V11H13V13ZM11 11H9V9H11V11ZM15 11H13V9H15V11ZM9 9H7V7H9V9ZM17 9H15V7H17V9ZM7 7H5V5H7V7ZM19 7H17V5H19V7Z"],
// PIXEL_ICON_PATHS_MORE
} as const;
export type PixelIconName = keyof typeof PIXEL_ICON_PATHS;
export function pixelIcon(name: PixelIconName): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('width','24'); svg.setAttribute('height','24');
  svg.setAttribute('fill','currentColor');
  svg.setAttribute('class','px-icon');
  svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
  for (const data of PIXEL_ICON_PATHS[name]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',data);
    svg.append(path);
  }
  return svg;
}
export function hydratePixelIcons(root: ParentNode = document): void {
  for (const node of root.querySelectorAll<HTMLElement>('[data-px-icon]')) {
    const name = node.dataset.pxIcon;
    if (!name || !(name in PIXEL_ICON_PATHS)) continue;
    node.replaceWith(pixelIcon(name as PixelIconName));
  }
}
