import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, Minimize2, Pencil } from "lucide-react";

// ── WhiteboardComponent ───────────────────────────────────────────────────────
//
// Renders Tldraw inside an IFRAME pointing to /whiteboard.
// The iframe gets a completely separate DOM & CSS context — zero
// possibility of our dark-mode globals leaking into Tldraw's styles.
// Communication is via window.postMessage.

function WhiteboardComponent({ node, updateAttributes }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateAttrsRef = useRef(updateAttributes);

  // Keep updateAttributes fresh via a ref
  useEffect(() => {
    updateAttrsRef.current = updateAttributes;
  }, [updateAttributes]);

  // Freeze snapshot at mount time — never re-send on every render
  const [frozenSnapshot] = useState<string | null>(() => node.attrs.snapshot ?? null);

  // Listen for messages from the iframe
  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: MessageEvent) => {
      // Only accept messages from our own iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === "whiteboard-ready") {
        // Iframe is ready — send it the saved snapshot
        if (frozenSnapshot) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "load-snapshot", snapshot: frozenSnapshot },
            "*"
          );
        }
      }

      if (event.data?.type === "save-snapshot") {
        // Iframe saved new drawing data — persist to TipTap node attributes
        updateAttrsRef.current({ snapshot: event.data.snapshot });
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isOpen, frozenSnapshot]);

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

          {/* Tldraw — rendered inside an iframe for complete CSS isolation */}
          {isOpen && (
            <iframe
              ref={iframeRef}
              src="/whiteboard"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                background: "#f8f9fa",
              }}
              title="Collaborative Whiteboard"
              allow="clipboard-read; clipboard-write"
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
