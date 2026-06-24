import { Server } from "@hocuspocus/server";
import * as Y from "yjs";

process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled rejection:', reason);
});

async function start() {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const extensions: any[] = [];

  // Only use Redis extension if explicitly configured AND we can parse the URL
  if (process.env.REDIS_URL) {
    try {
      const { Redis } = await import("@hocuspocus/extension-redis");
      const parsedUrl = new URL(redisUrl);
      const port = parseInt(parsedUrl.port) || 6379;
      console.log(`Configuring Redis extension via ${parsedUrl.hostname}:${port}...`);
      extensions.push(
        new Redis({
          host: parsedUrl.hostname,
          port,
        })
      );
      console.log("Redis extension configured successfully.");
    } catch (e: any) {
      console.warn(`[Warning] Failed to configure Redis (${e.message}). Running in-memory only.`);
    }
  } else {
    console.log("[Info] REDIS_URL not set. Running Hocuspocus in-memory (single-node sync).");
  }

  const server = new Server({
    port: process.env.PORT ? parseInt(process.env.PORT) : 1234,
    extensions,
    timeout: 30000,

    async onAuthenticate(data) {
      const { token } = data;
      // In production, verify the token against the FastAPI backend
      return {
        user: { id: "anonymous" }
      };
    },

    async onConnect(data: any) {
      const { documentName } = data;
      console.log(`[onConnect] Client connecting to document: ${documentName}`);
    },

    async onDisconnect(data: any) {
      const { documentName } = data;
      console.log(`[onDisconnect] Client left document: ${documentName}`);
    },

    async onStoreDocument(data: any) {
      const { documentName, document } = data;
      console.log(`[onStoreDocument] Persisting document: ${documentName}`);

      // Extract text for preview
      let preview = "";
      try {
        const textContent = document.getText("default").toString();
        preview = textContent.substring(0, 150);
      } catch {
        // Try XML fragment
        try {
          const xml = document.getXmlFragment("default");
          const texts: string[] = [];
          const traverse = (node: any) => {
            if (node.constructor?.name === "YXmlText") texts.push(node.toString());
            else if (node.toArray) node.toArray().forEach(traverse);
          };
          traverse(xml);
          preview = texts.join(" ").substring(0, 150);
        } catch {}
      }

      // Encode the full Yjs state as base64
      const state = Y.encodeStateAsUpdate(document);
      const base64State = Buffer.from(state).toString("base64");

      const apiUrl = process.env.API_URL || "http://localhost:8000";
      try {
        const response = await fetch(`${apiUrl}/docs/${documentName}/snapshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content_b64: base64State, preview }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          console.warn(`[onStoreDocument] Snapshot API returned ${response.status} for ${documentName}`);
        } else {
          console.log(`[onStoreDocument] Snapshot saved for ${documentName}`);
        }
      } catch (e: any) {
        console.warn(`[onStoreDocument] Could not reach backend API (${e.message}). Snapshot not persisted.`);
      }
    },
  });

  server.listen().then(() => {
    console.log(`✓ Hocuspocus WebSocket server running on ws://localhost:${process.env.PORT || 1234}`);
    console.log(`  Sync mode: in-memory${extensions.length > 0 ? " + Redis backplane" : " (set REDIS_URL for horizontal scaling)"}`);
  }).catch((err: Error) => {
    console.error("Failed to start Hocuspocus server:", err);
    process.exit(1);
  });
}

start();
