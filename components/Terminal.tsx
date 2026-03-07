import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, User, Bot, Monitor, MonitorOff, Camera, CameraOff, Paperclip, FileText, Download, CircleDot, Plus, X } from 'lucide-react';
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
    };
    // Read as text for .txt .md .csv .json .docx-text, etc.
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
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

      {/* Input Bar */}
      <div className={`border-t p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 transition-colors ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200 shadow-2xl z-10'}`}>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-white/5 justify-center sm:justify-start">
          {/* Mic button */}
          <button
            type="button"
            id="voice-toggle-btn"
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
              id="screen-share-btn"
              onClick={onToggleScreenShare}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen — Gemini will see your screen'}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isScreenSharing ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {isScreenSharing ? <Monitor size={20} strokeWidth={2.5} /> : <MonitorOff size={20} />}
            </button>
          )}

          {/* Camera button */}
          {onToggleCamera && (
            <button
              type="button"
              id="camera-btn"
              onClick={onToggleCamera}
              title={isCameraActive ? 'Stop Camera' : 'Start Camera — Gemini will see through your webcam'}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isCameraActive ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {isCameraActive ? <Camera size={20} strokeWidth={2.5} /> : <CameraOff size={20} />}
            </button>
          )}

          {/* Toggle Extra Tools Button */}
          <button
            type="button"
            onClick={() => setShowExtraTools(!showExtraTools)}
            title="More Tools"
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${showExtraTools || meetingActive || isRecording ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            {showExtraTools ? <X size={20} /> : <Plus size={20} />}
          </button>

          {/* Extra Tools Expanded */}
          {(showExtraTools || meetingActive || isRecording) && (
            <div className="flex gap-2 animate-in slide-in-from-left-2 duration-300">
              {/* Attachment button */}
              <button
                type="button"
                id="attachment-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach a file — Gemini will read and analyze it"
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <Paperclip size={18} />
              </button>

              {/* Meeting Minutes button */}
              <button
                type="button"
                id="meeting-btn"
                onClick={toggleMeeting}
                title={meetingActive ? 'End Meeting & Generate Minutes' : 'Start Meeting (Gemini takes notes)'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${meetingActive ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                <FileText size={18} />
              </button>

              {/* Download last response */}
              <button
                type="button"
                id="download-btn"
                onClick={downloadLastResponse}
                title="Download last AI response as .txt file"
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <Download size={18} />
              </button>

              {/* Session Recording button */}
              <button
                type="button"
                id="record-btn"
                onClick={toggleRecording}
                title={isRecording ? 'Stop Recording Session' : 'Record Session'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isRecording ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                <CircleDot size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Text input */}
        <form onSubmit={handleSubmit} className="flex-1 flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={meetingActive ? '🟢 Meeting in progress — speak or type...' : 'Talk to your Operator...'}
            disabled={isProcessing}
            className={`flex-1 px-6 py-3.5 rounded-2xl text-[14px] font-medium outline-none transition-all ${isDark ? 'bg-white/5 border border-white/10 text-white focus:border-violet-500/50' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-violet-400'} ${meetingActive ? 'border-emerald-500/40' : ''}`}
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
