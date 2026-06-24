"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

/**
 * Standalone whiteboard page — rendered inside an iframe from the editor.
 * This page has NO dark theme, NO Tailwind, NO globals.css — just pure Tldraw.
 * Communication with the parent editor happens via window.postMessage.
 */

function isTldrawSnapshot(val: unknown): val is { store: unknown; schema: unknown } {
  return (
    typeof val === "object" &&
    val !== null &&
    "store" in val &&
    "schema" in val
  );
}

export default function WhiteboardPage() {
  const editorRef = useRef<any>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  // Listen for snapshot data from the parent frame
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "load-snapshot" && editorRef.current && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        try {
          const parsed = JSON.parse(event.data.snapshot);
          if (isTldrawSnapshot(parsed)) {
            editorRef.current.store.loadSnapshot(parsed);
          }
        } catch {
          // Corrupted snapshot — start blank
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleMount = useCallback((editor: any) => {
    editorRef.current = editor;

    // Tell the parent we're ready to receive the snapshot
    window.parent.postMessage({ type: "whiteboard-ready" }, "*");

    // Save changes back to parent via postMessage (debounced)
    editor.store.listen(
      () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          try {
            const snapshot = editor.store.getSnapshot();
            window.parent.postMessage(
              { type: "save-snapshot", snapshot: JSON.stringify(snapshot) },
              "*"
            );
          } catch {
            /* serialisation failure — ignore */
          }
        }, 1500);
      },
      { source: "user", scope: "document" }
    );
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f8f9fa",
        colorScheme: "light",
      }}
    >
      <Tldraw onMount={handleMount} />
    </div>
  );
}
