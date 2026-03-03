
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

  const pulseSpeeds = {
    optimal: 'duration-2000',
    degraded: 'duration-1000',
    critical: 'duration-500',
    blocked: 'duration-75'
  };

  return (
    <header className="h-16 md:h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between bg-slate-950 sticky top-0 z-50">
      <div className="flex items-center gap-4 md:gap-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[12px] md:text-[14px] font-black tracking-[0.2em] md:tracking-[0.4em] uppercase text-white shadow-sm">PERSONAL_OPERATOR</h1>
            </div>
            <div className="h-4 w-px bg-slate-800 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${healthColors[health]}`}>
                <span>{health}</span>
              </div>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 overflow-x-auto no-scrollbar max-w-xs md:max-w-xl hidden sm:flex">
            {envSignals.length === 0 ? (
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Monitoring active</span>
            ) : (
              envSignals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black text-slate-400 uppercase">
                  <span>{s.value}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-2 md:p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </button>

          {showAdd && (
            <div className="absolute top-20 right-4 w-64 glass p-4 rounded-2xl shadow-2xl z-[70] border-white/5">
              <h3 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Inject Signal</h3>
              <div className="flex flex-col gap-1">
                {[
                  { t: 'URL', v: 'github.com/pulls', l: 'PR Detect' },
                  { t: 'GIT', v: 'git push origin dev', l: 'GIT Push' },
                  { t: 'TERMINAL', v: 'exit code 127', l: 'FAIL Cmd' }
                ].map((sig, i) => (
                  <button key={i} onClick={() => { onAddSignal({ type: sig.t as any, value: sig.v }); setShowAdd(false); }} className="text-left text-[10px] p-2 hover:bg-white/5 rounded-lg font-bold uppercase transition-all text-slate-400 hover:text-white">
                    {sig.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-10 w-px bg-slate-800 hidden sm:block" />

        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-[11px] px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-black text-slate-300 uppercase tracking-widest">
            {mode.replace('_', ' ')}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
