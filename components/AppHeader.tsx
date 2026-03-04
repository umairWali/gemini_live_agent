import React from 'react';
import { Activity, Radio, Mic, Bot } from 'lucide-react';

interface AppHeaderProps {
    isDark: boolean;
    isVoiceActive: boolean;
    emotionState?: 'normal' | 'happy' | 'angry';
}

const AppHeader: React.FC<AppHeaderProps> = ({ isDark, isVoiceActive, emotionState = 'normal' }) => {

    // Emotion-based styling
    let accentColor = 'text-violet-500';
    let ringColor = 'ring-violet-500';
    let gradientBg = '';

    if (emotionState === 'angry') {
        accentColor = 'text-red-500';
        ringColor = 'ring-red-500';
        gradientBg = isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200';
    } else if (emotionState === 'happy') {
        accentColor = 'text-emerald-500';
        ringColor = 'ring-emerald-500';
        gradientBg = isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200';
    }

    return (
        <header className={`h-[72px] shrink-0 flex items-center justify-between px-8 border-b transition-all duration-700 ${isDark ? 'bg-[#0f1115] border-white/5 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-800 shadow-sm'} z-10 w-full`}>
            <div className="flex items-center gap-4">
                {/* Animated Avatar / Logo */}
                <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-700 ${gradientBg || (isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200')} shadow-inner`}>
                    <Bot className={`w-5 h-5 transition-colors duration-700 ${isVoiceActive ? `${accentColor} animate-pulse` : 'text-slate-400'}`} />
                    {isVoiceActive && (
                        <div className={`absolute inset-0 rounded-2xl ring-2 ${ringColor} ring-offset-2 ring-offset-transparent animate-ping opacity-20`} />
                    )}
                </div>

                <div className="flex flex-col">
                    <h1 className="text-sm font-black tracking-[0.15em] uppercase flex items-center gap-2">
                        Personal Operator
                    </h1>
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
                ) : null}
            </div>
        </header>
    );
};

export default AppHeader;
