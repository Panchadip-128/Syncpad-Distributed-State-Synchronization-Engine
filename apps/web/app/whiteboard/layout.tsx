import React from "react";

/**
 * Minimal layout for the whiteboard iframe page.
 * This deliberately does NOT import globals.css — we want a clean,
 * unstyled environment so Tldraw's own CSS is the only thing present.
 */
export default function WhiteboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body style={{ margin: 0, padding: 0, overflow: "hidden", background: "#f8f9fa" }}>
        {children}
      </body>
    </html>
  );
}
