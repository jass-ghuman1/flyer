'use client';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { api, jsonInit, uploadFile } from '@/lib/client';
import { THEMES } from '@/lib/themes';
import { MAX_SLOTS } from '@/lib/defaults';
import type { AppSettings, Store } from '@/lib/types';

type Tab = 'stores' | 'themes' | 'slots' | 'users';

function lines(v: string): string[] {
  return v.split('\n').map((l) => l.trim()).filter(Boolean);
}

function StoreForm({ store, onChange }: { store: Store; onChange: (s: Store) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (p: Partial<Store>) => onChange({ ...store, ...p });
  const id = `st-${store.id}`;
  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>{store.displayName || 'Store'}</h3>
      <div className="grid2">
        <div>
          <label htmlFor={`${id}-n`}>Display name</label>
          <input id={`${id}-n`} value={store.displayName} onChange={(e) => set({ displayName: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${id}-f`}>Short label for file names</label>
          <input id={`${id}-f`} value={store.fileLabel} onChange={(e) => set({ fileLabel: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${id}-a`}>Address (one line per row)</label>
          <textarea id={`${id}-a`} value={store.addressLines.join('\n')} onChange={(e) => set({ addressLines: e.target.value.split('\n') })} onBlur={(e) => set({ addressLines: lines(e.target.value) })} />
        </div>
        <div>
          <label htmlFor={`${id}-h`}>Hours (one line per row)</label>
          <textarea id={`${id}-h`} placeholder="Not set: flyer shows an admin placeholder" value={store.hours.join('\n')} onChange={(e) => set({ hours: e.target.value.split('\n') })} onBlur={(e) => set({ hours: lines(e.target.value) })} />
        </div>
        <div>
          <label htmlFor={`${id}-l`}>Location note</label>
          <input id={`${id}-l`} placeholder="e.g. Next to Save On Foods" value={store.locationNote} onChange={(e) => set({ locationNote: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${id}-p`}>Phone</label>
          <input id={`${id}-p`} value={store.phone} onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${id}-q`}>Newsletter sign-up link (QR code)</label>
          <input id={`${id}-q`} type="url" placeholder="https://…" value={store.qrLink} onChange={(e) => set({ qrLink: e.target.value.trim() })} />
        </div>
        <div>
          <label>SkipTheDishes delivery</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 500, color: 'inherit' }}>
            <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={store.skipTheDishes} onChange={(e) => set({ skipTheDishes: e.target.checked })} />
            Show the SkipTheDishes delivery mark on this store&apos;s flyers
          </label>
        </div>
        <div className="full" style={{ gridColumn: '1 / -1' }}>
          <label>Logo</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {store.logoImageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/images/${store.logoImageId}`} alt="" style={{ height: 56, maxWidth: 200, objectFit: 'contain', background: '#eee', borderRadius: 6 }} />
            ) : (
              <span className="tag">No logo: store name is shown instead</span>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ width: 'auto' }}
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setBusy(true);
                setErr('');
                try {
                  set({ logoImageId: await uploadFile(f, 1200) });
                } catch (x) {
                  setErr((x as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
            {store.logoImageId && <button className="btn btn-sm" onClick={() => set({ logoImageId: undefined })}>Remove logo</button>}
            {err && <span className="error small">{err}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [data, setData] = useState<{ users: { username: string; createdAt: string }[]; envStaffLogin: boolean } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const load = () => api<typeof data>('/api/admin/users').then(setData).catch((e) => setMsg({ text: e.message, ok: false }));
  useEffect(() => {
    load();
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/admin/users', jsonInit('POST', { username, password }));
      setMsg({ text: `Saved login "${username.toLowerCase()}".`, ok: true });
      setUsername('');
      setPassword('');
      load();
    } catch (x) {
      setMsg({ text: (x as Error).message, ok: false });
    }
  }
  async function remove(u: string) {
    if (!window.confirm(`Remove login "${u}"?`)) return;
    try {
      await api(`/api/admin/users?username=${encodeURIComponent(u)}`, { method: 'DELETE' });
      load();
    } catch (x) {
      setMsg({ text: (x as Error).message, ok: false });
    }
  }
  return (
    <div className="panel">
      <p className="small muted" style={{ marginTop: 0 }}>
        Staff logins can use the Flyer Builder only. The shared login <b>staff</b> uses the STAFF_PASSWORD environment variable until you set a password for
        &quot;staff&quot; here. The <b>admin</b> password is set only in Netlify environment variables (ADMIN_PASSWORD).
      </p>
      <table className="list" style={{ marginBottom: 12 }}>
        <thead><tr><th>Username</th><th>Source</th><th /></tr></thead>
        <tbody>
          {data?.envStaffLogin && <tr><td>staff</td><td>Environment variable</td><td /></tr>}
          {data?.users.map((u) => (
            <tr key={u.username}>
              <td>{u.username}</td>
              <td>Set in Settings</td>
              <td style={{ textAlign: 'right' }}><button className="btn btn-sm btn-danger" onClick={() => remove(u.username)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="row" onSubmit={save}>
        <div>
          <label htmlFor="nu">Username (new, or existing to change password)</label>
          <input id="nu" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. sukhdeep" />
        </div>
        <div>
          <label htmlFor="np">Password (8+ characters)</label>
          <input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ flex: 'none' }} disabled={!username || password.length < 8}>Save login</button>
      </form>
      {msg && <p className={msg.ok ? 'ok small' : 'error small'}>{msg.text}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('stores');
  const [s, setS] = useState<AppSettings | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    api<AppSettings>('/api/settings').then(setS).catch((e) => setMsg({ text: e.message, ok: false }));
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    try {
      const clean: AppSettings = {
        ...s,
        stores: s.stores.map((st) => ({ ...st, addressLines: lines(st.addressLines.join('\n')), hours: lines(st.hours.join('\n')) })),
      };
      setS(await api<AppSettings>('/api/admin/settings', jsonInit('PUT', clean)));
      setMsg({ text: 'Settings saved.', ok: true });
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar active="settings" />
      <div className="page" style={{ maxWidth: 1000 }}>
        <div className="tabs" role="tablist">
          {(['stores', 'themes', 'slots', 'users'] as Tab[]).map((t) => (
            <button key={t} className="btn" aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t === 'stores' ? 'Stores' : t === 'themes' ? 'Themes' : t === 'slots' ? 'Item slots' : 'Staff logins'}
            </button>
          ))}
        </div>
        {!s ? (
          <p className="muted">{msg?.text || 'Loading…'}</p>
        ) : (
          <>
            {tab === 'stores' &&
              s.stores.map((st, i) => (
                <StoreForm key={st.id} store={st} onChange={(n) => setS({ ...s, stores: s.stores.map((x, j) => (j === i ? n : x)) })} />
              ))}
            {tab === 'themes' && (
              <div className="panel">
                {THEMES.map((t) => {
                  const ts = s.themes[t.id];
                  return (
                    <div key={t.id} className="row" style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10, alignItems: 'center' }}>
                      <div style={{ flex: '0 0 170px', fontWeight: 700 }}>{t.name}</div>
                      <div>
                        <label htmlFor={`th-${t.id}`}>Default headline</label>
                        <input id={`th-${t.id}`} value={ts.headline} onChange={(e) => setS({ ...s, themes: { ...s.themes, [t.id]: { ...ts, headline: e.target.value } } })} />
                      </div>
                      <div>
                        <label>Background art</label>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {ts.backgroundImageId ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/api/images/${ts.backgroundImageId}`} alt="" style={{ height: 40, width: 32, objectFit: 'cover', borderRadius: 4 }} />
                              <button className="btn btn-sm" onClick={() => setS({ ...s, themes: { ...s.themes, [t.id]: { ...ts, backgroundImageId: undefined } } })}>Use built-in art</button>
                            </>
                          ) : (
                            <span className="small muted">Built-in art</span>
                          )}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            style={{ width: 'auto' }}
                            disabled={uploading === t.id}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              e.target.value = '';
                              if (!f) return;
                              setUploading(t.id);
                              try {
                                const id = await uploadFile(f, 3400);
                                setS((cur) => (cur ? { ...cur, themes: { ...cur.themes, [t.id]: { ...cur.themes[t.id], backgroundImageId: id } } } : cur));
                              } catch (x) {
                                setMsg({ text: (x as Error).message, ok: false });
                              } finally {
                                setUploading('');
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="small muted" style={{ marginBottom: 0 }}>Uploaded art covers the whole flyer behind the header, items and footer. Portrait images around 2550 x 3300 px work best.</p>
              </div>
            )}
            {tab === 'slots' && (
              <div className="panel">
                <label htmlFor="ds">Default number of item slots for a new flyer</label>
                <input id="ds" type="number" min={1} max={MAX_SLOTS} style={{ maxWidth: 140 }} value={s.defaultSlotCount} onChange={(e) => setS({ ...s, defaultSlotCount: Number(e.target.value) })} />
              </div>
            )}
            {tab === 'users' && <UsersTab />}
            {tab !== 'users' && (
              <div className="row" style={{ marginTop: 12, alignItems: 'center' }}>
                <button className="btn btn-primary" style={{ flex: 'none' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
                {msg && <span className={msg.ok ? 'ok' : 'error'}>{msg.text}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
