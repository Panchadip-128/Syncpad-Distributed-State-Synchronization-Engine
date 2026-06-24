"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Settings, LogOut, LayoutDashboard, Copy, Moon, Sun, History } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Action = {
  id: string;
  name: string;
  icon: React.ReactNode;
  shortcut?: string[];
  perform: () => void;
  section: "Navigation" | "Document" | "Settings";
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Toggle palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const actions: Action[] = [
    {
      id: "dashboard",
      name: "Go to Dashboard",
      icon: <LayoutDashboard className="w-4 h-4 text-indigo-400" />,
      shortcut: ["G", "D"],
      perform: () => router.push("/dashboard"),
      section: "Navigation",
    },
    {
      id: "new-doc",
      name: "Create New Document",
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      perform: () => router.push("/dashboard"), // We could trigger the new doc flow here
      section: "Navigation",
    },
    {
      id: "copy-link",
      name: "Copy Link to Current Page",
      icon: <Copy className="w-4 h-4 text-amber-400" />,
      shortcut: ["⌘", "C"],
      perform: () => {
        navigator.clipboard.writeText(window.location.href);
      },
      section: "Document",
    },
    {
      id: "time-travel",
      name: "Toggle Time-Travel Engine",
      icon: <History className="w-4 h-4 text-violet-400" />,
      shortcut: ["⌘", "⇧", "T"],
      perform: () => {
        // Dispatch a keyboard event so the doc page picks it up
        const e = new KeyboardEvent("keydown", { key: "T", ctrlKey: true, shiftKey: true, bubbles: true });
        window.dispatchEvent(e);
      },
      section: "Document",
    },
    {
      id: "theme-dark",
      name: "Switch to Dark Theme",
      icon: <Moon className="w-4 h-4 text-slate-400" />,
      perform: () => document.documentElement.classList.add('dark'),
      section: "Settings",
    },
    {
      id: "theme-light",
      name: "Switch to Light Theme",
      icon: <Sun className="w-4 h-4 text-yellow-400" />,
      perform: () => document.documentElement.classList.remove('dark'),
      section: "Settings",
    },
    {
      id: "logout",
      name: "Log Out",
      icon: <LogOut className="w-4 h-4 text-rose-400" />,
      perform: async () => {
        try { await fetchApi("/auth/logout", { method: "POST" }); } catch {}
        router.push("/login");
      },
      section: "Settings",
    },
  ];

  // Very simple fuzzy search
  const filteredActions = actions.filter((action) => {
    if (!query) return true;
    const searchStr = query.toLowerCase().replace(/\s+/g, "");
    const targetStr = action.name.toLowerCase().replace(/\s+/g, "");
    
    // Check if all characters in search string appear in target string in order
    let searchIdx = 0;
    for (let i = 0; i < targetStr.length; i++) {
      if (targetStr[i] === searchStr[searchIdx]) {
        searchIdx++;
      }
      if (searchIdx === searchStr.length) return true;
    }
    return false;
  });

  // Group actions
  const groupedActions = React.useMemo(() => {
    return filteredActions.reduce((acc, action) => {
      if (!acc[action.section]) acc[action.section] = [];
      acc[action.section].push(action);
      return acc;
    }, {} as Record<string, Action[]>);
  }, [filteredActions]);

  const flatActions = React.useMemo(() => Object.values(groupedActions).flat(), [groupedActions]);

  // Reset active index on query change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatActions.length);
        // Scroll into view logic could be added here
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatActions.length) % flatActions.length);
      } else if (e.key === "Enter" && flatActions[activeIndex]) {
        e.preventDefault();
        flatActions[activeIndex].perform();
        setOpen(false);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [flatActions, activeIndex]
  );

  if (!open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] animate-fade-in"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] pointer-events-none px-4">
        <div 
          className="w-full max-w-xl bg-[#0f111a] rounded-xl overflow-hidden pointer-events-auto animate-scale-in"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.8), 0 0 20px rgba(99,102,241,0.1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header / Input */}
          <div className="flex items-center px-4 border-b border-white/10">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              className="flex-1 h-14 bg-transparent border-none outline-none text-white placeholder-slate-500 px-4 text-lg"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="bg-white/10 text-slate-300 rounded px-2 py-1 text-xs font-sans font-medium border border-white/5">ESC</kbd>
            </div>
          </div>

          {/* List */}
          <div 
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto py-2 px-2 custom-scrollbar"
          >
            {flatActions.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-sm">
                No results found.
              </div>
            ) : (
              Object.entries(groupedActions).map(([section, items]) => (
                <div key={section} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {section}
                  </div>
                  {items.map((action) => {
                    const idx = flatActions.findIndex(a => a.id === action.id);
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={action.id}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm text-left transition-colors mb-0.5 ${
                          isActive 
                            ? "bg-indigo-500/20 text-indigo-100" 
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                        onClick={() => {
                          action.perform();
                          setOpen(false);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${isActive ? "bg-indigo-500/30" : "bg-white/5"}`}>
                            {action.icon}
                          </div>
                          <span className="font-medium">{action.name}</span>
                        </div>
                        {action.shortcut && (
                          <div className="flex items-center gap-1">
                            {action.shortcut.map(key => (
                              <kbd key={key} className={`rounded px-2 py-1 text-xs font-sans ${isActive ? "bg-indigo-500/40 text-indigo-200" : "bg-white/10 text-slate-400"}`}>
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-white/5 px-4 py-3 bg-[#0a0c14] flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/5">↑↓</kbd> to navigate</span>
              <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/5">↵</kbd> to select</span>
            </div>
            <div className="font-mono opacity-50">SyncPad OS</div>
          </div>
        </div>
      </div>
    </>
  );
}
