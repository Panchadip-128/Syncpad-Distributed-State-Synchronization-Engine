"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCcw, CheckCircle2 } from "lucide-react";

export default function OfflineDrawer() {
  const [isOffline, setIsOffline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showConnected, setShowConnected] = useState(false);
  const [offlineChanges, setOfflineChanges] = useState(0);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowConnected(false);
      setIsReconnecting(false);
    };

    const handleOnline = () => {
      setIsReconnecting(true);
      
      // Simulate sync delay for visual effect
      setTimeout(() => {
        setIsReconnecting(false);
        setIsOffline(false);
        setShowConnected(true);
        setOfflineChanges(0);
        
        // Hide the "Back online" toast after 3s
        setTimeout(() => setShowConnected(false), 3000);
      }, 2000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Simulate accumulating offline changes when disconnected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOffline && !isReconnecting) {
      interval = setInterval(() => {
        // Randomly simulate user making edits while offline
        if (Math.random() > 0.5) {
          setOfflineChanges((prev) => prev + Math.floor(Math.random() * 3) + 1);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isOffline, isReconnecting]);

  if (!isOffline && !showConnected) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Drawer */}
      <div 
        className={`pointer-events-auto overflow-hidden transition-all duration-500 ease-in-out ${
          isOffline || isReconnecting ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
        }`}
        style={{
          background: "rgba(13,17,23,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          borderRadius: "16px",
          width: "320px"
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className="relative">
            <WifiOff className="w-5 h-5 text-rose-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Offline Mode Active</div>
            <div className="text-[10px] text-slate-400">CRDTs queueing locally (IndexedDB)</div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Unsynced Operations</span>
            <span className="font-mono font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              {offlineChanges} pending
            </span>
          </div>

          {/* Simulated Queue Visualization */}
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-amber-400/50 transition-all duration-300"
              style={{ width: `${Math.min(offlineChanges * 2, 100)}%` }}
            />
            {isReconnecting && (
              <div className="absolute top-0 left-0 h-full w-1/3 bg-emerald-400 animate-[shimmer_1s_infinite] blur-[2px]" />
            )}
          </div>

          {/* Sync Status */}
          <div className="flex items-center gap-2 pt-1">
            {isReconnecting ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span className="text-xs text-emerald-400 font-medium">Reconnecting & Syncing...</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-amber-400 font-medium">Waiting for network</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showConnected && (
        <div 
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl animate-fade-in-up"
          style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#34d399",
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          }}
        >
          <CheckCircle2 className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Connection Restored</span>
            <span className="text-[10px] opacity-80">All CRDT vectors synchronized.</span>
          </div>
        </div>
      )}
    </div>
  );
}
