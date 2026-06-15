import { Server } from "@hocuspocus/server";
import { Redis } from "@hocuspocus/extension-redis";
import * as Y from "yjs";
import net from "net";

process.on('uncaughtException', (err) => {
  console.warn('[Warning] Caught uncaught exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Warning] Caught unhandled rejection:', reason);
});

function checkRedis(host: string, port: number, timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      resolved = true;
      socket.destroy();
      resolve(true);
    });

    const onError = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    };

    socket.on('error', onError);
    socket.on('timeout', onError);

    socket.connect(port, host);
  });
}

async function start() {
  const redisHost = process.env.REDIS_HOST || "127.0.0.1";
  const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
  
  console.log(`Checking Redis connection on ${redisHost}:${redisPort}...`);
  const isRedisRunning = await checkRedis(redisHost, redisPort, 1000);
  
  const extensions = [];
  if (isRedisRunning) {
    console.log("Redis is running. Adding Hocuspocus Redis extension.");
    extensions.push(
      new Redis({
        host: redisHost,
        port: redisPort,
      })
    );
  } else {
    console.warn("[Warning] Redis is NOT running or unreachable. Running Hocuspocus in-memory (local sync only).");
  }

  const server = new Server({
    port: process.env.PORT ? parseInt(process.env.PORT) : 1234,
    extensions,

    async onConnect(data: any) {
      const { documentName, requestHeaders } = data;
      // In a real app, we'd extract the user token from requestHeaders
      console.log(`[onConnect] User connecting to document: ${documentName}`);
    },

    async onStoreDocument(data: any) {
      const { documentName, document } = data;
      console.log(`[onStoreDocument] Saving document: ${documentName}`);
      
      // Extracting text content from the Yjs document for logging
      const text = document.getText("default").toString();
      const preview = text.substring(0, 100);
      
      // Encode the full Yjs state as a binary array, then base64
      const state = Y.encodeStateAsUpdate(document);
      const base64State = Buffer.from(state).toString('base64');
      
      try {
        const apiUrl = process.env.API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/docs/${documentName}/snapshot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content_b64: base64State,
            preview: preview
          })
        });
        if (!response.ok) {
          console.error("Failed to save snapshot to backend API", await response.text());
        }
      } catch (e) {
        console.error("Error saving snapshot:", e);
      }
    },
  });

  server.listen().then(() => {
    console.log("Hocuspocus WebSocket server is running on ws://localhost:1234");
  });
}

start().catch(err => {
  console.error("Failed to start Hocuspocus server:", err);
});
