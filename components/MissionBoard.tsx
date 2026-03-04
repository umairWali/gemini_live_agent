
import React from 'react';
import { Target, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Goal } from '../types';

interface MissionBoardProps {
    goals: Goal[];
    isDark: boolean;
}

const MissionBoard: React.FC<MissionBoardProps> = ({ goals, isDark }) => {
    return (
        <div className={`p-4 rounded-3xl border transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4 px-2">
                <Target className="w-5 h-5 text-violet-500" />
                <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Mission Board</h3>
            </div>

            <div className="space-y-3">
                {goals.length === 0 ? (
                    <div className="text-center py-6 opacity-40 text-xs italic">
                        No active missions.
                    </div>
                ) : (
                    goals.map(goal => (
                        <div key={goal.id} className={`p-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-start justify-between mb-1.5">
                                <span className={`text-sm font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{goal.title}</span>
                                {goal.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : goal.status === 'active' ? (
                                    <Clock className="w-4 h-4 text-amber-500" />
                                ) : (
                                    <Circle className="w-4 h-4 text-slate-400" />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 transition-all duration-1000"
                                        style={{ width: `${goal.progress}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono opacity-60">{goal.progress}%</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MissionBoard;
