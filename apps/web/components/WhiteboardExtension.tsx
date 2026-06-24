import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Maximize2, Minimize2, Pencil } from "lucide-react";
import dynamic from "next/dynamic";

// Tldraw CSS is now imported globally at the bottom of globals.css

// Dynamic import with no SSR (Tldraw uses browser-only APIs)
const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f0ef",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #6366f1",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <span style={{ color: "#64748b", fontSize: 14 }}>
          Loading whiteboard…
        </span>
      </div>
    </div>
  ),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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
// This component is memo'd. It receives initialSnapshot ONCE and never
// re-renders from prop changes — this eliminates the draw→save→re-render→
// loadSnapshot→draw infinite loop that caused the black/white screen.

interface WhiteboardCanvasProps {
  initialSnapshot: string | null;
  onSave: (snapshot: string) => void;
}

const WhiteboardCanvas = memo(function WhiteboardCanvas({
  initialSnapshot,
  onSave,
}: WhiteboardCanvasProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);

  // Keep onSave ref current without triggering re-renders
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Stable mount handler — empty deps so it's created once only
  const handleMount = useCallback((editor: any) => {
    // Load saved snapshot once on mount
    if (initialSnapshot) {
      try {
        const parsed = JSON.parse(initialSnapshot);
        if (isTldrawSnapshot(parsed)) {
          editor.store.loadSnapshot(parsed);
        }
      } catch {
        // Corrupted or legacy format — start with a blank canvas
      }
    }

    // Debounce-save user drawing changes (1.5s) to avoid hammering Yjs/TipTap
    editor.store.listen(
      () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          try {
            const snapshot = editor.store.getSnapshot();
            onSaveRef.current(JSON.stringify(snapshot));
          } catch {
            /* serialisation failure — ignore */
          }
        }, 1500);
      },
      { source: "user", scope: "document" }
    );
  }, []); // intentionally empty — handleMount must be stable

  // Use position:absolute + inset:0 so Tldraw fills the container and its
  // toolbar overlays render correctly regardless of parent layout.
  // All styles are inline to bypass our global Tailwind/dark-mode CSS.
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        // Tldraw is a light-mode tool — override our dark html.dark CSS cascade
        colorScheme: "light",
        // Explicitly unset CSS custom properties that our @theme overrides,
        // which Tldraw also uses internally (e.g. --color-background).
        // Using "initial" makes custom props revert to Tldraw's own CSS values.
      }}
      className="tldraw-isolation-root"
    >
      <Tldraw onMount={handleMount} />
    </div>
  );
});

// ── WhiteboardComponent ───────────────────────────────────────────────────────

function WhiteboardComponent({ node, updateAttributes }: any) {
  const [isOpen, setIsOpen] = useState(false);

  // Freeze the snapshot at mount time — never pass updated node.attrs.snapshot
  // down to WhiteboardCanvas to avoid triggering re-render/reload loops.
  const [frozenSnapshot] = useState<string | null>(() => node.attrs.snapshot ?? null);

  // Keep updateAttributes fresh via a ref (updated in useEffect, not render)
  const updateAttrsRef = useRef(updateAttributes);
  useEffect(() => {
    updateAttrsRef.current = updateAttributes;
  }, [updateAttributes]);

  const handleSave = useCallback((snapshot: string) => {
    updateAttrsRef.current({ snapshot });
  }, []);

  return (
    <NodeViewWrapper as="div" style={{ margin: "24px 0" }}>
      <div
        style={{
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          background: "#0d1117",
        }}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "rgba(30,36,51,0.97)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pencil style={{ width: 14, height: 14, color: "#818cf8" }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#e2e8f0",
              }}
            >
              Collaborative Whiteboard
            </span>
            {isOpen && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(99,102,241,0.2)",
                  color: "#a5b4fc",
                  fontWeight: 500,
                }}
              >
                Live
              </span>
            )}
          </div>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsOpen((v) => !v)}
            style={{
              padding: "6px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
            }}
            title={isOpen ? "Minimise" : "Expand whiteboard"}
          >
            {isOpen ? (
              <Minimize2 style={{ width: 16, height: 16 }} />
            ) : (
              <Maximize2 style={{ width: 16, height: 16 }} />
            )}
          </button>
        </div>

        {/* ── Canvas area ──────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            height: isOpen ? 620 : 220,
            transition: "height 0.3s ease",
            background: "#1e2433",
            overflow: "hidden",
          }}
        >
          {/* Collapsed: click-to-open overlay */}
          {!isOpen && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  color: "#a5b4fc",
                  fontWeight: 600,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Pencil style={{ width: 14, height: 14 }} />
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
