import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ---- Mock de Redis en memoria con TTL ----
type Entry = { value: number | string; expireAt?: number };
const store = new Map<string, Entry>();

const now = () => Date.now();

const mockRedis = {
  async set(key: string, value: number | string, opts?: { nx?: boolean; ex?: number }) {
    const exists = store.has(key);
    if (opts?.nx && exists) return 'OK';
    const entry: Entry = { value };
    if (opts?.ex) entry.expireAt = now() + opts.ex * 1000;
    store.set(key, entry);
    return 'OK';
  },
  async incr(key: string) {
    const e = store.get(key);
    let v = 0;
    if (e && (!e.expireAt || e.expireAt > now())) {
      v = typeof e.value === 'number' ? e.value : Number(e.value) || 0;
    }
    v += 1;
    // preserva expireAt si existía
    const expireAt = e?.expireAt;
    store.set(key, { value: v, expireAt });
    return v;
  },
  async expire(key: string, seconds: number) {
    const e = store.get(key);
    if (!e) return 0;
    e.expireAt = now() + seconds * 1000;
    store.set(key, e);
    return 1;
  },
  async ttl(key: string) {
    const e = store.get(key);
    if (!e) return -2; // no existe
    if (!e.expireAt) return -1; // sin expiración
    const ms = e.expireAt - now();
    return ms <= 0 ? -2 : Math.ceil(ms / 1000);
  },
  async get<T = unknown>(key: string): Promise<T | null> {
    const e = store.get(key);
    if (!e) return null;
    if (e.expireAt && e.expireAt <= now()) {
      store.delete(key);
      return null;
    }
    return e.value as T;
  },
  async del(key: string) {
    store.delete(key);
    return 1;
  },
  async keys(glob: string) {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const reg = new RegExp('^' + escaped + '$');
    return Array.from(store.keys()).filter((k) => reg.test(k));
  },
};

// Mockea el módulo que usa rateLimiter.ts
jest.mock('./redis', () => ({ redis: mockRedis }));

import { tryBuy, getTotal } from './rateLimiter';
import { env } from './config';

describe('rateLimiter (windowed 1/min)', () => {
  beforeEach(() => {
    store.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-09-26T00:00:00Z'));
  });

  it('permite la primera compra y bloquea la segunda en la misma ventana', async () => {
    const id = 'user1';

    const first = await tryBuy(id);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.total).toBe(1);
      expect(first.current).toBe(1);
      expect(first.limit).toBe(Number(env.CORN_LIMIT));
      expect(first.ttl).toBeGreaterThan(0);
    }

    const second = await tryBuy(id);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe(429);
      expect(typeof second.ttl).toBe('number');
      expect(second.ttl! > 0).toBe(true);
    }
  });

  it('desbloquea al pasar la ventana + margen', async () => {
    const id = 'user2';

    const first = await tryBuy(id);
    expect(first.ok).toBe(true);

    const immediate = await tryBuy(id);
    expect(immediate.ok).toBe(false);

    // avanza el tiempo más que la ventana + margen
    const advanceSec =
      Number(env.CORN_WINDOW_SECONDS) + Number(env.CORN_TTL_MARGIN_SECONDS) + 1;
    jest.advanceTimersByTime(advanceSec * 1000);

    const after = await tryBuy(id);
    expect(after.ok).toBe(true);
    if (after.ok) expect(after.total).toBe(2);
  });

  it('getTotal devuelve 0 si no existe y aumenta tras compra', async () => {
    const id = 'user3';
    expect(await getTotal(id)).toBe(0);

    const r = await tryBuy(id);
    expect(r.ok).toBe(true);

    expect(await getTotal(id)).toBe(1);
  });
});
