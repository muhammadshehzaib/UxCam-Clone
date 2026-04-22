import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="ml-[var(--sidebar-width)] min-h-screen p-8 transition-all duration-300 animate-fade-in relative z-0">
        {/* Subtle grid background */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </>
  );
}
