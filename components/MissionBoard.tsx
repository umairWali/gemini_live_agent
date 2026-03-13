
import React from 'react';
import { Target, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Goal } from '../types';

interface MissionBoardProps {
    goals: Goal[];
    isDark: boolean;
}

const MissionBoard: React.FC<MissionBoardProps> = ({ goals, isDark }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const scrollDown = () => {
        scrollRef.current?.scrollBy({ top: 120, behavior: 'smooth' });
    };

    return (
        <div className={`p-5 rounded-[2rem] border transition-all ${isDark ? 'bg-slate-950/80 border-white/5 shadow-2xl backdrop-blur-md' : 'bg-white border-slate-100 shadow-xl'}`}>
            <div className={`flex items-center justify-center mb-4 px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80">Mission Board</h3>
            </div>

            <div className="relative group">
                <div 
                    ref={scrollRef}
                    className="space-y-3 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar"
                >
                    {goals.length === 0 ? (
                        <div className={`text-center py-8 opacity-30 text-[9px] uppercase font-black tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No Active Missions
                        </div>
                    ) : (
                        goals.map(goal => (
                            <div key={goal.id} className={`p-4 rounded-2xl border transition-all hover:scale-[1.01] cursor-default ${isDark ? 'bg-white/5 border-white/5 hover:border-violet-500/20 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <span className={`text-[11px] font-black uppercase tracking-tight leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{goal.title}</span>
                                    {goal.status === 'completed' ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                        <Circle className="w-3.5 h-3.5 text-slate-600" />
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center px-0.5">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Progress</span>
                                        <span className={`text-[9px] font-black ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{goal.progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-1000"
                                            style={{ width: `${goal.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {goals.length > 2 && (
                    <button 
                        onClick={scrollDown}
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 p-1.5 rounded-full border shadow-lg transition-all hover:scale-110 active:scale-95 ${isDark ? 'bg-slate-900 border-white/10 text-violet-400' : 'bg-white border-slate-100 text-violet-600'}`}
                    >
                        <Clock className="w-3 h-3 animate-pulse" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default MissionBoard;
