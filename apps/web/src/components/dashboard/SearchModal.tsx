'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FileText, 
  Folder, 
  Command, 
  X,
  History,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Node } from '@nexus/api/schema';
import { useRouter, useParams } from 'next/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
}

export default function SearchModal({ isOpen, onClose, nodes }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const params = useParams();
  const workspace_slug = params?.workspace_slug as string;

  // Filter nodes based on query
  const filteredNodes = nodes.filter(node => 
    node.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSelect = (nodeId: string) => {
    router.push(`/w/${workspace_slug}/n/${nodeId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm animate-in fade-in duration-300 px-4">
      <div className="w-full max-w-2xl bg-sidebar border border-border/10 shadow-popover rounded-2xl overflow-hidden flex flex-col animate-in slide-in-from-top-4 zoom-in-95 duration-500">
        
        {/* Search Bar */}
        <div className="flex items-center px-6 py-5 border-b border-border/5">
          <Search className="w-5 h-5 text-muted mr-4" />
          <input 
            autoFocus
            type="text"
            placeholder="Search for documents, folders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-lg text-foreground placeholder:text-muted/40 font-medium"
          />
          <button onClick={onClose} className="p-1 hover:bg-hover rounded transition-colors text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
          {query.length === 0 && (
            <div className="p-4 space-y-4">
               <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted/50 ml-2">Recent Searches</h4>
               <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted/60 opacity-50 select-none italic font-medium">
                   <History className="w-4 h-4" /> No recent searches
                 </div>
               </div>
            </div>
          )}

          {query.length > 0 && filteredNodes.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-muted/5 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-muted/20" />
              </div>
              <p className="text-sm text-muted/50 font-medium italic">No results found for "{query}"</p>
            </div>
          )}

          {filteredNodes.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted/50 ml-4 py-2 mt-2">Pages</h4>
              {filteredNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-hover rounded-xl group transition-all cursor-pointer text-left focus:bg-hover outline-none"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-background border border-border/5 rounded-lg group-hover:scale-110 transition-transform">
                    {node.icon ? (
                      <span className="text-lg">{node.icon}</span>
                    ) : (
                      node.type === 'folder' ? <Folder className="w-4 h-4 text-muted" /> : <FileText className="w-4 h-4 text-muted" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-[15px] font-bold text-foreground/80 group-hover:text-foreground">
                      {node.title || "Untitled"}
                    </span>
                    <span className="text-[11px] text-foreground/50 font-medium flex items-center gap-1">
                      In Private / {node.type}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cta opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Help */}
        <div className="px-6 py-4 border-t border-border/5 bg-background/20 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-foreground/40">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Command className="w-3 h-3 text-cta/60" />K Search</span>
            <span className="flex items-center gap-1.5"><span className="text-cta/60">Esc</span> Close</span>
            <span className="flex items-center gap-1.5"><span className="text-cta/60">Enter</span> Select</span>
          </div>
          <div className="flex items-center gap-1 text-cta/60 tracking-widest text-[9px]">
             <span>Search by Nexus AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
