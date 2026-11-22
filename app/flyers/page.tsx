'use client';
import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/TopBar';
import { api } from '@/lib/client';
import { formatDateRange } from '@/lib/format';
import { getTheme } from '@/lib/themes';
import type { AppSettings, Flyer, FlyerSummary } from '@/lib/types';

export default function FlyersPage() {
  const [list, setList] = useState<FlyerSummary[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [q, setQ] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const [l, s] = await Promise.all([api<FlyerSummary[]>('/api/flyers'), api<AppSettings>('/api/settings')]);
      setList(l);
      setSettings(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const storeName = (id: string, fallback: string) => settings?.stores.find((s) => s.id === id)?.displayName || fallback || id;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (list || []).filter((f) => {
      if (storeFilter && f.storeId !== storeFilter) return false;
      if (!needle) return true;
      const hay = [f.title, storeName(f.storeId, f.storeName), getTheme(f.themeId).name, formatDateRange(f.fromDate, f.toDate), f.fromDate, f.toDate]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, q, storeFilter, settings]);

  async function duplicate(id: string) {
    setBusy(id);
    try {
      const copy = await api<Flyer>(`/api/flyers/${id}/duplicate`, { method: 'POST' });
      window.location.href = `/?id=${copy.id}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy('');
    }
  }

  async function remove(f: FlyerSummary) {
    const label = `${storeName(f.storeId, f.storeName)}, ${getTheme(f.themeId).name}, ${formatDateRange(f.fromDate, f.toDate) || 'no dates'}`;
    if (!window.confirm(`Delete this flyer?\n\n${label}\n\nThis cannot be undone.`)) return;
    setBusy(f.id);
    try {
      await api(`/api/flyers/${f.id}`, { method: 'DELETE' });
      try {
        localStorage.removeItem(`fb-draft:${f.id}`);
      } catch {
        /* ignore */
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <TopBar active="flyers" />
      <div className="page">
        <div className="panel">
          <div className="row" style={{ marginBottom: 12 }}>
            <div style={{ flex: '2 1 240px' }}>
              <label htmlFor="q">Search</label>
              <input id="q" placeholder="Store, theme, dates…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <label htmlFor="st">Store</label>
              <select id="st" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="">All stores</option>
                {settings?.stores.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
              </select>
            </div>
            <a className="btn btn-primary" style={{ flex: 'none' }} href="/">+ New flyer</a>
          </div>
          {error && <p className="error">{error}</p>}
          {!list ? (
            <p className="muted">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="muted">No flyers found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="list">
                <thead>
                  <tr><th>Store</th><th>Theme</th><th>Sale dates</th><th>Last edited</th><th /></tr>
                </thead>
                <tbody>
                  {shown.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <a href={`/?id=${f.id}`}><b>{storeName(f.storeId, f.storeName)}</b></a>
                        {f.sample && <> <span className="tag">SAMPLE DATA</span></>}
                      </td>
                      <td>{getTheme(f.themeId).name}</td>
                      <td>{formatDateRange(f.fromDate, f.toDate) || <span className="muted">not set</span>}</td>
                      <td>{new Date(f.updatedAt).toLocaleString()}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <a className="btn btn-sm" href={`/?id=${f.id}`}>Open</a>{' '}
                        <button className="btn btn-sm" disabled={busy === f.id} onClick={() => duplicate(f.id)}>Duplicate</button>{' '}
                        <button className="btn btn-sm btn-danger" disabled={busy === f.id} onClick={() => remove(f)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small muted" style={{ marginBottom: 0 }}>Tip: to reuse last week&apos;s flyer for another store or new dates, Duplicate it, then change the store and dates.</p>
        </div>
      </div>
    </>
  );
}
