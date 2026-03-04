
import React from 'react';
import { Target, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Goal } from '../types';

interface MissionBoardProps {
    goals: Goal[];
    isDark: boolean;
}

const MissionBoard: React.FC<MissionBoardProps> = ({ goals, isDark }) => {
    return (
        <div className={`p-6 rounded-[2rem] border transition-all ${isDark ? 'bg-slate-900/40 border-white/5 shadow-2xl backdrop-blur-sm' : 'bg-white border-slate-100 shadow-xl'}`}>
            <div className={`flex items-center gap-3 mb-6 px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <Target className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Mission_Board</h3>
            </div>

            <div className="space-y-4">
                {goals.length === 0 ? (
                    <div className={`text-center py-10 opacity-30 text-[10px] uppercase font-black tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        System Standby: No Active Missions.
                    </div>
                ) : (
                    goals.map(goal => (
                        <div key={goal.id} className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-default ${isDark ? 'bg-white/5 border-white/5 hover:border-violet-500/20 shadow-lg' : 'bg-slate-50/50 border-slate-100'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <span className={`text-[12px] font-black uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{goal.title}</span>
                                {goal.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : goal.status === 'active' ? (
                                    <div className="flex gap-0.5">
                                        <div className="w-1 h-3 rounded-full bg-amber-500 animate-pulse" />
                                        <div className="w-1 h-3 rounded-full bg-amber-500/40 animate-pulse delay-75" />
                                    </div>
                                ) : (
                                    <Circle className="w-4 h-4 text-slate-600" />
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center px-0.5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Progress</span>
                                    <span className={`text-[10px] font-black ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{goal.progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                                        style={{ width: `${goal.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MissionBoard;
