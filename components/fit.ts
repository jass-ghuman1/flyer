// Shrinks text to fit its box. Every element with [data-fit] gets the largest font size between
// data-min and data-max (px) at which its content fits without overflowing. If it still does not fit
// at the minimum, the text is clamped with an ellipsis so it can never spill out of the cell.

function fits(el: HTMLElement): boolean {
  return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
}

export function fitAll(root: HTMLElement): void {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-fit]'));
  for (const el of els) {
    let max = Number(el.dataset.max || 16);
    // data-cap: never larger than this fraction of the previous element's fitted size (keeps hierarchy).
    const cap = Number(el.dataset.cap || 0);
    const prev = el.previousElementSibling as HTMLElement | null;
    if (cap && prev?.style.fontSize) max = Math.min(max, parseFloat(prev.style.fontSize) * cap);
    const min = Math.min(Number(el.dataset.min || 6), max);
    el.style.webkitLineClamp = '';
    el.classList.remove('fit-clamped');
    el.style.fontSize = `${max}px`;
    if (fits(el)) continue;
    let lo = min;
    let hi = max;
    for (let i = 0; i < 9 && hi - lo > 0.25; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (fits(el)) lo = mid;
      else hi = mid;
    }
    el.style.fontSize = `${lo}px`;
    if (!fits(el)) {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || lo * 1.15;
      const lines = Math.max(1, Math.floor(el.clientHeight / lh));
      el.classList.add('fit-clamped');
      el.style.webkitLineClamp = String(lines);
    }
  }
}
