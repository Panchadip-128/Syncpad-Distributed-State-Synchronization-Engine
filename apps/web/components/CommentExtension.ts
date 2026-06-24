import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: (commentId: string) => ReturnType;
    };
  }
}

export const CommentExtension = Mark.create<CommentOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) return {};
          return {
            'data-comment-id': attributes.commentId,
            class: 'bg-yellow-200/40 border-b-2 border-yellow-400 cursor-pointer hover:bg-yellow-300/50 transition-colors',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setComment: (commentId) => ({ commands }) => {
        return commands.setMark(this.name, { commentId });
      },
      unsetComment: (commentId) => ({ commands }) => {
        return commands.unsetMark(this.name, { commentId } as any);
      },
    };
  },
});
