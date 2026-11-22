'use client';
import { memo, useEffect, useRef, useState } from 'react';
import type { Product, Slot } from '@/lib/types';
import { SIZE_OPTIONS, isPackSize, isLargeSize } from '@/lib/sizes';
import { isValidPrice, slotHasContent } from '@/lib/format';
import { api, jsonInit, removeWhiteBackground, uploadFile } from '@/lib/client';
import type { LookupResponse } from '@/lib/lookup';

interface Props {
  slot: Slot;
  index: number;
  count: number;
  onChange: (id: string, patch: Partial<Slot>) => void;
  onAction: (id: string, action: 'up' | 'down' | 'duplicate' | 'clear' | 'remove') => void;
}

function fillEmpty(slot: Slot, p: Partial<Slot>): Partial<Slot> {
  const out: Partial<Slot> = {};
  if (!slot.name.trim() && p.name) out.name = p.name;
  if (!slot.varieties.trim() && p.varieties) out.varieties = p.varieties;
  if (!slot.size && p.size) {
    out.size = p.size;
    out.sizeCustom = p.sizeCustom || '';
    if (p.container) out.container = p.container;
  }
  if (!slot.imageId && p.imageId) out.imageId = p.imageId;
  return out;
}

function SlotEditorInner({ slot, index, count, onChange, onAction }: Props) {
  const set = (patch: Partial<Slot>) => onChange(slot.id, patch);
  const [lookupMsg, setLookupMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState('');
  const lastLooked = useRef(slot.itemNumber.trim());
  const [libQ, setLibQ] = useState('');
  const [libResults, setLibResults] = useState<Product[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function lookup(force = false) {
    const num = slot.itemNumber.trim();
    if (!num || (!force && num === lastLooked.current)) return;
    lastLooked.current = num;
    setBusy('lookup');
    setLookupMsg(null);
    try {
      const r = await api<LookupResponse>('/api/lookup', jsonInit('POST', { itemNumber: num, itemType: slot.itemType }));
      if (r.found && r.product) {
        const patch = fillEmpty(slot, r.product as Partial<Slot>);
        set(patch);
        setLookupMsg({ text: `Found in ${r.source}.${Object.keys(patch).length ? ' Empty fields filled in.' : ' Your entries were kept.'}`, ok: true });
      } else {
        setLookupMsg({ text: 'Not found, please enter manually.', ok: false });
      }
    } catch (e) {
      setLookupMsg({ text: `Lookup failed: ${(e as Error).message} Please enter manually.`, ok: false });
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    if (!libQ.trim()) {
      setLibResults(null);
      return;
    }
    const t = setTimeout(() => {
      api<Product[]>(`/api/products?q=${encodeURIComponent(libQ.trim())}`).then(setLibResults).catch(() => setLibResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [libQ]);

  function pick(p: Product) {
    set({
      itemNumber: p.itemNumber,
      itemType: p.itemType,
      name: p.name,
      varieties: p.varieties,
      size: p.size,
      sizeCustom: p.sizeCustom,
      container: p.container,
      imageId: p.imageId,
      imageOriginalId: undefined,
      bgRemoved: false,
      ...(slot.salePrice.trim() ? {} : { salePrice: p.lastPrice }),
    });
    lastLooked.current = p.itemNumber;
    setLibQ('');
    setLibResults(null);
    setLookupMsg({ text: 'Filled from the product library.', ok: true });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy('upload');
    setLookupMsg(null);
    try {
      const id = await uploadFile(f);
      set({ imageId: id, imageOriginalId: undefined, bgRemoved: false });
    } catch (err) {
      setLookupMsg({ text: (err as Error).message, ok: false });
    } finally {
      setBusy('');
    }
  }

  async function toggleBg(on: boolean) {
    if (!slot.imageId) return;
    if (!on) {
      set({ imageId: slot.imageOriginalId || slot.imageId, imageOriginalId: undefined, bgRemoved: false });
      return;
    }
    setBusy('bg');
    try {
      const id = await removeWhiteBackground(slot.imageId);
      set({ imageOriginalId: slot.imageId, imageId: id, bgRemoved: true });
    } catch (err) {
      setLookupMsg({ text: `Could not remove background: ${(err as Error).message}`, ok: false });
    } finally {
      setBusy('');
    }
  }

  const priceBad = slot.salePrice.trim() !== '' && !isValidPrice(slot.salePrice);
  const regBad = slot.regularPrice.trim() !== '' && !isValidPrice(slot.regularPrice);
  const needsPrice = slotHasContent(slot) && !slot.salePrice.trim();
  const pid = `slot-${slot.id}`;

  return (
    <div className={`slot${slotHasContent(slot) ? '' : ' is-empty'}`}>
      <div className="slot-head">
        <span className="idx">#{index + 1}</span>
        {isLargeSize(slot.size) && <span className="tag">Large cell</span>}
        <span className="spacer" />
        <button type="button" className="btn btn-sm btn-icon" title="Move up" aria-label="Move up" disabled={index === 0} onClick={() => onAction(slot.id, 'up')}>↑</button>
        <button type="button" className="btn btn-sm btn-icon" title="Move down" aria-label="Move down" disabled={index === count - 1} onClick={() => onAction(slot.id, 'down')}>↓</button>
        <button type="button" className="btn btn-sm" onClick={() => onAction(slot.id, 'duplicate')}>Duplicate</button>
        <button type="button" className="btn btn-sm" onClick={() => onAction(slot.id, 'clear')}>Clear</button>
        <button type="button" className="btn btn-sm btn-danger" title="Remove this slot" onClick={() => onAction(slot.id, 'remove')}>Remove</button>
      </div>

      <div className="slot-grid">
        <div>
          <label htmlFor={`${pid}-num`}>Item number</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select aria-label="Item number type" value={slot.itemType} onChange={(e) => set({ itemType: e.target.value as Slot['itemType'] })} style={{ width: 92, flex: 'none' }}>
              <option value="AGLC">AGLC SKU</option>
              <option value="BDL">BDL / CL</option>
            </select>
            <input
              id={`${pid}-num`}
              value={slot.itemNumber}
              inputMode="text"
              onChange={(e) => set({ itemNumber: e.target.value })}
              onBlur={() => lookup()}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), lookup(true))}
            />
            <button type="button" className="btn" style={{ flex: 'none' }} disabled={!slot.itemNumber.trim() || busy === 'lookup'} onClick={() => lookup(true)}>
              {busy === 'lookup' ? '…' : 'Look up'}
            </button>
          </div>
          {lookupMsg && <div className={`lookup-msg ${lookupMsg.ok ? 'ok' : 'error'}`}>{lookupMsg.text}</div>}
        </div>
        <div style={{ position: 'relative' }}>
          <label htmlFor={`${pid}-lib`}>Pick from library</label>
          <input id={`${pid}-lib`} placeholder="Search by name or number" value={libQ} onChange={(e) => setLibQ(e.target.value)} onBlur={() => setTimeout(() => setLibResults(null), 200)} />
          {libResults && (
            <div className="lib-results">
              {libResults.length === 0 && <div className="small muted" style={{ padding: 8 }}>No saved products match.</div>}
              {libResults.map((p) => (
                <button type="button" key={`${p.itemType}:${p.itemNumber}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                  <b>{p.name}</b> <span className="muted small">{p.itemType} {p.itemNumber}{p.sample ? ' · sample' : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor={`${pid}-name`}>Product name (brand)</label>
          <input id={`${pid}-name`} value={slot.name} placeholder="e.g. Kokanee" onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${pid}-var`}>Varieties</label>
          <input id={`${pid}-var`} value={slot.varieties} placeholder="e.g. Cabernet Sauvignon, Merlot" onChange={(e) => set({ varieties: e.target.value })} />
        </div>

        <div>
          <label htmlFor={`${pid}-size`}>Size / pack</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select id={`${pid}-size`} value={slot.size} onChange={(e) => set({ size: e.target.value })}>
              <option value="">Select…</option>
              {SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {isPackSize(slot.size) && (
              <select aria-label="Cans or bottles" value={slot.container} onChange={(e) => set({ container: e.target.value as Slot['container'] })} style={{ width: 100, flex: 'none' }}>
                <option value="cans">Cans</option>
                <option value="bottles">Bottles</option>
              </select>
            )}
          </div>
          {slot.size === 'custom' && (
            <input aria-label="Custom size" style={{ marginTop: 6 }} placeholder="e.g. 375 ml or 6 x 355 ml" value={slot.sizeCustom} onChange={(e) => set({ sizeCustom: e.target.value })} />
          )}
        </div>
        <div className="grid2">
          <div>
            <label htmlFor={`${pid}-sale`}>Sale price *</label>
            <input id={`${pid}-sale`} inputMode="decimal" placeholder="19.99" value={slot.salePrice} aria-invalid={priceBad || needsPrice} onChange={(e) => set({ salePrice: e.target.value })} />
            {priceBad && <div className="lookup-msg error">Enter a price like 19.99</div>}
            {needsPrice && !priceBad && <div className="lookup-msg error">Sale price required</div>}
          </div>
          <div>
            <label htmlFor={`${pid}-reg`}>Regular price</label>
            <input id={`${pid}-reg`} inputMode="decimal" placeholder="optional" value={slot.regularPrice} aria-invalid={regBad} onChange={(e) => set({ regularPrice: e.target.value })} />
            {regBad && <div className="lookup-msg error">Enter a price like 24.99</div>}
          </div>
        </div>

        <div className="full slot-img">
          <span className="thumb" style={slot.imageId ? { backgroundImage: `url(/api/images/${slot.imageId})` } : undefined} aria-label={slot.imageId ? 'Product image' : 'No image'} />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
          <button type="button" className="btn btn-sm" disabled={busy === 'upload'} onClick={() => fileRef.current?.click()}>
            {busy === 'upload' ? 'Uploading…' : slot.imageId ? 'Replace image' : 'Upload image'}
          </button>
          {slot.imageId && (
            <>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0, fontWeight: 500 }}>
                <input type="checkbox" style={{ width: 18, minHeight: 18 }} checked={Boolean(slot.bgRemoved)} disabled={busy === 'bg'} onChange={(e) => toggleBg(e.target.checked)} />
                {busy === 'bg' ? 'Working…' : 'Remove white background'}
              </label>
              <button type="button" className="btn btn-sm" onClick={() => set({ imageId: undefined, imageOriginalId: undefined, bgRemoved: false })}>Remove image</button>
            </>
          )}
          <span className="small muted">PNG, JPG or WebP, up to 10 MB</span>
        </div>
      </div>
    </div>
  );
}

const SlotEditor = memo(SlotEditorInner);
export default SlotEditor;
