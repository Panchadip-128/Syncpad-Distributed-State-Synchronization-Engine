"use client";

import React, { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { ListTree, ChevronRight } from "lucide-react";

interface DocumentOutlineProps {
  editor: Editor | null;
}

interface OutlineItem {
  id: string;
  text: string;
  level: number;
  pos: number;
}

export default function DocumentOutline({ editor }: DocumentOutlineProps) {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updateOutline = () => {
      const newItems: OutlineItem[] = [];
      const transaction = editor.state.tr;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const id = `heading-${pos}`;
          // Add ID to the DOM node if it doesn't have one (for scrolling)
          // We do this by keeping a map of pos to ID and injecting it.
          // Tiptap usually requires custom extensions for IDs, so we'll just scroll to the DOM node directly.
          newItems.push({
            id,
            text: node.textContent,
            level: node.attrs.level,
            pos,
          });
        }
        return true;
      });

      setItems(newItems);
    };

    editor.on("update", updateOutline);
    // Initial populate
    updateOutline();

    return () => {
      editor.off("update", updateOutline);
    };
  }, [editor]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    
    // Tiptap coordinates to DOM node
    const domNode = editor.view.domAtPos(pos).node;
    if (domNode && domNode instanceof HTMLElement) {
      domNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (domNode && domNode.parentElement) {
      domNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!editor) return null;

  return (
    <div 
      className={`absolute left-0 top-14 bottom-8 flex flex-col transition-all duration-300 z-20 ${isOpen ? 'w-64' : 'w-0'}`}
      style={{
        background: "rgba(8,10,15,0.8)",
        borderRight: isOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-7 top-4 w-7 h-10 flex items-center justify-center rounded-r-xl transition-colors hover:bg-white/10"
        style={{
          background: "rgba(8,10,15,0.9)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderLeft: "none"
        }}
        title="Toggle Outline"
      >
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity delay-100`}>
        <div className="flex items-center gap-2 mb-4 px-2">
          <ListTree className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Outline</h3>
        </div>

        {items.length === 0 ? (
          <div className="text-xs text-slate-500 px-2 py-4 italic">
            Add headings to create a document outline.
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.pos)}
                className={`w-full text-left py-1.5 px-2 rounded-lg text-sm transition-colors hover:bg-white/5 ${
                  activeId === item.id ? 'text-indigo-400 font-medium bg-indigo-500/10' : 'text-slate-400'
                }`}
                style={{
                  paddingLeft: `${(item.level - 1) * 12 + 8}px`,
                  fontSize: item.level === 1 ? '0.875rem' : item.level === 2 ? '0.8125rem' : '0.75rem',
                }}
              >
                <span className="truncate block w-full">{item.text || 'Untitled Section'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
