'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpError, apiBuy, apiGetStats } from '@/lib/api';

export default function BuyCornCard() {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('demo-client');

  // Cooldown state
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const isCoolingDown = cooldownUntil !== null && remaining > 0;

  // Cada segundo, recalcula los “segundos restantes”
  useEffect(() => {
    if (!cooldownUntil) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const ms = cooldownUntil - now;
      const sec = Math.max(0, Math.ceil(ms / 1000));
      setRemaining(sec);
      if (sec <= 0) {
        setCooldownUntil(null);
      }
    };
    tick(); // actualiza inmediato
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // Si cambia el clientId, resetea cooldown y mensajes
  useEffect(() => {
    setCooldownUntil(null);
    setRemaining(0);
  }, [clientId]);

  // Carga del total (habilitada solo si hay clientId)
  const enabled = useMemo(() => Boolean(clientId?.trim()), [clientId]);
  const { data: stats, refetch: refetchStats, isFetching } = useQuery({
    queryKey: ['stats', clientId],
    queryFn: () => apiGetStats(clientId),
    enabled,
  });

  // Mutación de compra
  const {
    mutate: buy,
    isPending: isBuying,
    error: buyError,
    reset: resetBuyError,
  } = useMutation({
    mutationFn: () => apiBuy(clientId),
    onSuccess: (data) => {
      // Actualiza la cache del total y refresca query
      qc.setQueryData(['stats', clientId], { ok: true, total: data.total });
      // Limpia posibles errores previos
      resetBuyError();
    },
    onError: (err) => {
      // Si es 429, arrancamos cooldown
      if (err instanceof HttpError && err.status === 429) {
        const retry = err.data?.retry_after_seconds ?? 60;
        const until = Date.now() + retry * 1000;
        setCooldownUntil(until);
      }
    },
  });

  const total = stats?.total ?? '—';
  const lastErrorMsg =
    buyError instanceof HttpError
      ? buyError.data?.message ?? buyError.message
      : buyError
      ? 'Unexpected error'
      : null;

  const disabled = !enabled || isBuying || isFetching || isCoolingDown;

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl shadow border bg-white dark:bg-neutral-900">
      <h2 className="text-2xl font-semibold mb-4">Bob’s Corn 🌽</h2>

      <label className="block text-sm mb-2">Client ID</label>
      <input
        className="w-full rounded-xl border px-3 py-2 mb-4 bg-transparent"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        onBlur={() => enabled && refetchStats()}
        placeholder="your-client-id"
      />

      <button
        className="w-full rounded-2xl px-4 py-3 font-medium shadow disabled:opacity-50 border"
        onClick={() => buy()}
        disabled={disabled}
        title={isCoolingDown ? `Wait ${remaining}s` : undefined}
      >
        {isBuying ? 'Buying…' : isCoolingDown ? `Wait ${remaining}s` : 'Buy corn 🌽'}
      </button>

      <div className="mt-4 text-sm">
        <div>
          <span className="font-medium">Successful purchases:</span> {total}
        </div>

        {lastErrorMsg && !isCoolingDown && (
          <div className="mt-2">⛔ {lastErrorMsg}</div>
        )}

        {isCoolingDown && (
          <div className="mt-2">⏳ Too many requests. Try again in {remaining}s.</div>
        )}

        <div className="mt-2 text-xs opacity-70">
          Policy: max 1 corn per client per minute.
        </div>
      </div>
    </div>
  );
}
