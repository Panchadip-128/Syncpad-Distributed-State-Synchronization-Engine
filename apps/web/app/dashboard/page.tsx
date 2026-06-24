"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { FileText, Activity, Link as LinkIcon, RefreshCw, Search, LogOut, User } from "lucide-react";
import CommandPalette from "@/components/CommandPalette";

// ─── Debounce hook ─────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Highlight matched text in document titles ─────────────────────────────
function HighlightedTitle({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="text-indigo-400 bg-indigo-500/20 rounded px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

type Document = {
  id: string;
  title: string;
  updated_at: string;
};

const docColors = [
  "#6366f1", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#f472b6", "#84cc16",
];

function getDocColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return docColors[Math.abs(hash) % docColors.length];
}

function DocSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: "rgba(13,17,23,0.6)" }}>
      <div className="h-32 shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-4 rounded-lg shimmer w-3/4" />
        <div className="h-3 rounded-lg shimmer w-1/2" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const debouncedSearch = useDebounce(search, 300);

  // Load on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Debounced server-side search
  useEffect(() => {
    const fetchFiltered = async () => {
      try {
        setSearchLoading(true);
        const endpoint = debouncedSearch
          ? `/docs?q=${encodeURIComponent(debouncedSearch)}`
          : "/docs";
        const docs = await fetchApi(endpoint);
        setDocuments(docs);
      } catch (error) {
        if (error instanceof Error && error.message.includes("401")) {
          router.push("/login");
        }
      } finally {
        setSearchLoading(false);
      }
    };
    fetchFiltered();
  }, [debouncedSearch]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await fetchApi("/docs");
      setDocuments(docs);
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    setCreating(true);
    try {
      const newDoc = await fetchApi("/docs", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled Document" }),
      });
      router.push(`/doc/${newDoc.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
    } finally {
      setCreating(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await fetchApi(`/docs/${id}`, { method: "DELETE" });
      setDocuments(documents.filter((doc) => doc.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete document", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  };

  // Client-side filtering is now handled by the backend via debounced search.
  // We still keep a local filter for instant feel before debounce triggers.
  const filtered = debouncedSearch === search
    ? documents
    : documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-[#080a0f] relative overflow-hidden">
      {/* Background */}
      <div className="mesh-bg"><div className="mesh-orb" /></div>
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      {/* ── HEADER ─────────────────────────────────────── */}
      <header
        className="relative z-10 sticky top-0"
        style={{
          background: "rgba(8,10,15,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 0 16px rgba(99,102,241,0.4)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="font-bold text-white tracking-tight">SyncPad</span>
            <span className="hidden sm:block text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              CRDT Engine
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden md:block">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm text-white placeholder-slate-600 rounded-xl outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(99,102,241,0.4)";
                  e.target.style.boxShadow = "0 0 0 2px rgba(99,102,241,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {/* Search loading spinner */}
              {searchLoading && (
                <svg className="animate-spin w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={createDocument}
              disabled={creating}
              className="btn-premium flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            >
              {creating ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                </svg>
              )}
              <span className="hidden sm:inline">New Document</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-all border border-white/8"
                title="Account"
              >
                <User className="w-4 h-4" />
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div
                    className="absolute right-0 top-full mt-2 w-44 z-50 rounded-xl overflow-hidden animate-scale-in"
                    style={{
                      background: "rgba(13,17,23,0.98)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ─────────────────────────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 animate-fade-up">
          {[
            { label: "Documents", value: loading ? "—" : documents.length, color: "#6366f1", icon: <FileText className="w-6 h-6 text-[#6366f1]" /> },
            { label: "Real-time Sync", value: "Active", color: "#10b981", icon: <Activity className="w-6 h-6 text-[#10b981]" /> },
            { label: "CRDT Engine", value: "Yjs v14", color: "#8b5cf6", icon: <LinkIcon className="w-6 h-6 text-[#8b5cf6]" /> },
            { label: "Collab Protocol", value: "WS+CRDT", color: "#f59e0b", icon: <RefreshCw className="w-6 h-6 text-[#f59e0b]" /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-5 border"
              style={{
                background: "rgba(13,17,23,0.6)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="stat-number text-white" style={{ fontSize: "1.4rem" }}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Your Documents</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? "Loading..." : `${filtered.length} document${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => <DocSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 && search ? (
          <div className="text-center py-24 animate-fade-in">
            <div className="flex justify-center mb-4"><Search className="w-10 h-10 text-slate-500" /></div>
            <h3 className="text-lg font-semibold text-white mb-2">No results for &ldquo;{search}&rdquo;</h3>
            <p className="text-slate-500 text-sm">Try a different search term</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-24 rounded-3xl border border-dashed animate-fade-in"
            style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(13,17,23,0.3)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No documents yet</h3>
            <p className="text-slate-400 mb-7 text-sm max-w-xs mx-auto">
              Create your first document and experience real-time CRDT collaboration
            </p>
            <button
              onClick={createDocument}
              className="btn-premium inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
              </svg>
              Create First Document
            </button>
          </div>
        ) : (
          <>
            {/* New doc card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <button
                onClick={createDocument}
                disabled={creating}
                className="rounded-2xl border border-dashed p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-all group hover:scale-[1.02] animate-fade-up"
                style={{ borderColor: "rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.04)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  {creating ? "Creating..." : "New Document"}
                </div>
              </button>

              {filtered.map((doc, i) => {
                const color = getDocColor(doc.id);
                return (
                  <div
                    key={doc.id}
                    className="rounded-2xl border overflow-hidden group cursor-pointer relative transition-all hover:scale-[1.02] hover:-translate-y-0.5 animate-fade-up"
                    style={{
                      background: "rgba(13,17,23,0.7)",
                      borderColor: "rgba(255,255,255,0.07)",
                      animationDelay: `${i * 50}ms`,
                      animationFillMode: "both",
                    }}
                    onClick={() => router.push(`/doc/${doc.id}`)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = color + "50";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px ${color}18`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Color bar */}
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

                    {/* Preview area */}
                    <div
                      className="h-28 flex items-center justify-center relative overflow-hidden"
                      style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}12 0%, transparent 70%)` }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1" className="w-12 h-12 opacity-40">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                      </svg>
                      {/* Live indicator */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                        Live
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-white text-sm truncate mb-1 group-hover:text-indigo-300 transition-colors">
                        <HighlightedTitle text={doc.title} query={search} />
                      </h3>
                      <p className="text-xs text-slate-500">{formatDate(doc.updated_at)}</p>
                    </div>

                    {/* Delete btn */}
                    <button
                      className="absolute bottom-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(doc.id);
                      }}
                      title="Delete document"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* ── DELETE CONFIRM MODAL ──────────────────────────── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm animate-scale-in"
            style={{
              background: "rgba(13,17,23,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete document?</h3>
            <p className="text-sm text-slate-400 mb-6">This action cannot be undone. All CRDT history and snapshots will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors border border-white/10 hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDocument(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "#ef4444", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
