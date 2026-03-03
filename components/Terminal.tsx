
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
      const response = await fetch('/api/live', {
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

              <div className="flex items-center justify-between mb-5 opacity-40 text-[9px] font-black uppercase tracking-[0.5em]">
                {msg.role === 'user' ? (
                  '[ USER_COMMAND ]'
                ) : (
                  <div className="flex items-center gap-2.5">
                    {getAgentIcon(msg.agentBadge)}
                    <span className={msg.agentBadge === AgentRole.AUTONOMOUS_ENGINEER ? 'text-violet-400' : ''}>[ {msg.agentBadge || 'OPERATOR'} ]</span>
                  </div>
                )}
                {msg.role === 'ai' && (
                  <button
                    onClick={() => onToggleExplain?.(i)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all text-[8px] ${msg.isExplainMode ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/5'}`}
                  >
                    <BrainCircuit className="w-3 h-3" />
                    <span>{msg.isExplainMode ? 'HIDE_LOGIC' : 'EXPLAIN'}</span>
                  </button>
                )}
              </div>

              <p className="leading-relaxed font-medium tracking-tight whitespace-pre-wrap text-[14px]">
                {msg.text}
              </p>

              {msg.isExplainMode && msg.explanation && (
                <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-3 text-violet-400 opacity-60">
                    <MessageSquareCode className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">INTERNAL_REASONING_MATRIX</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic leading-relaxed">
                    {msg.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start fade-in">
            <div className="glass-card p-6 rounded-3xl flex items-center gap-6 text-slate-500 shadow-3xl border-l-[4px] border-l-violet-500">
              <div className="relative">
                <div className="w-10 h-10 border-[4px] border-violet-500/10 border-t-violet-500 rounded-full animate-spin" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-violet-400 animate-pulse italic">Synchronizing...</span>
                <div className="flex gap-4 opacity-50">
                  {['PLANNER', 'EXECUTOR', 'TESTER'].map(p => (
                    <span key={p} className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 z-10 flex flex-col">
        <form onSubmit={handleSubmit} className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-[2rem] transition-all duration-500 shadow-4xl backdrop-blur-3xl focus-within:border-violet-500/30">
          <TerminalIcon className="w-6 h-6 text-slate-600 ml-4" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="System Command Input..."
            className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 uppercase font-black text-[14px] tracking-[0.3em] h-12"
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={toggleLive}
            className={`p-4 rounded-full transition-all duration-500 ${isLive ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'bg-slate-800 text-slate-400 hover:text-violet-400'}`}
          >
            {isLive ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-10 h-14 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white rounded-2xl font-black text-[14px] uppercase transition-all shadow-xl active:scale-95"
          >
            Dispatch
          </button>
        </form>
      </div>
    </div>
  );
};

export default Terminal;
