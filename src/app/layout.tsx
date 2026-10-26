import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Apex Diagnostics | Pathology Laboratory Management System',
  description: 'Enterprise Pathology Laboratory Information & Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen">
          {/* Persistent Sidebar */}
          <Sidebar />

          {/* Main Work Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
