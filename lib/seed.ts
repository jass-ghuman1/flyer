// SAMPLE DATA. Recreates the structure of the Camrose Liquor Discounter Thanksgiving flyer.
// Brand names, item numbers and prices are placeholders, not real products or prices.
// Replace them with the real values from the reference flyer before printing.
import type { Flyer, Slot } from './types';

type Row = [name: string, varieties: string, size: string, price: string];

const ROWS: Row[] = [
  ['Sample Estate', 'Cabernet Sauvignon, Merlot, Pinot Grigio', '750ml', '14.99'],
  ['Sample Ridge', 'Shiraz, Chardonnay', '750ml', '12.99'],
  ['Sample Cellars Reserve', 'Malbec, Sauvignon Blanc', '750ml', '17.99'],
  ['Sample Valley', 'Red Blend, White Blend', '750ml', '11.99'],
  ['Sample Box Wine Co.', 'Cabernet Sauvignon, Merlot, Pinot Grigio, Chardonnay', '4L', '49.99'],
  ['Sample Vineyards', 'Pinot Noir, Riesling', '750ml', '19.99'],
  ['Sample Coast', 'Sauvignon Blanc', '750ml', '15.99'],
  ['Sample Hills', 'Merlot, Cabernet Sauvignon', '750ml', '13.99'],
  ['Sample Family Wines', 'Moscato, Pink Moscato', '750ml', '10.99'],
  ['Sample Cask', 'Shiraz Cabernet, Chardonnay', '4L', '44.99'],
  ['Sample Bodega', 'Tempranillo, Garnacha', '750ml', '16.99'],
  ['Sample Terrace', 'Pinot Grigio, Rosé', '750ml', '12.99'],
  ['Sample Grand Cru Style', 'Zinfandel, Petite Sirah', '750ml', '21.99'],
  ['Sample Orchard', 'Riesling, Gewürztraminer', '750ml', '13.99'],
  ['Sample Big Box Red', 'Red Blend, Merlot', '4L', '46.99'],
  ['Sample Mesa', 'Malbec, Cabernet Sauvignon', '750ml', '14.99'],
  ['Sample Lakeside', 'Chardonnay, Pinot Gris', '750ml', '18.99'],
  ['Sample Harvest', 'Cabernet Merlot, Sauvignon Blanc', '750ml', '11.99'],
  ['Sample Party Box', 'Pinot Grigio, Chardonnay, Merlot', '4L', '42.99'],
  ['Sample Prairie Cellars', 'Cabernet Franc, Pinot Noir', '750ml', '15.99'],
];

export function buildCamroseSample(): Flyer {
  const slots: Slot[] = ROWS.map(([name, varieties, size, price], i) => ({
    id: `s_sample${i + 1}`,
    itemNumber: `SAMPLE${String(i + 1).padStart(2, '0')}`,
    itemType: 'AGLC',
    name,
    varieties,
    size,
    sizeCustom: '',
    container: 'bottles',
    salePrice: price,
    regularPrice: '',
  }));
  const now = new Date().toISOString();
  return {
    id: 'sample-camrose-thanksgiving',
    title: 'SAMPLE DATA: Camrose Thanksgiving test flyer',
    themeId: 'fall',
    headline: 'Happy Thanksgiving',
    fromDate: '2026-10-08',
    toDate: '2026-10-21',
    storeId: 'camrose',
    slots,
    sample: true,
    createdAt: now,
    updatedAt: now,
  };
}
