'use client';
// Browser-side helpers: API calls, image resize/compress, simple background removal, exports.
import type { ExportFormat, FlyerRenderInput } from './types';
import { FORMATS } from './export/formats';
import { exportFileName } from './format';

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  if (res.status === 401 && typeof window !== 'undefined' && !url.includes('/api/auth/login')) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    throw new Error('Please log in.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status}).`);
  return data as T;
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = src;
  });
}

function canvasToBlob(c: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Image conversion failed.'))), type, q));
}

/** Resizes to at most `maxSide` px and compresses. Keeps transparency (WebP, or PNG where WebP encoding is unavailable). */
export async function prepareImage(file: Blob, maxSide = 1600): Promise<Blob> {
  if (!OK_TYPES.includes(file.type)) throw new Error('Please upload a PNG, JPG or WebP image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That image is over 10 MB. Please use a smaller file.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const webp = await canvasToBlob(c, 'image/webp', 0.88);
    if (webp.type === 'image/webp') return webp;
    return file.type === 'image/jpeg' ? canvasToBlob(c, 'image/jpeg', 0.88) : canvasToBlob(c, 'image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImage(blob: Blob): Promise<string> {
  const r = await api<{ id: string }>('/api/images', { method: 'POST', body: blob, headers: { 'Content-Type': blob.type } });
  return r.id;
}

export async function uploadFile(file: File, maxSide = 1600): Promise<string> {
  return uploadImage(await prepareImage(file, maxSide));
}

/**
 * Simple "remove white background": flood-fills near-white pixels connected to the image edges and
 * makes them transparent. Works well for product shots on white; done in the browser, no paid service.
 */
export async function removeWhiteBackground(imageId: string, tolerance = 28): Promise<string> {
  const img = await loadImage(`/api/images/${imageId}`);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const { width: w, height: h } = c;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const isBg = (i: number) => px[i + 3] > 0 && 255 - px[i] <= tolerance && 255 - px[i + 1] <= tolerance && 255 - px[i + 2] <= tolerance;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    if (!isBg(p * 4)) continue;
    px[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  ctx.putImageData(data, 0, 0);
  let blob = await canvasToBlob(c, 'image/webp', 0.9);
  if (blob.type !== 'image/webp') blob = await canvasToBlob(c, 'image/png');
  return uploadImage(blob);
}

export const EXPORT_ENDPOINT = process.env.NEXT_PUBLIC_EXPORT_ENDPOINT || '/.netlify/functions/export';

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 2000);
}

/** Exports through the server renderer (headless Chrome). Throws on failure so the caller can fall back. */
export async function exportOnServer(format: ExportFormat, input: FlyerRenderInput): Promise<void> {
  const fmt = FORMATS[format];
  const res = await fetch(EXPORT_ENDPOINT, { ...jsonInit('POST', { format, input }), credentials: 'same-origin' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || `Export failed (${res.status}).`);
  }
  const blob = await res.blob();
  download(blob, exportFileName(input.flyer, input.store, fmt.fileSuffix, fmt.kind));
}

/** Fallback PNG export rendered in this browser from the hidden full-size flyer node. */
export async function exportPngInBrowser(node: HTMLElement, format: ExportFormat, input: FlyerRenderInput): Promise<void> {
  const { toBlob } = await import('html-to-image');
  const fmt = FORMATS[format];
  const blob = await toBlob(node, { width: fmt.width, height: fmt.height, pixelRatio: 1, cacheBust: false });
  if (!blob) throw new Error('Could not render the image in this browser.');
  download(blob, exportFileName(input.flyer, input.store, fmt.fileSuffix, 'png'));
}

/** Fallback PDF: opens the print page and the browser's print dialog ("Save as PDF" keeps text as vector). */
export function exportPdfViaPrintDialog(format: ExportFormat, input: FlyerRenderInput): void {
  try {
    localStorage.setItem('fb-print-payload', JSON.stringify(input));
  } catch {
    throw new Error('Could not prepare the print view (browser storage is blocked).');
  }
  window.open(`/print?format=${format}&mode=print`, '_blank');
}
