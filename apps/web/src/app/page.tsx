export default function Home() {
  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans">
      {/* Sidebar Placeholder */}
      <aside className="w-60 h-full bg-sidebar border-r border-border flex flex-col p-4 space-y-4">
        <div className="flex items-center space-x-2 px-2 py-1">
          <div className="w-6 h-6 bg-foreground/10 rounded-sm flex items-center justify-center text-xs font-bold uppercase tracking-widest">N</div>
          <span className="font-semibold text-sm">Nexus</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto pt-4">
          <ul className="space-y-1">
            <li className="px-2 py-1.5 hover:bg-foreground/5 rounded-sm cursor-pointer text-sm">
              <span className="opacity-60 mr-2">🏠</span> Home
            </li>
            <li className="px-2 py-1.5 hover:bg-foreground/5 rounded-sm cursor-pointer text-sm">
              <span className="opacity-60 mr-2">📅</span> Calendar
            </li>
            <li className="px-2 py-1.5 hover:bg-foreground/5 rounded-sm cursor-pointer text-sm">
              <span className="opacity-60 mr-2">📄</span> Documents
            </li>
          </ul>
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-12 py-24 md:px-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Nexus</h1>
          <p className="text-lg opacity-80 leading-relaxed">
            A block-based knowledge system designed for advanced collaboration. 
            Everything is a node, and documents are just containers for your ideas.
          </p>
          
          <div className="h-px bg-border w-full my-8" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-border rounded-md hover:bg-foreground/[0.02] cursor-pointer transition-colors group">
              <h3 className="font-semibold mb-2 group-hover:underline">Create a Document</h3>
              <p className="text-sm opacity-60">Start writing with the block-based editor.</p>
            </div>
            <div className="p-4 border border-border rounded-md hover:bg-foreground/[0.02] cursor-pointer transition-colors group">
              <h3 className="font-semibold mb-2 group-hover:underline">Open Calendar</h3>
              <p className="text-sm opacity-60">Plan your content schedule across platforms.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
