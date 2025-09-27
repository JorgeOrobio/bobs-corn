import { NextResponse } from 'next/server';
import { getTotal } from '@/lib/rateLimiter';
import { clientIdSchema } from '@/lib/validation';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('clientId') ?? '';
  const parsed = clientIdSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0].message }, { status: 400 });
  }

  const total = await getTotal(parsed.data);
  return new NextResponse(JSON.stringify({ ok: true, total }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
