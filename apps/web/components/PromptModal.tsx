import React, { useState, useEffect, useRef } from "react";

type PromptRequest = {
  title: string;
  placeholder?: string;
  resolve: (val: string | null) => void;
};

let globalPromptRequest: ((req: PromptRequest) => void) | null = null;

export const showPrompt = (title: string, placeholder?: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (globalPromptRequest) {
      globalPromptRequest({ title, placeholder, resolve });
    } else {
      resolve(null);
    }
  });
};

export function GlobalPromptModal() {
  const [req, setReq] = useState<PromptRequest | null>(null);
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    globalPromptRequest = (newReq) => {
      setReq(newReq);
      setVal("");
    };
    return () => {
      globalPromptRequest = null;
    };
  }, []);

  useEffect(() => {
    if (req) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [req]);

  if (!req) return null;

  const handleConfirm = () => {
    req.resolve(val);
    setReq(null);
  };

  const handleCancel = () => {
    req.resolve(null);
    setReq(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl p-6 w-[400px] animate-in zoom-in-95">
        <h3 className="text-lg font-semibold text-white mb-4">{req.title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={req.placeholder || "https://..."}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
