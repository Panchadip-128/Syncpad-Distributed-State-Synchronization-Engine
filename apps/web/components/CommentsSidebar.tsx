"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { Editor } from "@tiptap/react";
import { MessageSquare, Check, Trash2 } from "lucide-react";

interface CommentData {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  resolved: boolean;
}

interface CommentsSidebarProps {
  editor: Editor | null;
  yDoc: Y.Doc;
  userName?: string;
}

export function CommentsSidebar({ editor, yDoc, userName = "Anonymous" }: CommentsSidebarProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    const commentsMap = yDoc.getMap<CommentData>("comments");

    const updateComments = () => {
      const allComments = Array.from(commentsMap.values());
      // Sort by timestamp (oldest first, like a thread)
      allComments.sort((a, b) => a.timestamp - b.timestamp);
      setComments(allComments);
    };

    commentsMap.observe(updateComments);
    updateComments(); // initial load

    return () => {
      commentsMap.unobserve(updateComments);
    };
  }, [yDoc]);

  // Listen to editor selection to highlight active comment
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { $from } = editor.state.selection;
      const marks = $from.marks();
      const commentMark = marks.find((m) => m.type.name === "comment");
      
      if (commentMark) {
        setActiveCommentId(commentMark.attrs.commentId);
        // If clicking on an empty comment, don't reset text if already typing
        const existingComment = yDoc.getMap<CommentData>("comments").get(commentMark.attrs.commentId);
        if (existingComment && existingComment.text === "") {
            // Keep typing
        }
      } else {
        setActiveCommentId(null);
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, yDoc]);

  const handleResolve = (id: string) => {
    const commentsMap = yDoc.getMap<CommentData>("comments");
    const comment = commentsMap.get(id);
    if (comment) {
      commentsMap.set(id, { ...comment, resolved: true });
    }
    if (editor) editor.chain().focus().unsetComment(id).run();
  };

  const handleDelete = (id: string) => {
    const commentsMap = yDoc.getMap<CommentData>("comments");
    commentsMap.delete(id);
    if (editor) editor.chain().focus().unsetComment(id).run();
  };

  const handleSaveEdit = (id: string) => {
    const commentsMap = yDoc.getMap<CommentData>("comments");
    const comment = commentsMap.get(id);
    if (comment && newCommentText.trim()) {
      commentsMap.set(id, { ...comment, text: newCommentText.trim() });
      setNewCommentText("");
    }
  };

  const handleCommentClick = (id: string) => {
    // Focus the editor on the comment highlight
    // This is complex, so we'll just set it as active
    setActiveCommentId(id);
  };

  return (
    <div className="w-80 h-full flex flex-col shrink-0 border-l animate-in slide-in-from-right-4 duration-300" style={{ background: "rgba(8,10,15,0.95)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="h-14 flex items-center gap-2 px-4 shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <MessageSquare className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold text-white">Comments</span>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
          {comments.filter((c) => !c.resolved).length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {comments.filter((c) => !c.resolved).length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-10">
            No active comments.
            <br />
            <span className="text-xs">Highlight text and click &quot;Comment&quot; to add one.</span>
          </div>
        ) : (
          comments
            .filter((c) => !c.resolved)
            .map((comment) => (
              <div
                key={comment.id}
                onClick={() => handleCommentClick(comment.id)}
                className={`p-3 rounded-xl border transition-all cursor-default ${
                  activeCommentId === comment.id
                    ? "border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">{comment.author}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResolve(comment.id); }}
                      className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                      title="Resolve"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {comment.text === "" && activeCommentId === comment.id ? (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                    <textarea
                      autoFocus
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 resize-none"
                      rows={3}
                      placeholder="Type your comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit(comment.id);
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!newCommentText.trim()}
                        className="px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {comment.text || <span className="italic text-slate-500">Empty comment...</span>}
                  </p>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
