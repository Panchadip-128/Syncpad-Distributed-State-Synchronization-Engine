"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { AiBubbleMenu } from "./AiBubbleMenu";
import "./editor.css";

interface EditorProps {
  provider: HocuspocusProvider;
  yDoc: Y.Doc;
  userName?: string;
  userColor?: string;
  onEditorReady?: (editor: any) => void;
}

export default function Editor({
  provider,
  yDoc,
  userName = "Anonymous",
  userColor = "#6366f1",
  onEditorReady,
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Collaboration extension handles history
        // @ts-ignore: Tiptap types might not have history in this version
        history: false,
      }),
      Collaboration.configure({ document: yDoc }),
      CollaborationCaret.configure({
        provider,
        user: { name: userName, color: userColor },
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-lg max-w-none focus:outline-none min-h-[60vh] leading-relaxed",
        spellcheck: "true",
      },
    },
    onCreate: ({ editor }) => {
      if (onEditorReady) onEditorReady(editor);
    },
  });

  return (
    <div className="editor-focus-ring rounded-2xl overflow-hidden" style={{
      background: "rgba(13,17,23,0.6)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      {/* Toolbar */}
      {editor && (
        <div
          className="flex items-center gap-1 px-4 py-2.5 flex-wrap"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Text format group */}
          <div className="flex items-center gap-0.5">
            <ToolbarBtn
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3.744h-.753v8.25h7.125a4.125 4.125 0 000-8.25H6.75zM6 16.5h6.75a4.5 4.5 0 000-9H6.75v9H6z"/>
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/>
                <line x1="15" y1="4" x2="9" y2="20"/>
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Inline code"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </ToolbarBtn>
          </div>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Heading group */}
          <div className="flex items-center gap-0.5">
            {([1, 2, 3] as const).map((level) => (
              <ToolbarBtn
                key={level}
                active={editor.isActive("heading", { level })}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                title={`Heading ${level}`}
              >
                <span className="text-[10px] font-bold">H{level}</span>
              </ToolbarBtn>
            ))}
          </div>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* List group */}
          <div className="flex items-center gap-0.5">
            <ToolbarBtn
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet list"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/>
                <line x1="9" y1="18" x2="20" y2="18"/>
                <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered list"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/>
                <line x1="10" y1="18" x2="21" y2="18"/>
                <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
              </svg>
            </ToolbarBtn>
            <ToolbarBtn
              active={false}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Divider"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <line x1="3" y1="12" x2="21" y2="12"/>
              </svg>
            </ToolbarBtn>
          </div>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Code block */}
          <ToolbarBtn
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/>
            </svg>
          </ToolbarBtn>
        </div>
      )}

      {/* Editor content */}
      <div className="px-8 py-8">
        <EditorContent editor={editor} />
        {editor && <AiBubbleMenu editor={editor} />}
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all"
      style={{
        color: active ? "#818cf8" : "#64748b",
        background: active ? "rgba(99,102,241,0.15)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1";
        (e.currentTarget as HTMLButtonElement).style.background = active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = active ? "#818cf8" : "#64748b";
        (e.currentTarget as HTMLButtonElement).style.background = active ? "rgba(99,102,241,0.15)" : "transparent";
      }}
    >
      {children}
    </button>
  );
}
