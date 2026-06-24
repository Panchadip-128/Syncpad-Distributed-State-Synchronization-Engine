"use client";

import React, { useEffect, useRef } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";

interface CollaborativeCanvasProps {
  provider: HocuspocusProvider;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
}

interface Point {
  x: number;
  y: number; // Document Y (including scroll)
  timestamp: number;
  isNewStroke?: boolean;
}

interface FadingLine {
  clientId: number;
  color: string;
  points: Point[];
}

interface PeerCursor {
  clientId: number;
  x: number;
  y: number; // Document Y
  name: string;
  color: string;
  isDrawing: boolean;
  lastActive: number;
}

export function CollaborativeCanvas({ provider, editorContainerRef, isActive }: CollaborativeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastSentRef = useRef<number>(0);
  
  const fadingLinesRef = useRef<Map<number, FadingLine>>(new Map());
  const peerCursorsRef = useRef<Map<number, PeerCursor>>(new Map());

  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return { r: 99, g: 102, b: 241 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const resizeCanvas = () => {
    const container = editorContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    
    // Only size to the VISIBLE area to prevent massive canvases and scaling bugs
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    const dpr = window.devicePixelRatio || 1;
    
    // Only resize if actually changed to prevent clearing canvas strokes
    if (canvas.width !== newWidth * dpr || canvas.height !== newHeight * dpr) {
      canvas.width = newWidth * dpr;
      canvas.height = newHeight * dpr;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    }
  };

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);
    window.addEventListener("resize", resizeCanvas);

    // Make canvas stay in viewport by translating it down as we scroll
    const onScroll = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transform = `translateY(${container.scrollTop}px)`;
      }
    };
    container.addEventListener("scroll", onScroll);
    onScroll(); // initial positioning

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      container.removeEventListener("scroll", onScroll);
    };
  }, [editorContainerRef]);

  useEffect(() => {
    resizeCanvas();
  }, [isActive]);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const currentClientId = awareness.clientID;
      const now = Date.now();

      states.forEach((state: any, clientId) => {
        if (clientId === currentClientId) return;

        const laser = state.laser;
        const user = state.user;

        if (laser && user) {
          const wasDrawing = peerCursorsRef.current.get(clientId)?.isDrawing;
          const isNewStroke = laser.isDrawing && !wasDrawing;

          peerCursorsRef.current.set(clientId, {
            clientId,
            x: laser.x,
            y: laser.y, // This is document Y
            name: user.name || "Anonymous",
            color: user.color || "#818cf8",
            isDrawing: !!laser.isDrawing,
            lastActive: now,
          });

          if (laser.isDrawing) {
            let line = fadingLinesRef.current.get(clientId);
            if (!line) {
              line = {
                clientId,
                color: user.color || "#818cf8",
                points: [],
              };
              fadingLinesRef.current.set(clientId, line);
            }

            const lastPoint = line.points[line.points.length - 1];
            if (!lastPoint || Math.hypot(lastPoint.x - laser.x, lastPoint.y - laser.y) > 2 || isNewStroke) {
              line.points.push({
                x: laser.x,
                y: laser.y,
                timestamp: now,
                isNewStroke,
              });
            }
          }
        } else {
          peerCursorsRef.current.delete(clientId);
        }
      });

      peerCursorsRef.current.forEach((peer, clientId) => {
        if (now - peer.lastActive > 5000) {
          peerCursorsRef.current.delete(clientId);
        }
      });
    };

    awareness.on("change", handleAwarenessChange);
    return () => awareness.off("change", handleAwarenessChange);
  }, [provider]);

  useEffect(() => {
    let animationFrameId: number;

    const draw = () => {
      const canvas = canvasRef.current;
      const container = editorContainerRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !container) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Convert CSS pixels to render space
      const cssWidth = parseFloat(canvas.style.width);
      const cssHeight = parseFloat(canvas.style.height);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const now = Date.now();
      const scrollTop = container.scrollTop;

      // 1. Draw drawing trails (fading lines)
      fadingLinesRef.current.forEach((line) => {
        line.points = line.points.filter((pt) => now - pt.timestamp < 1500);

        if (line.points.length < 2) return;

        const rgb = hexToRgb(line.color);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < line.points.length; i++) {
          const ptA = line.points[i - 1];
          const ptB = line.points[i];
          
          if (ptB.isNewStroke) continue;
          
          const age = now - ptB.timestamp;
          const opacity = Math.max(0, 1 - age / 1500);

          ctx.beginPath();
          // Offset by scrollTop to keep anchored to document
          ctx.moveTo(ptA.x, ptA.y - scrollTop);
          ctx.lineTo(ptB.x, ptB.y - scrollTop);
          
          ctx.lineWidth = opacity * 6 + 1;
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.85})`;
          ctx.stroke();
        }
      });

      // 2. Draw glowing laser pointer cursors & labels for peers
      peerCursorsRef.current.forEach((peer) => {
        const rgb = hexToRgb(peer.color);
        const screenY = peer.y - scrollTop; // Project document Y to screen Y

        // Hide if well outside visible area
        if (screenY < -50 || screenY > cssHeight + 50) return;

        const gradient = ctx.createRadialGradient(peer.x, screenY, 2, peer.x, screenY, 12);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
        gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(peer.x, screenY, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = peer.color;
        ctx.font = "bold 10px sans-serif";
        const textMetrics = ctx.measureText(peer.name);
        const paddingX = 6;
        const paddingY = 3;
        const boxWidth = textMetrics.width + paddingX * 2;
        const boxHeight = 16;
        const boxX = peer.x + 10;
        const boxY = screenY + 10;

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(peer.name, boxX + paddingX, boxY + boxHeight / 2);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const updateLocalAwareness = (x: number, y: number, isDrawing: boolean) => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const now = Date.now();
    if (now - lastSentRef.current < 25 && !isDrawing) return;
    lastSentRef.current = now;

    awareness.setLocalStateField("laser", { x, y, isDrawing });
  };

  const getDocCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // The y coordinate on screen
    const screenY = e.clientY - rect.top;
    const container = editorContainerRef.current;
    // Add scroll offset to get document Y
    const docY = screenY + (container?.scrollTop || 0);
    return { x, docY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const awareness = provider.awareness;
    if (!awareness) return;
    isDrawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);

    const { x, docY } = getDocCoords(e);
    const localId = awareness.clientID;
    let line = fadingLinesRef.current.get(localId);
    if (!line) {
      const myColor = awareness.getLocalState()?.user?.color || "#818cf8";
      line = { clientId: localId, color: myColor, points: [] };
      fadingLinesRef.current.set(localId, line);
    }
    line.points.push({ x, y: docY, timestamp: Date.now(), isNewStroke: true });

    updateLocalAwareness(x, docY, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const awareness = provider.awareness;
    if (!awareness) return;

    const { x, docY } = getDocCoords(e);

    if (isDrawingRef.current) {
      const localId = awareness.clientID;
      const line = fadingLinesRef.current.get(localId);
      if (line) {
        line.points.push({ x, y: docY, timestamp: Date.now() });
      }
    }

    updateLocalAwareness(x, docY, isDrawingRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    isDrawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const { x, docY } = getDocCoords(e);
    updateLocalAwareness(x, docY, false);
  };

  const handlePointerLeave = () => {
    if (!isActive) return;
    isDrawingRef.current = false;
    const awareness = provider.awareness;
    if (awareness) {
      awareness.setLocalStateField("laser", null);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`absolute top-0 left-0 z-20 transition-opacity duration-300 ${
        isActive ? "pointer-events-auto cursor-crosshair opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ mixBlendMode: "screen", transformOrigin: "top left" }}
    />
  );
}

