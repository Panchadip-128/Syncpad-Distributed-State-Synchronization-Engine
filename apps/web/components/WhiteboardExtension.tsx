"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Maximize2, Minimize2, PenTool, RefreshCw } from "lucide-react";
import { Tldraw, Editor as TldrawEditor, getSnapshot, createTLStore, defaultShapeUtils, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

class WhiteboardErrorBoundary extends React.Component<any, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Whiteboard crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-950/20 text-red-400 p-6 overflow-auto">
          <h2 className="text-lg font-bold mb-2">Whiteboard Crashed</h2>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-black/50 p-4 rounded-md border border-red-900/50 max-w-full">
            {this.state.error?.message || "Unknown error"}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-800/50 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function WhiteboardBlock({ node, updateAttributes }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const tldrawEditorRef = useRef<TldrawEditor | null>(null);

  // Track remote change flag to avoid infinite loops
  const isRemoteChange = useRef(false);

  // Track the stringified representation of the last saved snapshot to detect actual changes
  const lastSavedSnapshotStrRef = useRef("");

  // Debounced save: persists snapshot + renders a preview image into node attrs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateAttributesRef = useRef(updateAttributes);
  const myEditorId = useRef(Math.random().toString(36).slice(2));
  
  useEffect(() => {
    updateAttributesRef.current = updateAttributes;
  }, [updateAttributes]);

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const tldrawEditor = tldrawEditorRef.current;
      if (!tldrawEditor) return;

      try {
        const snapshot = getSnapshot(tldrawEditor.store);
        const snapshotStr = JSON.stringify(snapshot);

        // Skip if nothing actually changed
        if (snapshotStr === lastSavedSnapshotStrRef.current) return;
        lastSavedSnapshotStrRef.current = snapshotStr;

        updateAttributesRef.current({
          snapshot: snapshotStr,
          lastEditorId: myEditorId.current,
        });
      } catch (err) {
        console.error("Failed to save whiteboard snapshot:", err);
      }
    }, 600);
  }, []);

  // Initialize the Tldraw store only on the client side to prevent Next.js SSR/hydration crashes
  const [store, setStore] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Only run on the client
    if (typeof window === "undefined") return;

    try {
      const newStore = createTLStore({ shapeUtils: defaultShapeUtils });
      if (node.attrs.snapshot) {
        const parsed = typeof node.attrs.snapshot === 'string' ? JSON.parse(node.attrs.snapshot) : node.attrs.snapshot;
        if (parsed && parsed.document) {
          loadSnapshot(newStore, parsed);
        }
        lastSavedSnapshotStrRef.current = typeof node.attrs.snapshot === 'string' ? node.attrs.snapshot : JSON.stringify(node.attrs.snapshot);
      }
      setStore(newStore);
    } catch (err: any) {
      console.error("Error creating Tldraw store:", err);
      setInitError(err.message || String(err));
    }
  }, []);

  // Handle initialization/mounting of the Tldraw editor instance
  const handleMount = useCallback(
    (tldrawEditor: TldrawEditor) => {
      tldrawEditorRef.current = tldrawEditor;

      // Listen to local user changes
      const cleanup = tldrawEditor.store.listen(() => {
        if (isRemoteChange.current) return;
        scheduleSave();
      });

      return () => {
        cleanup();
        tldrawEditorRef.current = null;
      };
    },
    [scheduleSave]
  );

  // Sync incoming changes from remote collaborators via TipTap/Yjs attributes
  useEffect(() => {
    const tldrawEditor = tldrawEditorRef.current;
    if (!tldrawEditor || !node.attrs.snapshot) return;
    
    // Ignore updates that we originally authored (echoed back by Yjs)
    if (node.attrs.lastEditorId === myEditorId.current) return;

    try {
      const remoteSnapshotStr = typeof node.attrs.snapshot === 'string' ? node.attrs.snapshot : JSON.stringify(node.attrs.snapshot);
      if (remoteSnapshotStr !== lastSavedSnapshotStrRef.current) {
        isRemoteChange.current = true;
        const parsed = typeof node.attrs.snapshot === 'string' ? JSON.parse(node.attrs.snapshot) : node.attrs.snapshot;
        
        if (parsed && parsed.document) {
          const currentSnap = getSnapshot(tldrawEditor.store);
          loadSnapshot(tldrawEditor.store, {
            document: parsed.document,
            session: currentSnap.session,
          });
        }
        lastSavedSnapshotStrRef.current = remoteSnapshotStr;
      }
    } catch (err) {
      console.error("Error syncing remote whiteboard snapshot:", err);
    } finally {
      isRemoteChange.current = false;
    }
  }, [node.attrs.snapshot, node.attrs.lastEditorId]);

  const handleToggleOpen = async () => {
    if (isOpen) {
      const tldrawEditor = tldrawEditorRef.current;
      if (tldrawEditor) {
        try {
          const shapeIds = [...tldrawEditor.getCurrentPageShapeIds()];
          if (shapeIds.length > 0) {
            const result = await tldrawEditor.toImageDataUrl(shapeIds, {
              format: "png",
              background: true,
              padding: 16,
              scale: 1.5,
            });
            if (result && result.url) {
              updateAttributesRef.current({ previewImage: result.url });
            }
          }
        } catch (e) {
          console.warn("Preview generation failed on close", e);
        }
      }
    }
    setIsOpen(!isOpen);
  };

  // Reset viewport zoom and scroll
  const handleResetView = () => {
    const tldrawEditor = tldrawEditorRef.current;
    if (tldrawEditor) {
      tldrawEditor.resetZoom();
    }
  };

  return (
    <NodeViewWrapper className="whiteboard-block-wrapper my-6 border border-slate-700/50 rounded-xl overflow-hidden bg-[#0d1117] shadow-xl">
      {/* Header */}
      <div className="px-4 py-2 bg-slate-800/50 flex items-center justify-between border-b border-slate-700/50 select-none">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-200">Collaborative Whiteboard</span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={handleResetView}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset View"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleToggleOpen}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            title={isOpen ? "Minimize Whiteboard" : "Maximize Whiteboard"}
          >
            {isOpen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        className={`transition-all duration-300 ease-in-out ${isOpen ? "h-[600px]" : "h-[300px]"} relative group`}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
      >
        {!isOpen && (
          <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-lg font-medium shadow-xl">
              Click to Interact
            </span>
          </div>
        )}

        {/* Render Tldraw Editor */}
        <div className="w-full h-full bg-[#1e1e1e] relative">
          <link rel="stylesheet" href="https://unpkg.com/tldraw@5.1.1/tldraw.css" />
          <WhiteboardErrorBoundary>
            {initError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-red-400 bg-red-950/20 p-4">
                <span className="font-bold mb-2">Failed to initialize whiteboard:</span>
                <span className="text-xs font-mono bg-black/50 p-2 rounded max-w-full overflow-hidden text-ellipsis">{initError}</span>
              </div>
            ) : store ? (
              <Tldraw store={store} onMount={handleMount} autoFocus={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">Loading Whiteboard...</div>
            )}
          </WhiteboardErrorBoundary>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const WhiteboardExtension = Node.create({
  name: "whiteboard",
  group: "block",
  atom: true, // Mark as block atom so TipTap handles it as a unit

  addAttributes() {
    return {
      snapshot: {
        default: null,
      },
      previewImage: {
        default: null,
      },
      lastEditorId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "whiteboard-block",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["whiteboard-block", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardBlock);
  },
});
