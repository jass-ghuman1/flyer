import type { ExportFormat } from '../types';

export interface FormatDef {
  id: ExportFormat;
  label: string;
  fileSuffix: string;
  kind: 'pdf' | 'png';
  /** Size in CSS px. PDF pages use 96 px per inch, so 816 x 1056 = 8.5 x 11 in. */
  width: number;
  height: number;
  pdfWidth?: string;
  pdfHeight?: string;
  /** Scale unit for type and spacing inside the flyer. */
  unit: number;
  compact: boolean;
}

export const FORMATS: Record<ExportFormat, FormatDef> = {
  letter: { id: 'letter', label: 'Letter PDF (8.5x11)', fileSuffix: 'Letter', kind: 'pdf', width: 816, height: 1056, pdfWidth: '8.5in', pdfHeight: '11in', unit: 1, compact: false },
  tabloid: { id: 'tabloid', label: 'Tabloid PDF (11x17)', fileSuffix: '11x17', kind: 'pdf', width: 1056, height: 1632, pdfWidth: '11in', pdfHeight: '17in', unit: 1.3, compact: false },
  square: { id: 'square', label: 'Square PNG (1080x1080)', fileSuffix: '1080x1080', kind: 'png', width: 1080, height: 1080, unit: 1.2, compact: true },
  portrait: { id: 'portrait', label: 'Portrait PNG (1080x1350)', fileSuffix: '1080x1350', kind: 'png', width: 1080, height: 1350, unit: 1.25, compact: true },
};

export const FORMAT_LIST = Object.values(FORMATS);
