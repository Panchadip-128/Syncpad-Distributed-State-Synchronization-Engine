import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";

import "tldraw/tldraw.css"; // required for Tldraw UI

class TldrawErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("Tldraw crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-xl border border-red-500/30 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-red-400 mb-1">Whiteboard Render Error</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            The drawing data could not be loaded because it may be corrupted or from an older version.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition-colors"
          >
            Reset Whiteboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function TldrawEditorWrapper({
  initialSnapshotStr,
  onChange
}: {
  initialSnapshotStr: string | null;
  onChange: (snapshot: string) => void;
}) {
  const [editor, setEditor] = useState<any>(null);
  const localUpdateInProgressRef = useRef(false);
  const isInternalUpdateRef = useRef(false);

  const handleMount = useCallback((app: any) => {
    setEditor(app);
    if (initialSnapshotStr) {
      try {
        const parsed = JSON.parse(initialSnapshotStr);
        if (parsed && typeof parsed === 'object') {
          if (parsed.elements || parsed.type === 'excalidraw' || (!parsed.store && !Array.isArray(parsed))) {
            return;
          }
          isInternalUpdateRef.current = true;
          try {
            app.store.loadSnapshot(parsed);
          } catch(e) {}
          setTimeout(() => { isInternalUpdateRef.current = false; }, 50);
        }
      } catch (e) {}
    }
  }, [initialSnapshotStr]);

  // Listen for local drawing changes
  useEffect(() => {
    if (!editor) return;

    let timeoutId: NodeJS.Timeout;
    
    const unlisten = editor.store.listen(
      (entry: any) => {
        // Prevent infinite loops during remote merges
        if (isInternalUpdateRef.current || entry.source !== 'user') return;
        
        localUpdateInProgressRef.current = true;
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          try {
            const snapshot = editor.store.getSnapshot();
            onChange(JSON.stringify(snapshot));
          } catch (e) {} finally {
            setTimeout(() => { localUpdateInProgressRef.current = false; }, 500);
          }
        }, 1000); 
      },
      { source: 'user', scope: 'document' }
    );

    return () => {
      unlisten();
      clearTimeout(timeoutId);
    };
  }, [editor, onChange]);

  // Handle incoming remote changes from TipTap/Yjs
  useEffect(() => {
    // Only load remote changes if the user is not actively drawing
    if (!editor || localUpdateInProgressRef.current) return;
    
    if (initialSnapshotStr) {
      try {
        const parsed = JSON.parse(initialSnapshotStr);
        if (parsed && typeof parsed === 'object') {
          if (parsed.elements || parsed.type === 'excalidraw' || (!parsed.store && !Array.isArray(parsed))) {
            return; // Ignore corrupted or Excalidraw snapshots
          }
          isInternalUpdateRef.current = true;
          try {
            editor.store.loadSnapshot(parsed);
          } catch(e) {}
          setTimeout(() => { isInternalUpdateRef.current = false; }, 50);
        }
      } catch (e) {}
    }
  }, [initialSnapshotStr, editor]);

  return (
    <div className="w-full h-full relative" style={{ zIndex: 1 }}>
      <TldrawErrorBoundary>
        <Tldraw onMount={handleMount} />
      </TldrawErrorBoundary>
    </div>
  );
}

function WhiteboardComponent({ node, updateAttributes }: any) {
  const [isOpen, setIsOpen] = useState(false);

  // Debounced update to TipTap to prevent history bloat
  const handleSave = useCallback((newSnapshotStr: string) => {
    // Only update TipTap attributes if they actually changed
    updateAttributes({
      snapshot: newSnapshotStr
    });
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="whiteboard-block-wrapper my-6 border border-slate-700/50 rounded-xl overflow-hidden bg-[#0d1117] shadow-xl">
      {/* Header bar */}
      <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700/50 flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
          <span className="text-sm font-semibold text-slate-200">Collaborative Whiteboard</span>
          {!isOpen && (
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to open
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
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
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-lg font-medium shadow-xl">
              Click to Interact
            </span>
          </div>
        )}

        {isOpen && <TldrawEditorWrapper initialSnapshotStr={node.attrs.snapshot || null} onChange={handleSave} />}
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
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="whiteboard"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'whiteboard' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardComponent);
  },
});
