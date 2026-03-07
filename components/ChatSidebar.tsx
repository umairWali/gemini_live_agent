import React from 'react';
import { Plus, MessageSquare, Sparkles } from 'lucide-react';

interface ChatSidebarProps {
    onNewChat: () => void;
    isDark: boolean;
    savedSessions?: { id: string, title: string, history: any[], timestamp: number }[];
    onSelectSession?: (id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNewChat, isDark, savedSessions = [], onSelectSession }) => {
    return (
        <aside className={`w-64 flex flex-col transition-colors ${isDark ? 'bg-slate-950 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-800'} z-20 shrink-0 flex-1`}>
            <div className="p-6">
                <button
                    onClick={onNewChat}
                    className={`group w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all relative overflow-hidden active:scale-95 shadow-[0_8px_30px_rgb(255,255,255,0.1)] ${isDark ? 'bg-white text-slate-900 hover:bg-sky-400 hover:shadow-sky-400/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'}`}
                >
                    <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                    New Session
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                <div className={`text-xs font-bold tracking-wider uppercase px-2 py-3 mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Recent History</div>

                {savedSessions.length === 0 ? (
                    <div className={`text-center py-4 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No recent sessions</div>
                ) : (
                    savedSessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => onSelectSession && onSelectSession(session.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                        >
                            <MessageSquare size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                            <span className="truncate font-medium">{session.title}</span>
                        </button>
                    ))
                )}
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} mt-auto`}>
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg ring-2 ring-white/10">
                        <Sparkles size={14} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-widest text-violet-500">Elite Edition</span>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Personal Operator</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;
