"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { HocuspocusProvider } from "@hocuspocus/provider";
import dynamic from "next/dynamic";
import PresenceBar from "@/components/PresenceBar";
import Sidebar from "@/components/Sidebar";
import VersionHistory from "@/components/VersionHistory";
import BranchVisualizer from "@/components/BranchVisualizer";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import * as Y from "yjs";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

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
  const router = useRouter();

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

    const newProvider = new HocuspocusProvider({
      url: "ws://localhost:1234",
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
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 text-sm transition-all border border-white/8 hover:border-white/15"
            title="Copy share link"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Editor area */}
        <div className="flex-1 overflow-auto">
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

        {/* AI Sidebar */}
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
            doc/{id.slice(0, 8)}…
          </span>
        </div>
      </footer>
    </div>
  );
}
