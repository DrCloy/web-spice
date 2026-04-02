/**
 * Component color resolver.
 *
 * style.css @theme is the single source of truth for colors.
 * This module reads CSS custom properties at runtime and caches the result,
 * so symbolRenderer stays independent of the DOM.
 */

export interface ComponentColors {
  resistor: string;
  capacitor: string;
  inductor: string;
  voltage: string;
  current: string;
  ground: string;
  wire: string;
  selected: string;
}

let _cache: ComponentColors | null = null;

/**
 * Read component colors from CSS custom properties defined in style.css @theme.
 *
 * Result is cached after the first call. The cache persists for the lifetime of
 * the page unless explicitly cleared via `clearColorCache()`.
 *
 * Must be called after the DOM is mounted (CSS variables are not available in
 * Node/test environments without a DOM).
 */
export function resolveComponentColors(): ComponentColors {
  if (_cache) return _cache;

  const s = getComputedStyle(document.documentElement);
  const get = (varName: string) => s.getPropertyValue(varName).trim();

  _cache = {
    resistor: get('--color-component-resistor'),
    capacitor: get('--color-component-capacitor'),
    inductor: get('--color-component-inductor'),
    voltage: get('--color-component-voltage'),
    current: get('--color-component-current'),
    ground: get('--color-component-ground'),
    wire: get('--color-wire'),
    selected: get('--color-primary-500'),
  };

  return _cache;
}

/**
 * Clear the cached colors so the next `resolveComponentColors()` call re-reads
 * CSS custom properties from the DOM.
 *
 * Call this when CSS variables change at runtime (e.g. theme switch, dark mode
 * toggle). `clearColorCache` is not called internally — callers are responsible
 * for invoking it when the theme changes.
 */
export function clearColorCache(): void {
  _cache = null;
}
