import { NextResponse } from 'next/server';
import { tryBuy } from '@/lib/rateLimiter';
import { clientIdSchema } from '@/lib/validation';
import { env } from '@/lib/config';

export const runtime = 'edge';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = clientIdSchema.safeParse(body.clientId);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0].message }, { status: 400 });
  }
  const clientId = parsed.data;

  const result = await tryBuy(clientId);

  if (!result.ok) {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (result.code === 429 && typeof result.ttl === 'number') {
      headers.set('retry-after', String(result.ttl));
      const resetEpoch = Math.floor(Date.now() / 1000) + result.ttl;
      headers.set('x-ratelimit-limit', String(env.CORN_LIMIT));
      headers.set('x-ratelimit-remaining', '0');
      headers.set('x-ratelimit-reset', String(resetEpoch));
    }
    return new NextResponse(JSON.stringify({
      ok: false,
      message: result.message,
      retry_after_seconds: result.ttl,
    }), { status: result.code, headers });
  }

  const remaining = Math.max(0, result.limit - result.current);
  const resetEpoch = Math.floor(Date.now() / 1000) + result.ttl;

  return new NextResponse(JSON.stringify({ ok: true, total: result.total }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-limit': String(result.limit),
      'x-ratelimit-remaining': String(remaining),
      'x-ratelimit-reset': String(resetEpoch),
      'cache-control': 'no-store',
    },
  });
}
