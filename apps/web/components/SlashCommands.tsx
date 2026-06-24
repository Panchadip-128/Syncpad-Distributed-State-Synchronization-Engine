"use client";

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { ReactRenderer } from "@tiptap/react";
import { 
  Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, 
  Code, Quote, Image as ImageIcon, 
  Video, Type, Table as TableIcon,
  PenTool
} from "lucide-react";
import { showPrompt } from "./PromptModal";

export interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
}

export const getSuggestionItems = ({ query }: { query: string }) => {
  const items: CommandItem[] = [
    {
      title: "Text",
      description: "Just start typing with plain text.",
      icon: <Type className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("paragraph").run();
      },
    },
    {
      title: "Heading 1",
      description: "Big section heading.",
      icon: <Heading1 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading.",
      icon: <Heading2 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading.",
      icon: <Heading3 className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "To-do List",
      description: "Track tasks with a checklist.",
      icon: <CheckSquare className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a simple bulleted list.",
      icon: <List className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create a list with numbering.",
      icon: <ListOrdered className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Quote",
      description: "Capture a quote.",
      icon: <Quote className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setBlockquote().run();
      },
    },
    {
      title: "Code",
      description: "Capture a code snippet.",
      icon: <Code className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCodeBlock().run();
      },
    },
    {
      title: "Image",
      description: "Upload or embed with a link.",
      icon: <ImageIcon className="w-4 h-4" />,
      command: async ({ editor, range }) => {
        const url = await showPrompt("URL of the image:");
        if (url) {
          editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
        } else {
          editor.chain().focus().deleteRange(range).run();
        }
      },
    },
    {
      title: "YouTube",
      description: "Embed a YouTube video.",
      icon: <Video className="w-4 h-4" />,
      command: async ({ editor, range }) => {
        const url = await showPrompt("YouTube Video URL:");
        if (url) {
          editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run();
        } else {
          editor.chain().focus().deleteRange(range).run();
        }
      },
    },
    {
      title: "Table",
      description: "Insert a 3x3 table.",
      icon: <TableIcon className="w-4 h-4" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      title: "Code Sandbox",
      description: "Insert an interactive JS editor & runner.",
      icon: <Code className="w-4 h-4 text-emerald-400" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent({ type: "codeSandbox" }).run();
      },
    },
    {
      title: "Whiteboard",
      description: "Insert a collaborative drawing board.",
      icon: <PenTool className="w-4 h-4 text-emerald-400" />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent({ type: "whiteboard" }).run();
      },
    },
  ];

  return items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
};

export const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    },
    [props]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return null;
  }

  return (
    <div
      className="bg-[#0f111a] border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden z-[100] w-64 animate-in fade-in zoom-in-95"
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-white/5 bg-white/5">
        Basic Blocks
      </div>
      <div className="p-1 max-h-[300px] overflow-y-auto">
        {props.items.map((item: CommandItem, index: number) => (
          <button
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
              index === selectedIndex ? "bg-indigo-500/20 text-indigo-300" : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <div className={`p-1.5 rounded-md ${index === selectedIndex ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"}`}>
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-[10px] opacity-60 leading-tight">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

CommandList.displayName = "CommandList";

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const renderItems = () => {
  let component: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },

    onUpdate(props: any) {
      component.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup[0].setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown(props: any) {
      if (props.event.key === "Escape") {
        popup[0].hide();
        return true;
      }
      return (component.ref as any)?.onKeyDown(props);
    },

    onExit() {
      popup[0].destroy();
      component.destroy();
    },
  };
};
