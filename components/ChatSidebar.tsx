import React from 'react';
import { Plus, MessageSquare, Sparkles } from 'lucide-react';

interface ChatSidebarProps {
    onNewChat: () => void;
    isDark: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNewChat, isDark }) => {
    return (
        <aside className={`w-64 border-r flex flex-col transition-colors ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-800'} z-20 shrink-0`}>
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all shadow-lg active:scale-95 ${isDark ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/30'}`}
                >
                    <Plus size={18} />
                    New Session
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                <div className={`text-xs font-bold tracking-wider uppercase px-2 py-3 mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recent History</div>

                {/* Premium Mock History Items */}
                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    <MessageSquare size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    <span className="truncate font-medium">Matrix monitoring concepts</span>
                </button>
                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    <MessageSquare size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    <span className="truncate font-medium">Explain Node.js event pool</span>
                </button>
                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    <MessageSquare size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    <span className="truncate font-medium">Fix the voice API integration</span>
                </button>
                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    <MessageSquare size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                    <span className="truncate font-medium">UI Cleanup request</span>
                </button>
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} mt-auto`}>
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg ring-2 ring-white/10">
                        <Sparkles size={14} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-widest text-violet-500">Pro Edition</span>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Live Agent Operator v2.0</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default ChatSidebar;
