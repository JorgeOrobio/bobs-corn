import { NextResponse } from 'next/server';
import { getTotal } from '@/lib/rateLimiter';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId') ?? '';

  if (!clientId) {
    return NextResponse.json({ ok: false, message: 'clientId required' }, { status: 400 });
  }

  const total = await getTotal(clientId);
  return NextResponse.json({ ok: true, total }, { status: 200 });
}
