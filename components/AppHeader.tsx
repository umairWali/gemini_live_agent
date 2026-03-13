import React from 'react';
import { Activity, Radio, Mic, Bot, Settings, Menu, Plus } from 'lucide-react';

interface AppHeaderProps {
    isDark: boolean;
    isVoiceActive: boolean;
    emotionState?: 'normal' | 'happy' | 'angry';
    audioLevel?: number;
    onThemeToggle?: () => void;
    onSettingsClick?: () => void;
    onMobileMenuClick?: () => void;
    onNewChat?: () => void;
    isConnected?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ isDark, isVoiceActive, emotionState = 'normal', audioLevel = 0, onThemeToggle, onSettingsClick, onMobileMenuClick, onNewChat, isConnected = true }) => {

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
        <header className={`h-[72px] shrink-0 flex items-center justify-between px-4 md:px-8 border-b transition-all duration-700 ${isDark ? 'bg-[#0f1115] border-white/5 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-800 shadow-sm'} z-10 w-full`}>
            {/* Left side - Logo (always visible) */}
            <div className="flex items-center gap-4">
                {/* Mobile menu button - only on small screens */}
                <button
                    onClick={onMobileMenuClick}
                    className={`md:hidden p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Logo - centered on desktop, left-aligned on mobile */}
                <div className="hidden md:flex items-center gap-4">
                    <div
                        className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-75 ${gradientBg || (isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200')} shadow-inner overflow-hidden shadow-violet-500/20`}
                        style={{
                            transform: `scale(${1 + (audioLevel / 500)})`,
                            boxShadow: audioLevel > 10 ? `0 0 ${audioLevel / 2}px ${accentColor.includes('violet') ? 'rgba(139,92,246,0.5)' : accentColor.includes('red') ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}` : 'none'
                        }}
                    >
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-full h-full object-cover"
                            style={{
                                transform: `scale(${1 + (audioLevel / 200)})`,
                            }}
                        />
                        {isVoiceActive && (
                            <div className={`absolute inset-0 rounded-2xl ring-2 ${ringColor} ring-offset-2 ring-offset-transparent animate-ping opacity-20`} />
                        )}
                    </div>

                    <div className="flex flex-col">
                        <h1 className="text-sm font-black tracking-[0.25em] uppercase flex items-center gap-2">
                            Personal Operator
                        </h1>
                    </div>
                </div>
            </div>

            {/* Right side controls - New Chat + Settings + Live indicator */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* New Chat Button - visible on mobile */}
                <button
                    onClick={onNewChat}
                    className={`md:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New</span>
                </button>
                
                {isVoiceActive ? (
                    <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500">
                        <Radio className="w-4 h-4 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest ml-1">Live</span>
                    </div>
                ) : null}
                
                <button
                    onClick={onSettingsClick}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 ml-1">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isConnected ? 'Sync' : 'Lost'}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
