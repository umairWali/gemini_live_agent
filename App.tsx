
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
import SettingsPanel from './components/SettingsPanel';
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
  const [isDark, setIsDark] = useState(() => {
    // Load theme from localStorage, default to true (dark)
    const savedTheme = localStorage.getItem('operator_theme');
    return savedTheme === null ? true : savedTheme === 'true';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

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
  const [isConnected, setIsConnected] = useState(false);
  const voiceSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const playbackScheduleRef = useRef<number>(0);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isUserSpeakingRef = useRef<boolean>(false);
  const aiGainNodeRef = useRef<GainNode | null>(null);
  const workletModuleLoadedRef = useRef<boolean>(false);
  const voiceSessionCounterRef = useRef<number>(0);
  const isAiSpeakingRef = useRef<boolean>(false); // NEW: Track if AI is talking
  const muteUntilRef = useRef<number>(0); // NEW: Track when it's safe to unmute mic (cooldown after AI stops)
  const clientId = useRef<string>(Math.random().toString(36).substring(7));

  const stopAllPlayback = useCallback(() => {
    if (aiGainNodeRef.current && audioContextRef.current) {
      // Instantly mute
      aiGainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
      aiGainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    }
    activeAudioSourcesRef.current.forEach(source => {
      try { source.stop(); source.disconnect(); } catch (e) { }
    });
    activeAudioSourcesRef.current = [];
    playbackScheduleRef.current = 0;
    isAiSpeakingRef.current = false;
    muteUntilRef.current = Date.now() + 1000; // 1-second cooldown after stopping
    console.log('[CLIENT]: All playback stopped and speaker flag reset.');
  }, []);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenCaptureIntervalRef = useRef<any>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraCaptureIntervalRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('operator_master_prod_v11', JSON.stringify(state));
  }, [state]);

  const addAuditEntry = (text: string, source: any) => {
    setState(prev => ({
      ...prev,
      auditTrail: [{ id: Date.now().toString(), text, source, timestamp: Date.now() }, ...prev.auditTrail].slice(0, 50)
    }));
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
    // Handle the case where the server disconnected
    if (!isConnected) {
      addToast({ 
        type: 'error', 
        title: 'System Offline', 
        message: 'Establishing connection to Orchestrator... Please wait.' 
      });
      return;
    }

    const ws = (window as any).operatorWs as WebSocket;

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
    
    // Increment session counter to invalidate previous ones
    const sessionId = ++voiceSessionCounterRef.current;
    (ws as any).voiceSessionId = sessionId;
    
    console.log('[CLIENT]: Requesting START_VOICE, local sessionId:', sessionId);
    ws.send(JSON.stringify({ type: 'START_VOICE', sessionId, clientId: clientId.current }));
  }, [isVoiceActive, isVoiceConnecting, isVoiceReady, isConnected, addToast]);

  const startMediaStream = useCallback(() => {
    const ws = (window as any).operatorWs as WebSocket;
    navigator.mediaDevices.getUserMedia({ 
      audio: { 
        sampleRate: 16000, 
        channelCount: 1, 
        echoCancellation: true, 
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
      .then(async stream => {
        mediaStreamRef.current = stream;
        const ctx = audioContextRef.current!;

        // Clean up old worklet if still hanging
        if (workletNodeRef.current) {
          try { workletNodeRef.current.disconnect(); } catch (e) { }
          workletNodeRef.current = null;
        }

        // Ensure AI Gain Node exists and is at full volume
        if (!aiGainNodeRef.current) {
          aiGainNodeRef.current = ctx.createGain();
          aiGainNodeRef.current.connect(ctx.destination);
        }
        // Always reset gain to 1 on new session start (avoid stuck-muted state)
        aiGainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        aiGainNodeRef.current.gain.setValueAtTime(1, ctx.currentTime);

        // Load AudioWorklet module ONLY ONCE (re-adding causes hang/error)
        if (!workletModuleLoadedRef.current) {
          await ctx.audioWorklet.addModule('/audio-processor.js');
          workletModuleLoadedRef.current = true;
        }

        const source = ctx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(ctx, 'audio-processor');
        workletNodeRef.current = workletNode;

        source.connect(analyzerRef.current!);
        source.connect(workletNode);

        let audioBuffer: Int16Array[] = [];
        let bufferLength = 0;        // Pure audio streamer — Gemini's server VAD handles all turn-taking
        workletNode.port.onmessage = (e) => {
          if (ws.readyState === WebSocket.OPEN && e.data.event === 'data') {
            // MUTE PROTECTION: If AI is speaking OR we are in the cooldown period, drop mic data
            if (isAiSpeakingRef.current || Date.now() < muteUntilRef.current) {
              audioBuffer = [];
              bufferLength = 0;
              return;
            }

            const inputData = e.data.buffer;
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
            }

            audioBuffer.push(pcmData);
            bufferLength += pcmData.length;

            // 512 samples = ~32ms at 16kHz — much lower latency
            if (bufferLength >= 512) {
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
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'VOICE_AUDIO', data: btoa(binary) }));
              }
              audioBuffer = [];
              bufferLength = 0;
            }
          }
        };
        setIsVoiceConnecting(false);
        setIsVoiceActive(true);
        addToast({ type: 'success', title: 'Voice Live', message: 'Gemini is listening...' });
        console.log('[CLIENT]: Audio pipeline ready. 32ms chunks, Server-Side VAD.');
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

  const toggleCamera = useCallback(async () => {
    const ws = (window as any).operatorWs;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (isCameraActive) {
        setIsCameraActive(false);
        if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(t => t.stop());
        if (cameraCaptureIntervalRef.current) clearInterval(cameraCaptureIntervalRef.current);
      } else {
        addToast({ type: 'error', title: 'Connection Error', message: 'WebSocket is disconnected.' });
      }
      return;
    }

    if (isCameraActive) {
      setIsCameraActive(false);
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(t => t.stop());
      if (cameraCaptureIntervalRef.current) clearInterval(cameraCaptureIntervalRef.current);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360, frameRate: 5 } });
      cameraStreamRef.current = stream;
      setIsCameraActive(true);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      cameraCaptureIntervalRef.current = setInterval(() => {
        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = 640;
          canvas.height = 360;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const jpeg = canvas.toDataURL('image/jpeg', 0.6);
          ws.send(JSON.stringify({ type: 'CAMERA_FRAME', data: jpeg }));
        }
      }, 500);

      stream.getVideoTracks()[0].onended = () => {
        setIsCameraActive(false);
        if (cameraCaptureIntervalRef.current) clearInterval(cameraCaptureIntervalRef.current);
      };
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Camera Error', message: 'Could not access webcam.' });
    }
  }, [isCameraActive]);

  // --- WebSocket Connection Management ---
  const reconnectTimeoutRef = useRef<any>(null);

  const connectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    // CRITICAL: Close existing socket if it exists to prevent double voices
    const existingWs = (window as any).operatorWs as any;
    if (existingWs) {
      console.log('[WS]: Closing stale connection...');
      if (existingWs.heartbeat) clearInterval(existingWs.heartbeat);
      existingWs.onclose = null; // Prevent trigger of reconnect logic
      existingWs.onerror = null;
      existingWs.onmessage = null;
      existingWs.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/`;
    const ws = new WebSocket(wsUrl);
    (window as any).operatorWs = ws;

    ws.onopen = () => {
      console.log('[WS]: Connected');
      setIsConnected(true);
      setState(p => ({ ...p, osState: { ...p.osState, connected: true } }));
      
      // Heartbeat to keep connection alive on Cloud Run
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 15000);
      (ws as any).heartbeat = heartbeatInterval;
      
      // Fetch goals
      fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_goals', target: '' })
      }).then(r => r.json()).then(d => {
        if (d.success) setState(p => ({ ...p, goals: JSON.parse(d.output) }));
      });
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        
        // CRITICAL: Ensure only the absolute latest socket processes messages
        if ((window as any).operatorWs !== ws) {
          try { ws.close(); } catch(e) {}
          return;
        }

        if (data.type === 'VOICE_RESPONSE') {
          const currentId = (ws as any).voiceSessionId;
          const msgId = data.sessionId;
          
          // Debug log for every chunk to help identify issues
          if (Math.random() < 0.01) {
            console.log(`[CLIENT_DEBUG]: Receive chunk. ClientSession=${currentId}, MsgSession=${msgId}`);
          }

          // Strict block only if IDs explicitly mismatch
          if (msgId && currentId && String(msgId) !== String(currentId)) {
            return;
          }

          isAiSpeakingRef.current = true;
          muteUntilRef.current = Date.now() + 2000; // continually push mute window while chunks arrive

          // Log only 1 in 50 chunks to reduce console noise
          if (Math.random() < 0.02) {
            console.log(`[CLIENT]: Playing AI audio chunk (Session: ${msgId || 'legacy'})`);
          }
          
          try {
            const ctx = audioContextRef.current;
            if (!ctx) return;
            if (ctx.state === 'suspended') await ctx.resume();
            
            if (aiGainNodeRef.current) {
              aiGainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
              aiGainNodeRef.current.gain.setValueAtTime(1, ctx.currentTime);
            }
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
            source.connect(aiGainNodeRef.current!);
            source.connect(analyzerRef.current!);
            source.onended = () => {
              try { source.disconnect(); } catch (e) {}
              activeAudioSourcesRef.current = activeAudioSourcesRef.current.filter(s => s !== source);
              if (activeAudioSourcesRef.current.length === 0) {
                isAiSpeakingRef.current = false;
                muteUntilRef.current = Date.now() + 1500; // 1.5s echo flush window after finishing
              }
            };
            activeAudioSourcesRef.current.push(source);

            // Safety fallback: if AI hasn't spoken in 5 seconds of chunks, something is wrong
            if ((window as any).aiMuteTimeout) clearTimeout((window as any).aiMuteTimeout);
            (window as any).aiMuteTimeout = setTimeout(() => {
                if (isAiSpeakingRef.current && activeAudioSourcesRef.current.length === 0) {
                    console.log('[CLIENT]: Safety reset of AiSpeaking flag.');
                    isAiSpeakingRef.current = false;
                }
            }, 5000);

            // Ensure consecutive chunks play seamlessly
            const now = ctx.currentTime;
            let startAt = playbackScheduleRef.current || now;
            if (startAt < now) startAt = now; // If lagging, catch up to current time
            
            source.start(startAt);
            playbackScheduleRef.current = startAt + buffer.duration;
          } catch (err: any) {
            console.error('[CLIENT_PLAYBACK_ERR]:', err.message);
          }
        } else if (data.type === 'VOICE_READY') {
          setIsVoiceReady(true);
          startMediaStream();
        } else if (data.type === 'USER_INTERRUPTED') {
          // Gemini's VAD detected user started speaking → kill AI audio immediately
          console.log('[CLIENT]: Gemini VAD: User interrupted AI.');
          stopAllPlayback();
          isAiSpeakingRef.current = false; // Reset speaker state
          isUserSpeakingRef.current = true;
          // Also signal server to stop sending AI audio chunks
          const wsRef = (window as any).operatorWs as any;
          if (wsRef?.readyState === WebSocket.OPEN) {
            wsRef.send(JSON.stringify({ type: 'STOP_AI_SPEECH' }));
          }
        } else if (data.type === 'AI_TURN_COMPLETE') {
          // Gemini finished speaking → ready to listen again
          console.log('[CLIENT]: AI turn complete — listening.');
          isUserSpeakingRef.current = false;
          isAiSpeakingRef.current = false; // Just in case
          if (aiGainNodeRef.current) {
            aiGainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current?.currentTime || 0);
          }
        } else if (data.type === 'VOICE_ENDED') {
          // Gemini session ended gracefully (not an error)
          console.log('[CLIENT]: Voice session ended:', data.reason);
          stopAllPlayback();
          isAiSpeakingRef.current = false;
          isUserSpeakingRef.current = false;
          setIsVoiceActive(false);
          setIsVoiceReady(false);
          addToast({ type: 'info', title: 'Voice Ended', message: 'Session ended. Press mic to reconnect.' });
        } else if (data.type === 'VOICE_ERROR') {
          addToast({ type: 'error', title: 'Gemini Error', message: data.error });
          setIsVoiceActive(false);
          setIsVoiceReady(false);
        } else if (data.type === 'SYSTEM_PULSE') {
          setState(p => ({ ...p, realtimeMetrics: data.metrics }));
        }
      }
    };

    ws.onclose = () => {
      console.log('[WS]: Disconnected. Retrying in 3s...');
      if ((ws as any).heartbeat) clearInterval((ws as any).heartbeat);
      setIsConnected(false);
      setIsVoiceActive(false);
      setIsVoiceReady(false);
      setState(p => ({ ...p, osState: { ...p.osState, connected: false } }));
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []); // Stable callback, no dependency on state to prevent resets

  useEffect(() => {
    connectWebSocket();
    const auditTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/audit');
        const data = await res.json();
        if (data.success && data.logs) {
          setState(p => ({ ...p, auditTrail: data.logs }));
        }
      } catch (e) { }
    }, 5000);

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(auditTimer);
      // Clean up WebSocket on sidecar unmount
      const ws = (window as any).operatorWs as WebSocket;
      if (ws) {
        ws.onclose = null;
        ws.close();
        (window as any).operatorWs = null;
      }
    };
  }, [connectWebSocket]);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('operator_theme', isDark.toString());
  }, [isDark]);

  return (
    <div className={`flex w-screen h-screen overflow-hidden ${isDark ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} font-sans tracking-tight`}>
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-72 transform transition-transform duration-300 z-50 md:hidden ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex flex-col h-full ${isDark ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-200'}`}>
          <ChatSidebar
            isDark={isDark}
            savedSessions={state.savedSessions || []}
            onSelectSession={(id) => {
              const s = state.savedSessions?.find(s => s.id === id);
              if (s) setState(p => ({ ...p, history: s.history }));
              setShowMobileSidebar(false);
            }}
            onNewChat={() => {
              if (state.history.length > 0) {
                const title = state.history[0].text.slice(0, 20) + '...';
                setState(p => ({ ...p, savedSessions: [{ id: Date.now().toString(), title, history: p.history, timestamp: Date.now() }, ...(p.savedSessions || [])], history: [] }));
                setShowMobileSidebar(false);
              }
            }}
          />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex flex-col border-r transition-colors w-72 h-full overflow-hidden ${isDark ? 'bg-slate-950 border-white/5 shadow-2xl' : 'bg-white border-slate-200'} z-20 shrink-0`}>
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
        <AppHeader 
          isDark={isDark} 
          isVoiceActive={isVoiceActive} 
          isConnected={isConnected}
          emotionState={state.emotionState || 'normal'} 
          audioLevel={audioLevel}
          onThemeToggle={() => setIsDark(!isDark)}
          onSettingsClick={() => setShowSettings(true)}
          onMobileMenuClick={() => setShowMobileSidebar(!showMobileSidebar)}
          onNewChat={() => {
            if (state.history.length > 0) {
              const title = state.history[0].text.slice(0, 20) + '...';
              setState(p => ({ ...p, savedSessions: [{ id: Date.now().toString(), title, history: p.history, timestamp: Date.now() }, ...(p.savedSessions || [])], history: [] }));
            }
          }}
        />
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
            isCameraActive={isCameraActive}
            onToggleCamera={toggleCamera}
          />
        </div>
      </main>

      <RightPanel state={state} isDark={isDark} onModeChange={() => { }} onAutonomousToggle={() => setState(p => ({ ...p, isAutonomous: !p.isAutonomous }))} />
      
      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isDark={isDark}
        onThemeToggle={() => setIsDark(!isDark)}
      />
    </div>
  );
};

export default App;
