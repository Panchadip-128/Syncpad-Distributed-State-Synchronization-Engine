"use client";

import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { BookOpen, Hash, Type } from "lucide-react";

interface EditorMetricsProps {
  editor: Editor | null;
}

export function EditorMetrics({ editor }: EditorMetricsProps) {
  const [words, setWords] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateMetrics = () => {
      const text = editor.getText();
      setChars(text.length);
      const wordArr = text.trim().split(/\\s+/).filter((w) => w.length > 0);
      setWords(text.trim() === "" ? 0 : wordArr.length);
    };

    // Initial calculate
    updateMetrics();

    editor.on("update", updateMetrics);

    return () => {
      editor.off("update", updateMetrics);
    };
  }, [editor]);

  if (!editor) return null;

  const readingTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div 
      className="flex items-center gap-4 px-4 py-2.5 text-xs font-medium border-t transition-opacity duration-300"
      style={{ 
        borderColor: "rgba(255,255,255,0.06)", 
        background: "rgba(0,0,0,0.15)",
        color: "#94a3b8" 
      }}
    >
      <div className="flex items-center gap-1.5" title="Word count">
        <Type className="w-3.5 h-3.5 text-indigo-400" />
        <span>{words} {words === 1 ? "word" : "words"}</span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <div className="flex items-center gap-1.5" title="Character count">
        <Hash className="w-3.5 h-3.5 text-emerald-400" />
        <span>{chars} {chars === 1 ? "character" : "characters"}</span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <div className="flex items-center gap-1.5" title="Estimated reading time">
        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
        <span>{readingTime} min read</span>
      </div>
    </div>
  );
}
