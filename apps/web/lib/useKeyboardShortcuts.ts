"use client";

import { useEffect, useCallback } from "react";

export interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
  category?: string;
}

/**
 * Custom hook that registers global keyboard shortcuts.
 * Prevents default browser behavior for intercepted shortcuts.
 * 
 * @param shortcuts - Array of shortcut definitions
 * @param enabled - Whether shortcuts are active (default: true)
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutAction[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept when typing in input/textarea (except for specific combos)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && keyMatch) {
          // Allow non-modified keys to be typed in inputs
          if (isInput && !shortcut.ctrl && !shortcut.shift) continue;

          e.preventDefault();
          e.stopPropagation();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);
}

/**
 * All available shortcuts for the editor page.
 * Used both by the hook and the help modal.
 */
export const EDITOR_SHORTCUTS = [
  { key: "s", ctrl: true, description: "Save document", category: "General" },
  { key: "/", ctrl: true, description: "Toggle AI Co-Author", category: "Panels" },
  { key: "e", ctrl: true, shift: true, description: "Export document", category: "General" },
  { key: "d", ctrl: true, description: "Branch (duplicate) document", category: "General" },
  { key: "?", description: "Show keyboard shortcuts", category: "Help" },
  { key: "Escape", description: "Close panel / modal", category: "General" },
];
