import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UXClone — Analytics Dashboard',
  description: 'Session recording and user analytics',
};

// Data-driven dashboard: render on demand instead of static prerender at build
// (avoids the useSearchParams CSR-bailout prerender errors across pages).
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
