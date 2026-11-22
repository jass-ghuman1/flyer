'use client';
// Contemporary "digital rain" background: soft gradient, falling columns of glyphs in a sunset/violet palette,
// with the odd price tag and drink icon for fun. Pauses when the tab is hidden; static for reduced-motion users.
import { useEffect, useRef } from 'react';

const GLYPHS = '0123456789$%.+×アカサタナハマヤラワABCDEF<>/*';
const FUN = ['🍷', '🍺', '🍾', '🥂', '🍸', '$9.99', '$19.99', '%', '★'];
const COLORS = ['#ff7a59', '#ffb86b', '#ff5fa2', '#b48cff', '#6ad5ff'];

export default function RainBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 18;
    let w = 0;
    let h = 0;
    let drops: { y: number; speed: number; color: string; fun: number }[] = [];
    let raf = 0;
    let last = 0;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(w / size);
      drops = Array.from({ length: cols }, () => ({
        y: Math.random() * -h,
        speed: 40 + Math.random() * 90,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        fun: 0,
      }));
      ctx!.fillStyle = '#140c2c';
      ctx!.fillRect(0, 0, w, h);
    }

    function frame(t: number) {
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      // Fade previous frame into the background gradient tone to leave soft trails.
      ctx!.fillStyle = 'rgba(20, 12, 44, 0.12)';
      ctx!.fillRect(0, 0, w, h);
      ctx!.textBaseline = 'top';
      drops.forEach((d, i) => {
        const x = i * size;
        const near = Math.hypot(mouse.x - x, mouse.y - d.y) < 120;
        d.y += d.speed * dt * (near ? 0.25 : 1);
        if (Math.random() < 0.004) d.fun = 1;
        let ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        let font = `600 ${size - 3}px ui-monospace, 'SF Mono', Menlo, monospace`;
        if (d.fun) {
          ch = FUN[Math.floor(Math.random() * FUN.length)];
          font = `700 ${size}px 'Oswald', system-ui, sans-serif`;
          d.fun = 0;
        }
        ctx!.font = font;
        ctx!.shadowColor = d.color;
        ctx!.shadowBlur = near ? 16 : 6;
        ctx!.fillStyle = near ? '#ffffff' : d.color;
        ctx!.fillText(ch, x, d.y);
        if (d.y > h + 20 && Math.random() > 0.97) {
          d.y = -20 - Math.random() * 200;
          d.speed = 40 + Math.random() * 90;
          d.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
      });
      ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }

    resize();
    if (reduce) {
      // One static frame.
      for (let i = 0; i < 40; i++) frame(i * 50);
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }
    const onVis = () => {
      if (reduce) return;
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} className="rain-bg" aria-hidden="true" />
      <div className="rain-glow" aria-hidden="true" />
    </>
  );
}
