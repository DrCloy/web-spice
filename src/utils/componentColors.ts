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

/** Read component colors from CSS custom properties defined in style.css @theme. */
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
    wire: get('--color-component-ground'),
    selected: get('--color-primary-500'),
  };

  return _cache;
}

/** Clear the color cache (useful when CSS variables are changed at runtime). */
export function clearColorCache(): void {
  _cache = null;
}
