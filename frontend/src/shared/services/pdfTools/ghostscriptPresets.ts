export type GhostscriptQuality = 'screen' | 'ebook' | 'printer' | 'prepress';

export interface GhostscriptPresetInfo {
  id: GhostscriptQuality;
  label: string;
  description: string;
  dpi: number;
}

export const GHOSTSCRIPT_PRESETS: GhostscriptPresetInfo[] = [
  {
    id: 'screen',
    label: 'Maximum',
    description: 'Smallest file — 72 DPI images (~60–85% smaller). Good for sharing.',
    dpi: 72,
  },
  {
    id: 'ebook',
    label: 'Balanced',
    description: 'Recommended — 150 DPI, sharp vector text (~40–70% smaller).',
    dpi: 150,
  },
  {
    id: 'printer',
    label: 'High quality',
    description: '300 DPI — best readability, moderate compression (~20–45%).',
    dpi: 300,
  },
  {
    id: 'prepress',
    label: 'Prepress',
    description: '300 DPI print-ready — minimal quality loss.',
    dpi: 300,
  },
];
