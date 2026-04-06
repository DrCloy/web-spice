import { createContext, use, useEffect, useState } from 'react';
import { DARK_CANVAS_COLORS, LIGHT_CANVAS_COLORS } from '@/theme/canvasColors';
import type { CanvasColors } from '@/theme/canvasColors';

interface ThemeContextValue {
  isDark: boolean;
  canvasColors: CanvasColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  canvasColors: LIGHT_CANVAS_COLORS,
  toggleTheme: () => {},
});

const THEME_KEY = 'webspice-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(
    () => sessionStorage.getItem(THEME_KEY) === 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    sessionStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(d => !d);

  return (
    <ThemeContext
      value={{
        isDark,
        canvasColors: isDark ? DARK_CANVAS_COLORS : LIGHT_CANVAS_COLORS,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useIsDark = () => use(ThemeContext).isDark;
// eslint-disable-next-line react-refresh/only-export-components
export const useToggleTheme = () => use(ThemeContext).toggleTheme;
// eslint-disable-next-line react-refresh/only-export-components
export const useCanvasColors = () => use(ThemeContext).canvasColors;
