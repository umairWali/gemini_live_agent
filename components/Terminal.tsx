
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Zap, ShieldCheck, BrainCircuit, Search, Code, CheckCircle, User, Bot } from 'lucide-react';
import { AgentRole, Message } from '../types';

interface TerminalProps {
  history: Message[];
  onSend: (text: string) => void;
  isProcessing: boolean;
  onExecute: (id: string) => void;
  onToggleExplain?: (index: number) => void;
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ history, onSend, isProcessing, onExecute, onToggleExplain, isVoiceActive, onToggleVoice }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSend(input.trim());
      setInput('');
    }
  };

  const getAgentLabel = (role?: AgentRole) => {
    switch (role) {
      case AgentRole.PLANNER: return 'Planner';
      case AgentRole.EXECUTOR: return 'Executor';
      case AgentRole.TESTER: return 'Tester';
      case AgentRole.HEALER: return 'Healer';
      case AgentRole.AUTONOMOUS_ENGINEER: return 'AI Engineer';
      case AgentRole.SUPERVISOR: return 'AI Operator';
      default: return 'AI Operator';
    }
  };

  const getAgentColor = (role?: AgentRole) => {
    switch (role) {
      case AgentRole.AUTONOMOUS_ENGINEER: return 'text-violet-600';
      case AgentRole.HEALER: return 'text-rose-500';
      case AgentRole.SUPERVISOR: return 'text-blue-600';
      default: return 'text-slate-500';
    }
  };

  // Filter out internal IPC system messages from the chat view
  const visibleHistory = history.filter(msg => {
    if (msg.role === 'ai' && msg.text) {
      const t = msg.text;
      if (t.startsWith('[IPC_ACK]') || t.startsWith('[HEALER_SIGNAL]') || t.startsWith('PROTOCOL_LOCK')) return false;
    }
    if (msg.role === 'user' && msg.text) {
      const t = msg.text;
      if (t.startsWith('[IPC_ACK]') || t.startsWith('[HEALER_SIGNAL]') || t.startsWith('[VISION_SIGNAL]')) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
        {visibleHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 gap-3 pt-16">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Bot className="w-8 h-8 text-violet-500" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Personal AI Operator</p>
            <p className="text-xs text-slate-400 max-w-xs">Type a command or tap the mic to speak. Your AI assistant is ready.</p>
          </div>
        )}

        {visibleHistory.map((msg, i) => (
          <div key={i} className={`flex gap-3 fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-violet-600" />
              </div>
            )}

            <div className={`max-w-[78%] ${msg.role === 'user' ? '' : 'flex-1'}`}>
              {msg.role !== 'user' && (
                <div className={`text-[10px] font-semibold mb-1.5 ${getAgentColor(msg.agentBadge)}`}>
                  {getAgentLabel(msg.agentBadge)}
                </div>
              )}

              <div className={`msg-bubble rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-tr-sm font-medium'
                  : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {msg.role === 'ai' && (
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => onToggleExplain?.(i)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-violet-500 transition-colors font-medium"
                  >
                    <BrainCircuit className="w-3 h-3" />
                    {msg.isExplainMode ? 'Hide reasoning' : 'Show reasoning'}
                  </button>
                </div>
              )}

              {msg.isExplainMode && msg.explanation && (
                <div className="mt-2 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                  <p className="text-[11px] text-violet-700 leading-relaxed italic">{msg.explanation}</p>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-3 justify-start fade-in">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-violet-600" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleVoice}
            title={isVoiceActive ? 'Stop voice' : 'Start voice'}
            className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 transition-all ${
              isVoiceActive
                ? 'bg-red-500 text-white mic-active shadow-lg'
                : 'bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600'
            }`}
          >
            {isVoiceActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isProcessing}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="w-11 h-11 flex items-center justify-center bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl flex-shrink-0 transition-all shadow"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {isVoiceActive && (
          <p className="text-center text-xs text-red-500 font-medium mt-2 animate-pulse">
            Mic is active — listening...
          </p>
        )}
      </div>
    </div>
  );
};

export default Terminal;
