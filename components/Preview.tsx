'use client';
import { useEffect, useRef, useState } from 'react';
import FlyerView from './Flyer';
import { FORMATS } from '@/lib/export/formats';
import type { ExportFormat, FlyerRenderInput } from '@/lib/types';

/** Shows the full-size flyer scaled down to fit the panel width. */
export default function Preview({ input, format }: { input: FlyerRenderInput; format: ExportFormat }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const fmt = FORMATS[format];
  const maxH = typeof window !== 'undefined' ? window.innerHeight - 170 : 900;
  const scale = Math.min(w / fmt.width, Math.max(maxH, 420) / fmt.height);
  return (
    <div ref={boxRef} style={{ width: '100%' }}>
      <div style={{ width: fmt.width * scale, height: fmt.height * scale, margin: '0 auto', boxShadow: '0 2px 12px rgba(0,0,0,.2)' }}>
        <div className="preview-scale" style={{ transform: `scale(${scale})`, width: fmt.width, height: fmt.height }}>
          <FlyerView input={input} format={format} />
        </div>
      </div>
    </div>
  );
}
