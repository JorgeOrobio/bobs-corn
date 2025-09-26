import { NextResponse } from 'next/server';
import { tryBuy } from '@/lib/rateLimiter';

export async function POST(req: Request) {
  const { clientId } = await req.json().catch(() => ({ clientId: '' }));
  const result = await tryBuy(clientId);

  if (!result.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message ?? 'Too Many Requests',
        retry_after_seconds: 'retry_after_seconds' in result ? result.retry_after_seconds : undefined,
      },
      { status: result.code }
    );
  }

  return NextResponse.json({ ok: true, total: result.total }, { status: 200 });
}
