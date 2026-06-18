"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HocuspocusProvider } from "@hocuspocus/provider";
import dynamic from "next/dynamic";
import PresenceBar from "@/components/PresenceBar";
import Sidebar from "@/components/Sidebar";
import VersionHistory from "@/components/VersionHistory";
import BranchVisualizer from "@/components/BranchVisualizer";
import { fetchApi } from "@/lib/api";
import { useKeyboardShortcuts, EDITOR_SHORTCUTS } from "@/lib/useKeyboardShortcuts";
import Link from "next/link";
import * as Y from "yjs";
import DocumentOutline from "@/components/DocumentOutline";
import Minimap from "@/components/Minimap";
import { ShareModal } from "@/components/ShareModal";
import { TelemetryDashboard } from "@/components/TelemetryDashboard";
import { TimeTravelSlider } from "@/components/TimeTravelSlider";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

// ─── HTML → Markdown converter (inline, no extra dep) ──────────────────────
function htmlToMarkdown(html: string): string {
  let md = html;
  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  // Bold + Italic
  md = md.replace(/<(strong|b)>(.*?)<\/\1>/gi, "**$2**");
  md = md.replace(/<(em|i)>(.*?)<\/\1>/gi, "*$2*");
  md = md.replace(/<s>(.*?)<\/s>/gi, "~~$1~~");
  // Code
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n\n");
  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");
  // Blockquote
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n\n");
  // Horizontal rule
  md = md.replace(/<hr\s*\/?>/gi, "---\n\n");
  // Paragraphs + breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Shortcuts Help Modal ──────────────────────────────────────────────────
function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac");
  const mod = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    { keys: `${mod} + S`, desc: "Save document" },
    { keys: `${mod} + /`, desc: "Toggle AI Co-Author" },
    { keys: `${mod} + T`, desc: "Toggle Telemetry Dashboard" },
    { keys: `${mod} + Shift + E`, desc: "Export document" },
    { keys: `${mod} + D`, desc: "Branch (duplicate) document" },
    { keys: "?", desc: "Show this help" },
    { keys: "Esc", desc: "Close panel / modal" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md animate-scale-in"
        style={{
          background: "rgba(13,17,23,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-1">
          {shortcuts.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-sm text-slate-300">{s.desc}</span>
              <kbd
                className="text-xs font-mono px-2 py-1 rounded-md"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#a5b4fc",
                }}
              >
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs text-slate-600 text-center">
            Press <kbd className="text-indigo-400 font-mono">?</kbd> anywhere to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Export Dropdown ────────────────────────────────────────────────────────
function ExportDropdown({
  isOpen,
  onClose,
  onExportMarkdown,
  onExportText,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExportMarkdown: () => void;
  onExportText: () => void;
}) {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute top-full right-0 mt-1 z-50 w-52 rounded-xl overflow-hidden animate-scale-in"
        style={{
          background: "rgba(13,17,23,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        <button
          onClick={() => { onExportMarkdown(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all text-left"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div>
            <div className="font-medium">Markdown</div>
            <div className="text-[10px] text-slate-500">.md — headings, bold, lists</div>
          </div>
        </button>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
        <button
          onClick={() => { onExportText(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all text-left"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
          <div>
            <div className="font-medium">Plain Text</div>
            <div className="text-[10px] text-slate-500">.txt — raw text content</div>
          </div>
        </button>
      </div>
    </>
  );
}

// ─── Save Toast ────────────────────────────────────────────────────────────
function SaveToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium animate-fade-up"
      style={{
        background: "rgba(16,185,129,0.15)",
        border: "1px solid rgba(16,185,129,0.3)",
        color: "#34d399",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      Saved
    </div>
  );
}

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [yDoc] = useState(() => new Y.Doc());
  const [title, setTitle] = useState("Loading...");
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isSynced, setIsSynced] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // New state for features
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const [userOptions] = useState(() => {
    const colors = ["#f43f5e", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"];
    return {
      color: colors[Math.floor(Math.random() * colors.length)],
      name: "User_" + Math.floor(Math.random() * 1000),
    };
  });

  useEffect(() => {
    fetchApi(`/docs/${id}`)
      .then((doc) => {
        setTitle(doc.title);
        setDraftTitle(doc.title);
        setLoading(false);
      })
      .catch(() => router.push("/dashboard"));

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: id,
      document: yDoc,
      onSynced: () => setIsSynced(true),
    });

    newProvider.setAwarenessField("user", {
      name: userOptions.name,
      color: userOptions.color,
    });

    setProvider(newProvider);

    return () => { newProvider.destroy(); };
  }, [id, router, userOptions, yDoc]);

  // Track word/char count from editor
  useEffect(() => {
    if (!editorInstance) return;
    const update = () => {
      const text = editorInstance.getText();
      setCharCount(text.length);
      setWordCount(text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);
    };
    editorInstance.on("update", update);
    update();
    return () => editorInstance.off("update", update);
  }, [editorInstance]);

  const saveTitle = async () => {
    if (draftTitle.trim() && draftTitle !== title) {
      try {
        await fetchApi(`/docs/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: draftTitle.trim() }),
        });
        setTitle(draftTitle.trim());
      } catch {}
    } else {
      setDraftTitle(title);
    }
    setEditingTitle(false);
  };

  // ─── Save handler (for Cmd+S) ──────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
    // Trigger title save if editing
    if (editingTitle) {
      saveTitle();
    }
  }, [editingTitle, draftTitle, title]);

  // ─── Export handlers ───────────────────────────────────────────────────
  const handleExportMarkdown = useCallback(() => {
    if (!editorInstance) return;
    const html = editorInstance.getHTML();
    const md = `# ${title}\n\n${htmlToMarkdown(html)}`;
    const safeName = title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    downloadFile(md, `${safeName}.md`, "text/markdown;charset=utf-8");
  }, [editorInstance, title]);

  const handleExportText = useCallback(() => {
    if (!editorInstance) return;
    const text = editorInstance.getText();
    const safeName = title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    downloadFile(`${title}\n${"=".repeat(title.length)}\n\n${text}`, `${safeName}.txt`, "text/plain;charset=utf-8");
  }, [editorInstance, title]);

  // ─── Branch handler ────────────────────────────────────────────────────
  const handleBranch = useCallback(async () => {
    try {
      const branch = await fetchApi(`/docs/${id}/branch`, { method: "POST" });
      router.push(`/doc/${branch.id}`);
    } catch (err) {
      console.error("Failed to branch:", err);
    }
  }, [id, router]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useKeyboardShortcuts([
    { key: "s", ctrl: true, handler: handleSave, description: "Save" },
    { key: "/", ctrl: true, handler: () => setSidebarOpen((p) => !p), description: "Toggle AI" },
    { key: "e", ctrl: true, shift: true, handler: () => setShowExport((p) => !p), description: "Export" },
    { key: "d", ctrl: true, handler: handleBranch, description: "Branch" },
    { key: "?", handler: () => setShowShortcuts((p) => !p), description: "Help" },
    { key: "Escape", handler: () => { setShowShortcuts(false); setShowExport(false); setSidebarOpen(false); }, description: "Close" },
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center animate-pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
            </svg>
          </div>
          <span className="text-slate-500 text-sm font-medium">Connecting to CRDT network...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a0f] text-white flex flex-col">
      {/* ── TOP HEADER ──────────────────────────────────── */}
      <header
        className="h-14 shrink-0 sticky top-0 z-30 flex items-center justify-between px-4 gap-3"
        style={{
          background: "rgba(8,10,15,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
            </svg>
          </Link>
          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Title editable */}
          {editingTitle ? (
            <input
              ref={titleRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setDraftTitle(title); setEditingTitle(false); } }}
              autoFocus
              className="text-base font-semibold text-white bg-transparent border-b border-indigo-500 outline-none px-1 min-w-[120px] max-w-xs"
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 10); }}
              className="text-base font-semibold text-white hover:text-indigo-300 transition-colors truncate max-w-[200px] sm:max-w-xs group flex items-center gap-1.5"
              title="Click to rename"
            >
              {title}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0 transition-opacity">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
              </svg>
            </button>
          )}

          {/* Sync indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isSynced ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="hidden sm:inline">{isSynced ? "Live" : "Connecting"}</span>
          </div>
        </div>

        {/* Right: tools */}
        <div className="flex items-center gap-2 shrink-0">
          {provider && <BranchVisualizer documentId={id} provider={provider} />}
          {provider && <PresenceBar provider={provider} />}
          {provider && <VersionHistory documentId={id} provider={provider} />}

          {/* Export button */}
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 text-sm transition-all border border-white/8 hover:border-white/15"
              title="Export document (Ctrl+Shift+E)"
              id="export-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
            <ExportDropdown
              isOpen={showExport}
              onClose={() => setShowExport(false)}
              onExportMarkdown={handleExportMarkdown}
              onExportText={handleExportText}
            />
          </div>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 text-sm transition-all border border-white/8 hover:border-white/15"
            title="Share Document"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Shortcuts help button */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 transition-all"
            title="Keyboard shortcuts (?)"
            id="shortcuts-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">
        <DocumentOutline editor={editorInstance} />
        
        {/* Editor area */}
        <div ref={editorContainerRef} className="flex-1 overflow-auto transition-all pl-12 sm:pl-0 pr-0 lg:pr-[140px] relative scroll-smooth">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
            {provider ? (
              <Editor
                provider={provider}
                yDoc={yDoc}
                userName={userOptions.name}
                userColor={userOptions.color}
                onEditorReady={setEditorInstance}
              />
            ) : (
              <div className="h-96 rounded-2xl shimmer" />
            )}
          </div>
        </div>

        {/* Telemetry Dashboard */}
        {provider && <TelemetryDashboard provider={provider} yDoc={yDoc} />}

        {/* Minimap */}
        <Minimap editor={editorInstance} editorContainerRef={editorContainerRef} />

        {/* Time Travel Slider */}
        <TimeTravelSlider />

        {/* AI Sidebar — now controlled by sidebarOpen OR its own internal state */}
        {editorInstance && (
          <Sidebar editor={editorInstance} documentId={id} />
        )}
      </main>

      {/* ── STATUS BAR ──────────────────────────────────── */}
      <footer
        className="h-8 shrink-0 flex items-center justify-between px-4 gap-4"
        style={{
          background: "rgba(8,10,15,0.9)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-slate-600 font-mono">
            {wordCount} words · {charCount} chars
          </span>
          <span className="crdt-badge">CRDT · Yjs</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-slate-600 font-mono hidden sm:inline">
            <kbd className="text-indigo-500 opacity-60">?</kbd> shortcuts
          </span>
          <span className="text-[11px] text-slate-600 font-mono hidden sm:inline">
            doc/{id.slice(0, 8)}…
          </span>
        </div>
      </footer>

      {/* ── MODALS & TOASTS ─────────────────────────────── */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} documentId={id} />
      <SaveToast show={showSaveToast} />
    </div>
  );
}
