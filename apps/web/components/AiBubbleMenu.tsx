"use client";

import { Sparkles, Wand2, Type, ArrowRightLeft, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const AI_ACTIONS = [
  { id: "improve", label: "Improve", icon: Wand2 },
  { id: "shorter", label: "Shorter", icon: ArrowRightLeft },
  { id: "summarize", label: "Summarize", icon: Type },
];

import * as Y from "yjs";

export function AiBubbleMenu({ editor, yDoc, userName = "Anonymous" }: { editor: any, yDoc?: Y.Doc, userName?: string }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!editor) return;
    const updateMenu = () => {
      setShow(!editor.state.selection.empty);
      setError("");
    };
    editor.on("selectionUpdate", updateMenu);
    editor.on("blur", () => {
      // Small delay to allow button clicks to register
      setTimeout(() => {
        if (!editor.state.selection.empty) return;
        setShow(false);
      }, 150);
    });
    return () => {
      editor.off("selectionUpdate", updateMenu);
    };
  }, [editor]);

  const handleAiAction = async (action: string) => {
    if (!editor) return;
    setIsProcessing(true);
    setError("");

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (!selectedText.trim()) {
      setError("Please select some text first.");
      setIsProcessing(false);
      return;
    }

    abortRef.current = new AbortController();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/ai/assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: selectedText, action }),
          signal: abortRef.current.signal,
        }
      );

      if (!response.ok) throw new Error(`AI request failed: ${response.statusText}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let resultText = "";

      // Replace selection with empty cursor at start position
      editor.chain().focus().deleteSelection().run();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            if (data.startsWith("[ERROR]")) {
              setError(data.slice(7).trim() || "AI error occurred.");
              break;
            }
            // Stream text directly into editor
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                editor.chain().focus().insertContent(parsed.content).run();
                resultText += parsed.content;
              }
            } catch (e) {
              editor.chain().focus().insertContent(data).run();
              resultText += data;
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith("data: ")) {
        const data = buffer.slice(6);
        if (data && data !== "[DONE]" && !data.startsWith("[ERROR]")) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              editor.chain().focus().insertContent(parsed.content).run();
            }
          } catch (e) {
            editor.chain().focus().insertContent(data).run();
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.warn("AI bubble menu: backend unavailable, using demo response.");

      // Demo fallback - stream word by word into editor
      const DEMO: Record<string, string> = {
        improve: "This text has been improved for clarity and professional tone.",
        shorter: "Text shortened and optimized.",
        summarize: "Key points: collaborative editing with real-time CRDT synchronization.",
      };

      const demo = DEMO[action] || "AI response (backend not connected).";
      editor.chain().focus().deleteSelection().run();
      const words = demo.split(" ");
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 40));
        editor.chain().focus().insertContent((i === 0 ? "" : " ") + words[i]).run();
      }
    } finally {
      setIsProcessing(false);
      setShow(false);
    }
  };

  const handleComment = () => {
    if (!editor) return;
    const commentId = "comment_" + Math.random().toString(36).slice(2, 9);
    
    if (yDoc) {
      const commentsMap = yDoc.getMap("comments");
      commentsMap.set(commentId, {
        id: commentId,
        text: "",
        author: userName,
        timestamp: Date.now(),
        resolved: false,
      });
    }

    editor.chain().focus().setComment(commentId).run();
    setShow(false);
  };

  if (!editor || !show) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-auto flex flex-wrap items-center justify-center p-1.5 gap-1 rounded-xl shadow-[0_8px_32px_rgba(99,102,241,0.25)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
      style={{
        background: "rgba(15,17,26,0.97)",
        border: "1px solid rgba(99,102,241,0.35)",
        backdropFilter: "blur(12px)",
      }}
    >
      {isProcessing ? (
        <div className="flex items-center gap-2 px-4 py-1.5 text-sm text-indigo-300 font-medium">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="animate-pulse">AI writing...</span>
        </div>
      ) : (
        <>
          <div className="px-2 py-1 flex items-center gap-1.5 border-r border-white/10 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">AI</span>
          </div>

          {AI_ACTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleAiAction(id)}
              className="btn-premium flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}

          <div className="w-px h-4 bg-white/10 mx-1" />

          <button
            type="button"
            onClick={handleComment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/20 text-xs font-medium transition-colors border border-yellow-500/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Comment
          </button>

          {error && (
            <div className="w-full px-3 py-1.5 text-xs text-red-400 text-center">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
