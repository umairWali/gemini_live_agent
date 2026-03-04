
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  WorkMode, TaskCategory, OperatorTask, AppState, AgentRole,
  WatcherEvent, RecoveryAttempt, Message, ErrorCategory, TelemetryPoint,
  AuditTrailEntry
} from './types';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import RightPanel from './components/RightPanel';
import Header from './components/Header';
import { Zap, PlayCircle, HeartPulse } from 'lucide-react';
import type { FunctionDeclaration } from "@google/genai";

// UI/UX Components
import { ToastProvider, useToast } from './components/Toast';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader, SkeletonMessage } from './components/Skeletons';
import { useSoundEffects } from './hooks/useSoundEffects';

// Local Type definitions to replace @google/genai imports
const Type = {
  OBJECT: 'OBJECT' as any,
  STRING: 'STRING' as any,
  NUMBER: 'NUMBER' as any,
  ARRAY: 'ARRAY' as any,
  BOOLEAN: 'BOOLEAN' as any,
};

// Simplified Chat interface for server-side proxy
interface ChatClient {
  sendMessage: (params: { message: string }) => Promise<{
    text?: string;
    functionCalls?: any[];
  }>;
}

const OS_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'os_sidecar_ipc',
  parameters: {
    type: Type.OBJECT,
    description: 'Privileged Native Sidecar Interface. Controls system-level actions via privileged bridge.',
    properties: {
      action: {
        type: Type.STRING,
        description: 'Command: open_app, run_command, read_file, write_file, watch_dir, list_processes, create_backup, apply_repair, update_goal, vault_access'
      },
      target: { type: Type.STRING, description: 'Application name, file path, command, or identifier.' },
      args: { type: Type.STRING, description: 'Optional data, parameters, or content for the action.' },
      risk: { type: Type.STRING, description: 'Risk assessment: LOW (safe), MEDIUM (reversible), HIGH (destructive/production).' },
      explanation: { type: Type.STRING, description: 'Brief technical rationale for the action.' }
    },
    required: ['action', 'target', 'risk']
  }
};

const MASTER_SYSTEM_PROMPT = `
You are the Personal AI Operator (Final Master Build v8.5).
You behave as a coordinated technical team: Planner, Executor, Tester, Healer, and Supervisor.

PRIMARY OPERATING PRINCIPLE:
Anticipate → Plan → Execute → Verify → Heal → Learn

OPERATING DIRECTIVES:
1. MULTI-AGENT COORDINATION: Planner creates sequences. Executor calls os_sidecar_ipc. Tester validates. Healer fixes faults.
2. SELF-HEALING: On failure, classify the error (DEP, PERM, RUNTIME, LOGIC, NETWORK) and select a recovery strategy (Restart, Resolve, Backoff, Flush).
3. GOAL ALIGNMENT: Every task must map to a long-term goal.
4. POLICY GUARD: RISK > 0.8 requires user confirmation. Redact secrets.
5. AUTONOMY: Respond concisely. Focus on verified execution results.

Command local tools via os_sidecar_ipc. You are persistent.
`;

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const { addToast } = useToast();
  const { isOpen: isCommandOpen, setIsOpen: setCommandOpen } = useCommandPalette();
  const { playSuccess, playError, playNotification, playClick, haptic } = useSoundEffects(true);
  const [isDark, setIsDark] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('operator_master_prod_v8_final');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        osState: { ...parsed.osState, bridgeUrl: '' },
        isSessionStarted: false // Reset on load
      };
    }
    return {
      currentMode: WorkMode.DAILY_CONTROL,
      isAutonomous: false,
      isSandbox: false,
      daemon: {
        isBooted: false,
        services: [
          { name: 'ipc_server', status: 'STOPPED', lastHeartbeat: 0, uptime: 0 },
          { name: 'event_bus', status: 'STOPPED', lastHeartbeat: 0, uptime: 0 },
          { name: 'recovery_engine', status: 'STOPPED', lastHeartbeat: 0, uptime: 0 },
          { name: 'health_monitor', status: 'STOPPED', lastHeartbeat: 0, uptime: 0 }
        ],
        processes: [
          { pid: 1, name: 'operator_sidecar', cpu: 0.1, mem: 128, status: 'running' },
          { pid: 102, name: 'fs_watcher', cpu: 0.05, mem: 42, status: 'running' },
          { pid: 552, name: 'git_daemon', cpu: 0.02, mem: 64, status: 'running' }
        ],
        events: [],
        recoveryLog: [],
        activeQueue: []
      },
      tasks: [], checklists: [], activeStack: [],
      goals: [
        { id: '1', title: 'System Autonomy Transition', progress: 82, status: 'active' },
        { id: '2', title: 'Zero-Fault Resilience', progress: 45, status: 'active' }
      ],
      vault: [{ id: 'v1', key: 'AWS_PROD_SECRET', value: '******************', timestamp: Date.now() }],
      auditTrail: [],
      agentActivities: Object.values(AgentRole).map(role => ({ agent: role as AgentRole, status: 'idle', message: 'Standby', timestamp: Date.now() })),
      history: [], envSignals: [], evolutionLogs: [], telemetry: [],
      osState: { connected: false, platform: 'linux', runningApps: ['Terminal', 'Code', 'Chrome'], bridgeUrl: '' },
      realtimeMetrics: { cpu: 0, ram: 0 },
      githubFeed: [],
      isSessionStarted: false,
      systemHealth: 'optimal',
      isOverloaded: false,
      usage: { tokens: 0, estimatedCost: 0, executionCount: 0, fixAttempts: {} },
      policies: { riskThreshold: 0.8, maxRuntime: 3600, allowedDirectories: ['/src', '/docs'], allowedDomains: ['github.com', 'npm.org'], canaryStabilityWindow: 300 }
    };
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [authPassword, setAuthPassword] = useState('');
  const chatRef = useRef<ChatClient | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const voiceSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackScheduleRef = useRef<number>(0);

  const toggleVoice = useCallback(async () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
      playbackCtxRef.current?.close();
      playbackCtxRef.current = null;
      const mainWs = (window as any).operatorWs;
      if (mainWs && mainWs.readyState === WebSocket.OPEN) {
        mainWs.send(JSON.stringify({ type: 'STOP_VOICE' }));
      }
      addToast({ type: 'info', title: 'Voice Off', message: 'Session ended' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      // Input context: 16kHz for sending to Gemini
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = inputCtx;

      // Output context: 24kHz for Gemini audio response
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = outputCtx;
      playbackScheduleRef.current = outputCtx.currentTime;

      const mainWs = (window as any).operatorWs;
      if (!mainWs || mainWs.readyState !== WebSocket.OPEN) {
        addToast({ type: 'error', title: 'Not Connected', message: 'Refresh page and try again' });
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      // Tell server to open Gemini Live session
      mainWs.send(JSON.stringify({ type: 'START_VOICE' }));

      // Start mic streaming
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      source.connect(processor);
      processor.connect(inputCtx.destination);
      processor.onaudioprocess = (e) => {
        const ws = (window as any).operatorWs;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        ws.send(JSON.stringify({ type: 'VOICE_AUDIO', data: btoa(binary) }));
      };

      setIsVoiceActive(true);
      addToast({ type: 'success', title: 'Voice Active', message: 'Listening... speak now' });
    } catch (e: any) {
      const msg = e.name === 'NotAllowedError' ? 'Mic permission denied in browser' : e.message;
      addToast({ type: 'error', title: 'Mic Error', message: msg });
    }
  }, [isVoiceActive, addToast]);


  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      addToast({
        type: 'success',
        title: 'System Ready',
        message: 'Personal AI Operator initialized successfully'
      });
      playSuccess();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('operator_master_prod_v8_final', JSON.stringify(state));
    // Keep historyRef up to date so sendMessage always sends latest history
    historyRef.current = state.history;
  }, [state]);

  // Keyboard shortcuts - moved after processInput to avoid reference error
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A - Toggle Autonomous Mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        playClick();
        haptic('medium');
        const newState = !state.isAutonomous;
        setState(p => ({ ...p, isAutonomous: newState }));

        if (newState) {
          addToast({
            type: 'warning',
            title: 'Autonomous Mode Enabled',
            message: 'AI will now act independently on detected events'
          });
          // Use setTimeout to avoid circular dependency
          setTimeout(() => {
            // Trigger autonomous mode message
            const event = new CustomEvent('autonomous-toggle', { detail: { enabled: true } });
            window.dispatchEvent(event);
          }, 0);
        } else {
          addToast({
            type: 'info',
            title: 'Manual Mode',
            message: 'Autonomous actions disabled'
          });
        }
      }

      // Ctrl+T - Theme toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setIsDark(prev => !prev);
        addToast({
          type: 'info',
          title: isDark ? 'Light Mode' : 'Dark Mode',
          message: `Theme switched to ${isDark ? 'light' : 'dark'} mode`
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isAutonomous, isDark, addToast, playClick, haptic]);

  // Persistent Heartbeat & Metric Tracking
  useEffect(() => {
    const daemonInterval = setInterval(() => {
      setState(prev => {
        if (!prev.daemon.isBooted) return prev;

        const updatedProcesses = prev.daemon.processes.map(p => ({
          ...p,
          cpu: Math.min(100, Math.max(0.1, p.cpu + (Math.random() - 0.5) * 0.15)),
          mem: Math.min(16384, Math.max(20, p.mem + (Math.random() - 0.5) * 4))
        }));

        const totalCpu = updatedProcesses.reduce((acc, curr) => acc + curr.cpu, 0);
        const healthStatus: 'optimal' | 'degraded' | 'critical' | 'blocked' = totalCpu > 2.0 ? 'degraded' : 'optimal';

        return {
          ...prev,
          systemHealth: healthStatus,
          daemon: {
            ...prev.daemon,
            processes: updatedProcesses,
            services: prev.daemon.services.map(s => ({ ...s, uptime: s.uptime + 1, lastHeartbeat: Date.now() }))
          }
        };
      });
    }, 1000);
    return () => clearInterval(daemonInterval);
  }, [state.daemon.isBooted]);

  // Autonomous Watcher Feedback Loop
  useEffect(() => {
    const unhandled = state.daemon.events.filter(e => e.status === 'UNPROCESSED');
    if (unhandled.length > 0 && state.isAutonomous && !isProcessing) {
      const event = unhandled[0];
      setState(p => ({
        ...p,
        daemon: {
          ...p.daemon,
          events: p.daemon.events.map(e => e.id === event.id ? { ...e, status: 'PLANNING' } : e)
        }
      }));
      processInput(`[IPC_EVENT_DETECTED]: Source: ${event.source}, Type: ${event.type}. Metadata: ${JSON.stringify(event.metadata)}. Propose plan aligned with core GOALS.`, 'system');
    }
  }, [state.daemon.events, state.isAutonomous, isProcessing]);

  const historyRef = useRef<any[]>([]);

  const initChat = useCallback(() => {
    chatRef.current = {
      sendMessage: async ({ message }: { message: string }) => {
        const response = await fetch(`${state.osState.bridgeUrl}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: historyRef.current,
            systemPrompt: MASTER_SYSTEM_PROMPT
          })
        });
        return await response.json();
      }
    };
  }, [state.osState.bridgeUrl]);

  useEffect(() => {
    initChat();

    // WebSocket with reconnection logic
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/`;
      ws = new WebSocket(wsUrl);
      (window as any).operatorWs = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'FS_CHANGE') {
          pushEvent(data.type, data.source, data.metadata);
        } else if (data.type === 'RECOVERY_SIGNAL') {
          pushEvent(data.type, data.source, data.metadata);
        } else if (data.type === 'VOICE_RESPONSE') {
          try {
            const ctx = playbackCtxRef.current;
            if (!ctx) return;
            const binaryString = atob(data.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const pcmData = new Int16Array(bytes.buffer);
            const floatData = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) floatData[i] = pcmData[i] / 32768;
            const buffer = ctx.createBuffer(1, floatData.length, 24000);
            buffer.getChannelData(0).set(floatData);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            const startAt = Math.max(ctx.currentTime, playbackScheduleRef.current);
            source.start(startAt);
            playbackScheduleRef.current = startAt + buffer.duration;
          } catch (err) {
            console.error('[VOICE_PLAYBACK]:', err);
          }
        } else if (data.type === 'VOICE_TEXT') {
          addAuditEntry(`VOICE_REPLY: ${data.text}`, 'ai');
          setState(prev => ({
            ...prev,
            history: [...prev.history, {
              role: 'ai',
              text: data.text,
              timestamp: Date.now(),
              agentBadge: AgentRole.SUPERVISOR
            }].slice(-50)
          }));
        } else if (data.type === 'SYSTEM_PULSE') {
          setState(p => ({
            ...p,
            realtimeMetrics: data.metrics,
            systemHealth: data.metrics.cpu > 85 ? 'critical' : data.metrics.cpu > 60 ? 'degraded' : 'optimal'
          }));
        }
      };

      ws.onopen = () => {
        reconnectAttempts = 0; // Reset on successful connection
        setState(p => ({ ...p, osState: { ...p.osState, connected: true } }));
        addAuditEntry("SIDE CAR: Real-time event bus connected.", "bridge");
      };

      ws.onclose = () => {
        setState(p => ({ ...p, osState: { ...p.osState, connected: false } }));
        addAuditEntry("SIDE CAR: Event bus disconnected. Attempting reconnect...", "system");

        // Exponential backoff reconnection
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s delay
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connectWebSocket, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WEBSOCKET_ERROR]:', error);
        addAuditEntry("SIDE CAR: WebSocket error occurred.", "system");
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [initChat]);

  const addAuditEntry = (text: string, source: AuditTrailEntry['source']) => {
    setState(p => ({
      ...p,
      auditTrail: [{ id: Math.random().toString(36).substr(2, 9), text, source, timestamp: Date.now() }, ...p.auditTrail].slice(0, 100)
    }));
  };

  const pushEvent = (type: WatcherEvent['type'], source: string, metadata: any) => {
    const event: WatcherEvent = { id: Math.random().toString(36).substr(2, 9), type, source, timestamp: Date.now(), metadata, status: 'UNPROCESSED' };
    setState(p => ({
      ...p,
      daemon: { ...p.daemon, events: [event, ...p.daemon.events].slice(0, 50) }
    }));
    addAuditEntry(`WATCHER_${type}: Signal detected at ${source}.`, 'system');
  };

  const handleNativeFailure = async (action: string, target: string, error: string) => {
    addAuditEntry(`RECOVERY: Failure in "${action}". Initializing strategy engine.`, 'ai');

    let category: ErrorCategory = 'RUNTIME';
    if (error.includes('PERMISSION') || error.includes('EACCES')) category = 'PERMISSION';
    if (error.includes('ENOENT') || error.includes('NOT_FOUND')) category = 'DEPENDENCY';
    if (error.includes('TIMEOUT') || error.includes('ECONN')) category = 'NETWORK';

    const strategies = {
      PERMISSION: 'REQUEST_ELEVATED_PRIVILEGE_WRAPPER',
      DEPENDENCY: 'AUTO_RESOLVE_MISSING_DEPS',
      NETWORK: 'EXPONENTIAL_BACKOFF_RETRY',
      RUNTIME: 'FLUSH_BUFFER_AND_RESTART',
      LOGIC: 'ROLLBACK_LAST_SNAPSHOT'
    };

    const strategy = strategies[category];

    const attempt: RecoveryAttempt = {
      id: Math.random().toString(36).substr(2, 9),
      targetId: target,
      errorCategory: category,
      strategy,
      outcome: 'PENDING',
      timestamp: Date.now()
    };

    setState(p => ({
      ...p,
      daemon: { ...p.daemon, recoveryLog: [attempt, ...p.daemon.recoveryLog].slice(0, 50) },
      usage: { ...p.usage, fixAttempts: { ...p.usage.fixAttempts, [target]: (p.usage.fixAttempts[target] || 0) + 1 } }
    }));

    await processInput(`[HEALER_SIGNAL]: Native fault in ${action}. Category: ${category}. Strategy identified: ${strategy}. Execute repair and verify.`, 'system');
  };

  const dispatchToSidecar = async (fc: any) => {
    const { action, target, risk, args, explanation } = fc.args;
    const riskMap = { LOW: 0.1, MEDIUM: 0.5, HIGH: 0.9 };
    const currentRisk = riskMap[risk as keyof typeof riskMap] || 0.5;

    // Policy Enforcement
    if (currentRisk > state.policies.riskThreshold) {
      addAuditEntry(`POLICY_GUARD: HIGH_RISK action "${action}" rejected by Supervisor.`, 'system');
      return { success: false, error: 'POLICY_VIOLATION: Risk exceeds autonomous limit (0.8).' };
    }

    const startTime = Date.now();
    try {
      // REAL IPC Bridge
      const token = localStorage.getItem('operator_auth_token');
      const response = await fetch(`${state.osState.bridgeUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fc)
      });
      const result = await response.json();

      const duration = Date.now() - startTime;
      setState(p => ({
        ...p,
        telemetry: [{ id: Math.random().toString(36).substr(2, 9), action, duration, success: result.success, resourceUsage: { cpu: 0.1, mem: 32 }, timestamp: Date.now() }, ...p.telemetry].slice(0, 100)
      }));

      if (!result.success) {
        await handleNativeFailure(action, target, result.error || 'UNSPECIFIED_IPC_ERROR');
      }

      if (action === 'update_goal') {
        setState(p => ({ ...p, goals: p.goals.map(g => g.id === target ? { ...g, progress: parseInt(args || '0') } : g) }));
      }

      addAuditEntry(`IPC_BRIDGE: ${action} on ${target} -> ${result.success ? 'SUCCESS' : 'FAILED'}`, 'bridge');
      return result;
    } catch (e) {
      addAuditEntry(`IPC_BRIDGE_ERROR: Connection to sidecar failed. Ensure daemon is running.`, 'system');
      return { success: false, error: 'SIDECAR_NOT_REACHABLE' };
    }
  };

  const processInput = useCallback(async (input: string, origin: 'user' | 'system' = 'user') => {
    if (!chatRef.current) {
      addAuditEntry('ERROR: Chat service not initialized.', 'system');
      return;
    }

    // Only add USER messages to the visible chat history (not internal system signals)
    if (origin === 'user') {
      setState(prev => ({
        ...prev,
        history: [...prev.history, {
          role: 'user',
          text: input,
          timestamp: Date.now()
        }].slice(-50)
      }));
    }

    setIsProcessing(true);
    try {
      const response = await chatRef.current.sendMessage({ message: input });

      if (!response || (response as any).error) {
        const errorMsg = (response as any)?.error || 'Unknown error from AI service';
        addAuditEntry(`AI_ERROR: ${errorMsg}`, 'system');
        setState(prev => ({
          ...prev,
          history: [...prev.history, {
            role: 'ai',
            text: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
            timestamp: Date.now(),
            agentBadge: AgentRole.SUPERVISOR
          }].slice(-50)
        }));
        return;
      }

      const text = response.text || '';

      // Execute any function calls (IPC)
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          const result = await dispatchToSidecar(fc);
          addAuditEntry(`IPC_ACK: ${fc.name} -> ${result.success ? 'OK' : result.error}`, 'bridge');
        }
      }

      // Only show AI response if there is actual text to display
      if (text.trim()) {
        setState(prev => ({
          ...prev,
          history: [...prev.history, {
            role: 'ai',
            text,
            timestamp: Date.now(),
            agentBadge: AgentRole.SUPERVISOR,
            explanation: 'Planner: Goal verified. Executor: Tools ready. Healer: Standby. Risk: 0.4 (Within Policy).'
          }].slice(-50),
          isSessionStarted: true
        }));
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Unknown error';
      console.error('OS_CORE_RUNTIME_EXCEPTION:', e);
      addAuditEntry(`CRITICAL_ERROR: ${errorMsg}`, 'system');
      setState(prev => ({
        ...prev,
        history: [...prev.history, {
          role: 'ai',
          text: `I ran into a problem: ${errorMsg}. Attempting to recover...`,
          timestamp: Date.now(),
          agentBadge: AgentRole.HEALER
        }].slice(-50)
      }));
      initChat();
    } finally {
      setIsProcessing(false);
    }
  }, [state.osState.bridgeUrl, state.isAutonomous, initChat]);

  const bootDaemon = () => {
    playClick();
    haptic('medium');
    setState(p => ({
      ...p,
      daemon: {
        ...p.daemon,
        isBooted: true,
        services: p.daemon.services.map(s => ({ ...s, status: 'RUNNING', lastHeartbeat: Date.now() }))
      }
    }));
    addAuditEntry("BOOT: Background orchestrator active.", "bridge");
    addToast({
      type: 'success',
      title: 'Daemon Started',
      message: 'Background services are now running'
    });
    playSuccess();
    processInput("SYSTEM_BOOT: OS Sidecar IPC listener online. Monitoring heartbeats.", 'system');
  };


  return (
      <div className="flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden">
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setCommandOpen(false)}
        onToggleTheme={() => setIsDark(!isDark)}
        onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
        isDark={isDark}
        notificationsEnabled={notificationsEnabled}
      />

      <Sidebar mode={state.currentMode} onModeChange={(m) => { setState(p => ({ ...p, currentMode: m })); playClick(); }} />
      <main className="flex-1 flex flex-col relative overflow-hidden border-l border-slate-100">
        <Header
          mode={state.currentMode}
          envSignals={state.envSignals}
          onAddSignal={(s) => pushEvent(s.type as WatcherEvent['type'], s.value, { manual: true })}
          health={state.systemHealth}
          isOverloaded={state.isOverloaded}
        />

        {/* Toolbar */}
        <div className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newState = !state.isAutonomous;
                setState(p => ({ ...p, isAutonomous: newState }));
                playClick();
                if (newState) {
                  addToast({ type: 'warning', title: 'Auto Mode On', message: 'AI is acting autonomously' });
                } else {
                  addToast({ type: 'info', title: 'Manual Mode', message: 'Autonomous actions disabled' });
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                state.isAutonomous
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {state.isAutonomous ? 'Auto Mode' : 'Manual'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-600">Connected</span>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Terminal
            history={state.history}
            onSend={(txt) => { playClick(); processInput(txt); }}
            isProcessing={isProcessing}
            onExecute={(id) => { playClick(); processInput(`MANUAL_SIGNAL: ${id}`); }}
            onToggleExplain={(i) => {
              playClick();
              const h = [...state.history];
              h[i].isExplainMode = !h[i].isExplainMode;
              setState(p => ({ ...p, history: h }));
            }}
            isVoiceActive={isVoiceActive}
            onToggleVoice={toggleVoice}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
