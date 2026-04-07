/**
 * Canvas color constants for light and dark themes.
 *
 * Canvas API cannot read CSS custom properties directly.
 * These TS constants replace the CSS-bridge approach and are the single
 * source of truth for all canvas drawing colors.
 */

export interface CanvasColors {
  stroke: string; // all symbols, wires, and leads
  selected: string; // selection highlight (dashed box)
  label: string; // component label text
  grid: string; // grid dots
}

// Light mode — canvas background: gray-50 (#f9fafb)
export const LIGHT_CANVAS_COLORS: CanvasColors = {
  stroke: '#111827', // gray-900, contrast 17.5:1
  selected: '#3b82f6', // primary-500, contrast 3.9:1
  label: '#6b7280', // gray-500, contrast 4.8:1
  grid: 'rgba(156, 163, 175, 0.4)',
};

// Dark mode — canvas background: gray-900 (#111827)
export const DARK_CANVAS_COLORS: CanvasColors = {
  stroke: '#d1d5db', // gray-300, contrast 9.8:1
  selected: '#60a5fa', // primary-400, contrast 4.5:1
  label: '#9ca3af', // gray-400, contrast 7.2:1
  grid: 'rgba(209, 213, 219, 0.2)',
};
