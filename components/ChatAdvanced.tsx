import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Reply, Edit2, Trash2, MoreVertical, Smile } from 'lucide-react';

interface MessageActionsProps {
  messageId: string;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  reactions?: Record<string, number>;
  userReaction?: string;
  isUser: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  onReact,
  onReply,
  onEdit,
  onDelete,
  reactions = {},
  userReaction,
  isUser
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const emojis = ['👍', '👎', '❤️', '😄', '😮', '🎉', '🤔', '👏'];

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Add reaction"
        >
          <Smile className="w-4 h-4" />
        </button>
        
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex gap-1 z-10">
            {emojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-1.5 hover:bg-slate-700 rounded text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reply button */}
      <button
        onClick={onReply}
        className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-slate-200 transition-colors"
        title="Reply"
      >
        <Reply className="w-4 h-4" />
      </button>

      {/* More options menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-slate-200 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute bottom-full right-0 mb-2 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[120px] z-10">
            {isUser && (
              <button
                onClick={() => {
                  onEdit?.();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={() => {
                onDelete?.();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Message Reactions Display
interface MessageReactionsProps {
  reactions: Record<string, number>;
  userReaction?: string;
  onReact: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  userReaction,
  onReact
}) => {
  if (Object.keys(reactions).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(reactions).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
            userReaction === emoji
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          {emoji} {count}
        </button>
      ))}
    </div>
  );
};

// Reply Thread Component
interface ReplyThreadProps {
  replyTo: {
    id: string;
    text: string;
    role: 'user' | 'ai';
  };
  onCancel: () => void;
}

export const ReplyThread: React.FC<ReplyThreadProps> = ({ replyTo, onCancel }) => {
  return (
    <div className="flex items-start gap-2 p-3 bg-slate-800/50 border-l-2 border-emerald-500 rounded mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-emerald-400 font-medium mb-1">
          Replying to {replyTo.role === 'user' ? 'your message' : 'AI response'}
        </p>
        <p className="text-sm text-slate-400 truncate">{replyTo.text}</p>
      </div>
      <button
        onClick={onCancel}
        className="p-1 hover:bg-slate-700 rounded text-slate-500"
      >
        ✕
      </button>
    </div>
  );
};

// Edit Message Component
interface EditMessageProps {
  originalText: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
}

export const EditMessage: React.FC<EditMessageProps> = ({
  originalText,
  onSave,
  onCancel
}) => {
  const [text, setText] = useState(originalText);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 resize-none"
        rows={3}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(text)}
          disabled={!text.trim() || text === originalText}
          className="px-3 py-1.5 bg-emerald-500 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

// Typing indicator
interface TypingIndicatorProps {
  agentName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ agentName = 'AI' }) => {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <span>{agentName} is typing</span>
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
      </span>
    </div>
  );
};

export default {
  MessageActions,
  MessageReactions,
  ReplyThread,
  EditMessage,
  TypingIndicator
};
