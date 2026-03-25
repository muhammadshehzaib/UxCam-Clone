import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'UXClone — Analytics Dashboard',
  description: 'Session recording and user analytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-56 min-h-screen p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
