"use client";

import React, { useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Play, Terminal, Trash2 } from "lucide-react";

export function CodeSandboxBlock({ node, updateAttributes }: any) {
  const code = node.attrs.code || "";
  const output = node.attrs.output || "";
  const language = node.attrs.language || "javascript";
  const [isRunning, setIsRunning] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateAttributes({ code: e.target.value });
  };

  const runCode = async () => {
    setIsRunning(true);
    
    if (language === "python") {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/ai/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: "python", code }),
          }
        );
        if (!response.ok) throw new Error("Execution request failed");
        
        const result = await response.json();
        const outputText = result.stderr ? `${result.stdout}\n${result.stderr}`.trim() : result.stdout;
        updateAttributes({ output: outputText || "[Code executed with no output]" });
      } catch (e: any) {
        updateAttributes({ output: `[Error] ${e.message}` });
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // Default: local client-side JavaScript execution
    const logs: string[] = [];
    const mockConsole = {
      log: (...args: any[]) => {
        logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" "));
      },
      error: (...args: any[]) => {
        logs.push("[Error] " + args.map(a => String(a)).join(" "));
      },
      warn: (...args: any[]) => {
        logs.push("[Warning] " + args.map(a => String(a)).join(" "));
      },
      info: (...args: any[]) => {
        logs.push("[Info] " + args.map(a => String(a)).join(" "));
      }
    };

    try {
      const fn = new Function("console", `
        try {
          ${code}
        } catch (e) {
          console.error(e.message);
        }
      `);
      fn(mockConsole);
    } catch (e: any) {
      logs.push("[Syntax Error] " + e.message);
    }

    updateAttributes({ output: logs.join("\n") || "[Code executed with no output]" });
    setIsRunning(false);
  };

  const clearOutput = () => {
    updateAttributes({ output: "" });
  };

  return (
    <NodeViewWrapper className="code-sandbox-wrapper my-6 relative rounded-xl overflow-hidden border border-white/10 bg-[#0f1115] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10 select-none">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider hidden sm:inline">Code Sandbox</span>
          <select
            value={language}
            onChange={(e) => updateAttributes({ language: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none cursor-pointer hover:bg-white/10 transition-colors"
          >
            <option value="javascript" className="bg-[#0f1115]">JavaScript (Client)</option>
            <option value="python" className="bg-[#0f1115]">Python (Backend)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          {output && (
            <button
              onClick={clearOutput}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-rose-400 transition-colors"
              title="Clear Console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={runCode}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={isRunning}
            className="btn-premium flex items-center gap-1.5 px-4 py-1.5 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Running..." : "Run Code"}</span>
          </button>
        </div>
      </div>

      {/* Editor container */}
      <div className="relative flex min-h-[120px] bg-black/20">
        {/* Dynamic Line Numbers */}
        <div className="w-10 text-slate-600 font-mono text-xs text-right pr-2.5 py-4 select-none border-r border-white/5 leading-relaxed bg-black/10">
          {(code.split("\n") as string[]).map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>
        {/* Monospace edit textbox */}
        <textarea
          value={code}
          onChange={handleCodeChange}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          spellCheck={false}
          className="flex-1 min-h-[120px] bg-transparent text-slate-200 font-mono text-xs p-4 focus:outline-none resize-y leading-relaxed"
          style={{ whiteSpace: "pre", overflowWrap: "normal" }}
          placeholder={language === "javascript" ? "// Write JS code here..." : "# Write Python code here..."}
        />
      </div>

      {/* Output Console panel */}
      {output && (
        <div className="px-4 py-3 bg-black/40 border-t border-white/10 text-xs font-mono">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Console Output</div>
          <pre className="text-emerald-400/90 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">{output}</pre>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const CodeSandboxExtension = Node.create({
  name: "codeSandbox",
  group: "block",
  // atom is set to false so the inner inputs maintain native browser focus/typing controls
  atom: false,

  addAttributes() {
    return {
      code: {
        default: 'console.log("Hello, SyncPad!");\nconsole.log("Calculating 2 + 2 = ", 2 + 2);',
      },
      output: {
        default: "",
      },
      language: {
        default: "javascript",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "code-sandbox",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["code-sandbox", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeSandboxBlock);
  },
});
