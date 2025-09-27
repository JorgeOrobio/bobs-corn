import { redis } from './redis';
import { env } from './config';

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

export type TryBuyOk = {
  ok: true;
  code: 200;
  total: number;
  current: number;
  limit: number;
  ttl: number;
};
export type TryBuyErr = {
  ok: false;
  code: 400 | 429;
  message: string;
  ttl?: number;
};

const SCRIPT = `
local w = KEYS[1]
local t = KEYS[2]
local limit = tonumber(ARGV[1])
local ex = tonumber(ARGV[2])

-- crea ventana con TTL si no existe
if redis.call("EXISTS", w) == 0 then
  redis.call("SET", w, 0, "EX", ex)
end

local current = redis.call("INCR", w)
local ttl = redis.call("TTL", w)

if current > limit then
  return {0, ttl, current, 0}
end

local total = redis.call("INCR", t)
return {1, ttl, current, total}
`;

export async function tryBuy(clientId: string): Promise<TryBuyOk | TryBuyErr> {
  const id = clientId?.trim();
  if (!id) return { ok: false, code: 400, message: 'clientId required' };

  const ex = env.CORN_WINDOW_SECONDS + env.CORN_TTL_MARGIN_SECONDS;
  const keys = [windowKey(id), totalKey(id)];
  const args = [env.CORN_LIMIT, ex];

  // Una sola llamada a Redis:
  const result = (await redis.eval(SCRIPT, keys, args)) as [number, number, number, number];
  const allowed = result?.[0] === 1;
  const ttl = Number(result?.[1] ?? env.CORN_WINDOW_SECONDS) || env.CORN_WINDOW_SECONDS;
  const current = Number(result?.[2] ?? 0);

  if (!allowed) {
    return {
      ok: false,
      code: 429,
      message: `Rate limit exceeded: ${env.CORN_LIMIT} per minute`,
      ttl,
    };
  }

  const total = Number(result?.[3] ?? 0);
  return { ok: true, code: 200, total, current, limit: env.CORN_LIMIT, ttl };
}

export async function getTotal(clientId: string) {
  const total = await redis.get<number>(totalKey(clientId));
  return total ?? 0;
}
