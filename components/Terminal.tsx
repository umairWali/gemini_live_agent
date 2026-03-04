
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, BrainCircuit, User, Bot } from 'lucide-react';
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

const Terminal: React.FC<TerminalProps> = ({
  history, onSend, isProcessing, onExecute, onToggleExplain, isVoiceActive, onToggleVoice
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
    <div className="flex-1 flex flex-col h-full" style={{ background: '#f7f8fa', fontFamily: 'Inter, sans-serif' }}>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
        {visibleHistory.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', opacity: 0.5, paddingTop: 48 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Bot size={24} color="#6b7280" />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>Personal AI Operator</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', maxWidth: 240 }}>Type a message or use the mic to speak.</p>
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

                {/* Bubble */}
                <div style={{
                  borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: msg.role === 'user' ? '#1f2937' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : '#111827',
                  border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
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
                  background: '#1f2937', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2
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
              background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px 18px 18px 18px',
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
      <div style={{
        borderTop: '1px solid #e5e7eb', padding: '12px 16px',
        background: '#ffffff', display: 'flex', alignItems: 'center', gap: 10
      }}>
        {/* Mic button */}
        <button
          type="button"
          onClick={onToggleVoice}
          title={isVoiceActive ? 'Stop voice' : 'Start voice'}
          className={isVoiceActive ? 'mic-active' : ''}
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e5e7eb', cursor: 'pointer',
            background: isVoiceActive ? '#ef4444' : '#f9fafb',
            color: isVoiceActive ? '#ffffff' : '#6b7280'
          }}
        >
          {isVoiceActive ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {/* Text input */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isProcessing}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              border: '1px solid #e5e7eb', fontSize: 14, color: '#111827',
              background: '#f9fafb', outline: 'none',
              fontFamily: 'Inter, sans-serif'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: input.trim() && !isProcessing ? '#1f2937' : '#e5e7eb',
              color: input.trim() && !isProcessing ? '#ffffff' : '#9ca3af',
              border: 'none', cursor: input.trim() && !isProcessing ? 'pointer' : 'not-allowed'
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {isVoiceActive && (
        <div style={{
          textAlign: 'center', fontSize: 11, color: '#ef4444',
          fontWeight: 500, padding: '4px 0 8px', background: '#ffffff'
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
