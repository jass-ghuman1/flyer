'use client';
// The flyer. One component used for the live preview AND for PDF/PNG exports (via /print).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { ExportFormat, FlyerRenderInput, Slot } from '@/lib/types';
import { getTheme } from '@/lib/themes';
import { FORMATS } from '@/lib/export/formats';
import { formatDateRange, slotIsPrintable, splitPrice } from '@/lib/format';
import { isLargeSize, sizeLabel } from '@/lib/sizes';
import { planGrid } from '@/lib/layout';
import { fitAll } from './fit';
import ThemeArt from './ThemeArt';
import QrCode from './QrCode';
import Silhouette from './Silhouette';

export function imageUrl(id?: string) {
  return id ? `/api/images/${id}` : '';
}

const GRID_COLS: Record<ExportFormat, number[]> = {
  letter: [3, 4, 5, 6],
  tabloid: [3, 4, 5, 6],
  square: [4, 5, 6, 7],
  portrait: [4, 5, 6],
};

function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="ph">{children}</span>;
}

function Price({ value, cls }: { value: string; cls?: string }) {
  const p = splitPrice(value);
  if (!p) return null;
  return (
    <span className={cls}>
      <span className="p-cur">$</span>
      <span className="p-dol">{p.dollars}</span>
      <span className="p-cts">{p.cents}</span>
    </span>
  );
}

function ProductImage({ slot }: { slot: Slot }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [slot.imageId]);
  if (!slot.imageId || failed) return <Silhouette size={slot.size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl(slot.imageId)} alt="" onError={() => setFailed(true)} />;
}

export interface FlyerProps {
  input: FlyerRenderInput;
  format: ExportFormat;
  onReady?: () => void;
}

export default function FlyerView({ input, format, onReady }: FlyerProps) {
  const { flyer, store, theme: themeSetting } = input;
  const fmt = FORMATS[format];
  const theme = getTheme(flyer.themeId);
  const u = fmt.unit;
  const rootRef = useRef<HTMLDivElement>(null);

  const pad = Math.round(12 * u);
  const headerH = Math.round((fmt.compact ? 104 : 118) * u);
  const ribbonH = Math.round((fmt.compact ? 48 : 54) * u);
  const footerH = Math.round((fmt.compact ? 100 : 112) * u);
  const gap = Math.round(5 * u);
  const gridW = fmt.width - pad * 2;
  const gridH = fmt.height - headerH - ribbonH - footerH - pad * 2;

  const items = useMemo(() => flyer.slots.filter(slotIsPrintable), [flyer.slots]);
  const plan = useMemo(
    () => planGrid(items.map((s) => ({ w: isLargeSize(s.size) ? 2 : 1 })), gridW, gridH, GRID_COLS[format], fmt.compact ? 1.0 : 1.1),
    [items, gridW, gridH, format, fmt.compact],
  );
  const rowH = plan.rows.length ? (gridH - gap * (plan.rows.length - 1)) / plan.rows.length : 0;
  const cellW = (gridW - gap * (plan.cols - 1)) / plan.cols;
  const horizontal = cellW / rowH >= 0.95;

  const style = {
    width: fmt.width,
    height: fmt.height,
    '--u': u,
    '--primary': theme.colors.primary,
    '--primary-text': theme.colors.primaryText,
    '--accent': theme.colors.accent,
    '--accent-text': theme.colors.accentText,
    '--price': theme.colors.price,
    '--card-border': theme.colors.cardBorder,
  } as CSSProperties;

  // Fit all text after every render and once web fonts finish loading.
  const contentKey = JSON.stringify([input, format]);
  useLayoutEffect(() => {
    if (rootRef.current) fitAll(rootRef.current);
  });
  useEffect(() => {
    let cancelled = false;
    const root = rootRef.current;
    if (!root) return;
    const imgs = Array.from(root.querySelectorAll('img'));
    Promise.all([
      document.fonts?.ready,
      ...imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); }))),
    ]).then(() => {
      if (cancelled || !rootRef.current) return;
      fitAll(rootRef.current);
      requestAnimationFrame(() => !cancelled && onReady?.());
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  const dateRange = formatDateRange(flyer.fromDate, flyer.toDate);
  const textH = Math.min(rowH, 210 * u); // keep type sensible when only a few items fill the page
  const fs = (f: number) => Math.max(6, Math.round(textH * f * 10) / 10);

  return (
    <div ref={rootRef} className={`flyer fmt-${format}${fmt.compact ? ' compact' : ''}`} style={style}>
      <div className="fl-bg">
        <ThemeArt theme={theme} width={fmt.width} height={fmt.height} />
        {themeSetting.backgroundImageId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="fl-bg-img" src={imageUrl(themeSetting.backgroundImageId)} alt="" />
        )}
      </div>

      <header className="fl-header" style={{ height: headerH, padding: `${pad * 0.7}px ${pad * 1.3}px` }}>
        <div className="fl-logo">
          {store?.logoImageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(store.logoImageId)} alt={store.displayName} />
          ) : (
            <div className="fl-wordmark" data-fit data-max={34 * u} data-min={12 * u}>
              {store?.displayName || <Placeholder>Select a store</Placeholder>}
            </div>
          )}
        </div>
        <div className="fl-address">
          {store?.logoImageId && <div className="fl-storename" data-fit data-max={17 * u} data-min={9 * u}>{store.displayName}</div>}
          <div className="fl-addr-lines" data-fit data-max={14 * u} data-min={8 * u}>
            {store ? (
              store.addressLines.filter(Boolean).length ? (
                store.addressLines.filter(Boolean).map((l, i) => <div key={i}>{l}</div>)
              ) : (
                <Placeholder>Address: admin to set</Placeholder>
              )
            ) : null}
            {store?.locationNote && <div className="fl-locnote">{store.locationNote}</div>}
          </div>
        </div>
        <div className="fl-hours">
          <div className="fl-hours-lines" data-fit data-max={13 * u} data-min={7.5 * u}>
            {store ? (
              store.hours.filter(Boolean).length ? (
                store.hours.filter(Boolean).map((l, i) => <div key={i}>{l}</div>)
              ) : (
                <Placeholder>Hours: admin to set</Placeholder>
              )
            ) : null}
          </div>
          <div className="fl-phone" data-fit data-max={20 * u} data-min={9 * u}>
            {store ? store.phone || <Placeholder>Phone: admin to set</Placeholder> : null}
          </div>
        </div>
      </header>

      <div className="fl-ribbon-wrap" style={{ height: ribbonH }}>
        <div className="fl-ribbon" data-fit data-max={ribbonH * 0.62} data-min={14 * u}>
          {flyer.headline}
        </div>
      </div>

      <main className="fl-grid" style={{ width: gridW, height: gridH, margin: `${pad}px ${pad}px`, gap }}>
        {items.length === 0 && <div className="fl-empty">Add items with a name and sale price to fill the flyer.</div>}
        {plan.rows.map((row, ri) => (
          <div className="fl-row" key={ri} style={{ height: rowH, gap }}>
            {row.map((idx) => {
              const s = items[idx];
              const w = isLargeSize(s.size) ? 2 : 1;
              const hasReg = Boolean(splitPrice(s.regularPrice));
              const wide = w === 2 || horizontal;
              return (
                <div className={`cell ${wide ? 'cell-h' : 'cell-v'}${w === 2 ? ' cell-big' : ''}`} key={s.id} style={{ flex: `${w} ${w} 0` }}>
                  <div className="cell-img">
                    <ProductImage slot={s} />
                  </div>
                  <div className={`cell-text${hasReg ? ' has-reg' : ''}`}>
                    <div className="c-name" data-fit data-max={fs(wide ? 0.17 : 0.11)} data-min={8 * u}>{s.name}</div>
                    <div className="c-var" data-fit data-cap="0.85" data-max={fs(wide ? 0.105 : 0.075)} data-min={6.5 * u}>{s.varieties}</div>
                    <div className="c-size" data-fit data-max={fs(wide ? 0.1 : 0.075)} data-min={6.5 * u}>{sizeLabel(s)}</div>
                    <div className="c-price" data-fit data-max={fs(wide ? 0.4 : 0.26)} data-min={14 * u}>
                      <Price value={s.salePrice} />
                    </div>
                    {hasReg && (
                      <div className="c-reg" data-fit data-max={fs(0.075)} data-min={6.5 * u}>
                        Reg. ${splitPrice(s.regularPrice)!.dollars}.{splitPrice(s.regularPrice)!.cents}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      <footer className="fl-footer" style={{ height: footerH, padding: `${pad * 0.7}px ${pad * 1.3}px` }}>
        <div className="ft-notes" data-fit data-max={13.5 * u} data-min={7.5 * u}>
          <div>Prices do not include GST &amp; Bottle Deposit</div>
          <div className="ft-pmg">Price Match Guarantee</div>
          <div>
            Sale prices in effect from {dateRange || <Placeholder>sale dates</Placeholder>}
          </div>
        </div>
        {store?.skipTheDishes && (
          <div className="ft-skip">
            <div className="ft-skip-badge" data-fit data-max={14 * u} data-min={7 * u}>
              <span>Delivery available on</span>
              <b>SkipTheDishes</b>
            </div>
          </div>
        )}
        <div className="ft-news">
          <div className="ft-news-text" data-fit data-max={14 * u} data-min={7.5 * u}>
            <span>
              <b>10% off</b> your next purchase when you sign up for our newsletter
            </span>
          </div>
          <div className="ft-qr" style={{ width: footerH - pad * 1.6, height: footerH - pad * 1.6 }}>
            {store?.qrLink ? (
              <QrCode text={store.qrLink} size={footerH - pad * 1.6} />
            ) : (
              <div className="ft-qr-ph">QR link: admin to set</div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
