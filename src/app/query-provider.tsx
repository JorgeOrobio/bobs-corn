'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function QueryProvider({ children }: { children: ReactNode }) {
  // Un QueryClient por montaje (recomendación oficial)
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5_000,
          },
          mutations: {
            retry: false, // Por defecto no reintentar (controlaremos por error)
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* Opcional: comenta si no lo quieres en prod */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}