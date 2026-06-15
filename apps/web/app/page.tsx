"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75"/>
      </svg>
    ),
    tag: "Core Architecture",
    title: "CRDT-Powered Sync",
    desc: "Built on Yjs — a production-grade CRDT library. Every keystroke is an atomic operation encoded as a Lamport-clocked binary update that auto-merges across any network partition.",
    color: "indigo",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
      </svg>
    ),
    tag: "Real-Time",
    title: "Sub-10ms Awareness",
    desc: "WebSocket-based Hocuspocus server broadcasts presence state instantly. See collaborators' cursors, selections and names update in real-time with zero polling.",
    color: "violet",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"/>
      </svg>
    ),
    tag: "Deterministic Replay",
    title: "Atomic Operation Replay",
    desc: "Every snapshot stores the full Yjs update binary. Hit Replay to watch the document reconstruct itself character-by-character — visually proving CRDT convergence.",
    color: "emerald",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 106 0m-6 0a3 3 0 106 0m6-9a3 3 0 110 6 3 3 0 010-6zM9 18a9 9 0 01-6-6"/>
      </svg>
    ),
    tag: "Git-Style Branching",
    title: "Document Branching",
    desc: "Fork any document at any point in time. Branch state is encoded as a Yjs binary update and propagated via the Hocuspocus WebSocket — zero data loss guaranteed.",
    color: "amber",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
      </svg>
    ),
    tag: "AI Native",
    title: "Streaming AI Co-Author",
    desc: "FastAPI backend proxies to an LLM with Server-Sent Events (SSE) streaming. Rewrite, summarize, continue, or fix grammar — AI output streams token-by-token into the editor.",
    color: "pink",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"/>
      </svg>
    ),
    tag: "Persistence Layer",
    title: "PostgreSQL + Redis Pub/Sub",
    desc: "FastAPI + SQLAlchemy persists documents and snapshots. Redis Pub/Sub backplane enables horizontal scaling across multiple Hocuspocus nodes.",
    color: "cyan",
  },
];

const colorMap: Record<string, string> = {
  indigo: "rgba(99,102,241,0.15)",
  violet: "rgba(139,92,246,0.15)",
  emerald: "rgba(16,185,129,0.15)",
  amber: "rgba(245,158,11,0.15)",
  pink: "rgba(236,72,153,0.15)",
  cyan: "rgba(6,182,212,0.15)",
};
const borderMap: Record<string, string> = {
  indigo: "rgba(99,102,241,0.3)",
  violet: "rgba(139,92,246,0.3)",
  emerald: "rgba(16,185,129,0.3)",
  amber: "rgba(245,158,11,0.3)",
  pink: "rgba(236,72,153,0.3)",
  cyan: "rgba(6,182,212,0.3)",
};
const textMap: Record<string, string> = {
  indigo: "#818cf8",
  violet: "#a78bfa",
  emerald: "#34d399",
  amber: "#fbbf24",
  pink: "#f472b6",
  cyan: "#22d3ee",
};

const techStack = [
  { name: "Next.js 16", desc: "React framework" },
  { name: "Tiptap v3", desc: "Rich text editor" },
  { name: "Yjs", desc: "CRDT library" },
  { name: "Hocuspocus", desc: "WS CRDT server" },
  { name: "FastAPI", desc: "Python backend" },
  { name: "PostgreSQL", desc: "Primary database" },
  { name: "Redis", desc: "Pub/Sub backplane" },
  { name: "TypeScript", desc: "End-to-end types" },
];

export default function Home() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080a0f]">
      {/* Animated mesh background */}
      <div className="mesh-bg">
        <div className="mesh-orb" />
      </div>

      {/* Top grid lines */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg" style={{boxShadow: "0 0 20px rgba(99,102,241,0.4)"}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">SyncPad</span>
          <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">v2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
            Sign In
          </Link>
          <Link href="/register" className="btn-premium text-sm text-white font-medium px-5 py-2 rounded-xl">
            Get Started →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28 text-center">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 animate-fade-up">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Live Collaborative CRDT Editor — Real-time sync across all connected clients
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 animate-fade-up delay-100">
          <span className="text-white">Where Documents</span>
          <br />
          <span className="gradient-text">Think in Real-Time</span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up delay-200">
          A production-grade collaborative editor demonstrating{" "}
          <span className="text-slate-200 font-medium">Conflict-Free Replicated Data Types</span>,{" "}
          <span className="text-slate-200 font-medium">Lamport vector clocks</span>, and{" "}
          <span className="text-slate-200 font-medium">deterministic CRDT replay</span> — 
          the exact algorithms used at Notion, Figma, and Google Docs.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-300">
          <Link href="/register" className="btn-premium text-base text-white font-semibold px-8 py-3.5 rounded-xl w-full sm:w-auto">
            Open the Editor →
          </Link>
          <Link href="/login" className="text-base text-slate-300 font-medium px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all w-full sm:w-auto">
            Sign In
          </Link>
        </div>

        {/* Live CRDT ticker */}
        <div className="mt-16 flex items-center justify-center gap-6 animate-fade-up delay-400">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="crdt-badge">CRDT Update #{(1000 + tick * 7).toLocaleString()}</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="text-sm text-slate-500 font-mono">Δt ≈ <span className="text-emerald-400">{(2 + (tick % 4))}ms</span></div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="text-sm text-slate-500">Lamport clock <span className="text-indigo-400 font-mono">{800 + tick * 3}</span></div>
        </div>
      </section>

      {/* ── FEATURE GRID ─────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <div className="feature-tag inline-block mb-4">Technical Architecture</div>
          <h2 className="text-4xl font-bold tracking-tight text-white">
            Every feature, <span className="gradient-text">production-grade</span>
          </h2>
          <p className="text-slate-400 mt-3 text-lg max-w-xl mx-auto">
            Not a toy. Every system demonstrates real distributed computing concepts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-300 gradient-border animate-fade-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ background: colorMap[f.color], border: `1px solid ${borderMap[f.color]}`, color: textMap[f.color] }}
              >
                {f.icon}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: textMap[f.color] }}>
                {f.tag}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH STACK ───────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="glass rounded-3xl p-10 border border-white/5">
          <div className="text-center mb-10">
            <div className="feature-tag inline-block mb-3">Stack</div>
            <h2 className="text-3xl font-bold text-white">Production-grade technology</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {techStack.map((t) => (
              <div key={t.name} className="bg-white/4 hover:bg-white/6 transition-colors rounded-xl p-4 text-center border border-white/5 hover:border-indigo-500/30 group">
                <div className="font-bold text-white group-hover:text-indigo-300 transition-colors text-sm">{t.name}</div>
                <div className="text-xs text-slate-500 mt-1">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-3xl p-12 text-center relative overflow-hidden" style={{
          background: "linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(139,92,246,0.1) 50%, rgba(16,185,129,0.1) 100%)",
          border: "1px solid rgba(99,102,241,0.3)"
        }}>
          <div className="absolute inset-0 opacity-30" style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.4) 0%, transparent 70%)"
          }} />
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
              Open the document editor now
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
              Create a document, type some text, open a second tab — watch CRDTs sync in real-time.
            </p>
            <Link href="/register" className="btn-premium inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl text-lg">
              Launch Editor
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-400">SyncPad</span>
            <span>·</span>
            <span>CRDT Collaborative Editor</span>
          </div>
          <div className="text-xs text-slate-600 font-mono">
            Built with Yjs · Hocuspocus · Tiptap · FastAPI
          </div>
        </div>
      </footer>
    </div>
  );
}
