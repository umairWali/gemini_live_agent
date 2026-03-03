
import React, { useState } from 'react';
import { WorkMode, EnvSignal } from '../types';
import { Globe, Terminal as TermIcon, GitBranch, Plus, Activity, Heart, Zap, AlertTriangle, Waves } from 'lucide-react';

interface HeaderProps {
  mode: WorkMode;
  envSignals: EnvSignal[];
  onAddSignal: (signal: EnvSignal) => void;
  // Fix: Expanded health type to include 'blocked' status to match AppState definition
  health: 'optimal' | 'degraded' | 'critical' | 'blocked';
  isOverloaded: boolean;
}

const Header: React.FC<HeaderProps> = ({ mode, envSignals, onAddSignal, health, isOverloaded }) => {
  const [showAdd, setShowAdd] = useState(false);

  // Fix: Added styling configuration for the 'blocked' state
  const healthColors = {
    optimal: 'text-violet-400 bg-violet-400/10 border-violet-400/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]',
    degraded: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    critical: 'text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse',
    blocked: 'text-slate-500 bg-slate-500/10 border-slate-500/20 grayscale'
  };

  // Fix: Added pulse speed configuration for the 'blocked' state
  const pulseSpeeds = {
    optimal: 'duration-2000',
    degraded: 'duration-1000',
    critical: 'duration-500',
    blocked: 'duration-0'
  };

  return (
    <header className="h-20 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/95 backdrop-blur-2xl z-20 sticky top-0">
      <div className="flex items-center gap-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-violet-400" />
              <h1 className="text-[14px] font-black tracking-[0.4em] uppercase text-white shadow-sm">PERSONAL_OPERATOR_V2.0</h1>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2.5 px-3 py-1 rounded-full border transition-all duration-700 ${healthColors[health]}`}>
                <Heart className={`w-3 h-3 ${health === 'optimal' ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{health}</span>
              </div>
              {isOverloaded && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500 text-rose-500 bg-rose-500/10 animate-bounce">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Focus_Limit_Reached</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 overflow-x-auto no-scrollbar max-w-xl">
            {envSignals.length === 0 ? (
              <span className="text-[9px] font-bold text-slate-500 uppercase italic tracking-widest">Active matrix monitoring online...</span>
            ) : (
              envSignals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-300 transition-all hover:text-white hover:border-violet-500/30">
                  {s.type === 'URL' && <Globe className="w-3 h-3" />}
                  {s.type === 'TERMINAL' && <TermIcon className="w-3 h-3" />}
                  {s.type === 'GIT' && <GitBranch className="w-3 h-3" />}
                  <span className="uppercase tracking-tighter">{s.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pulse Visualization */}
        <div className="hidden lg:flex items-center gap-1 opacity-20">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`w-0.5 bg-violet-500 rounded-full animate-pulse ${pulseSpeeds[health]}`}
              style={{
                height: `${10 + Math.random() * 20}px`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
          <Waves className="w-4 h-4 text-violet-500 ml-2 animate-bounce" />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-3 bg-violet-600 border border-violet-500/50 rounded-xl hover:bg-violet-500 transition-all group shadow-lg shadow-violet-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>

          {showAdd && (
            <div className="absolute top-20 right-56 w-72 glass p-6 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-[70] border-t-violet-500 animate-in fade-in slide-in-from-top-4 duration-200">
              <h3 className="text-[11px] font-black uppercase text-slate-400 mb-4 tracking-[0.3em]">Inject Env Signal</h3>
              <div className="flex flex-col gap-2">
                {[
                  { t: 'URL', v: 'github.com/pulls', l: 'PR Detect: Code Review' },
                  { t: 'GIT', v: 'git push origin dev', l: 'GIT: Push to Dev' },
                  { t: 'TERMINAL', v: 'exit code 127', l: 'FAIL: Command Not Found' },
                  { t: 'LOG', v: 'latency > 500ms', l: 'WARN: High Latency' },
                  { t: 'PROCESS', v: 'PID 4422 Spike', l: 'WARN: CPU Overload' }
                ].map((sig, i) => (
                  <button key={i} onClick={() => { onAddSignal({ type: sig.t as any, value: sig.v }); setShowAdd(false); }} className="text-left text-[11px] p-3 hover:bg-violet-500/20 rounded-xl font-bold uppercase transition-all text-slate-300 hover:text-white border border-transparent hover:border-white/5">
                    {sig.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-10 w-px bg-slate-800" />

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1.5 opacity-40">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Protocol_Active</span>
          </div>
          <span className="text-[12px] px-5 py-2 bg-slate-900 border border-slate-800 rounded-xl font-black text-emerald-50 text-opacity-90 tracking-widest transition-all hover:border-emerald-500/50 shadow-inner">
            {mode.replace('_', ' ')}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
