import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, User, Bot, Monitor, MonitorOff, Camera, CameraOff, Paperclip, FileText, Download, CircleDot, Plus, X, Zap, Sliders, Info, MoreVertical, Wand2, Sparkles } from 'lucide-react';
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
  isCameraActive?: boolean;
  onToggleCamera?: () => void;
}

const Terminal: React.FC<TerminalProps> = ({
  history, onSend, isProcessing, onExecute, onToggleExplain,
  isVoiceActive, onToggleVoice, isDark = false,
  isScreenSharing, onToggleScreenShare,
  isCameraActive, onToggleCamera
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevLengthRef = useRef(0);
  const [meetingActive, setMeetingActive] = useState(false);
  const meetingStartRef = useRef<number | null>(null);
  const [showExtraTools, setShowExtraTools] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [attachedFile, setAttachedFile] = useState<{ name: string, type: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ws = (window as any).operatorWs as WebSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      ws.send(JSON.stringify({
        type: 'ATTACHMENT',
        filename: file.name,
        content: content
      }));
      setAttachedFile({ name: file.name, type: file.type });
      onSend(`[SYSTEM] File attached: ${file.name}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    const ws = (window as any).operatorWs as WebSocket;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'SET_INTERRUPT_SENSITIVITY', value: val }));
    }
  };

  const toggleMeeting = () => {
    const ws = (window as any).operatorWs as WebSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (meetingActive) setMeetingActive(false);
      return;
    }

    if (meetingActive) {
      setMeetingActive(false);
      const duration = meetingStartRef.current ? Math.round((Date.now() - meetingStartRef.current) / 60000) : 0;
      ws.send(JSON.stringify({
        type: 'MEETING_MINUTES',
        transcript: null
      }));
      onSend(`[SYSTEM] Meeting ended after ${duration} min. Please generate formal meeting minutes.`);
    } else {
      setMeetingActive(true);
      meetingStartRef.current = Date.now();
      onSend('[SYSTEM] Meeting started. I will take notes and generate meeting minutes when asked.');
    }
  };

  const downloadLastResponse = () => {
    const aiMessages = history.filter(m => m.role === 'ai' && m.text);
    if (aiMessages.length === 0) return;
    const lastMsg = aiMessages[aiMessages.length - 1];
    const blob = new Blob([lastMsg.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operator-response-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isRecording, setIsRecording] = useState(false);
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      onSend(`[SYSTEM] Session recording stopped and saved.`);
    } else {
      setIsRecording(true);
      onSend(`[SYSTEM] Session recording started.`);
    }
  };

  const visibleHistory = isVoiceActive ? [] : history.filter(msg => {
    const t = msg.text || '';
    if (t.startsWith('[IPC_ACK]') || t.startsWith('[HEALER_SIGNAL]') ||
      t.startsWith('PROTOCOL_LOCK') || t.startsWith('[VISION_SIGNAL]') ||
      t.startsWith('MANUAL_SIGNAL') || t.startsWith('SYSTEM_BOOT') ||
      t.startsWith('[IPC_EVENT_DETECTED]') || t.startsWith('[SYSTEM]')) return false;
    return true;
  });

  return (
    <div className={`flex-1 flex flex-col h-full transition-colors ${isDark ? 'bg-black text-white' : 'bg-[#f7f8fa] text-slate-800'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
        {visibleHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in zoom-in duration-1000">
            <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-8 overflow-hidden shadow-[0_20px_50px_rgba(139,92,246,0.3)] border-2 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <h2 className={`text-2xl font-black uppercase tracking-[0.4em] mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Personal Operator</h2>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Press the mic to start a voice conversation</p>
          </div>
        )}

        {attachedFile && (
          <div className="sticky top-0 z-10 flex justify-end p-2 animate-in fade-in slide-in-from-top-2">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border backdrop-blur-md ${isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-white border-indigo-100 text-indigo-600 shadow-lg'}`}>
              <Info size={14} className="animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-black tracking-widest opacity-60">Deep Context HUD</span>
                <span className="text-[11px] font-bold truncate max-w-[120px]">{attachedFile.name} (Active)</span>
              </div>
              <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={12} />
              </button>
            </div>
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
              <div style={{ maxWidth: '76%' }}>
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
              </div>

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

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.py,.js,.ts,.html,.css"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Input Bar - Unified horizontal layout */}
      <div className={`border-t px-2 py-3 sm:px-4 sm:py-4 flex flex-col gap-2 transition-colors ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200 shadow-2xl z-10'}`}>

        {/* Main interaction row: [Tools] [Input] [Send] */}
        <div className="flex items-center gap-2">

          {/* Action Group (The "Black" tools sidebar element replaced by a sleek group) */}
          <div className={`p-1 flex items-center gap-1 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-800 border-slate-700 shadow-lg'}`}>
            <button
              type="button"
              onClick={onToggleVoice}
              title={isVoiceActive ? 'Stop' : 'Start Voice'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isVoiceActive ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'text-slate-400 hover:text-white'}`}
            >
              {isVoiceActive ? <Mic size={18} strokeWidth={2.5} /> : <MicOff size={18} />}
            </button>

            <div className="flex items-center px-1 border-l border-white/10 ml-1">
              <button
                type="button"
                onClick={() => setShowExtraTools(!showExtraTools)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${showExtraTools ? 'bg-violet-500/20 text-violet-400' : 'text-slate-500 hover:text-violet-400'}`}
              >
                {showExtraTools ? <X size={16} /> : <Plus size={16} />}
              </button>
            </div>
          </div>

          {/* Form Area: Center Input + Right Send */}
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={meetingActive ? 'Listening...' : 'Ask your Operator...'}
                disabled={isProcessing}
                className={`w-full h-11 sm:h-12 px-4 rounded-2xl text-[14px] font-medium outline-none transition-all ${isDark ? 'bg-white/5 border border-white/10 text-white focus:border-violet-500/50' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-violet-400'}`}
              />
              {attachedFile && (
                <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                  <Paperclip size={10} />
                  {attachedFile.name.length > 6 ? attachedFile.name.slice(0, 6) + '..' : attachedFile.name}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${input.trim() && !isProcessing ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-slate-600 border border-white/5'}`}
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </form>
        </div>

        {showExtraTools && (
          <div className={`p-2 grid grid-cols-2 gap-2 rounded-2xl border animate-in slide-in-from-bottom-2 duration-200 ${isDark ? 'bg-slate-900/95 border-white/10' : 'bg-white border-slate-200 shadow-2xl'}`}>
            <button
              onClick={() => { fileInputRef.current?.click(); setShowExtraTools(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
            >
              <Paperclip size={14} className="text-violet-500" />
              ATTACH
            </button>
            
            {onToggleScreenShare && (
              <button
                onClick={() => { onToggleScreenShare(); setShowExtraTools(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${isScreenSharing ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
              >
                <Monitor size={14} className={isScreenSharing ? 'text-sky-400' : 'text-slate-500'} />
                {isScreenSharing ? 'STOP_SHARE' : 'SHARE_SCR'}
              </button>
            )}

            {onToggleCamera && (
              <button
                onClick={() => { onToggleCamera(); setShowExtraTools(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${isCameraActive ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
              >
                <Camera size={14} className={isCameraActive ? 'text-amber-500' : 'text-slate-500'} />
                {isCameraActive ? 'STOP_CAM' : 'CAMERA'}
              </button>
            )}

            <button
              onClick={() => { toggleMeeting(); setShowExtraTools(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${meetingActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
            >
              <FileText size={14} className={meetingActive ? 'text-emerald-500' : 'text-slate-500'} />
              {meetingActive ? 'END_MEET' : 'START_MEET'}
            </button>

            <button
                onClick={() => { downloadLastResponse(); setShowExtraTools(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${isDark ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
              >
                <Download size={14} className="text-sky-500" />
                EXPORT
            </button>

            <div className="col-span-2 px-3 py-3 border-t border-white/10 mt-2">
               <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Sensitivity</span>
                  <span className="text-[8px] font-black text-violet-500">{sensitivity}%</span>
               </div>
               <input
                  type="range"
                  min="0"
                  max="100"
                  value={sensitivity}
                  onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-violet-500"
                />
            </div>
          </div>
        )}

      </div>

      {(isVoiceActive || isScreenSharing || meetingActive || isRecording) && (
        <div className={`flex items-center justify-center gap-5 py-2 px-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-t ${isDark ? 'bg-black border-white/5 text-slate-500' : 'bg-white border-slate-100 text-slate-400 shadow-inner'}`}>
          {isRecording && <span className="flex items-center gap-1.5 text-rose-500"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />Recording</span>}
          {isVoiceActive && <span className="flex items-center gap-1.5 text-rose-500"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />Listening</span>}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        input[type='range']::-webkit-slider-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          appearance: none;
        }
      `}</style>
    </div>
  );
};

export default Terminal;
