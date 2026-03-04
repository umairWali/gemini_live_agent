
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, User, Bot, Monitor, MonitorOff } from 'lucide-react';
import { AgentRole, Message } from '../types';

interface TerminalProps {
  history: Message[];
  onSend: (text: string) => void;
  isProcessing: boolean;
  onExecute: (id: string) => void;
  onToggleExplain?: (index: number) => void;
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
  isDark?: boolean;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
}

const Terminal: React.FC<TerminalProps> = ({
  history, onSend, isProcessing, onExecute, onToggleExplain,
  isVoiceActive, onToggleVoice, isDark = false,
  isScreenSharing, onToggleScreenShare
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLengthRef = useRef(0);

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

  // Filter internal system messages
  const visibleHistory = history.filter(msg => {
    const t = msg.text || '';
    if (t.startsWith('[IPC_ACK]') || t.startsWith('[HEALER_SIGNAL]') ||
      t.startsWith('PROTOCOL_LOCK') || t.startsWith('[VISION_SIGNAL]') ||
      t.startsWith('MANUAL_SIGNAL') || t.startsWith('SYSTEM_BOOT') ||
      t.startsWith('[IPC_EVENT_DETECTED]')) return false;
    return true;
  });

  return (
    <div className={`flex-1 flex flex-col h-full transition-colors ${isDark ? 'bg-black text-white' : 'bg-[#f7f8fa] text-slate-800'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
        {visibleHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in zoom-in duration-1000">
            <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-8 overflow-hidden shadow-[0_20px_50px_rgba(139,92,246,0.3)] border-2 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <h2 className={`text-2xl font-black uppercase tracking-[0.4em] mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Personal_Operator</h2>
            <p className={`text-[13px] font-bold tracking-widest uppercase opacity-40 max-w-sm leading-loose ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              System Online // Biometric Voice Auth Active<br />
              Awaiting Directives via Voice or Terminal
            </p>
          </div>
        )}

        {visibleHistory.map((msg, i) => {
          const isNew = i >= prevLengthRef.current;
          return (
            <div
              key={i}
              className={isNew ? 'msg-new' : ''}
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start'
              }}
            >
              {/* AI avatar removed as requested */}

              <div style={{ maxWidth: '76%' }}>
                {/* Label removed as requested */}

                <div style={{
                  borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: msg.role === 'user' ? '#8b5cf6' : (isDark ? '#111827' : '#ffffff'),
                  color: msg.role === 'user' ? '#ffffff' : (isDark ? '#f3f4f6' : '#111827'),
                  border: msg.role === 'user' ? 'none' : (isDark ? '1px solid #1f2937' : '1px solid #e5e7eb'),
                  boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>

                {/* Explanation and reasoning toggle removed as requested */}
              </div>

              {/* User avatar */}
              {msg.role === 'user' && (
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: isDark ? '#374151' : '#1f2937', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                  boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.5)' : 'none'
                }}>
                  <User size={14} color="#ffffff" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isProcessing && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              background: isDark ? '#111827' : '#ffffff', border: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb', borderRadius: '4px 18px 18px 18px',
              padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center'
            }}>
              {[0, 150, 300].map(delay => (
                <div key={delay} style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#9ca3af',
                  animation: 'bounce 1s infinite',
                  animationDelay: `${delay}ms`
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className={`border-t p-4 flex items-center gap-3 transition-colors ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200 shadow-2xl z-10'}`}>
        <div className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-white/5">
          {/* Mic button */}
          <button
            type="button"
            onClick={onToggleVoice}
            title={isVoiceActive ? 'Stop voice' : 'Start voice'}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isVoiceActive ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            {isVoiceActive ? <Mic size={20} strokeWidth={2.5} /> : <MicOff size={20} />}
          </button>

          {/* Screen Share button */}
          {onToggleScreenShare && (
            <button
              type="button"
              onClick={onToggleScreenShare}
              title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isScreenSharing ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {isScreenSharing ? <Monitor size={20} strokeWidth={2.5} /> : <MonitorOff size={20} />}
            </button>
          )}
        </div>

        {/* Text input */}
        <form onSubmit={handleSubmit} className="flex-1 flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Talk to your Operator..."
            disabled={isProcessing}
            className={`flex-1 px-6 py-3.5 rounded-2xl text-[14px] font-medium outline-none transition-all ${isDark ? 'bg-white/5 border border-white/10 text-white focus:border-violet-500/50' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-violet-400'}`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`w-14 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${input.trim() && !isProcessing ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/5 text-slate-600 cursor-not-allowed opacity-50'}`}
          >
            <Send size={18} strokeWidth={3} />
          </button>
        </form>
      </div>

      {isVoiceActive && (
        <div style={{
          textAlign: 'center', fontSize: 11, color: '#ef4444',
          fontWeight: 600, padding: '6px 0 10px', background: isDark ? '#0f1115' : '#ffffff',
          letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>
          Listening... speak now
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Terminal;
