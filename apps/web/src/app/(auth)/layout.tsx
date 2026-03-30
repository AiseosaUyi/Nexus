export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground transition-colors duration-300">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <span className="text-black text-sm font-bold">N</span>
          </div>
          <span className="text-white text-xl font-black font-display tracking-tight">Nexus</span>
        </div>
        {children}
      </div>
    </div>
  );
}
