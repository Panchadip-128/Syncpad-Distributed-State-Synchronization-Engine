"use client";

import React, { useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";

interface MinimapProps {
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLElement | null>;
}

export default function Minimap({ editor, editorContainerRef }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [contentHeight, setContentHeight] = useState(1);

  // Constants for rendering
  const SCALE = 0.1; // Scale factor for the minimap

  useEffect(() => {
    if (!editor || !canvasRef.current || !editorContainerRef.current) return;

    const container = editorContainerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawMinimap = () => {
      const pmContainer = container.querySelector('.ProseMirror') as HTMLElement;
      if (!pmContainer) return;

      const rect = pmContainer.getBoundingClientRect();
      const actualHeight = pmContainer.scrollHeight;
      const actualWidth = pmContainer.scrollWidth || 800; // default width

      setContentHeight(actualHeight);
      setViewportHeight(container.clientHeight);

      // Setup canvas dimensions based on content
      canvas.width = 120; // fixed width for minimap
      canvas.height = actualHeight * SCALE;
      
      const widthScale = canvas.width / actualWidth;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";

      // Simple heuristic: read child nodes and draw rects for text blocks
      let yOffset = 0;
      Array.from(pmContainer.children).forEach((child: Element) => {
        const htmlChild = child as HTMLElement;
        const style = window.getComputedStyle(htmlChild);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        const h = htmlChild.offsetHeight;
        
        yOffset += marginTop;

        // Draw a block if it has text
        if (htmlChild.textContent?.trim() !== "") {
          const isHeading = ["H1", "H2", "H3", "H4"].includes(htmlChild.tagName);
          ctx.fillStyle = isHeading ? "rgba(129, 140, 248, 0.8)" : "rgba(148, 163, 184, 0.4)";
          
          // Try to approximate line breaks
          const textLength = htmlChild.textContent?.length || 0;
          const estimatedLines = Math.max(1, Math.ceil(textLength / 80));
          const lineHeight = h / estimatedLines;

          for (let i = 0; i < estimatedLines; i++) {
             // add random jitter to width for realistic text look
             const randomWidth = isHeading ? 0.8 : (0.4 + Math.random() * 0.5);
             ctx.fillRect(
               10, 
               (yOffset + i * lineHeight) * SCALE, 
               (actualWidth * randomWidth) * widthScale - 20, 
               Math.max(1, (lineHeight - 2) * SCALE)
             );
          }
        }

        yOffset += h + marginBottom;
      });
    };

    // Draw on init and on editor updates
    drawMinimap();
    editor.on('update', drawMinimap);

    // Resize observer to detect window/container resizes
    const resizeObserver = new ResizeObserver(() => {
      drawMinimap();
    });
    resizeObserver.observe(container);
    const pmElement = container.querySelector('.ProseMirror');
    if (pmElement) resizeObserver.observe(pmElement);

    return () => {
      editor.off('update', drawMinimap);
      resizeObserver.disconnect();
    };
  }, [editor, editorContainerRef]);

  // Handle scrolling synchronization
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [editorContainerRef]);

  // Click on minimap to scroll
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current || !editorContainerRef.current) return;
    
    const rect = wrapperRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    
    // Convert click position back to original scale
    const targetScroll = (clickY / SCALE) - (viewportHeight / 2);
    
    editorContainerRef.current.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  };

  if (!editor) return null;

  return (
    <div 
      className="absolute right-0 top-14 bottom-8 w-[140px] z-10 hidden lg:block border-l border-white/5"
      style={{
        background: "rgba(8,10,15,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-50 mb-2">
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Minimap</span>
      </div>
      
      <div 
        ref={wrapperRef}
        className="relative w-full h-full mt-8 overflow-hidden cursor-pointer group"
        onClick={handleMinimapClick}
      >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 right-0 opacity-60 group-hover:opacity-100 transition-opacity"
        />
        
        {/* Viewport Overlay */}
        {contentHeight > 0 && (
          <div 
            className="absolute right-0 w-full bg-white/10 border-y border-white/20 transition-transform pointer-events-none"
            style={{
              height: `${viewportHeight * SCALE}px`,
              transform: `translateY(${scrollTop * SCALE}px)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
