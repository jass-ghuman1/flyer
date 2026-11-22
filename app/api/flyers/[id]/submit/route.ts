import { NextResponse } from 'next/server';
import { getSession, jsonError } from '@/lib/session';
import { getFlyer, getImage, getSettings } from '@/lib/data';
import { buildAiPrompt, finalizePrompt } from '@/lib/aiPrompt';
import { sendEmail, type EmailAttachment } from '@/lib/email';
import { slotIsPrintable } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' };

/** Emails a ready-to-paste ChatGPT / Grok prompt for this (saved) flyer, with product images attached. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError('Please log in.', 401);
  const to = (process.env.SUBMIT_EMAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!to.length) return jsonError('Email is not set up yet (SUBMIT_EMAIL_TO is missing in Netlify).', 500);

  const flyer = await getFlyer((await ctx.params).id);
  if (!flyer) return jsonError('Save the flyer first.', 404);
  if (!flyer.slots.some(slotIsPrintable)) return jsonError('Add at least one item with a name and sale price.');

  const settings = await getSettings();
  const { subject, text, images } = buildAiPrompt(flyer, settings);

  const attachments: EmailAttachment[] = [];
  const names: Record<string, string> = {};
  for (const im of images) {
    const img = await getImage(im.imageId).catch(() => null);
    if (!img) continue;
    const filename = `${im.baseName}.${EXT[img.contentType] || 'png'}`;
    names[im.baseName] = filename;
    attachments.push({ filename, content: Buffer.from(img.data).toString('base64') });
  }
  const when = new Date().toLocaleString('en-CA', { timeZone: 'America/Edmonton' });
  const body =
    finalizePrompt(text, names) +
    `\n\n---\nSubmitted by: ${session.u}, ${when} (Edmonton time)\nAttachments: ${attachments.length ? attachments.map((a) => a.filename).join(', ') : 'none'}`;

  try {
    await sendEmail({ to, subject, text: body, attachments });
  } catch (e) {
    return jsonError((e as Error).message, 502);
  }
  return NextResponse.json({ ok: true, attachments: attachments.length });
}
