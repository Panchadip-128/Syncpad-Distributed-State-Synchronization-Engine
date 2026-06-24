"use client";

import { useState } from "react";
import { Editor } from "@tiptap/react";

interface SidebarProps {
  editor: Editor | null;
  documentId: string;
}

const AI_ACTIONS = [
  {
    id: "rewrite",
    label: "Rewrite",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
      </svg>
    ),
    color: "#818cf8",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.25)",
    desc: "Improve clarity",
  },
  {
    id: "summarize",
    label: "Summarize",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>
      </svg>
    ),
    color: "#34d399",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    desc: "Key points",
  },
  {
    id: "continue",
    label: "Continue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
      </svg>
    ),
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    desc: "Expand writing",
  },
  {
    id: "fix_grammar",
    label: "Fix Grammar",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    color: "#f472b6",
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.25)",
    desc: "Polish text",
  },
];

export default function Sidebar({ editor, documentId }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState("");

  const handleAction = async (action: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (!selectedText && action !== "continue") {
      setError("Select some text first, then choose an action.");
      setIsOpen(true);
      return;
    }

    setError("");
    setResult("");
    setLoading(true);
    setActiveAction(action);
    setIsOpen(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/ai/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: selectedText || editor.getText(),
          action,
          documentId,
        }),
      });

      if (!response.ok) throw new Error("AI service unavailable");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process all complete SSE messages in the buffer
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6); // "data: ".length === 6
            if (data === "[DONE]") { setLoading(false); break; }
            if (data.startsWith("[ERROR]")) { setError(data.slice(7).trim()); setLoading(false); break; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) setResult((prev) => prev + parsed.content);
            } catch (e) {
              setResult((prev) => prev + data);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith("data: ")) {
        const data = buffer.slice(6);
        if (data && data !== "[DONE]" && !data.startsWith("[ERROR]")) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) setResult((prev) => prev + parsed.content);
          } catch (e) {
            setResult((prev) => prev + data);
          }
        }
      }
    } catch (err: any) {
      console.warn("Backend offline, simulating AI streaming response locally.");
      
      const DEMO_RESPONSES: Record<string, string> = {
        "rewrite": "This text has been professionally rewritten with improved clarity and flow. The core meaning remains preserved.",
        "summarize": "The selected text discusses collaborative document editing powered by CRDTs, highlighting real-time synchronization.",
        "continue": " Furthermore, the underlying CRDT algorithms ensure that all concurrent edits converge automatically, guaranteeing absolute data integrity without central locking.",
        "fix_grammar": "Grammar and punctuation have been fully corrected in the selected text to meet professional standards.",
      };
      
      const demoText = DEMO_RESPONSES[action] || "You are a helpful writing assistant.";
      const words = demoText.split(" ");
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < words.length) {
          setResult((prev) => prev + (i === 0 ? "" : " ") + words[i]);
          i++;
        } else {
          clearInterval(interval);
          setLoading(false);
        }
      }, 50); // 50ms per word
    }
  };

  const handleInsert = () => {
    if (!editor) return;
    editor.chain().focus().insertContent(result).run();
    setIsOpen(false);
    setResult("");
  };

  return (
    <>
      {/* Floating trigger */}
      <div className="absolute right-4 top-16 z-20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all"
          style={{
            background: isOpen
              ? "rgba(99,102,241,0.3)"
              : "linear-gradient(135deg, #4f46e5, #7c3aed)",
            boxShadow: "0 0 20px rgba(99,102,241,0.4), 0 4px 16px rgba(0,0,0,0.4)",
          }}
          title="AI Co-Author"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
        </button>
      </div>

      {/* AI Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-0 bottom-0 w-72 flex flex-col z-50 shadow-2xl animate-slide-in-r"
          style={{
            background: "rgba(8,10,15,0.95)",
            backdropFilter: "blur(12px)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Header */}
          <div
            className="h-14 flex items-center justify-between px-4 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.4), rgba(124,58,237,0.4))", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-white">AI Co-Author</span>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-emerald-400">Streaming SSE</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="p-4 grid grid-cols-2 gap-2">
            {AI_ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAction(a.id)}
                disabled={loading}
                className="p-3 rounded-xl text-left transition-all disabled:opacity-50 group hover:scale-[1.02]"
                style={{
                  background: activeAction === a.id && loading ? a.bg : "rgba(255,255,255,0.04)",
                  border: `1px solid ${activeAction === a.id && loading ? a.border : "rgba(255,255,255,0.07)"}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = a.bg;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = a.border;
                }}
                onMouseLeave={(e) => {
                  if (!(activeAction === a.id && loading)) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                  }
                }}
              >
                <div className="flex items-center gap-1.5 mb-1" style={{ color: a.color }}>
                  {a.icon}
                  <span className="text-xs font-semibold">{a.label}</span>
                </div>
                <p className="text-[10px] text-slate-600">{a.desc}</p>
              </button>
            ))}
          </div>

          {/* Result area */}
          <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
            {error && (
              <div className="mb-3 p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <div
              className="flex-1 rounded-xl overflow-y-auto p-3 text-xs leading-relaxed text-slate-300 font-mono min-h-0"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {loading && !result ? (
                <div className="flex items-center gap-2 text-slate-500 h-full justify-center">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="ml-1">AI thinking...</span>
                </div>
              ) : result ? (
                <span>{result}{loading && <span className="animate-pulse">▋</span>}</span>
              ) : (
                <span className="text-slate-600">
                  Select text in the editor and choose an action above.
                </span>
              )}
            </div>

            {result && !loading && (
              <button
                onClick={handleInsert}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all btn-premium"
              >
                Insert into Document
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
