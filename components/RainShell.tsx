'use client';
import { useEffect } from 'react';
import RainBackground from './RainBackground';

/** Adds the animated background to a page (app pages only; the print/export page never uses it). */
export default function RainShell() {
  useEffect(() => {
    document.body.classList.add('has-rain');
    return () => document.body.classList.remove('has-rain');
  }, []);
  return <RainBackground />;
}
