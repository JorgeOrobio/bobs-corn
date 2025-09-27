import './globals.css';
import type { Metadata } from 'next';
import QueryProvider from './query-provider';

export const metadata: Metadata = {
  title: "Bob's Corn",
  description: 'Rate limit demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
