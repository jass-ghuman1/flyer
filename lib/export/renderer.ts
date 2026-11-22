// Headless-browser export. Opens the app's own /print page (the same <Flyer> component as the preview),
// hands it the flyer data, waits until images are loaded and text is fitted, then prints a PDF
// (vector text) or takes a PNG screenshot.
import type { Browser } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import type { ExportFormat, FlyerRenderInput } from '../types';
import { FORMATS } from './formats';
import { SESSION_COOKIE } from '../auth';

async function launch(): Promise<Browser> {
  const localPath = process.env.CHROME_PATH;
  if (localPath) {
    return puppeteer.launch({ executablePath: localPath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  }
  const chromium = (await import('@sparticuz/chromium')).default;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  });
}

export interface RenderRequest {
  origin: string;
  sessionToken: string;
  format: ExportFormat;
  input: FlyerRenderInput;
}

export async function renderExport(req: RenderRequest): Promise<{ body: Uint8Array; contentType: string }> {
  const fmt = FORMATS[req.format];
  if (!fmt) throw new Error('Unknown export format.');
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: fmt.width, height: fmt.height, deviceScaleFactor: 1 });
    await page.setCookie({ name: SESSION_COOKIE, value: req.sessionToken, url: req.origin, httpOnly: true });
    await page.goto(`${req.origin}/print?format=${fmt.id}&mode=export`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction('typeof window.__setFlyer === "function"', { timeout: 15000 });
    await page.evaluate((input) => (window as unknown as { __setFlyer: (i: unknown) => void }).__setFlyer(input), req.input as unknown as Record<string, unknown>);
    await page.waitForFunction('window.__flyerReady === true', { timeout: 15000 });
    if (fmt.kind === 'pdf') {
      const pdf = await page.pdf({
        width: fmt.pdfWidth,
        height: fmt.pdfHeight,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageRanges: '1',
        preferCSSPageSize: false,
      });
      return { body: pdf, contentType: 'application/pdf' };
    }
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: fmt.width, height: fmt.height } });
    return { body: png as Uint8Array, contentType: 'image/png' };
  } finally {
    await browser.close().catch(() => {});
  }
}
