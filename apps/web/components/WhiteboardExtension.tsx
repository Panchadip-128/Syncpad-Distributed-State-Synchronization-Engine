import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Maximize2, Minimize2, Pencil } from "lucide-react";
import dynamic from "next/dynamic";

// Import Tldraw CSS so Turbopack bundles it in production (prevents black canvas on Vercel)
import "tldraw/tldraw.css";

// Dynamic import — no SSR (Tldraw uses window APIs)
const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1f2733]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading whiteboard…</span>
      </div>
    </div>
  ),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true only if the JSON looks like a real Tldraw v2/v3 snapshot */
function isTldrawSnapshot(val: unknown): val is { store: unknown; schema: unknown } {
  return (
    typeof val === "object" &&
    val !== null &&
    "store" in val &&
    "schema" in val
  );
}

// ── WhiteboardCanvas ──────────────────────────────────────────────────────────
//
// KEY DESIGN: this component is React.memo'd and only receives
// `initialSnapshot` once (at open-time). It never re-renders from snapshot
// prop changes, which eliminates the draw→save→re-render→loadSnapshot→draw
// loop that caused the Vercel black screen.

interface WhiteboardCanvasProps {
  initialSnapshot: string | null;
  onSave: (snapshot: string) => void;
}

const WhiteboardCanvas = memo(function WhiteboardCanvas({
  initialSnapshot,
  onSave,
}: WhiteboardCanvasProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep onSave up-to-date inside the store listener without re-subscribing.
  // We update this ref inside a useEffect (not during render) to satisfy
  // the React Compiler's react-hooks/refs rule.
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // handleMount is created once (empty deps) and handed to Tldraw.
  // Tldraw only calls it once on mount, so this is safe.
  const handleMount = useCallback(
    (editor: any) => {
      // 1. Load saved snapshot once on mount
      if (initialSnapshot) {
        try {
          const parsed = JSON.parse(initialSnapshot);
          if (isTldrawSnapshot(parsed)) {
            editor.store.loadSnapshot(parsed);
          }
        } catch {
          // Corrupted / legacy format — start with blank canvas
        }
      }

      // 2. Subscribe to user drawing events and debounce-save.
      //    We do NOT call loadSnapshot on every onSave, which prevents the loop.
      editor.store.listen(
        () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            try {
              const snapshot = editor.store.getSnapshot();
              onSaveRef.current(JSON.stringify(snapshot));
            } catch {
              // serialisation failed — ignore silently
            }
          }, 1500); // 1.5 s debounce — safe for Yjs/TipTap
        },
        { source: "user", scope: "document" }
      );
    },
    []
    // Empty deps is intentional: handleMount must be stable so Tldraw
    // doesn't re-call it. initialSnapshot is captured via closure at mount
    // time only (that is the desired behaviour).
  );

  return (
    <div className="w-full h-full" style={{ colorScheme: "light" }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
});

// ── WhiteboardComponent ───────────────────────────────────────────────────────

function WhiteboardComponent({ node, updateAttributes }: any) {
  const [isOpen, setIsOpen] = useState(false);

  // Capture the snapshot at the moment the whiteboard is first opened.
  // Using useState (not ref) because this value is only read in JSX,
  // which satisfies the react-hooks/refs rule.
  const [frozenSnapshot] = useState<string | null>(() => node.attrs.snapshot ?? null);

  // Keep updateAttributes fresh without triggering re-mounts of WhiteboardCanvas.
  // We update this ref inside a useEffect (not during render).
  const updateAttrsRef = useRef(updateAttributes);
  useEffect(() => {
    updateAttrsRef.current = updateAttributes;
  }, [updateAttributes]);

  const handleSave = useCallback((snapshot: string) => {
    updateAttrsRef.current({ snapshot });
  }, []);

  return (
    <NodeViewWrapper
      as="div"
      className="whiteboard-wrapper my-6 rounded-xl overflow-hidden shadow-2xl"
      style={{ border: "1px solid rgba(99,102,241,0.25)" }}
    >
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: "rgba(30,36,51,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Pencil className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">
            Collaborative Whiteboard
          </span>
          {isOpen && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-medium">
              Live
            </span>
          )}
        </div>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setIsOpen((v) => !v)}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title={isOpen ? "Minimise" : "Open whiteboard"}
        >
          {isOpen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Canvas area ────────────────────────────────────────────────── */}
      <div
        className={`relative transition-[height] duration-300 ease-in-out ${
          isOpen ? "h-[620px]" : "h-[220px]"
        }`}
        style={{ background: "#1f2733" }}
      >
        {/* Collapsed overlay — click to open */}
        {!isOpen && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsOpen(true)}
            className="absolute inset-0 w-full h-full flex items-center justify-center"
          >
            <span
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-indigo-300"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              <Pencil className="inline w-4 h-4 mr-2 -mt-0.5" />
              Click to open whiteboard
            </span>
          </button>
        )}

        {/* Tldraw — only mounted when open */}
        {isOpen && (
          <WhiteboardCanvas
            initialSnapshot={frozenSnapshot}
            onSave={handleSave}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ── TipTap Extension ──────────────────────────────────────────────────────────

export const WhiteboardExtension = Node.create({
  name: "whiteboard",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      snapshot: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="whiteboard"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "whiteboard" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardComponent);
  },
});
