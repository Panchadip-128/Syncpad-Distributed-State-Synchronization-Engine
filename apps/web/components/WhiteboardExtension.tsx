"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Maximize2, Minimize2, PenTool, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Excalidraw to prevent SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

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
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  // Debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateAttributesRef = useRef(updateAttributes);
  // Keep track of the last broadcasted string to avoid infinite loops
  const lastSavedSnapshotStrRef = useRef("");
  const isRemoteUpdateRef = useRef(false);

  const [myEditorId] = useState(() => Math.random().toString(36).slice(2));
  
  useEffect(() => {
    updateAttributesRef.current = updateAttributes;
  }, [updateAttributes]);

  // Handle incoming remote updates
  useEffect(() => {
    if (!excalidrawAPI || !node.attrs.snapshot) return;
    
    // Ignore updates that we originally authored
    if (node.attrs.lastEditorId === myEditorId.current) return;

    try {
      const remoteSnapshotStr = typeof node.attrs.snapshot === 'string' 
        ? node.attrs.snapshot 
        : JSON.stringify(node.attrs.snapshot);

      if (remoteSnapshotStr !== lastSavedSnapshotStrRef.current) {
        lastSavedSnapshotStrRef.current = remoteSnapshotStr;
        isRemoteUpdateRef.current = true;
        
        const parsed = typeof node.attrs.snapshot === 'string' 
          ? JSON.parse(node.attrs.snapshot) 
          : node.attrs.snapshot;
        
        // Handle gracefully if the snapshot is an array (our new format)
        // or if it happens to be Tldraw's old format (which we'll just ignore or try to salvage)
        let elements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
        
        // If it's a completely different format (like tldraw), just reset to empty to avoid crashing Excalidraw
        if (!Array.isArray(elements)) {
          elements = [];
        }

        if (elements && Array.isArray(elements)) {
          excalidrawAPI.updateScene({ elements });
        }
      }
    } catch (err) {
      console.error("Error syncing remote whiteboard snapshot:", err);
    } finally {
      // Excalidraw's onChange is sometimes async or deferred, so we pad the reset
      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 50);
    }
  }, [node.attrs.snapshot, node.attrs.lastEditorId, excalidrawAPI]);

  // Handle local changes
  const onChange = useCallback((elements: readonly any[], appState: any) => {
    if (isRemoteUpdateRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const snapshotStr = JSON.stringify(elements);

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

  const handleToggleOpen = async () => {
    setIsOpen(!isOpen);
  };

  const handleResetView = () => {
    if (excalidrawAPI) {
      excalidrawAPI.resetScene();
    }
  };

  // Prepare initial data once
  const [initialData] = useState(() => {
    let initialElements: any[] = [];
    if (node.attrs.snapshot) {
      try {
        const parsed = typeof node.attrs.snapshot === 'string' 
          ? JSON.parse(node.attrs.snapshot) 
          : node.attrs.snapshot;
          
        const elements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
        initialElements = Array.isArray(elements) ? elements : [];
      } catch (e) {
        initialElements = [];
      }
    }
    return { elements: initialElements };
  });

  useEffect(() => {
    lastSavedSnapshotStrRef.current = typeof node.attrs.snapshot === 'string' 
      ? node.attrs.snapshot 
      : JSON.stringify(node.attrs.snapshot);
  }, []);

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

        {/* Render Excalidraw Editor */}
        <div className="w-full h-full relative" style={{ backgroundColor: "#121212" }}>
          <WhiteboardErrorBoundary>
            <Excalidraw 
              excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
              initialData={initialData}
              onChange={onChange}
              theme="dark"
            />
          </WhiteboardErrorBoundary>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const WhiteboardExtension = Node.create({
  name: "whiteboard",
  group: "block",
  atom: true,

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
