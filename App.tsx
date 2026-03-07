
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  WorkMode, TaskCategory, AppState, AgentRole, WatcherEvent, RecoveryAttempt,
  Message, ErrorCategory, TelemetryPoint, AuditTrailEntry, Goal
} from './types';
import MissionBoard from './components/MissionBoard';
import ChatSidebar from './components/ChatSidebar';
import Terminal from './components/Terminal';
import RightPanel from './components/RightPanel';
import AppHeader from './components/AppHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { useCommandPalette } from './components/CommandPalette';
import { useSoundEffects } from './hooks/useSoundEffects';
import { LucideIcon, Radio } from 'lucide-react';

const MASTER_SYSTEM_PROMPT = `You are Personal Operator — an elite, autonomous system companion.

Your job is to manage the user's projects, fix their code, participate in their meetings, and remember their personal preferences.

ELITE CAPABILITIES:
1. VISION: If the user shares their screen (especially during Google Meet/Teams), you can see what is happening. Use this to prepare meeting minutes, record tasks, and identify people.
2. MISSION BOARD (GOALS): Use 'get_goals' and 'set_goals' to manage a persistent checklist of user goals. You should proactively update these as tasks are completed.
3. DEVELOPER AGENT: If the user mentions a code error or a failing build, use 'run_fix' to analyze and attempt an autonomous patch of the codebase.
4. DAILY BRIEFING: At the start of every session, you should greet the user and provide a concise summary of their active goals, system status, and any pending reminders.
5. TOOLS: You can run commands, read/write/move/delete files, or create directories on the user's PC using 'execute_action'.
6. MEMORY: Use 'get_knowledge' and 'set_knowledge' to store user preferences and long-term facts.
7. GUARD: Monitor CPU/RAM and alert the user if thresholds are exceeded.

Respond in the SAME LANGUAGE the user writes in (Urdu, English, or mixed). Keep responses natural, professional, and proactive.`;

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
  const { playSuccess, playError, playNotification, playClick, haptic } = useSoundEffects(true);
  const [isDark, setIsDark] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('operator_master_prod_v11');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        osState: { ...parsed.osState, bridgeUrl: '' },
        isSessionStarted: false
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
      goals: [],
      activeProjects: ['Main Project'],
      vault: [{ id: 'v1', key: 'AWS_PROD_SECRET', value: '******************', timestamp: Date.now() }],
      auditTrail: [],
      agentActivities: Object.values(AgentRole).map(role => ({
        agent: role as AgentRole,
        status: 'idle',
        message: 'Awaiting directive...',
        timestamp: Date.now()
      })),
      knowledgeGraph: {
        nodes: [
          { id: 'user', label: 'Umair', type: 'person', relevance: 0.9 },
          { id: 'role', label: 'Developer', type: 'fact', relevance: 1.0 },
          { id: 'project', label: 'Personal Operator AI', type: 'project', relevance: 0.8 },
          { id: 'lang', label: 'Urdu/English', type: 'preference', relevance: 0.7 }
        ],
        links: [
          { source: 'user', target: 'role' },
          { source: 'user', target: 'project' },
          { source: 'user', target: 'lang' }
        ]
      },
      history: [], savedSessions: [], envSignals: [], evolutionLogs: [], telemetry: [],
      osState: { connected: false, platform: 'linux', runningApps: ['Terminal', 'Code', 'Chrome'], bridgeUrl: '' },
      emotionState: 'normal',
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
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const voiceSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const playbackScheduleRef = useRef<number>(0);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenCaptureIntervalRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('operator_master_prod_v11', JSON.stringify(state));
  }, [state]);

  const addAuditEntry = (text: string, source: any) => {
    setState(prev => ({
      ...prev,
      auditTrail: [{ id: Date.now().toString(), text, source, timestamp: Date.now() }, ...prev.auditTrail].slice(0, 50)
    }));
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const processInput = async (txt: string, origin: 'user' | 'system' = 'user') => {
    if (!txt.trim() || isProcessing) return;
    setIsProcessing(true);

    // Set Agent status
    setState(p => ({
      ...p,
      agentActivities: p.agentActivities.map(a =>
        a.agent === AgentRole.PLANNER ? { ...a, status: 'thinking', message: 'Synthesizing response...' } : a
      )
    }));

    if (origin === 'user') {
      setState(p => ({
        ...p,
        history: [...p.history, { role: 'user', text: txt, timestamp: Date.now() }].slice(-50)
      }));
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: txt,
          history: state.history,
          systemPrompt: MASTER_SYSTEM_PROMPT
        })
      });
      const data = await response.json();

      if (data.success && data.reply) {
        setState(p => ({
          ...p,
          agentActivities: p.agentActivities.map(a =>
            a.agent === AgentRole.PLANNER ? { ...a, status: 'idle', message: 'Directive complete.' } :
              a.agent === AgentRole.EXECUTOR ? { ...a, status: 'acting', message: 'Rendering response...' } : a
          ),
          history: [...p.history, { role: 'ai', text: data.reply, timestamp: Date.now(), agentBadge: AgentRole.EXECUTOR }].slice(-50)
        }));

        setTimeout(() => {
          setState(p => ({
            ...p,
            agentActivities: p.agentActivities.map(a =>
              a.agent === AgentRole.EXECUTOR ? { ...a, status: 'idle', message: 'Awaiting directive...' } : a
            )
          }));
        }, 3000);

        if (isVoiceActive) speakText(data.reply);
      } else {
        addToast({ type: 'error', title: 'AI Operator Error', message: data.error || 'Failed to generate response.' });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Network Error', message: 'Could not connect to Operator Sidecar.' });
    } finally {
      setIsProcessing(false);
      setState(p => ({
        ...p,
        agentActivities: p.agentActivities.map(a =>
          a.agent === AgentRole.PLANNER ? { ...a, status: 'idle', message: 'Task finalized.' } : a
        )
      }));
    }
  };

  const toggleVoice = useCallback(async () => {
    const ws = (window as any).operatorWs as WebSocket;

    // Handle the case where the server disconnected while the mic was active
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (isVoiceActive || isVoiceConnecting || isVoiceReady) {
        setIsVoiceActive(false);
        setIsVoiceReady(false);
        setIsVoiceConnecting(false);
        if (workletNodeRef.current) {
          try { workletNodeRef.current.disconnect(); } catch (e) { }
          workletNodeRef.current = null;
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        addToast({ type: 'success', title: 'Voice Offline', message: 'Session closed locally (server was disconnected).' });
      } else {
        addToast({ type: 'error', title: 'Connection Error', message: 'WebSocket not connected.' });
      }
      return;
    }

    // Initialize AudioContext immediately on user gesture
    if (!audioContextRef.current) {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new AudioCtx({ sampleRate: 16000 });

      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateLevel = () => {
        if (analyzerRef.current) {
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average * 2.5);
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
    }

    await audioContextRef.current.resume();

    if (isVoiceActive || isVoiceConnecting || isVoiceReady) {
      console.log('[CLIENT]: Closing session manually');
      setIsVoiceActive(false);
      setIsVoiceReady(false);
      setIsVoiceConnecting(false);
      ws.send(JSON.stringify({ type: 'STOP_VOICE' }));

      if (workletNodeRef.current) {
        try { workletNodeRef.current.disconnect(); } catch (e) { }
        workletNodeRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      addToast({ type: 'success', title: 'Voice Offline', message: 'Mic stream closed.' });
      return;
    }

    setIsVoiceConnecting(true);
    addToast({ type: 'info', title: 'Voice Link', message: 'Requesting Gemini stream...' });
    console.log('[CLIENT]: Requesting START_VOICE');
    ws.send(JSON.stringify({ type: 'START_VOICE' }));
  }, [isVoiceActive, isVoiceConnecting, isVoiceReady, addToast]);

  const startMediaStream = useCallback(() => {
    const ws = (window as any).operatorWs as WebSocket;
    navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, noiseSuppression: false } })
      .then(async stream => {
        mediaStreamRef.current = stream;
        const ctx = audioContextRef.current!;

        // Clean up old worklet if still hanging
        if (workletNodeRef.current) {
          try { workletNodeRef.current.disconnect(); } catch (e) { }
        }

        await ctx.audioWorklet.addModule('/audio-processor.js');
        const source = ctx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(ctx, 'audio-processor');
        workletNodeRef.current = workletNode;

        source.connect(analyzerRef.current!);
        source.connect(workletNode);

        let audioBuffer: Int16Array[] = [];
        let bufferLength = 0;

        workletNode.port.onmessage = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            if (e.data.event === 'speech_end') {
              ws.send(JSON.stringify({ type: 'VOICE_TURN_COMPLETE' }));
            } else if (e.data.event === 'data') {
              const inputData = e.data.buffer; // Float32Array
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }

              audioBuffer.push(pcmData);
              bufferLength += pcmData.length;

              // Only send if VOICE_READY received from server
              if (bufferLength >= 2048) {
                const combined = new Int16Array(bufferLength);
                let offset = 0;
                for (const chunk of audioBuffer) {
                  combined.set(chunk, offset);
                  offset += chunk.length;
                }

                const bytes = new Uint8Array(combined.buffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i += 8192) {
                  binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
                }

                // CRITICAL Handshake Check
                // Log occasionally to confirm data flow
                if (Math.random() < 0.02) console.log('[CLIENT_DEBUG]: Audio Streaming Active');
                ws.send(JSON.stringify({ type: 'VOICE_AUDIO', data: btoa(binary) }));

                audioBuffer = [];
                bufferLength = 0;
              }
            }
          }
        };

        source.connect(workletNode);
        // Do NOT connect worklet to destination (we don't want local echo)

        setIsVoiceConnecting(false);
        setIsVoiceActive(true);
        addToast({ type: 'success', title: 'Voice Online', message: 'You are now live with Gemini.' });
        console.log('[CLIENT]: Stream initialized on top of resumed context.');
      })
      .catch(err => {
        setIsVoiceConnecting(false);
        console.error('[CLIENT]: Mic error', err);
        addToast({ type: 'error', title: 'Microphone Error', message: err.message });
      });
  }, [addToast]);

  const toggleScreenShare = useCallback(async () => {
    const ws = (window as any).operatorWs as WebSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (isScreenSharing) {
        setIsScreenSharing(false);
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
        if (screenCaptureIntervalRef.current) clearInterval(screenCaptureIntervalRef.current);
      }
      return;
    }

    if (isScreenSharing) {
      setIsScreenSharing(false);
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
      if (screenCaptureIntervalRef.current) clearInterval(screenCaptureIntervalRef.current);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 } });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      screenCaptureIntervalRef.current = setInterval(() => {
        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = 640;
          canvas.height = 360;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const jpeg = canvas.toDataURL('image/jpeg', 0.6);
          ws.send(JSON.stringify({ type: 'SCREEN_FRAME', data: jpeg }));
        }
      }, 500);

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        if (screenCaptureIntervalRef.current) clearInterval(screenCaptureIntervalRef.current);
      };
    } catch (e) {
      console.error(e);
    }
  }, [isScreenSharing]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/`;
    const ws = new WebSocket(wsUrl);
    (window as any).operatorWs = ws;

    ws.onopen = () => {
      setState(p => ({ ...p, osState: { ...p.osState, connected: true } }));
      // Fetch goals
      fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_goals', target: '' })
      }).then(r => r.json()).then(d => {
        if (d.success) setState(p => ({ ...p, goals: JSON.parse(d.output) }));
      });

      // Removed text briefing as native-audio only accepts audio input.
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'VOICE_RESPONSE') {
          try {
            const ctx = audioContextRef.current;
            if (!ctx) return;
            if (ctx.state === 'suspended') await ctx.resume();

            const binaryString = atob(data.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

            // Native audio usually comes at 24kHz. Let's handle it.
            const pcmData = new Int16Array(bytes.buffer);
            const floatData = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) floatData[i] = pcmData[i] / 32768;

            const buffer = ctx.createBuffer(1, floatData.length, 24000);
            buffer.getChannelData(0).set(floatData);

            const source = ctx.createBufferSource();
            source.buffer = buffer;

            // Connect to analyzer for waveform visualization
            source.connect(analyzerRef.current!);
            // CRITICAL: Also connect directly to speakers so we actually hear Gemini's voice
            source.connect(ctx.destination);

            const startAt = Math.max(ctx.currentTime, playbackScheduleRef.current || 0);
            source.start(startAt);
            playbackScheduleRef.current = startAt + buffer.duration;
            console.log(`[CLIENT]: Playing ${Math.round(buffer.duration * 1000)}ms audio chunk.`);
          } catch (err: any) {
            console.error('[CLIENT_PLAYBACK_ERR]:', err.message);
          }
        } else if (data.type === 'VOICE_TEXT' || data.type === 'VOICE_PROACTIVE_ALERT' || data.type === 'VOICE_INPUT_TEXT') {
          const role = data.type === 'VOICE_INPUT_TEXT' ? 'user' : 'ai';
          if (data.text && !data.text.startsWith('SYSTEM:')) {
            setState(p => ({
              ...p,
              history: [...p.history, { role, text: data.text, timestamp: Date.now(), agentBadge: role === 'ai' ? AgentRole.SUPERVISOR : undefined }].slice(-50)
            }));
            if (data.type === 'VOICE_PROACTIVE_ALERT') speakText(data.text);
          }
        } else if (data.type === 'VOICE_READY') {
          setIsVoiceReady(true);
          startMediaStream();
        } else if (data.type === 'VOICE_ERROR') {
          addToast({ type: 'error', title: 'Gemini Error', message: data.error });
          setIsVoiceActive(false);
          setIsVoiceReady(false);
          setIsVoiceConnecting(false);
          if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
          }
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
          }
        } else if (data.type === 'SYSTEM_PULSE') {
          setState(p => ({ ...p, realtimeMetrics: data.metrics }));
        } else if (data.type === 'UPDATE_MEMORY') {
          setState(p => {
            const subjectId = data.data.subject.toLowerCase().replace(/\s+/g, '_');
            const objectId = data.data.object.toLowerCase().replace(/\s+/g, '_');

            // Check if nodes already exist to prevent dupes
            const nodes = [...p.knowledgeGraph.nodes];
            if (!nodes.find(n => n.id === subjectId)) {
              nodes.push({ id: subjectId, label: data.data.subject, type: 'concept', relevance: 0.8 });
            }
            if (!nodes.find(n => n.id === objectId)) {
              nodes.push({ id: objectId, label: data.data.object, type: 'fact', relevance: 0.7 });
            }

            // Find if link exists
            const links = [...p.knowledgeGraph.links];
            if (!links.find(l => l.source === subjectId && l.target === objectId)) {
              links.push({ source: subjectId, target: objectId });
            }

            return { ...p, knowledgeGraph: { nodes, links } };
          });
          addToast({ type: 'success', title: 'Memory Updated', message: `Learned: ${data.data.subject} -> ${data.data.object}` });
        } else if (data.type === 'UPDATE_SENTIMENT') {
          setState(p => ({ ...p, emotionState: data.emotion }));
          addToast({ type: 'info', title: 'Empathy Engine', message: `Emotional state shifted to: ${data.emotion}` });
        }
      }
    };

    const auditTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/audit');
        const data = await res.json();
        if (data.success && data.logs) {
          const newLogs = data.logs;
          // Check if latest log is a security threat and is new
          const lastLog = newLogs[newLogs.length - 1];
          if (lastLog && (lastLog.text.includes('SECURITY ALERT') || lastLog.text.includes('CRITICAL'))) {
            // Only toast if it's within the last 5 seconds
            const logTime = new Date(lastLog.timestamp).getTime();
            if (Date.now() - logTime < 6000) {
              addToast({
                type: 'error',
                title: 'Firewall Blockage',
                message: 'A critical system modification was intercepted and blocked.'
              });
            }
          }
          setState(p => ({ ...p, auditTrail: newLogs }));
        }
      } catch (e) { }
    }, 5000);

    return () => {
      ws.close();
      clearInterval(auditTimer);
    };
  }, []);

  return (
    <div className={`flex w-screen h-screen overflow-hidden ${isDark ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} font-sans tracking-tight`}>
      <div className={`flex flex-col border-r transition-colors w-72 h-full overflow-hidden ${isDark ? 'bg-slate-950 border-white/5 shadow-2xl' : 'bg-white border-slate-200'} z-20 shrink-0`}>
        <ChatSidebar
          isDark={isDark}
          savedSessions={state.savedSessions || []}
          onSelectSession={(id) => {
            const s = state.savedSessions?.find(s => s.id === id);
            if (s) setState(p => ({ ...p, history: s.history }));
          }}
          onNewChat={() => {
            if (state.history.length > 0) {
              const title = state.history[0].text.slice(0, 20) + '...';
              setState(p => ({ ...p, savedSessions: [{ id: Date.now().toString(), title, history: p.history, timestamp: Date.now() }, ...(p.savedSessions || [])], history: [] }));
            }
          }}
        />
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 border-t border-white/5 space-y-4">
          <MissionBoard goals={state.goals} isDark={isDark} />
        </div>
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AppHeader isDark={isDark} isVoiceActive={isVoiceActive} emotionState={state.emotionState || 'normal'} audioLevel={audioLevel} />
        <div className="flex-1 overflow-hidden">
          <Terminal
            history={state.history}
            onSend={processInput}
            isProcessing={isProcessing}
            onExecute={(id) => processInput(`MANUAL_SIGNAL: ${id}`, 'system')}
            isVoiceActive={isVoiceActive}
            onToggleVoice={toggleVoice}
            isDark={isDark}
            isScreenSharing={isScreenSharing}
            onToggleScreenShare={toggleScreenShare}
          />
        </div>
      </main>

      <RightPanel state={state} isDark={isDark} onModeChange={() => { }} onAutonomousToggle={() => setState(p => ({ ...p, isAutonomous: !p.isAutonomous }))} />
    </div>
  );
};

export default App;
