import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight, PlusCircle } from "lucide-react";
import CreateBusinessModal from "@/components/business/CreateBusinessModal";

export default async function DashboardRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's primary/first business
  const { data: businessMember } = await supabase
    .from("business_members")
    .select("businesses (slug)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const business = businessMember?.businesses;
  const slug = Array.isArray(business) ? business[0]?.slug : (business as any)?.slug;

  if (slug) {
    redirect(`/w/${slug}/dashboard`);
  }

  // High-fidelity Onboarding for users without a workspace
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cta/5 rounded-full blur-[150px] -z-10" />
      
      <div className="max-w-md w-full space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 border border-cta/20 text-cta text-[11px] font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Welcome to Nexus
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground leading-tight">
            Ready to build your <br />
            <span className="text-cta">second brain?</span>
          </h1>
          <p className="text-muted/60 text-[15px] font-medium leading-relaxed">
            You’re just one step away. Create your first workspace 
            to start organizing your digital life.
          </p>
        </div>

        <div className="pt-8">
          <CreateBusinessModal trigger={
            <button className="h-14 w-full bg-cta hover:opacity-90 text-cta-foreground text-lg font-bold rounded-2xl shadow-2xl shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center justify-center group">
              Create First Workspace <PlusCircle className="ml-2 w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
          } />
        </div>

        <div className="pt-8 text-[11px] font-bold text-muted/30 uppercase tracking-[0.2em]">
           Collaborative • Blazingly Fast • Real-time
        </div>
      </div>
    </div>
  );
}
