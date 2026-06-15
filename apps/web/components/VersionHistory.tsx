"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

interface VersionHistoryProps {
  documentId: string;
  provider: HocuspocusProvider | null;
}

export default function VersionHistory({ documentId, provider }: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null); // snapshotId
  const [replayProgress, setReplayProgress] = useState(0); // 0-100

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const data = await fetchApi(`/docs/${documentId}/snapshots`);
      setSnapshots(data);
    } catch (err) {
      console.error("Failed to load snapshots", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadSnapshots();
  }, [isOpen, documentId]);

  const handleRestore = async (snapshotId: string) => {
    if (!provider) return;
    setActiveAction(snapshotId);
    try {
      const detail = await fetchApi(`/docs/${documentId}/snapshots/${snapshotId}`);
      const binaryString = window.atob(detail.content_b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      Y.applyUpdate(provider.document, bytes);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to restore snapshot", err);
    } finally {
      setActiveAction(null);
    }
  };

  const handleReplay = async (snapshotId: string) => {
    if (!provider) return;
    setActiveAction(snapshotId);
    setReplayProgress(0);
    setIsOpen(false);

    try {
      const detail = await fetchApi(`/docs/${documentId}/snapshots/${snapshotId}`);
      const binaryString = window.atob(detail.content_b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const tempDoc = new Y.Doc();
      Y.applyUpdate(tempDoc, bytes);
      const xml = tempDoc.getXmlFragment("default");
      let fullText = "";
      const traverse = (node: any) => {
        if (node.constructor.name === "YXmlElement") {
          node.toArray().forEach(traverse);
          fullText += "\n";
        } else if (node.constructor.name === "YXmlText") {
          fullText += node.toString();
        }
      };
      traverse(xml);

      // Clear & reset editor
      const currentXml = provider.document.getXmlFragment("default");
      currentXml.delete(0, currentXml.length);
      const p = new Y.XmlElement("p");
      const textNode = new Y.XmlText();
      p.insert(0, [textNode]);
      currentXml.insert(0, [p]);

      let i = 0;
      const total = fullText.length;
      const interval = setInterval(() => {
        if (i >= total) {
          clearInterval(interval);
          setActiveAction(null);
          setReplayProgress(100);
          setTimeout(() => setReplayProgress(0), 1000);
          return;
        }
        provider.document.transact(() => {
          if (fullText[i] === "\n") {
            const newP = new Y.XmlElement("p");
            const newText = new Y.XmlText();
            newP.insert(0, [newText]);
            currentXml.insert(currentXml.length, [newP]);
          } else {
            const lastNode = currentXml.get(currentXml.length - 1) as Y.XmlElement;
            const lastText = lastNode?.get(lastNode.length - 1) as Y.XmlText;
            if (lastText) lastText.insert(lastText.length, fullText[i]);
          }
        });
        i++;
        setReplayProgress(Math.round((i / total) * 100));
      }, 40);
    } catch (err) {
      console.error("Failed to replay snapshot", err);
      setActiveAction(null);
    }
  };

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <>
      {/* Replay progress bar */}
      {replayProgress > 0 && replayProgress < 100 && (
        <div className="fixed top-14 left-0 right-0 z-50 h-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${replayProgress}%`,
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            }}
          />
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{
          color: "#94a3b8",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span className="hidden sm:inline">History</span>
      </button>

      {/* Drawer / Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
          onClick={() => setIsOpen(false)}
        >
          {/* Side panel */}
          <div
            className="ml-auto h-full w-full max-w-md flex flex-col animate-slide-in-r"
            style={{
              background: "rgba(8,10,15,0.98)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="h-14 flex items-center justify-between px-5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">Version History</h2>
                  <p className="text-[11px] text-slate-500">CRDT snapshots</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-white/5 p-4 shimmer h-20" />
                  ))}
                </div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/8 flex items-center justify-center mx-auto mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">No snapshots yet</p>
                  <p className="text-xs text-slate-500">Documents are auto-snapshotted as you type.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-600 font-medium uppercase tracking-wider mb-4">
                    {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} stored
                  </p>
                  {snapshots.map((snap, idx) => (
                    <div
                      key={snap.id}
                      className="relative pl-7 timeline-item"
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute left-0 top-3 w-5 h-5 rounded-full flex items-center justify-center border"
                        style={{
                          background: idx === 0 ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                          borderColor: idx === 0 ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        {idx === 0 ? (
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        )}
                      </div>

                      {/* Card */}
                      <div
                        className="rounded-xl p-4 border group transition-all hover:border-indigo-500/30"
                        style={{
                          background: idx === 0 ? "rgba(99,102,241,0.06)" : "rgba(13,17,23,0.6)",
                          borderColor: idx === 0 ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.07)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">{formatDate(snap.created_at)}</span>
                              {idx === 0 && (
                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded-full">
                                  Latest
                                </span>
                              )}
                            </div>
                            {snap.preview && (
                              <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">&ldquo;{snap.preview}&rdquo;</p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleReplay(snap.id)}
                            disabled={activeAction !== null}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                            style={{
                              color: "#818cf8",
                              background: "rgba(99,102,241,0.1)",
                              border: "1px solid rgba(99,102,241,0.2)",
                            }}
                          >
                            {activeAction === snap.id ? (
                              <>
                                <span className="typing-dot" style={{ color: "#818cf8" }} />
                                <span className="typing-dot" style={{ color: "#818cf8" }} />
                                <span className="typing-dot" style={{ color: "#818cf8" }} />
                              </>
                            ) : (
                              <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                  <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                Replay
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRestore(snap.id)}
                            disabled={activeAction !== null}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                            style={{
                              color: "#94a3b8",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/>
                            </svg>
                            Restore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-[11px] text-slate-600 text-center">
                Snapshots encode full Yjs binary state — <span className="text-indigo-500">CRDT merge-safe</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
