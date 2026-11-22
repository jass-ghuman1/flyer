// Netlify Function: renders the flyer to PDF/PNG with headless Chromium (@sparticuz/chromium).
// Reached at /.netlify/functions/export. Checks the session cookie itself.
import { handleExport } from '../../lib/export/handler';

export default async (req: Request) => handleExport(req);
