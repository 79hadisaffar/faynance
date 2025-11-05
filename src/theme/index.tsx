import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3DarkTheme as PaperDarkTheme, MD3LightTheme as PaperLightTheme } from 'react-native-paper';

type ThemeKey = 'light' | 'dark';

export type VisibleTabs = {
  dashboard: boolean;
  installments: boolean;
  debts: boolean;
  credits: boolean;
  checks: boolean;
  expenses: boolean;
  accounts: boolean;
};

export type SectionColors = {
  dashboard: string;
  installments: string;
  debts: string;
  credits: string;
  checks: string;
  expenses: string;
};

type SettingsState = {
  themeKey: ThemeKey;
  visibleTabs: VisibleTabs;
  colors: SectionColors;
  setTheme: (k: ThemeKey) => void;
  setVisibleTabs: (v: Partial<VisibleTabs>) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;
  fontScale: number;
  incFont: () => void;
  decFont: () => void;
  colorScheme: 'purple' | 'teal' | 'blue' | 'orange' | 'red';
  setColorScheme: (c: 'purple' | 'teal' | 'blue' | 'orange' | 'red') => void;
};

const defaultVisibleTabs: VisibleTabs = {
  dashboard: true,
  installments: true,
  debts: true,
  credits: true,
  checks: true,
  expenses: true,
  accounts: true,
};

const defaultSectionColors: SectionColors = {
  dashboard: '#6200ee',
  installments: '#ff9800',
  debts: '#f44336',
  credits: '#4caf50',
  checks: '#2196f3',
  expenses: '#9c27b0',
};

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within ThemeProvider');
  return ctx;
}

export function usePaperTheme() {
  const { themeKey, fontFamily, fontScale, colorScheme } = useSettings();
  const base = themeKey === 'dark' ? PaperDarkTheme : PaperLightTheme;
  const applyFonts = (t: any) => {
    const fam = fontFamily || (themeKey === 'dark' ? undefined : undefined);
    const scale = Math.max(0.8, Math.min(1.6, fontScale));
    const patch = (s: any) => ({ ...s, fontFamily: fam, fontSize: Math.round((s?.fontSize || 14) * scale) });
    return {
      ...t,
      fonts: {
        ...t.fonts,
        bodySmall: patch(t.fonts?.bodySmall || {}),
        bodyMedium: patch(t.fonts?.bodyMedium || {}),
        bodyLarge: patch(t.fonts?.bodyLarge || {}),
        titleSmall: patch(t.fonts?.titleSmall || {}),
        titleMedium: patch(t.fonts?.titleMedium || {}),
        titleLarge: patch(t.fonts?.titleLarge || {}),
        labelLarge: patch(t.fonts?.labelLarge || {}),
      },
    };
  };
  const withColors = {
    ...base,
    roundness: 10,
    colors: {
      ...base.colors,
      primary: colorScheme === 'purple' ? (themeKey === 'dark' ? '#bb86fc' : '#6200ee')
        : colorScheme === 'teal' ? '#00897b'
        : colorScheme === 'blue' ? '#1e88e5'
        : colorScheme === 'orange' ? '#fb8c00'
        : '#e53935',
      secondary: '#03dac6',
    },
    animation: { scale: 0.95 },
  } as any;
  return applyFonts(withColors);
}

// themes computed dynamically in usePaperTheme

type ProviderProps = { children: React.ReactNode };

export function ThemeProvider({ children }: ProviderProps) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('light');
  const [visibleTabs, setVisibleTabsState] = useState<VisibleTabs>(defaultVisibleTabs);
  const [colors] = useState<SectionColors>(defaultSectionColors);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>('');
  const [fontScale, setFontScale] = useState<number>(1);
  const [colorScheme, setColorScheme] = useState<'purple' | 'teal' | 'blue' | 'orange' | 'red'>('purple');
  const STORAGE_KEY = '@financeapp_settings_v1';

  // load persisted settings
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.themeKey) setThemeKey(parsed.themeKey);
          if (parsed.visibleTabs) setVisibleTabsState({ ...defaultVisibleTabs, ...parsed.visibleTabs });
          if (typeof parsed.fontFamily === 'string') setFontFamily(parsed.fontFamily);
          if (typeof parsed.fontScale === 'number') setFontScale(parsed.fontScale);
          if (parsed.colorScheme) setColorScheme(parsed.colorScheme);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // persist on changes (debounced minimal by batching React state)
  useEffect(() => {
    const payload = JSON.stringify({ themeKey, visibleTabs, fontFamily, fontScale, colorScheme });
    AsyncStorage.setItem(STORAGE_KEY, payload).catch(()=>{});
  }, [themeKey, visibleTabs, fontFamily, fontScale, colorScheme]);

  const value: SettingsState = useMemo(() => ({
    themeKey,
    visibleTabs,
    colors,
    setTheme: setThemeKey,
    setVisibleTabs: (v: Partial<VisibleTabs>) => setVisibleTabsState(prev => ({ ...prev, ...v })),
    isSettingsOpen,
    openSettings: () => setIsSettingsOpen(true),
    closeSettings: () => setIsSettingsOpen(false),
    fontFamily,
    setFontFamily,
    fontScale,
    incFont: () => setFontScale(s => Math.min(1.6, parseFloat((s + 0.1).toFixed(2)))) ,
    decFont: () => setFontScale(s => Math.max(0.8, parseFloat((s - 0.1).toFixed(2)))) ,
    colorScheme,
    setColorScheme,
  }), [themeKey, visibleTabs, colors, isSettingsOpen, fontFamily, fontScale, colorScheme]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}
