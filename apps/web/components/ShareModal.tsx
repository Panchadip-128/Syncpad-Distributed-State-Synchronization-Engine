"use client";

import { useState } from "react";
import { Share2, Copy, Check, X, UserPlus } from "lucide-react";

export function ShareModal({
  isOpen,
  onClose,
  documentId,
}: {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState("Editor");

  if (!isOpen) return null;

  const link = typeof window !== "undefined" ? `${window.location.origin}/doc/${documentId}` : `/doc/${documentId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-[480px] rounded-2xl bg-[#0f1115] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">Share Document</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Invite with link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl focus-within:border-indigo-500/50 transition-colors">
                <input 
                  readOnly 
                  value={link} 
                  className="bg-transparent w-full text-sm text-gray-300 focus:outline-none selection:bg-indigo-500/30"
                />
              </div>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Link access</label>
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Anyone with link</p>
                  <p className="text-xs text-gray-400">Can view and join the workspace</p>
                </div>
              </div>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-black/40 border border-white/10 text-sm text-white rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500"
              >
                <option>Viewer</option>
                <option>Editor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
