import { AlertCircle } from 'lucide-react';

export default function InvalidAuthorizePage() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
      </div>
      <h1 className="text-2xl font-black font-display tracking-tight text-foreground">
        This connection request looks invalid
      </h1>
      <p className="text-sm text-muted">
        It may have expired, or come from an app that isn't set up correctly. Go back to the app you were
        connecting and try again — if this keeps happening, contact its developer.
      </p>
    </div>
  );
}
