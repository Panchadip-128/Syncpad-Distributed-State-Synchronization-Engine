"use client";

import { Sparkles, Wand2, Type, ArrowRightLeft } from "lucide-react";
import { useState, useEffect } from "react";

export function AiBubbleMenu({ editor }: { editor: any }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const updateMenu = () => {
      setShow(!editor.state.selection.empty);
    };
    editor.on("selectionUpdate", updateMenu);
    return () => {
      editor.off("selectionUpdate", updateMenu);
    };
  }, [editor]);

  const simulateAiAction = (action: string) => {
    if (!editor) return;
    setIsProcessing(true);
    
    // Simulate API delay
    setTimeout(() => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      let resultText = "";

      switch (action) {
        case "improve":
          resultText = selectedText + " (improved by AI)";
          break;
        case "summarize":
          resultText = "Summary: " + selectedText.split(" ").slice(0, 5).join(" ") + "...";
          break;
        case "shorter":
          resultText = selectedText.substring(0, Math.floor(selectedText.length / 2));
          break;
      }

      editor.chain().focus().deleteSelection().insertContent(resultText).run();
      setIsProcessing(false);
      setShow(false);
    }, 800);
  };

  if (!editor || !show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-[420px] sm:w-auto flex flex-wrap items-center justify-center p-1.5 gap-1 rounded-xl bg-[#1e2330]/95 backdrop-blur-md border border-indigo-500/30 shadow-[0_8px_32px_rgba(99,102,241,0.2)] overflow-hidden animate-in fade-in slide-in-from-bottom-8">
      {isProcessing ? (
        <div className="flex items-center gap-2 px-4 py-1.5 text-sm text-indigo-300 font-medium animate-pulse">
          <Sparkles className="w-4 h-4 animate-spin-slow" />
          Neural Co-Author is writing...
        </div>
      ) : (
        <>
          <div className="px-2 py-1 flex items-center gap-1.5 border-r border-white/10 mr-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-wide">AI</span>
          </div>
          
          <button 
            onClick={() => simulateAiAction("improve")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Improve
          </button>
          
          <button 
            onClick={() => simulateAiAction("shorter")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Make Shorter
          </button>

          <button 
            onClick={() => simulateAiAction("summarize")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <Type className="w-3.5 h-3.5" />
            Summarize
          </button>
        </>
      )}
    </div>
  );
}
