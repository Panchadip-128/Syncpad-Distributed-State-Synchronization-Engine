"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

interface BranchVisualizerProps {
  documentId: string;
  provider: HocuspocusProvider;
}

export default function BranchVisualizer({ documentId, provider }: BranchVisualizerProps) {
  const [branching, setBranching] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleBranch = async () => {
    setBranching(true);
    try {
      const newDoc = await fetchApi(`/docs/${documentId}/branch`, { method: "POST" });
      const stateUpdate = Y.encodeStateAsUpdate(provider.document);

      const tempProvider = new HocuspocusProvider({
        url: (provider.configuration as any).url as string,
        name: newDoc.id,
      });

      const doApply = () => {
        Y.applyUpdate(tempProvider.document, stateUpdate);
        setTimeout(() => {
          tempProvider.destroy();
          setSuccess(true);
          setTimeout(() => router.push(`/doc/${newDoc.id}`), 400);
        }, 500);
      };

      tempProvider.on("synced", doApply);
      setTimeout(doApply, 1000);
    } catch (err) {
      console.error("Branch failed", err);
      setBranching(false);
    }
  };

  return (
    <button
      onClick={handleBranch}
      disabled={branching}
      title="Create a branch of this document"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
      style={{
        color: success ? "#34d399" : "#a5b4fc",
        background: success ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)",
        border: `1px solid ${success ? "rgba(16,185,129,0.25)" : "rgba(99,102,241,0.25)"}`,
      }}
      onMouseEnter={(e) => {
        if (!branching) (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.18)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = success ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)";
      }}
    >
      {branching ? (
        <>
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="hidden sm:inline">Branching…</span>
        </>
      ) : success ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
          </svg>
          <span className="hidden sm:inline">Branched!</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 106 0M6 15a3 3 0 106 0m6-9a3 3 0 110 6 3 3 0 010-6zM9 18a9 9 0 01-6-6"/>
          </svg>
          <span className="hidden sm:inline">Branch</span>
        </>
      )}
    </button>
  );
}
