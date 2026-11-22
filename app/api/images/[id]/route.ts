import { guard } from '@/lib/session';
import { getImage } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const img = await getImage((await ctx.params).id);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(img.data, {
    headers: {
      'Content-Type': img.contentType,
      // Image ids are never reused, so the browser can keep them.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
