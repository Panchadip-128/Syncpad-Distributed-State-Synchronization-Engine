"use client";

import { useState, useEffect } from "react";
import { History, Play, Pause, FastForward, Rewind, X } from "lucide-react";

interface TimeTravelSliderProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function TimeTravelSlider({ isOpen: externalOpen, onClose }: TimeTravelSliderProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  useEffect(() => {
    // Keyboard shortcut to open Time Travel (Ctrl+Shift+T) - only for internal usage
    if (externalOpen !== undefined) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setInternalOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [externalOpen]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Reset when closing
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setProgress(100);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-[#0f1115]/95 backdrop-blur-xl border border-indigo-500/40 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.35)] rounded-2xl p-4 overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <History className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-sm font-bold text-white uppercase tracking-wider">Time-Travel Engine</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">v2.1.0</span>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrubbing info */}
        {progress < 100 && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20">
            ⚠ Time-travel is a visual demo. Document state is read-only at T-{100 - progress}. Click Play to replay character-by-character.
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* Controls */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => { setProgress(Math.max(0, progress - 10)); setIsPlaying(false); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (progress >= 100) setProgress(0);
                setIsPlaying(!isPlaying);
              }}
              className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
            </button>
            <button
              onClick={() => { setProgress(Math.min(100, progress + 10)); setIsPlaying(false); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          {/* Slider */}
          <div className="flex-1 relative flex items-center h-8">
            <div className="absolute w-full h-1.5 bg-black/60 border border-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => {
                setProgress(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="absolute w-full h-full opacity-0 cursor-pointer"
            />
            {/* Playhead marker */}
            <div
              className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-75 pointer-events-none"
              style={{ left: `calc(${progress}% - 6px)` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                {progress === 100 ? "Now" : `T-${100 - progress}`}
              </div>
            </div>
          </div>

          {/* Time label */}
          <div className="text-xs font-mono text-slate-500 w-12 text-right shrink-0">
            {progress}%
          </div>
        </div>
      </div>
    </div>
  );
}
