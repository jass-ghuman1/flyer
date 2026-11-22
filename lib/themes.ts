import type { ThemeId } from './types';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  fileLabel: string;
  headline: string;
  colors: {
    bgTop: string;
    bgBottom: string;
    primary: string; // header / footer band
    primaryText: string;
    accent: string; // ribbon
    accentText: string;
    price: string;
    cardBorder: string;
    art: string[]; // colours used by the background art
  };
}

export const THEMES: ThemeDef[] = [
  {
    id: 'fall',
    name: 'Fall / Thanksgiving',
    fileLabel: 'Thanksgiving',
    headline: 'Happy Thanksgiving',
    colors: {
      bgTop: '#fbe7c6', bgBottom: '#f3c58b',
      primary: '#6b2a12', primaryText: '#fff6e8',
      accent: '#c2410c', accentText: '#ffffff',
      price: '#b91c1c', cardBorder: '#e0a96d',
      art: ['#c2410c', '#d97706', '#b45309', '#991b1b', '#ca8a04'],
    },
  },
  {
    id: 'christmas',
    name: 'Christmas',
    fileLabel: 'Christmas',
    headline: 'Merry Christmas',
    colors: {
      bgTop: '#f1f7f2', bgBottom: '#d7ebdc',
      primary: '#14532d', primaryText: '#ffffff',
      accent: '#b91c1c', accentText: '#ffffff',
      price: '#b91c1c', cardBorder: '#86b89a',
      art: ['#b91c1c', '#15803d', '#ca8a04', '#ffffff'],
    },
  },
  {
    id: 'newyear',
    name: 'New Year',
    fileLabel: 'NewYear',
    headline: 'Happy New Year',
    colors: {
      bgTop: '#1e1b4b', bgBottom: '#0f172a',
      primary: '#0b0f24', primaryText: '#fde68a',
      accent: '#ca8a04', accentText: '#111827',
      price: '#b91c1c', cardBorder: '#ca8a04',
      art: ['#fbbf24', '#fde68a', '#e5e7eb', '#f59e0b'],
    },
  },
  {
    id: 'valentines',
    name: "Valentine's Day",
    fileLabel: 'Valentines',
    headline: "Happy Valentine's Day",
    colors: {
      bgTop: '#fff1f2', bgBottom: '#fecdd3',
      primary: '#881337', primaryText: '#ffffff',
      accent: '#e11d48', accentText: '#ffffff',
      price: '#be123c', cardBorder: '#fda4af',
      art: ['#e11d48', '#fb7185', '#be123c', '#f9a8d4'],
    },
  },
  {
    id: 'spring',
    name: 'Spring',
    fileLabel: 'Spring',
    headline: 'Spring Savings',
    colors: {
      bgTop: '#f0fdf4', bgBottom: '#dcfce7',
      primary: '#166534', primaryText: '#ffffff',
      accent: '#db2777', accentText: '#ffffff',
      price: '#be185d', cardBorder: '#86efac',
      art: ['#f472b6', '#facc15', '#a78bfa', '#4ade80'],
    },
  },
  {
    id: 'summer',
    name: 'Summer',
    fileLabel: 'Summer',
    headline: 'Summer Savings',
    colors: {
      bgTop: '#e0f2fe', bgBottom: '#fef3c7',
      primary: '#0369a1', primaryText: '#ffffff',
      accent: '#f97316', accentText: '#ffffff',
      price: '#c2410c', cardBorder: '#7dd3fc',
      art: ['#facc15', '#f97316', '#38bdf8', '#fb923c'],
    },
  },
  {
    id: 'canadaday',
    name: 'Canada Day',
    fileLabel: 'CanadaDay',
    headline: 'Happy Canada Day',
    colors: {
      bgTop: '#ffffff', bgBottom: '#fee2e2',
      primary: '#b91c1c', primaryText: '#ffffff',
      accent: '#dc2626', accentText: '#ffffff',
      price: '#b91c1c', cardBorder: '#fca5a5',
      art: ['#dc2626', '#ef4444', '#b91c1c'],
    },
  },
  {
    id: 'halloween',
    name: 'Halloween',
    fileLabel: 'Halloween',
    headline: 'Happy Halloween',
    colors: {
      bgTop: '#2e1065', bgBottom: '#111827',
      primary: '#0f0a1e', primaryText: '#fb923c',
      accent: '#ea580c', accentText: '#ffffff',
      price: '#c2410c', cardBorder: '#ea580c',
      art: ['#ea580c', '#f97316', '#a855f7', '#1f2937'],
    },
  },
  {
    id: 'generic',
    name: 'Generic',
    fileLabel: 'Specials',
    headline: 'Weekly Specials',
    colors: {
      bgTop: '#f8fafc', bgBottom: '#e2e8f0',
      primary: '#1e293b', primaryText: '#ffffff',
      accent: '#b91c1c', accentText: '#ffffff',
      price: '#b91c1c', cardBorder: '#cbd5e1',
      art: ['#94a3b8', '#cbd5e1', '#b91c1c'],
    },
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);

export function getTheme(id: string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[THEMES.length - 1];
}
