"use client";

import React, { useState } from "react";
import { Maximize2, PenTool } from "lucide-react";

export function WhiteboardBlock() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-6 border border-slate-700/50 rounded-xl overflow-hidden bg-[#0d1117]">
      <div className="px-4 py-2 bg-slate-800/50 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-200">Interactive Whiteboard</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? "h-[500px]" : "h-[200px]"} relative group cursor-pointer`} onClick={() => !isOpen && setIsOpen(true)}>
        {!isOpen && (
          <div className="absolute inset-0 bg-slate-900/40 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-lg font-medium shadow-xl">
              Click to Interact
            </span>
          </div>
        )}
        
        {/* Placeholder for real Excalidraw integration */}
        <div className="w-full h-full bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center opacity-30">
           <svg className="w-32 h-32 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
             <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
           </svg>
        </div>
      </div>
    </div>
  );
}
