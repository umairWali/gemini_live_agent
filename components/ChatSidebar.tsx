import React from 'react';
import { Plus, MessageSquare, Sparkles, Trash2 } from 'lucide-react';

interface ChatSidebarProps {
    onNewChat: () => void;
    isDark: boolean;
    savedSessions?: { id: string, title: string, history: any[], timestamp: number }[];
    onSelectSession?: (id: string) => void;
    onDeleteSession?: (id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNewChat, isDark, savedSessions = [], onSelectSession, onDeleteSession }) => {
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
                        <div key={session.id} className="group flex items-center gap-2 px-3 py-1 rounded-lg transition-colors hover:bg-slate-400/10">
                            <button
                                onClick={() => onSelectSession && onSelectSession(session.id)}
                                className="flex-1 flex items-center gap-3 py-2 text-sm text-left truncate"
                            >
                                <MessageSquare size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                <span className="truncate font-medium">{session.title.replace(/\*\*/g, '')}</span>
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession && onDeleteSession(session.id);
                                }}
                                className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20 text-slate-500 hover:text-rose-500`}
                                title="Delete Session"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

        </aside>
    );
};

export default ChatSidebar;
