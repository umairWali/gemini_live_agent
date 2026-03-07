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

  // Handle file attachment
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
    // Read as text for .txt .md .csv .json .docx-text, etc.
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    const ws = (window as any).operatorWs as WebSocket;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'SET_INTERRUPT_SENSITIVITY', value: val }));
    }
  };

  // Meeting minutes
  const toggleMeeting = () => {
    const ws = (window as any).operatorWs as WebSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (meetingActive) setMeetingActive(false);
      return;
    }

    if (meetingActive) {
      // End meeting — request minutes
      setMeetingActive(false);
      const duration = meetingStartRef.current ? Math.round((Date.now() - meetingStartRef.current) / 60000) : 0;
      ws.send(JSON.stringify({
        type: 'MEETING_MINUTES',
        transcript: null // Gemini will use conversation context
      }));
      onSend(`[SYSTEM] Meeting ended after ${duration} min. Please generate formal meeting minutes.`);
    } else {
      setMeetingActive(true);
      meetingStartRef.current = Date.now();
      onSend('[SYSTEM] Meeting started. I will take notes and generate meeting minutes when asked.');
    }
  };

  // Download last AI response as a file
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

  // Filter internal system messages
  const visibleHistory = history.filter(msg => {
    const t = msg.text || '';
    if (t.startsWith('[IPC_ACK]') || t.startsWith('[HEALER_SIGNAL]') ||
      t.startsWith('PROTOCOL_LOCK') || t.startsWith('[VISION_SIGNAL]') ||
      t.startsWith('MANUAL_SIGNAL') || t.startsWith('SYSTEM_BOOT') ||
      t.startsWith('[IPC_EVENT_DETECTED]') || t.startsWith('[SYSTEM]')) return false;
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
            <h2 className={`text-2xl font-black uppercase tracking-[0.4em] mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Personal Operator</h2>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Press the mic to start a voice conversation</p>
          </div>
        )}

        {/* Deep Dive Context HUD */}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.py,.js,.ts,.html,.css"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Input Bar - Clean & Smart Design */}
      <div className={`border-t p-3 flex flex-col gap-3 transition-colors ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200 shadow-lg z-10'}`}>
        
        {/* Mobile: Input takes full width */}
        <form onSubmit={handleSubmit} className="flex-1 gap-2 sm:flex-row sm:items-center">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={meetingActive ? '🟢 Meeting mode — type or speak...' : 'Ask your Operator...'}
              disabled={isProcessing}
              className={`w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-white/5 border border-white/10 text-white focus:border-violet-500/50 placeholder:text-slate-600' : 'bg-slate-100 border border-slate-200 text-slate-900 focus:border-violet-400 placeholder:text-slate-400'} ${meetingActive ? 'border-emerald-500/40' : ''}`}
            />
            {attachedFile && (
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                <Paperclip size={10} />
                {attachedFile.name.length > 12 ? attachedFile.name.slice(0, 12) + '...' : attachedFile.name}
                <button type="button" onClick={() => setAttachedFile(null)} className="hover:text-white ml-1">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
          
          {/* Mobile: Send button - larger */}
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`w-14 h-10 sm:w-11 sm:h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${input.trim() && !isProcessing ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </form>

        {/* Desktop: Compact Controls - Hidden on Mobile */}
        <div className="hidden sm:flex items-center gap-1.5 p-1.5 bg-slate-900/60 rounded-xl border border-white/5">
          {/* Voice - Primary Action */}
          <button
            type="button"
            onClick={onToggleVoice}
            title={isVoiceActive ? 'Stop voice' : 'Start voice conversation'}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${isVoiceActive ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
          >
            {isVoiceActive ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          {/* Vision Controls - Group */}
          <div className="flex items-center gap-1 px-1 border-l border-white/10">
            {onToggleScreenShare && (
              <button
                type="button"
                onClick={onToggleScreenShare}
                title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90 ${isScreenSharing ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'hover:bg-white/10 text-slate-400 hover:text-sky-400'}`}
              >
                {isScreenSharing ? <Monitor size={16} /> : <MonitorOff size={16} />}
              </button>
            )}
            {onToggleCamera && (
              <button
                type="button"
                onClick={onToggleCamera}
                title={isCameraActive ? 'Stop camera' : 'Start camera'}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90 ${isCameraActive ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'hover:bg-white/10 text-slate-400 hover:text-amber-400'}`}
              >
                {isCameraActive ? <Camera size={16} /> : <CameraOff size={16} />}
              </button>
            )}
          </div>

          {/* Tools Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExtraTools(!showExtraTools)}
              title="More tools"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90 ${showExtraTools ? 'bg-violet-500/30 text-violet-300' : 'hover:bg-white/10 text-slate-400 hover:text-violet-400'}`}
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown Menu - Mobile Optimized */}
            {showExtraTools && (
              <div className={`absolute bottom-full left-0 mb-2 w-56 sm:w-48 rounded-xl border shadow-2xl overflow-hidden z-50 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="p-1">
                  <button
                    onClick={() => { fileInputRef.current?.click(); setShowExtraTools(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm sm:text-xs transition-colors ${isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <Paperclip size={18} className="text-violet-400" />
                    <span className="hidden sm:inline sm:text-xs">Attach file</span>
                  </button>
                  <button
                    onClick={() => { toggleMeeting(); setShowExtraTools(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm sm:text-xs transition-colors ${meetingActive ? 'bg-emerald-500/20 text-emerald-400' : isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <FileText size={18} className={meetingActive ? 'text-emerald-400' : 'text-emerald-500'} />
                    <span className="hidden sm:inline sm:text-xs">{meetingActive ? 'End meeting' : 'Meeting mode'}</span>
                  </button>
                  <button
                    onClick={() => { toggleRecording(); setShowExtraTools(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm sm:text-xs transition-colors ${isRecording ? 'bg-rose-500/20 text-rose-400' : isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <CircleDot size={18} className={isRecording ? 'text-rose-400 animate-pulse' : 'text-rose-500'} />
                    <span className="hidden sm:inline sm:text-xs">{isRecording ? 'Stop recording' : 'Record session'}</span>
                  </button>
                  <button
                    onClick={() => { downloadLastResponse(); setShowExtraTools(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm sm:text-xs transition-colors ${isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <Download size={18} className="text-sky-400" />
                    <span className="hidden sm:inline sm:text-xs">Download response</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle: Sensitivity Control - Mobile Optimized */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
          <Zap size={14} className={sensitivity > 70 ? 'text-amber-400' : 'text-slate-500'} />
          <input
            type="range"
            min="0"
            max="100"
            value={sensitivity}
            onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
            className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
          />
          <span className="text-[10px] font-mono w-5 text-center text-slate-500 sm:text-xs">{sensitivity}</span>
        </div>

        {/* Right: Text Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={meetingActive ? '🟢 Meeting mode — type or speak...' : 'Ask your Operator...'}
              disabled={isProcessing}
              className={`w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-white/5 border border-white/10 text-white focus:border-violet-500/50 placeholder:text-slate-600' : 'bg-slate-100 border border-slate-200 text-slate-900 focus:border-violet-400 placeholder:text-slate-400'} ${meetingActive ? 'border-emerald-500/40' : ''}`}
            />
            {attachedFile && (
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                <Paperclip size={10} />
                {attachedFile.name.length > 12 ? attachedFile.name.slice(0, 12) + '...' : attachedFile.name}
                <button type="button" onClick={() => setAttachedFile(null)} className="hover:text-white ml-1">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${input.trim() && !isProcessing ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      {/* Status bar */}
      {(isVoiceActive || isScreenSharing || meetingActive || isRecording) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '6px 0 10px',
          background: isDark ? '#0f1115' : '#ffffff',
          letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>
          {isRecording && <span style={{ color: '#ef4444' }}> Recording Session</span>}
          {isVoiceActive && <span style={{ color: '#ef4444' }}> Listening... Speak now</span>}
          {isScreenSharing && <span style={{ color: '#0ea5e9' }}> Screen sharing active</span>}
          {meetingActive && <span style={{ color: '#10b981' }}> Meeting in progress — Gemini is taking notes</span>}
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
