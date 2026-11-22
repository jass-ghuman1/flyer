'use client';
// Render target for exports. The headless browser calls window.__setFlyer(input) and waits for
// window.__flyerReady. In "print" mode (browser fallback) it reads the flyer from localStorage
// and opens the print dialog.
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FlyerView from '@/components/Flyer';
import { FORMATS } from '@/lib/export/formats';
import type { ExportFormat, FlyerRenderInput } from '@/lib/types';

declare global {
  interface Window {
    __setFlyer?: (i: FlyerRenderInput) => void;
    __flyerReady?: boolean;
  }
}

function PrintInner() {
  const params = useSearchParams();
  const format = (params.get('format') as ExportFormat) in FORMATS ? (params.get('format') as ExportFormat) : 'letter';
  const mode = params.get('mode');
  const fmt = FORMATS[format];
  const [input, setInput] = useState<FlyerRenderInput | null>(null);

  useEffect(() => {
    window.__flyerReady = false;
    window.__setFlyer = (i) => {
      window.__flyerReady = false;
      setInput(i);
    };
    if (mode === 'print') {
      try {
        const raw = localStorage.getItem('fb-print-payload');
        if (raw) setInput(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, [mode]);

  const pageCss = `@page { size: ${fmt.pdfWidth || fmt.width + 'px'} ${fmt.pdfHeight || fmt.height + 'px'}; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    @media print { body { width: ${fmt.width}px; } }`;

  return (
    <>
      <style>{pageCss}</style>
      {input ? (
        <FlyerView
          input={input}
          format={format}
          onReady={() => {
            window.__flyerReady = true;
            if (mode === 'print') setTimeout(() => window.print(), 150);
          }}
        />
      ) : (
        mode === 'print' && <p style={{ padding: 20 }}>Nothing to print. Go back to the Flyer Builder and use Export again.</p>
      )}
    </>
  );
}

export default function PrintPage() {
  return (
    <Suspense>
      <PrintInner />
    </Suspense>
  );
}
