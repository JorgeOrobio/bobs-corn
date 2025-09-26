import { redis } from './redis';

const WINDOW_SECONDS = 60;

function windowKey(clientId: string, date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `corn:window:${clientId}:${y}${m}${d}${h}${min}`;
}

function totalKey(clientId: string) {
  return `corn:total:${clientId}`;
}

export async function tryBuy(clientId: string) {
  if (!clientId?.trim()) {
    return { allowed: false, code: 400, message: 'clientId required' } as const;
  }

  const key = windowKey(clientId);
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS + 10);
  }

  if (current > 1) {
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      code: 429,
      message: 'Rate limit exceeded: 1 corn per minute',
      retry_after_seconds: ttl > 0 ? ttl : WINDOW_SECONDS,
    } as const;
  }

  const total = await redis.incr(totalKey(clientId));
  return { allowed: true, code: 200, total } as const;
}

export async function getTotal(clientId: string) {
  const total = await redis.get<number>(totalKey(clientId));
  return total ?? 0;
}
