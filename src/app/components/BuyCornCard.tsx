'use client';

import { useCallback, useState } from 'react';

export default function BuyCornCard() {
  const [clientId, setClientId] = useState('demo-client');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchTotal = useCallback(async (id: string) => {
    const res = await fetch(`/api/stats?clientId=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.ok) setTotal(data.total);
  }, []);

  const handleBuy = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTotal(data.total);
        setMsg('🌽 Purchase successful!');
      } else {
        const retry = data.retry_after_seconds ? ` Try again in ~${data.retry_after_seconds}s.` : '';
        setMsg(`⛔ ${data.message || 'Too Many Requests'}.${retry}`);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl shadow border bg-white dark:bg-neutral-900">
      <h2 className="text-2xl font-semibold mb-4">Bob’s Corn 🌽</h2>

      <label className="block text-sm mb-2">Client ID</label>
      <input
        className="w-full rounded-xl border px-3 py-2 mb-4 bg-transparent"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        onBlur={() => clientId && fetchTotal(clientId)}
        placeholder="your-client-id"
      />

      <button
        className="w-full rounded-2xl px-4 py-3 font-medium shadow disabled:opacity-50 border"
        onClick={handleBuy}
        disabled={loading || !clientId}
      >
        {loading ? 'Buying…' : 'Buy corn 🌽'}
      </button>

      <div className="mt-4 text-sm">
        <div><span className="font-medium">Successful purchases:</span> {total ?? '—'}</div>
        {msg && <div className="mt-2">{msg}</div>}
        <div className="mt-2 text-xs opacity-70">
          Policy: max 1 corn per client per minute.
        </div>
      </div>
    </div>
  );
}
