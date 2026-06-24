"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Bot, User } from "lucide-react";

export function CopilotSidebar({ editor, onClose }: { editor: any, onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !editor || isProcessing) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsProcessing(true);

    const documentContext = editor.getText();
    abortRef.current = new AbortController();

    try {
      setMessages((prev) => [...prev, { role: "ai", content: "" }]);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/ai/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_context: documentContext, message: userMessage }),
          signal: abortRef.current.signal,
        }
      );

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

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
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = { 
                  ...newMessages[lastIdx], 
                  content: newMessages[lastIdx].content + "\n\n[Error from server]" 
                };
                return newMessages;
              });
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIdx = newMessages.length - 1;
                  newMessages[lastIdx] = { 
                    ...newMessages[lastIdx], 
                    content: newMessages[lastIdx].content + parsed.content 
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore invalid JSON chunks
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          newMessages[lastIdx] = { 
            ...newMessages[lastIdx], 
            content: "Sorry, I encountered an error connecting to the backend." 
          };
          return newMessages;
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const insertToEditor = (content: string) => {
    editor.chain().focus().insertContent(content).run();
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 border-l border-white/10 flex flex-col bg-[#0d1117] z-50 shadow-2xl animate-in slide-in-from-right-8 duration-300">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 rounded-md text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-slate-200">Copilot</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 opacity-50 flex flex-col items-center gap-2">
            <Bot className="w-8 h-8 mb-2" />
            <p className="text-sm">I have access to your document.</p>
            <p className="text-sm">Ask me anything!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "user" ? "bg-slate-700" : "bg-indigo-500/20 text-indigo-400"}`}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`text-sm px-3 py-2 rounded-xl max-w-[80%] ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-200"}`}>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.role === "ai" && !isProcessing && msg.content && (
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={() => insertToEditor(msg.content)}
                    className="text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300 tracking-wider"
                  >
                    Insert into Document
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && messages.length > 0 && messages[messages.length - 1].content === "" && (
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-indigo-500/20 text-indigo-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex gap-1 items-center px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-[#0d1117]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot..."
            disabled={isProcessing}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-md transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}
