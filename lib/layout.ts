// Grid packing for the flyer. Large formats (4 L, 24/30/36 pack) take two columns.
// Items are placed row by row in order; when a wide item does not fit at the end of a row,
// the next single item is pulled forward so the row is filled. Any row that is still short
// (usually the last one) stretches its items to the full width, so there are never gaps.

export interface PackItem {
  w: 1 | 2;
}

export function packRows(items: PackItem[], cols: number): number[][] {
  const queue = items.map((_, i) => i);
  const rows: number[][] = [];
  while (queue.length) {
    const row: number[] = [];
    let used = 0;
    for (;;) {
      const k = queue.findIndex((i) => Math.min(items[i].w, cols) <= cols - used);
      if (k < 0) break;
      const [i] = queue.splice(k, 1);
      row.push(i);
      used += Math.min(items[i].w, cols);
      if (used >= cols) break;
    }
    if (!row.length) row.push(queue.shift()!); // safety; cannot normally happen
    rows.push(row);
  }
  return rows;
}

export interface GridPlan {
  cols: number;
  rows: number[][];
  cellRatio: number; // width / height of a single-column cell
}

/** Picks the column count whose cells come closest to the target shape for this page area. */
export function planGrid(items: PackItem[], width: number, height: number, candidates: number[], targetRatio: number): GridPlan {
  let best: GridPlan | null = null;
  let bestScore = Infinity;
  for (const cols of candidates) {
    const rows = packRows(items, cols);
    const cellW = width / cols;
    const cellH = height / Math.max(rows.length, 1);
    const ratio = cellW / cellH;
    const units = rows.reduce((n, r) => n + r.reduce((m, i) => m + items[i].w, 0), 0);
    const empty = rows.length * cols - units;
    const score = Math.abs(Math.log(ratio / targetRatio)) + empty * 0.04;
    if (score < bestScore) {
      bestScore = score;
      best = { cols, rows, cellRatio: ratio };
    }
  }
  return best ?? { cols: 1, rows: [], cellRatio: 1 };
}
