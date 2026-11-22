'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import RainShell from './RainShell';

export default function TopBar({ active }: { active: 'builder' | 'flyers' | 'settings' }) {
  const [role, setRole] = useState<string>('');
  useEffect(() => {
    api<{ role: string }>('/api/auth/me').then((m) => setRole(m.role)).catch(() => {});
  }, []);
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return (
    <>
    <RainShell />
    <nav className="topbar">
      <span className="brand">FLYER BUILDER</span>
      <a className={`btn btn-sm${active === 'builder' ? ' active' : ''}`} href="/">New / edit flyer</a>
      <a className={`btn btn-sm${active === 'flyers' ? ' active' : ''}`} href="/flyers">My flyers</a>
      {role === 'admin' && <a className={`btn btn-sm${active === 'settings' ? ' active' : ''}`} href="/settings">Settings</a>}
      <button className="btn btn-sm" onClick={logout}>Log out</button>
    </nav>
    </>
  );
}
