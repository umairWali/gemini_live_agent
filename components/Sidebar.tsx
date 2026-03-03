
import React from 'react';
import { WorkMode } from '../types';
import { Terminal, Layout, Mic, ShieldCheck, ClipboardList, Activity, Settings, Zap, ClipboardCheck, Server } from 'lucide-react';

interface SidebarProps {
  mode: WorkMode;
  onModeChange: (mode: WorkMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mode, onModeChange }) => {
  const modes = [
    { id: WorkMode.DAILY_CONTROL, label: 'Control', icon: Activity, color: 'text-violet-400' },
    { id: WorkMode.DEVELOPMENT, label: 'Dev', icon: Terminal, color: 'text-sky-400' },
    { id: WorkMode.DAEMON, label: 'System', icon: Server, color: 'text-violet-400' },
    { id: WorkMode.AUDIT, label: 'Logs', icon: ClipboardCheck, color: 'text-sky-400' },
    { id: WorkMode.SELF_UPGRADE, label: 'Evolve', icon: Zap, color: 'text-violet-400' },
  ];

  return (
    <aside className="w-20 md:w-24 flex-col items-center py-10 bg-slate-950 border-r border-white/5 shrink-0 z-30 hidden md:flex">
      <div className="mb-16 p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.1)] group hover:scale-110 transition-transform cursor-pointer">
        <ClipboardList className="w-7 h-7 text-violet-400" />
      </div>

      <nav className="flex-1 space-y-8">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`group relative flex flex-col items-center p-4 rounded-2xl transition-all duration-400 ${isActive ? 'bg-white/5 border border-white/10 shadow-2xl scale-110' : 'hover:bg-white/5'
                }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? m.color : 'text-slate-600'} group-hover:scale-110 transition-transform`} />
              <span className={`text-[8px] mt-2 font-black tracking-[0.2em] uppercase ${isActive ? 'text-slate-200' : 'text-slate-700'}`}>
                {m.label}
              </span>
              {isActive && (
                <div className={`absolute -left-1 top-1/4 bottom-1/4 w-1.5 rounded-r-full shadow-[0_0_20px_currentColor] ${m.color.replace('text', 'bg')}`} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 w-full flex flex-col items-center gap-6">
        <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.6)]" />
      </div>
    </aside>
  );
};

export default Sidebar;
