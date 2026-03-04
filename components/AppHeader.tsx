import React from 'react';
import { Activity, Radio, Mic } from 'lucide-react';

interface AppHeaderProps {
    isDark: boolean;
    isVoiceActive: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ isDark, isVoiceActive }) => {
    return (
        <header className={`h-[72px] shrink-0 flex items-center justify-between px-8 border-b transition-all ${isDark ? 'bg-[#0f1115] border-white/5 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-800 shadow-sm'} z-10 w-full`}>
            <div className="flex items-center gap-4">
                {/* Animated Avatar / Logo */}
                <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'} shadow-inner`}>
                    <Activity className={`w-5 h-5 ${isVoiceActive ? 'text-violet-500 animate-pulse' : 'text-slate-400'}`} />
                    {isVoiceActive && (
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent animate-ping opacity-20" />
                    )}
                </div>

                <div className="flex flex-col">
                    <h1 className="text-sm font-black tracking-[0.15em] uppercase flex items-center gap-2">
                        Personal AI Operator
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-sky-500/20 text-sky-500 tracking-widest border border-sky-500/30">
                            V2.0
                        </span>
                    </h1>
                    <p className={`text-[11px] font-medium tracking-wide mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Next-Gen Autonomous Agent
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Live Audio / Online Status */}
                {isVoiceActive ? (
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500">
                        <Radio className="w-4 h-4 animate-pulse" />
                        <div className="flex items-end gap-0.5 h-3">
                            <div className="w-1 bg-rose-500 animate-[bounce_1s_infinite] h-full" />
                            <div className="w-1 bg-rose-500 animate-[bounce_1.2s_infinite] h-2/3" />
                            <div className="w-1 bg-rose-500 animate-[bounce_0.8s_infinite] h-5/6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest ml-1">Live Audio</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border transition-colors duration-500 border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_currentColor]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Connected</span>
                    </div>
                )}
            </div>
        </header>
    );
};

export default AppHeader;
