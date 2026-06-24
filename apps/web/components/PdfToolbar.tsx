"use client";

import React, { useRef, useState } from "react";
import { Upload, Download, Loader2 } from "lucide-react";
import { exportToPdf } from "@/lib/exportPdf";

export function PdfToolbar({ editor }: { editor: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/pdf/import`,
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Import failed");

      const data = await res.json();
      if (editor) {
        editor.commands.setContent(data.content);
        showToast("PDF imported successfully");
      }
    } catch (err: any) {
      console.error(err);
      showToast("PDF import requires the Python backend to be running.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    if (!editor) return;
    setIsExporting(true);

    // Resolve title from the page header, fallback to document.title
    const titleEl = document.querySelector<HTMLElement>("header button, header input");
    const title =
      (titleEl instanceof HTMLInputElement ? titleEl.value : titleEl?.textContent?.trim()) ||
      document.title ||
      "Document";

    try {
      await exportToPdf(editor, title);
      showToast("✓ PDF downloaded successfully");
    } catch (err: any) {
      console.error(err);
      showToast("PDF export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <>
      <input
        type="file"
        accept=".pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImport}
      />

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium animate-fade-up"
          style={{
            background: "rgba(13,17,23,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#94a3b8",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}

      {/* PDF buttons - compact, dark themed */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
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
          title="Import PDF content"
        >
          {isImporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">PDF In</span>
        </button>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            color: "#818cf8",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.18)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)";
          }}
          title="Export to PDF"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">PDF Out</span>
        </button>
      </div>
    </>
  );
}
