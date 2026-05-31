import NexusMark from '@/components/NexusMark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground transition-colors duration-300">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <NexusMark size={30} className="text-foreground" />
          <span className="text-foreground text-xl font-bold font-display tracking-tight">Nexus</span>
        </div>
        {children}
      </div>
    </div>
  );
}
