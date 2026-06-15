"use client";

import { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";

interface PresenceBarProps {
  provider: HocuspocusProvider;
}

interface UserState {
  name: string;
  color: string;
}

export default function PresenceBar({ provider }: PresenceBarProps) {
  const [users, setUsers] = useState<Map<number, UserState>>(new Map());

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const sync = () => {
      const states = awareness.getStates() as Map<number, { user: UserState }>;
      const next = new Map<number, UserState>();
      states.forEach((state, clientId) => {
        if (state.user) next.set(clientId, state.user);
      });
      setUsers(next);
    };

    sync();
    awareness.on("change", sync);
    return () => awareness.off("change", sync);
  }, [provider]);

  const activeUsers = Array.from(users.values());
  const shown = activeUsers.slice(0, 4);
  const extra = activeUsers.length - shown.length;

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Live dot */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-[11px] font-medium text-emerald-400 hidden sm:inline">Live</span>
      </div>

      {activeUsers.length > 0 && <div className="w-px h-3.5 bg-white/10" />}

      {/* Avatars */}
      <div className="flex -space-x-2">
        {shown.map((user, idx) => (
          <div
            key={idx}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#080a0f] relative group"
            style={{ background: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
            {/* Tooltip */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] bg-[#0d1117] border border-white/10 text-white px-2 py-0.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
              {user.name}
            </div>
          </div>
        ))}
        {extra > 0 && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300 ring-2 ring-[#080a0f]"
            style={{ background: "#1e2433" }}
          >
            +{extra}
          </div>
        )}
      </div>

      {activeUsers.length === 0 && (
        <span className="text-[11px] text-slate-500">Solo</span>
      )}
    </div>
  );
}
