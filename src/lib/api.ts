import axios, { AxiosError } from 'axios';

export type BuySuccess = { ok: true; total: number };
export type BuyFailure = { ok: false; message: string; retry_after_seconds?: number };

export class HttpError<T = unknown> extends Error {
  status: number;
  data?: T;
  headers: Record<string, string>;
  constructor(message: string, status: number, data: T | undefined, headers: Record<string, string>) {
    super(message);
    this.status = status;
    this.data = data;
    this.headers = headers;
  }
}

function getRetryAfterSeconds(headers: Record<string, unknown>): number | undefined {
  const h = headers['retry-after'];
  if (!h) return undefined;
  const n = Number(h);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function convertHeaders(axiosHeaders: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(axiosHeaders)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export async function apiBuy(clientId: string): Promise<BuySuccess> {
  try {
    const response = await axios.post<BuySuccess>('/api/buy', { clientId });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const data = error.response.data as BuyFailure;
      const retryFromHeader = getRetryAfterSeconds(error.response.headers);
      const message = data?.message ?? error.message ?? 'Error';
      const merged = {
        ...data,
        retry_after_seconds: data?.retry_after_seconds ?? retryFromHeader ?? undefined,
      } as BuyFailure;
      throw new HttpError<BuyFailure>(message, error.response.status, merged, convertHeaders(error.response.headers));
    }
    throw error;
  }
}

export async function apiGetStats(clientId: string): Promise<{ ok: true; total: number }> {
  try {
    const response = await axios.get<{ ok: true; total: number }>(`/api/stats?clientId=${encodeURIComponent(clientId)}`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const data = error.response.data || {};
      throw new HttpError(data?.message ?? 'Failed to load stats', error.response.status, data, convertHeaders(error.response.headers));
    }
    throw error;
  }
}
