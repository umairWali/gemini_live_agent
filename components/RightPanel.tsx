
import React, { useState } from 'react';
import { AppState, VerifierFeature, AgentRole, AgentActivity } from '../types';
import { Target, History, Monitor, Zap, ClipboardCheck, Server, BarChart3, ShieldCheck, Cpu, Brain, Activity } from 'lucide-react';
import MultiAgentWarRoom from './MultiAgentWarRoom';
import NeuralKnowledgeGraph from './NeuralKnowledgeGraph';

interface RightPanelProps {
  state: AppState;
  onToggleCheck: (id: string) => void;
  onUpdateStack: (ids: string[]) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'AGENTS' | 'MEMORY' | 'SECURITY'>('SYSTEM');

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
    <aside className="hidden xl:flex w-[350px] flex-col bg-slate-950 border-l border-white/5 shrink-0 shadow-4xl overflow-hidden relative">
      <div className="grid grid-cols-4 border-b border-slate-900 bg-black/40">
        {[
          { id: 'SYSTEM', icon: Monitor },
          { id: 'AGENTS', icon: Activity },
          { id: 'MEMORY', icon: Brain },
          { id: 'SECURITY', icon: ClipboardCheck }
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
        {activeTab === 'SECURITY' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-rose-500 flex items-center gap-4"><ShieldCheck className="w-5 h-5" /> Security Protocol</h2>

            {/* Live Audit Trail */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-2 flex items-center gap-2">
                <Zap className="w-3 h-3 text-amber-500" /> Active Firewall Logs
              </p>
              <div className="bg-black/60 border border-white/5 rounded-3xl p-4 font-mono text-[10px] space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {state.auditTrail.length === 0 ? (
                  <div className="text-slate-700 italic py-4 text-center">No active threats detected.</div>
                ) : (
                  [...state.auditTrail].reverse().map((entry, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${entry.text.includes('SECURITY ALERT') || entry.text.includes('CRITICAL') ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/5'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`${entry.text.includes('SECURITY') ? 'text-rose-400' : 'text-sky-400'} font-black uppercase`}>
                          {entry.text.includes('SECURITY') ? 'BLOCKAGE' : 'AUTHORIZED'}
                        </span>
                        <span className="opacity-30 text-[8px]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed truncate">{entry.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <section className="space-y-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 pl-2">System_Hardening</h3>
              <div className="space-y-4">
                {verifierFeatures.map((v, i) => (
                  <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2 hover:border-violet-500/20 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-300 uppercase">{v.name}</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-emerald-500">LOCKED</span>
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-600 line-clamp-1">{v.trigger}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'SYSTEM' && (
          <section className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4"><Monitor className="w-5 h-5" /> Orchestrator HUD</h2>

            <div className="grid grid-cols-2 gap-5">
              <div className="bg-slate-50/90 backdrop-blur-md p-6 rounded-3xl text-center relative overflow-hidden group border border-white/20 shadow-[0_8px_32px_rgba(255,255,255,0.1)]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">CPU_LOAD</p>
                <p className="text-3xl font-black text-slate-900">{state.realtimeMetrics?.cpu || 0}%</p>
                <div className="h-1.5 w-12 bg-slate-200 mx-auto mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.5)]" style={{ width: `${state.realtimeMetrics?.cpu || 0}%` }} />
                </div>
              </div>
              <div className="bg-slate-50/90 backdrop-blur-md p-6 rounded-3xl text-center relative overflow-hidden group border border-white/20 shadow-[0_8px_32px_rgba(255,255,255,0.1)]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">RAM_USAGE</p>
                <p className="text-3xl font-black text-slate-900">{state.realtimeMetrics?.ram || 0}%</p>
                <div className="h-1.5 w-12 bg-slate-200 mx-auto mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-600 shadow-[0_0_8px_rgba(2,132,199,0.5)]" style={{ width: `${state.realtimeMetrics?.ram || 0}%` }} />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.5)] ${state.systemHealth === 'optimal' ? 'bg-violet-400' : 'bg-rose-500'}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health_Index</span>
                  <span className={`text-[12px] font-black uppercase ${state.systemHealth === 'optimal' ? 'text-white' : 'text-rose-500'}`}>{state.systemHealth}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter block">System_Uptime</span>
                <span className="text-[11px] font-black text-slate-400">Stable</span>
              </div>
            </div>

            <div className="space-y-6 pt-10 border-t border-slate-900">
              <h3 className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Telemetry Matrix</h3>
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

        {activeTab === 'AGENTS' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <MultiAgentWarRoom activities={state.agentActivities} isDark={true} />
            <div className="mt-10 p-6 glass-card rounded-3xl space-y-4">
              <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Server className="w-4 h-4" /> Operational_Processes</h4>
              <div className="space-y-3">
                {state.daemon.processes.slice(0, 3).map(p => (
                  <div key={p.pid} className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-200">{p.name}</span>
                    <span className="text-violet-400">{(p.cpu * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'MEMORY' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <NeuralKnowledgeGraph data={state.knowledgeGraph} isDark={true} />
            <div className="mt-10 p-8 glass-card rounded-[2.5rem] bg-violet-500/5 border border-violet-500/10">
              <h4 className="text-[10px] font-black uppercase text-violet-400 tracking-widest text-center mb-6">Autonomous Intelligence</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter">
                  <span className="text-slate-400">Synaptic Density</span>
                  <span className="text-white">82.4%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tighter">
                  <span className="text-slate-400">Context Retention</span>
                  <span className="text-white">High</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default RightPanel;
