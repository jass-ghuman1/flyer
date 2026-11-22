import 'server-only';

export interface EmailAttachment {
  filename: string;
  content: string; // base64
}

/** Sends an email with Resend (https://resend.com). Needs RESEND_API_KEY. */
export async function sendEmail(opts: { to: string[]; subject: string; text: string; attachments?: EmailAttachment[] }): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Email is not set up yet (RESEND_API_KEY is missing in Netlify).');
  const from = process.env.SUBMIT_EMAIL_FROM || 'Flyer Builder <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, text: opts.text, attachments: opts.attachments }),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`Email failed: ${data.message || res.status}`);
  return data.id || '';
}
