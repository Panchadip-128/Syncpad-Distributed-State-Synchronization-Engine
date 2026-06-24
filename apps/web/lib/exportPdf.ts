/**
 * exportPdf.ts
 * Generates a real, text-based, searchable PDF from a TipTap editor instance
 * using jsPDF directly — no html2canvas, no screenshots, no hidden DOM elements.
 * Produces a proper A4 multi-page document that opens in any PDF viewer.
 *
 * Handles: heading, paragraph, bulletList, orderedList, blockquote,
 *          codeBlock, horizontalRule, codeSandbox, whiteboard
 */

export async function exportToPdf(editor: any, title: string): Promise<void> {
  // @ts-ignore
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.jsPDF ?? jsPDFModule.default?.jsPDF ?? jsPDFModule.default;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pageW = doc.internal.pageSize.getWidth();  // 210mm
  const pageH = doc.internal.pageSize.getHeight(); // 297mm
  const mX = 20;
  const mY = 22;
  const cW = pageW - mX * 2;
  let y = mY;

  const addPage = () => { doc.addPage(); y = mY; };
  const need = (needed: number) => { if (y + needed > pageH - mY) addPage(); };
  const getText = (nodes: any[]): string => (nodes || []).map((n: any) => n.text || "").join("");

  // ─── Title ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(17, 17, 17);
  const titleLines: string[] = doc.splitTextToSize(title, cW);
  need(titleLines.length * 9 + 6);
  doc.text(titleLines, mX, y);
  y += titleLines.length * 9;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(mX, y, pageW - mX, y);
  y += 8;

  // ─── Body ──────────────────────────────────────────────────────────────
  const json = editor.getJSON();

  let whiteboardIndex = 0;

  for (const node of json.content || []) {
    switch (node.type) {

      // ── Heading ──────────────────────────────────────────────────────────
      case "heading": {
        const level: number = node.attrs?.level ?? 2;
        const size = level === 1 ? 17 : level === 2 ? 14 : 12;
        const lineH = size * 0.45;
        const text = getText(node.content || []);
        if (!text) break;
        need(lineH * 2 + 5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        doc.setTextColor(17, 17, 17);
        const lines: string[] = doc.splitTextToSize(text, cW);
        doc.text(lines, mX, y);
        y += lines.length * lineH + 5;
        break;
      }

      // ── Paragraph ────────────────────────────────────────────────────────
      case "paragraph": {
        const text = getText(node.content || []);
        if (!text.trim()) { y += 3; break; }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(40, 40, 40);
        const lines: string[] = doc.splitTextToSize(text, cW);
        for (const line of lines) {
          need(5.5);
          doc.text(line, mX, y);
          y += 5.5;
        }
        y += 2;
        break;
      }

      // ── Bullet List ───────────────────────────────────────────────────────
      case "bulletList": {
        for (const item of node.content || []) {
          const text = getText(item.content?.[0]?.content || []);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(40, 40, 40);
          const lines: string[] = doc.splitTextToSize(`\u2022  ${text}`, cW - 6);
          for (let i = 0; i < lines.length; i++) {
            need(5.5);
            doc.text(lines[i], mX + (i === 0 ? 0 : 5), y);
            y += 5.5;
          }
        }
        y += 2;
        break;
      }

      // ── Ordered List ──────────────────────────────────────────────────────
      case "orderedList": {
        let idx: number = node.attrs?.start ?? 1;
        for (const item of node.content || []) {
          const text = getText(item.content?.[0]?.content || []);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(40, 40, 40);
          const lines: string[] = doc.splitTextToSize(`${idx}.  ${text}`, cW - 8);
          for (let i = 0; i < lines.length; i++) {
            need(5.5);
            doc.text(lines[i], mX + (i === 0 ? 0 : 7), y);
            y += 5.5;
          }
          idx++;
        }
        y += 2;
        break;
      }

      // ── Blockquote ───────────────────────────────────────────────────────
      case "blockquote": {
        for (const inner of node.content || []) {
          const text = getText(inner.content || []);
          if (!text) continue;
          const lines: string[] = doc.splitTextToSize(text, cW - 12);
          const blockH = lines.length * 5.5 + 4;
          need(blockH);
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(1.2);
          doc.line(mX + 2, y - 4, mX + 2, y + blockH - 6);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          for (const line of lines) {
            doc.text(line, mX + 7, y);
            y += 5.5;
          }
          doc.setLineWidth(0.4);
        }
        y += 4;
        break;
      }

      // ── Code Block ───────────────────────────────────────────────────────
      case "codeBlock": {
        const code = getText(node.content || []);
        const lines = code.split("\n");
        const blockH = lines.length * 4.8 + 6;
        need(blockH);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(mX, y - 3, cW, blockH, 2, 2, "F");
        doc.setFont("courier", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(55, 65, 81);
        for (const line of lines) {
          doc.text(line || " ", mX + 3, y);
          y += 4.8;
        }
        y += 6;
        break;
      }

      // ── Horizontal Rule ───────────────────────────────────────────────────
      case "horizontalRule": {
        need(8);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(mX, y, pageW - mX, y);
        y += 8;
        break;
      }

      // ── Code Sandbox ──────────────────────────────────────────────────────
      case "codeSandbox": {
        const code: string = node.attrs?.code || "";
        const output: string = node.attrs?.output || "";
        const language: string = node.attrs?.language || "javascript";

        // Header
        need(10);
        doc.setFillColor(15, 17, 21);
        doc.roundedRect(mX, y - 4, cW, 8, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(52, 211, 153);
        doc.text(`CODE SANDBOX  [${language.toUpperCase()}]`, mX + 3, y + 0.5);
        y += 8;

        // Code lines with line numbers
        const codeLines = code.split("\n");
        const codeBlockH = codeLines.length * 4.8 + 6;
        need(codeBlockH);
        doc.setFillColor(10, 10, 15);
        doc.rect(mX, y - 2, cW, codeBlockH, "F");
        doc.setFont("courier", "normal");
        doc.setFontSize(8.5);
        codeLines.forEach((line, i) => {
          doc.setTextColor(80, 90, 110);
          doc.text(String(i + 1).padStart(2, " "), mX + 2, y + i * 4.8);
          doc.setTextColor(180, 200, 230);
          const clamped = doc.splitTextToSize(line || " ", cW - 14);
          doc.text(clamped[0] || " ", mX + 9, y + i * 4.8);
        });
        y += codeBlockH + 2;

        // Console output (if any)
        if (output.trim()) {
          const outLines = output.split("\n");
          const outH = outLines.length * 4.5 + 8;
          need(outH);
          doc.setFillColor(5, 12, 20);
          doc.rect(mX, y - 2, cW, outH, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(80, 90, 110);
          doc.text("CONSOLE OUTPUT", mX + 3, y + 1.5);
          y += 5;
          doc.setFont("courier", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(52, 211, 153);
          for (const line of outLines) {
            doc.text(line || " ", mX + 3, y);
            y += 4.5;
          }
          y += 4;
        }
        y += 4;
        break;
      }

      // ── Collaborative Whiteboard ──────────────────────────────────────────
      case "whiteboard": {
        // previewImage is a PNG data URL generated by tldraw's toImageDataUrl() API
        // and stored directly in the node attributes on every whiteboard change.
        const imgData: string | null = node.attrs?.previewImage ?? null;

        // Header
        need(10);
        doc.setFillColor(13, 17, 23);
        doc.roundedRect(mX, y - 4, cW, 8, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(129, 140, 248); // indigo-400
        doc.text("COLLABORATIVE WHITEBOARD", mX + 3, y + 0.5);
        y += 8;

        if (imgData) {
          // Embed the pre-rendered PNG preview stored in node attributes
          const imgWidth = cW;
          const imgHeight = Math.min(imgWidth * 0.56, 100); // 16:9 capped at 100mm
          need(imgHeight + 4);
          doc.addImage(imgData, "PNG", mX, y, imgWidth, imgHeight);
          y += imgHeight + 6;
        } else {
          // No preview yet — user hasn't drawn anything or hasn't saved yet
          need(18);
          doc.setFillColor(13, 17, 23);
          doc.roundedRect(mX, y - 2, cW, 15, 2, 2, "F");
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(
            "[ Whiteboard — draw something on the board first, then export ]",
            mX + 4, y + 6,
            { maxWidth: cW - 8 }
          );
          y += 18;
        }

        whiteboardIndex++;
        break;
      }

      // ── Fallback ──────────────────────────────────────────────────────────
      default: {
        const text = getText(node.content || []);
        if (text) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(40, 40, 40);
          const lines: string[] = doc.splitTextToSize(text, cW);
          for (const line of lines) {
            need(5.5);
            doc.text(line, mX, y);
            y += 5.5;
          }
          y += 2;
        }
      }
    }
  }

  // ─── Footer: page numbers ───────────────────────────────────────────────
  const totalPages: number = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`${i} / ${totalPages}`, pageW / 2, pageH - 10, { align: "center" });
  }

  const safeName = (title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() || "untitled") + ".pdf";
  doc.save(safeName);
}
