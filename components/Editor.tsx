'use client';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AppSettings, ExportFormat, Flyer, FlyerRenderInput, Slot, ThemeId } from '@/lib/types';
import { THEMES, getTheme } from '@/lib/themes';
import { emptySlot, formatDateRange, isDateRangeValid, isValidPrice, newId, slotHasContent, slotIsPrintable } from '@/lib/format';
import { FORMATS, FORMAT_LIST } from '@/lib/export/formats';
import { MAX_SLOTS } from '@/lib/defaults';
import { api, exportOnServer, exportPdfViaPrintDialog, exportPngInBrowser, jsonInit } from '@/lib/client';
import SlotEditor from './SlotEditor';
import Preview from './Preview';
import FlyerView from './Flyer';

const DRAFT_PREFIX = 'fb-draft:';

interface Draft {
  flyer: Flyer;
  savedAt: number;
}

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(key: string, flyer: Flyer) {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ flyer, savedAt: Date.now() }));
  } catch {
    /* storage full or blocked: ignore */
  }
}
function clearDraft(key: string) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
}

function blankFlyer(slotCount: number): Flyer {
  const now = new Date().toISOString();
  return {
    id: '',
    themeId: '' as ThemeId,
    headline: '',
    fromDate: '',
    toDate: '',
    storeId: '',
    slots: Array.from({ length: slotCount }, emptySlot),
    createdAt: now,
    updatedAt: now,
  };
}

export default function Editor() {
  const router = useRouter();
  const params = useSearchParams();
  const flyerId = params.get('id') || '';
  const draftKey = flyerId || 'new';

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('letter');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [offscreen, setOffscreen] = useState<{ format: ExportFormat; resolve: () => void } | null>(null);
  const offscreenRef = useRef<HTMLDivElement>(null);

  // Load settings + flyer (or restore a draft).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api<AppSettings>('/api/settings');
        if (cancelled) return;
        setSettings(s);
        let base: Flyer;
        if (flyerId) base = await api<Flyer>(`/api/flyers/${encodeURIComponent(flyerId)}`);
        else base = blankFlyer(s.defaultSlotCount);
        const d = readDraft(draftKey);
        if (d && (!flyerId || d.flyer.id === base.id)) {
          setFlyer(d.flyer);
          setDirty(true);
          setRestored(true);
        } else {
          setFlyer(base);
          setDirty(false);
          setRestored(false);
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [flyerId, draftKey]);

  // Autosave draft locally on every change (debounced).
  useEffect(() => {
    if (!flyer || !dirty) return;
    const t = setTimeout(() => writeDraft(draftKey, flyer), 400);
    return () => clearTimeout(t);
  }, [flyer, dirty, draftKey]);

  // Warn before leaving with unsaved changes (the local draft still protects against loss).
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const update = useCallback((patch: Partial<Flyer>) => {
    setFlyer((f) => (f ? { ...f, ...patch } : f));
    setDirty(true);
  }, []);

  const changeSlot = useCallback((id: string, patch: Partial<Slot>) => {
    setFlyer((f) => (f ? { ...f, slots: f.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : f));
    setDirty(true);
  }, []);

  const slotAction = useCallback((id: string, action: 'up' | 'down' | 'duplicate' | 'clear' | 'remove') => {
    setFlyer((f) => {
      if (!f) return f;
      const slots = [...f.slots];
      const i = slots.findIndex((s) => s.id === id);
      if (i < 0) return f;
      if (action === 'up' && i > 0) [slots[i - 1], slots[i]] = [slots[i], slots[i - 1]];
      if (action === 'down' && i < slots.length - 1) [slots[i + 1], slots[i]] = [slots[i], slots[i + 1]];
      if (action === 'duplicate' && slots.length < MAX_SLOTS) slots.splice(i + 1, 0, { ...slots[i], id: newId('s_') });
      if (action === 'clear') slots[i] = { ...emptySlot(), id };
      if (action === 'remove') {
        if (slotHasContent(slots[i]) && !window.confirm(`Remove slot #${i + 1} (${slots[i].name || 'item'})?`)) return f;
        slots.splice(i, 1);
      }
      return { ...f, slots };
    });
    setDirty(true);
  }, []);

  const store = useMemo(() => settings?.stores.find((s) => s.id === flyer?.storeId) ?? null, [settings, flyer?.storeId]);
  const renderInput: FlyerRenderInput | null = useMemo(() => {
    if (!flyer || !settings) return null;
    const theme = settings.themes[flyer.themeId] ?? { headline: '' };
    return { flyer, store, theme };
  }, [flyer, settings, store]);
  const deferredInput = useDeferredValue(renderInput);

  if (loadError) return <div className="page"><p className="error">Could not load: {loadError}</p><a className="btn" href="/">Start a new flyer</a></div>;
  if (!flyer || !settings || !renderInput) return <div className="page muted">Loading…</div>;

  const datesOk = isDateRangeValid(flyer.fromDate, flyer.toDate);
  const problems: string[] = [];
  if (!flyer.themeId) problems.push('Pick a season / theme (step 1).');
  if (!flyer.fromDate || !flyer.toDate) problems.push('Set the sale dates (step 2).');
  if (!datesOk) problems.push('"To" date cannot be before "From" date.');
  if (!flyer.storeId) problems.push('Pick a store (step 3).');
  const badPrices = flyer.slots.filter((s) => slotHasContent(s) && !isValidPrice(s.salePrice)).length;
  if (badPrices) problems.push(`${badPrices} item${badPrices > 1 ? 's need' : ' needs'} a valid sale price (they are hidden from the flyer until fixed).`);
  const missingStore: string[] = [];
  if (store) {
    if (!store.logoImageId) missingStore.push('logo');
    if (!store.hours.filter(Boolean).length) missingStore.push('hours');
    if (!store.phone) missingStore.push('phone');
    if (!store.qrLink) missingStore.push('newsletter QR link');
  }
  const printable = flyer.slots.filter(slotIsPrintable).length;

  async function save(): Promise<Flyer | null> {
    if (!flyer) return null;
    if (!flyer.themeId || !flyer.storeId) {
      setStatus({ text: 'Pick a theme and a store before saving.', ok: false });
      return null;
    }
    if (!datesOk) {
      setStatus({ text: '"To" date cannot be before "From" date.', ok: false });
      return null;
    }
    setSaving(true);
    try {
      const saved = await api<Flyer>('/api/flyers', jsonInit('POST', flyer));
      clearDraft(draftKey);
      setFlyer(saved);
      setDirty(false);
      setRestored(false);
      setStatus({ text: `Saved at ${new Date(saved.updatedAt).toLocaleTimeString()}. Products added to the library.`, ok: true });
      if (!flyerId) {
        clearDraft('new');
        router.replace(`/?id=${saved.id}`);
      }
      return saved;
    } catch (e) {
      setStatus({ text: `Save failed: ${(e as Error).message}`, ok: false });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitForDesign() {
    if (!flyer) return;
    if (problems.some((p) => !p.includes('valid sale price'))) {
      setStatus({ text: `Before submitting: ${problems[0]}`, ok: false });
      return;
    }
    if (!window.confirm('Submit this flyer? It will be saved and emailed as an AI design prompt.')) return;
    setSubmitting(true);
    try {
      const saved = await save();
      if (!saved) return;
      const r = await api<{ attachments: number }>(`/api/flyers/${saved.id}/submit`, { method: 'POST' });
      setStatus({ text: `Submitted. The AI prompt was emailed${r.attachments ? ` with ${r.attachments} image${r.attachments > 1 ? 's' : ''}` : ''}.`, ok: true });
    } catch (e) {
      setStatus({ text: `Submit failed: ${(e as Error).message}`, ok: false });
    } finally {
      setSubmitting(false);
    }
  }

  function discardDraft() {
    clearDraft(draftKey);
    window.location.reload();
  }

  function newFlyer() {
    if (dirty && !window.confirm('Start a new flyer? Unsaved changes on this one stay in its local draft.')) return;
    window.location.href = '/';
  }

  async function doExport(fmtId: ExportFormat) {
    if (!renderInput) return;
    if (problems.some((p) => !p.includes('valid sale price'))) {
      setStatus({ text: `Before exporting: ${problems[0]}`, ok: false });
      return;
    }
    setExporting(fmtId);
    setStatus({ text: `Exporting ${FORMATS[fmtId].label}…`, ok: true });
    try {
      await exportOnServer(fmtId, renderInput);
      setStatus({ text: `${FORMATS[fmtId].label} downloaded.`, ok: true });
    } catch (e) {
      const why = (e as Error).message;
      try {
        if (FORMATS[fmtId].kind === 'png') {
          await new Promise<void>((resolve) => setOffscreen({ format: fmtId, resolve }));
          const node = offscreenRef.current?.querySelector('.flyer') as HTMLElement | null;
          if (!node) throw new Error('render node missing');
          await exportPngInBrowser(node, fmtId, renderInput);
          setStatus({ text: `Server export was unavailable (${why}). Made the PNG in this browser instead.`, ok: true });
        } else {
          exportPdfViaPrintDialog(fmtId, renderInput);
          setStatus({ text: `Server export was unavailable (${why}). A print window opened: choose "Save as PDF", paper ${FORMATS[fmtId].pdfWidth} x ${FORMATS[fmtId].pdfHeight}, margins None, background graphics on.`, ok: false });
        }
      } catch (e2) {
        setStatus({ text: `Export failed: ${why}. Fallback also failed: ${(e2 as Error).message}`, ok: false });
      } finally {
        setOffscreen(null);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="page">
      {restored && (
        <div className="notice" style={{ marginBottom: 12 }}>
          Restored your unsaved changes from this browser. <button className="btn btn-sm" onClick={save}>Save now</button>{' '}
          <button className="btn btn-sm" onClick={discardDraft}>Discard changes</button>
        </div>
      )}
      {params.get('denied') && <div className="notice notice-red" style={{ marginBottom: 12 }}>Settings are for the admin login only.</div>}
      <div className="editor">
        <div>
          <div className="panel step">
            <div className="row" style={{ alignItems: 'center' }}>
              <div style={{ flex: '3 1 200px' }}>
                <strong style={{ fontSize: 18 }}>{flyer.title || (flyerId ? 'Flyer' : 'New flyer')}</strong>
                {flyer.sample && <span className="tag" style={{ marginLeft: 8 }}>SAMPLE DATA</span>}
                <div className="small muted">{dirty ? 'Unsaved changes (kept in this browser until you save)' : flyerId ? 'All changes saved' : 'Not saved yet'}</div>
              </div>
              <button className="btn" style={{ flex: 'none' }} onClick={newFlyer}>New flyer</button>
              <button className="btn btn-primary" style={{ flex: 'none' }} onClick={save} disabled={saving || submitting}>{saving ? 'Saving…' : 'Save flyer'}</button>
              <button className="btn btn-primary" style={{ flex: 'none', background: '#15803d', borderColor: '#15803d' }} onClick={submitForDesign} disabled={saving || submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
            {status && <p className={status.ok ? 'ok small' : 'error small'} role="status" style={{ marginBottom: 0 }}>{status.text}</p>}
          </div>

          <section className="panel step">
            <h2><span className="num">1</span>Season / theme</h2>
            <div className="theme-picks">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="theme-pick"
                  aria-pressed={flyer.themeId === t.id}
                  onClick={() => update({ themeId: t.id, headline: settings.themes[t.id]?.headline || t.headline })}
                >
                  <span className="swatch" style={{ background: `linear-gradient(135deg, ${t.colors.primary} 50%, ${t.colors.accent} 50%)` }} />
                  {t.name}
                </button>
              ))}
            </div>
            {flyer.themeId && (
              <div style={{ marginTop: 10 }}>
                <label htmlFor="headline">Headline ribbon text</label>
                <input id="headline" value={flyer.headline} maxLength={60} onChange={(e) => update({ headline: e.target.value })} />
              </div>
            )}
          </section>

          <section className="panel step">
            <h2><span className="num">2</span>Flyer active dates</h2>
            <div className="row">
              <div>
                <label htmlFor="from">From</label>
                <input id="from" type="date" value={flyer.fromDate} onChange={(e) => update({ fromDate: e.target.value })} />
              </div>
              <div>
                <label htmlFor="to">To</label>
                <input id="to" type="date" value={flyer.toDate} min={flyer.fromDate || undefined} aria-invalid={!datesOk} onChange={(e) => update({ toDate: e.target.value })} />
              </div>
            </div>
            {!datesOk ? (
              <p className="error small">&quot;To&quot; date cannot be before &quot;From&quot; date.</p>
            ) : (
              flyer.fromDate && flyer.toDate && <p className="small muted">Footer: Sale prices in effect from {formatDateRange(flyer.fromDate, flyer.toDate)}</p>
            )}
          </section>

          <section className="panel step">
            <h2><span className="num">3</span>Store</h2>
            <select aria-label="Store" value={flyer.storeId} onChange={(e) => update({ storeId: e.target.value })}>
              <option value="">Select a store…</option>
              {settings.stores.map((s) => (
                <option key={s.id} value={s.id}>{s.displayName}</option>
              ))}
            </select>
            {missingStore.length > 0 && (
              <p className="notice small" style={{ marginBottom: 0 }}>
                Not set for this store yet: <b>{missingStore.join(', ')}</b>. The flyer shows a marked placeholder until an admin fills it in Settings.
              </p>
            )}
          </section>

          <section className="panel step">
            <h2><span className="num">4</span>Items <span className="small muted" style={{ fontWeight: 400 }}>({printable} on flyer, {flyer.slots.length} slots)</span></h2>
            <p className="small muted" style={{ marginTop: 0 }}>Type an item number and press Look up (or leave the field) to fill in details. Empty slots are left off the flyer. 4 L, 24, 30 and 36 packs get a larger cell automatically.</p>
            <div className="slots">
              {flyer.slots.map((s, i) => (
                <SlotEditor key={s.id} slot={s} index={i} count={flyer.slots.length} onChange={changeSlot} onAction={slotAction} />
              ))}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" style={{ flex: 'none' }} disabled={flyer.slots.length >= MAX_SLOTS} onClick={() => update({ slots: [...flyer.slots, emptySlot()] })}>+ Add slot</button>
              <span className="small muted">Up to {MAX_SLOTS} slots.</span>
            </div>
          </section>
        </div>

        <div className="editor-preview panel">
          <div className="format-tabs" role="group" aria-label="Preview size">
            {FORMAT_LIST.map((f) => (
              <button key={f.id} className="btn btn-sm" aria-pressed={format === f.id} onClick={() => setFormat(f.id)}>
                {f.id === 'letter' ? 'Letter' : f.id === 'tabloid' ? '11x17' : f.id === 'square' ? '1080 square' : '1080x1350'}
              </button>
            ))}
          </div>
          <div className="preview-box">
            <Preview input={deferredInput ?? renderInput} format={format} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="small muted" style={{ marginBottom: 6 }}>Export (theme: {flyer.themeId ? getTheme(flyer.themeId).name : 'not set'})</div>
            <div className="row">
              {FORMAT_LIST.map((f) => (
                <button key={f.id} className="btn" onClick={() => doExport(f.id)} disabled={exporting !== null}>
                  {exporting === f.id ? 'Exporting…' : f.label}
                </button>
              ))}
            </div>
            {problems.length > 0 && (
              <ul className="small error" style={{ paddingLeft: 18, marginBottom: 0 }}>
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>

      {offscreen && (
        <div ref={offscreenRef} style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }} aria-hidden="true">
          <FlyerView input={renderInput} format={offscreen.format} onReady={offscreen.resolve} />
        </div>
      )}
    </div>
  );
}
