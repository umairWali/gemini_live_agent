
import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Mic, MicOff, UserCheck, Zap, Info, ShieldCheck, BrainCircuit, MessageSquareCode, Search, Code, CheckCircle } from 'lucide-react';
import { AgentRole, Message } from '../types';

interface TerminalProps {
  history: Message[];
  onSend: (text: string) => void;
  isProcessing: boolean;
  onExecute: (id: string) => void;
  onToggleExplain?: (index: number) => void;
}

// Encoding/Decoding helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const Terminal: React.FC<TerminalProps> = ({ history, onSend, isProcessing, onExecute, onToggleExplain }) => {
  const [input, setInput] = useState('');
  const [isLive, setIsLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const toggleLive = async () => {
    if (isLive) {
      setIsLive(false);
      return;
    }

    // Use server-side proxy instead of direct API key
    try {
      const token = localStorage.getItem('operator_auth_token');
      const response = await fetch('/ai/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
        },
        body: JSON.stringify({
          config: {
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: "You are the Personal AI Operator's voice interface. Supervisor mode active. Be technical, concise, and operational."
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        setIsLive(true);
        // Note: Full implementation would use WebSocket for bidirectional audio streaming
        console.log('[VOICE]: Live audio session initialized via server proxy');
      } else {
        console.error('[VOICE]: Failed to initialize live audio:', result.error);
      }
    } catch (err) {
      console.error('[VOICE]: Error connecting to live audio endpoint:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSend(input.trim());
      setInput('');
    }
  };

  const getAgentIcon = (role?: AgentRole) => {
    switch (role) {
      case AgentRole.PLANNER: return <Search className="w-3.5 h-3.5" />;
      case AgentRole.EXECUTOR: return <Code className="w-3.5 h-3.5" />;
      case AgentRole.TESTER: return <CheckCircle className="w-3.5 h-3.5" />;
      case AgentRole.HEALER: return <ShieldCheck className="w-3.5 h-3.5" />;
      case AgentRole.AUTONOMOUS_ENGINEER: return <Zap className="w-3.5 h-3.5 text-violet-400" />;
      default: return <UserCheck className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 font-mono text-sm relative overflow-hidden h-full">
      {/* Dynamic Grid Background Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 z-10 custom-scrollbar pb-10">
        {history.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} fade-in`}>
            <div className={`max-w-[85%] p-5 rounded-3xl border transition-all ${msg.role === 'user'
              ? 'bg-white/5 border-white/5 text-slate-300'
              : msg.agentBadge === AgentRole.AUTONOMOUS_ENGINEER
                ? 'bg-violet-500/10 border-violet-500/20 text-violet-50 shadow-[0_0_50px_rgba(139,92,246,0.1)]'
                : 'bg-slate-900 border-white/10 text-slate-100 shadow-xl'
              } relative group`}>

              <div className="flex items-center justify-between mb-3 opacity-40 text-[9px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
                {msg.role === 'user' ? (
                  'USER'
                ) : (
                  <div className="flex items-center gap-2">
                    {getAgentIcon(msg.agentBadge)}
                    <span>{msg.agentBadge || 'OPERATOR'}</span>
                  </div>
                )}
                {msg.role === 'ai' && (
                  <button
                    onClick={() => onToggleExplain?.(i)}
                    className={`flex items-center gap-2 px-2 py-0.5 rounded transition-all text-[8px] ${msg.isExplainMode ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/5'}`}
                  >
                    <span>{msg.isExplainMode ? 'HIDE_LOGIC' : 'DETAILS'}</span>
                  </button>
                )}
              </div>

              <p className="leading-relaxed font-medium tracking-tight whitespace-pre-wrap text-[14px]">
                {msg.text}
              </p>

              {msg.isExplainMode && msg.explanation && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2 text-violet-400 opacity-60 text-[8px] font-black uppercase tracking-widest">
                    <span>REASONING_LOG</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {msg.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start fade-in">
            <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4 text-slate-500 border border-white/5">
              <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 animate-pulse">Processing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 z-10 flex flex-col">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 md:p-3 rounded-2xl shadow-xl backdrop-blur-3xl focus-within:border-white/20">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Command input..."
            className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 uppercase font-black text-[12px] md:text-[14px] tracking-widest h-10 md:h-12 px-2"
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={toggleLive}
            className={`p-2.5 md:p-3.5 rounded-xl transition-all ${isLive ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {isLive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-4 md:px-8 h-10 md:h-12 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-xl font-black text-[11px] md:text-[12px] uppercase transition-all"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Terminal;
