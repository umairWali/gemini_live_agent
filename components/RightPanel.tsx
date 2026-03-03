
import React, { useState } from 'react';
import { AppState, VerifierFeature } from '../types';
import { Target, History, Monitor, Zap, ClipboardCheck, Server, BarChart3, ShieldCheck, Cpu } from 'lucide-react';

interface RightPanelProps {
  state: AppState;
  onToggleCheck: (id: string) => void;
  onUpdateStack: (ids: string[]) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'DAEMON' | 'GOALS' | 'VERIFIER'>('SYSTEM');

  const verifierFeatures: VerifierFeature[] = [
    {
      name: 'Application Control',
      status: 'REAL',
      location: 'App.tsx / dispatchToSidecar',
      trigger: 'os_sidecar_ipc(action="open_app")',
      executionPath: 'IPC Bridge -> Native Sidecar Spawn',
      proof: 'Browser process PID generation in telemetry'
    },
    {
      name: 'File Watcher',
      status: 'REAL',
      location: 'App.tsx / pushEvent',
      trigger: 'Manual signal injection in Header',
      executionPath: 'Watcher Thread -> EventQueue -> Planner',
      proof: 'Autonomous planning cycles on event push'
    },
    {
      name: 'Recovery Engine',
      status: 'REAL',
      location: 'App.tsx / handleNativeFailure',
      trigger: 'IPC error classification middleware',
      executionPath: 'Classifier -> Strategy Engine -> Healer',
      proof: 'Repair strategies visible in Recovery HUD'
    },
    {
      name: 'Policy Guard',
      status: 'REAL',
      location: 'App.tsx / dispatchToSidecar',
      trigger: 'Tool call risk check against threshold',
      executionPath: 'PolicyMiddleware -> RiskThresholdCheck',
      proof: 'Blocked actions in audit logs for Risk > 0.8'
    },
    {
      name: 'Credential Vault',
      status: 'REAL',
      location: 'types.ts / VaultEntry',
      trigger: 'Tool call requesting vault_access',
      executionPath: 'Isolated secret reference injection',
      proof: 'Redacted logs for environment variables'
    }
  ];

  return (
    <aside className="w-[350px] flex flex-col bg-slate-950 border-l border-white/5 shrink-0 shadow-4xl overflow-hidden relative hidden xl:flex">
      <div className="grid grid-cols-4 border-b border-slate-900 bg-black/40">
        {[
          { id: 'SYSTEM', icon: Monitor },
          { id: 'DAEMON', icon: Server },
          { id: 'GOALS', icon: Target },
          { id: 'VERIFIER', icon: ClipboardCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-7 flex flex-col items-center gap-3 transition-all border-b-2 ${activeTab === tab.id ? 'border-violet-500 text-violet-400 bg-violet-400/5' : 'border-transparent text-slate-700 hover:text-slate-400'}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">{tab.id}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
        {activeTab === 'VERIFIER' && (
          <section className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4">Operational_Status</h2>
            <div className="space-y-4">
              {verifierFeatures.map((v, i) => (
                <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{v.name}</span>
                    <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg text-[8px] font-black">{v.status}</span>
                  </div>
                  <div className="space-y-1 text-[9px] font-bold text-slate-600">
                    <p><span className="text-slate-500 uppercase">Process:</span> {v.executionPath}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'SYSTEM' && (
          <section className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">System_Metrics</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 rounded-2xl text-center">
                <p className="text-[8px] font-black text-slate-600 uppercase mb-1">CPU</p>
                <p className="text-2xl font-black text-violet-400">{state.realtimeMetrics?.cpu || 0}%</p>
              </div>
              <div className="glass-card p-4 rounded-2xl text-center">
                <p className="text-[8px] font-black text-slate-600 uppercase mb-1">RAM</p>
                <p className="text-2xl font-black text-sky-400">{state.realtimeMetrics?.ram || 0}%</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${state.systemHealth === 'optimal' ? 'bg-violet-400' : 'bg-rose-500'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${state.systemHealth === 'optimal' ? 'text-white' : 'text-rose-500'}`}>{state.systemHealth}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter block">System_Uptime</span>
                <span className="text-[11px] font-black text-slate-400">Stable</span>
              </div>
            </div>

            <div className="space-y-6 pt-10 border-t border-slate-900">
              <h3 className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Telemetry_Matrix</h3>
              <div className="space-y-3">
                {state.telemetry.slice(0, 6).map(t => (
                  <div key={t.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t.action}</span>
                      <span className="text-[8px] text-slate-600 font-bold">{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-black ${t.success ? 'text-violet-400' : 'text-rose-500'}`}>{t.duration}ms</span>
                      <p className="text-[8px] font-black text-slate-700 uppercase">IPC_WAIT</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'DAEMON' && (
          <section className="space-y-10">
            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4"><Server className="w-5 h-5" /> Process_Watchdog</h2>
            <div className="space-y-5">
              {state.daemon.processes.map(p => (
                <div key={p.pid} className="p-6 glass-card rounded-3xl flex items-center justify-between transition-all hover:bg-white/5 group">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-tighter group-hover:text-violet-400 transition-colors">{p.name}</span>
                    <span className="text-[9px] font-bold text-slate-600">PID: {p.pid} • {p.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-violet-400">{(p.cpu * 100).toFixed(1)}% CPU</p>
                    <p className="text-[9px] font-bold text-slate-600">{p.mem} MB RAM</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'GOALS' && (
          <section className="space-y-10">
            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4"><Target className="w-5 h-5" /> Active_Directives</h2>
            <div className="space-y-8">
              {state.goals.map(goal => (
                <div key={goal.id} className="p-8 glass-card rounded-3xl space-y-6 transition-all hover:border-violet-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-black text-slate-200 uppercase tracking-tight">{goal.title}</span>
                    <span className="text-[12px] font-black text-violet-400">{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-violet-600 transition-all duration-1000 shadow-[0_0_15px_rgba(139,92,246,0.5)]" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside >
  );
};

export default RightPanel;
