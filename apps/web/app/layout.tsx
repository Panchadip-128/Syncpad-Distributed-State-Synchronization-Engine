import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CommandPalette from "@/components/CommandPalette";
import OfflineDrawer from "@/components/OfflineDrawer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SyncPad — Real-Time Collaborative Document Editor",
  description:
    "SyncPad is a production-grade collaborative document editor powered by CRDTs (Conflict-Free Replicated Data Types), Yjs, and Hocuspocus. Features real-time multi-user collaboration, deterministic replay, AI co-authoring, and Git-style branching.",
  keywords: [
    "collaborative editor",
    "CRDT",
    "Yjs",
    "real-time collaboration",
    "document editor",
    "operational transformation",
  ],
  authors: [{ name: "SyncPad" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#080a0f] text-white">
        <CommandPalette />
        <OfflineDrawer />
        {children}
      </body>
    </html>
  );
}
