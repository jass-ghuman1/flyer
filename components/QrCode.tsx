import QRCode from 'qrcode';

/** Draws a QR code as vector SVG (stays sharp in the PDF). */
export default function QrCode({ text, size }: { text: string; size: number }) {
  let path = '';
  let n = 0;
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    n = qr.modules.size;
    const d = qr.modules.data;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (d[y * n + x]) path += `M${x},${y}h1v1h-1z`;
    }
  } catch {
    return null;
  }
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" aria-label="Newsletter sign-up QR code">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
