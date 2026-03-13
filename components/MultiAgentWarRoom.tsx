
import React from 'react';
import { AgentActivity, AgentRole } from '../types';
import { Shield, Hammer, ClipboardList, Search, Activity, Cpu, Sparkles } from 'lucide-react';

interface WarRoomProps {
    activities: AgentActivity[];
    isDark: boolean;
}

const AgentIcon: React.FC<{ role: AgentRole; size?: number }> = ({ role, size = 18 }) => {
    switch (role) {
        case AgentRole.PLANNER: return <ClipboardList size={size} className="text-sky-400" />;
        case AgentRole.EXECUTOR: return <Hammer size={size} className="text-violet-400" />;
        case AgentRole.TESTER: return <Activity size={size} className="text-emerald-400" />;
        case AgentRole.RESEARCH: return <Search size={size} className="text-amber-400" />;
        case AgentRole.SUPERVISOR: return <Shield size={size} className="text-rose-400" />;
        case AgentRole.AUTONOMOUS_ENGINEER: return <Cpu size={size} className="text-cyan-400" />;
        case AgentRole.HEALER: return <Sparkles size={size} className="text-pink-400" />;
        default: return <Activity size={size} />;
    }
};

const MultiAgentWarRoom: React.FC<WarRoomProps> = ({ activities, isDark }) => {
    return (
        <div className="space-y-6">
            <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Activity className="w-5 h-5" /> Agent War Room
            </h3>
            <div className="space-y-4">
                {activities.map((activity) => (
                    <div
                        key={activity.agent}
                        className={`p-5 rounded-3xl border transition-all duration-500 ${activity.status !== 'idle'
                                ? 'bg-violet-400/5 border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                                : isDark ? 'bg-white/5 border-white/5 opacity-60' : 'bg-slate-50 border-slate-100 opacity-70'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-2xl ${activity.status !== 'idle' ? 'bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-slate-500/10'
                                    }`}>
                                    <AgentIcon role={activity.agent} size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-[11px] font-black uppercase tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {activity.agent.replace('_', ' ')}
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${activity.status === 'idle' ? 'text-slate-500' : 'text-violet-400'
                                        }`}>
                                        {activity.status}
                                    </span>
                                </div>
                            </div>

                            {activity.status !== 'idle' && (
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-1 h-3 rounded-full bg-violet-400/40 animate-pulse`} style={{ animationDelay: `${i * 150}ms` }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {activity.message}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MultiAgentWarRoom;
