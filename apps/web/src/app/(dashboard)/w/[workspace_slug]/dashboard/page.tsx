import { FileText, FolderOpen, Calendar, Plus, ChevronRight, LayoutDashboard } from "lucide-react";

export default function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ workspace_slug: string }>;
}) {
  return (
    <div className="max-w-4xl mx-auto px-12 py-12 md:px-24">
      {/* Page Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-[#37352f] flex items-center gap-4">
          <LayoutDashboard className="w-10 h-10 text-[#2383e2]" />
          Dashboard
        </h1>
        <p className="mt-4 text-lg text-[#37352f]/60 leading-relaxed">
          Welcome to your Nexus workspace. Here you can manage your documents, 
          track your content calendar, and collaborate with your team.
        </p>
      </div>

      <div className="h-px bg-[#37352f]/10 w-full mb-12" />

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <div className="p-6 border border-[#37352f]/10 rounded-xl hover:bg-foreground/[0.02] cursor-pointer transition-all hover:shadow-sm group">
          <div className="w-10 h-10 bg-[#2383e2]/10 rounded-lg flex items-center justify-center mb-4 text-[#2383e2]">
            <Plus className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-[#37352f] mb-1 group-hover:underline">New Document</h3>
          <p className="text-xs text-[#37352f]/50">Start capturing your thoughts.</p>
        </div>

        <div className="p-6 border border-[#37352f]/10 rounded-xl hover:bg-foreground/[0.02] cursor-pointer transition-all hover:shadow-sm group">
          <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4 text-orange-600">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-[#37352f] mb-1 group-hover:underline">Calendar</h3>
          <p className="text-xs text-[#37352f]/50">Plan your next big launch.</p>
        </div>

        <div className="p-6 border border-[#37352f]/10 rounded-xl hover:bg-foreground/[0.02] cursor-pointer transition-all hover:shadow-sm group">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 text-purple-600">
            <FolderOpen className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-[#37352f] mb-1 group-hover:underline">Files</h3>
          <p className="text-xs text-[#37352f]/50">Access your shared assets.</p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#37352f]/40">Recent Documents</h2>
          <button className="text-xs font-semibold text-[#2383e2] hover:underline cursor-pointer flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="flex items-center justify-between p-3 hover:bg-foreground/[0.03] rounded-lg cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 opacity-40 text-[#37352f]" />
                <span className="text-sm font-medium text-[#37352f]">Documentation Page {i}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#37352f]/40 font-medium">
                <span>Updated 2h ago</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
