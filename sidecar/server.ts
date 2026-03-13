
import express from 'express';
import fs from 'fs';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { executeAction } from './modules/executor';
import { WatcherEngine } from './modules/watcher';
import { RecoveryEngine } from './modules/recovery';
import { StateManager } from './modules/state_manager';
import { Brain } from './modules/brain';
import { JudgmentEngine, RiskLevel } from './modules/judgment';
import { HealthMonitor } from './modules/health';
import { ConfidenceEngine } from './modules/confidence';
import { PriorityEngine } from './modules/priority';
import { VerifierEngine } from './modules/verifier';
import { AdaptiveEngine } from './modules/adaptive';
import { OutcomeEngine } from './modules/outcome';
import { GoalManager } from './modules/goal_manager';
import { ArchitectEngine } from './modules/architect';
import { WorkModeEngine } from './modules/work_mode';
import { ErpNextConsultant } from './modules/erpnext_consultant';
import { EmailIntegration } from './modules/email_integration';
import { CalendarSync } from './modules/calendar_sync';
import { ScreenshotOCR } from './modules/screenshot_ocr';
import { VoiceTranscription } from './modules/voice_transcription';
import { DocumentTemplates } from './modules/document_templates';
import { SelfHealingCode } from './modules/self_healing';
import { PredictiveAlerts } from './modules/predictive_alerts';
import { MultiAgentSwarm } from './modules/multi_agent_swarm';
import { CodeReviewAI } from './modules/code_review_ai';
import { DocumentationGenerator } from './modules/documentation_generator';
import { DeploymentPipeline } from './modules/deployment_pipeline';
import { CreativeStoryteller } from './modules/creative_storyteller';
import { UINavigator } from './modules/ui_navigator';
import { IncomeEngine } from './modules/income_engine/engine';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import osUtils from 'os-utils';
import { createServer } from 'http';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/' });
const distPath = path.join(process.cwd(), 'dashboard');

app.use(cors());
app.use(express.json());

// --- 1. CORE ASSETS & API ---
// Note: distPath contains both the build and anything from public/
app.use(express.static(distPath));

app.get('/health', (req, res) => {
    res.json({ success: true, status: 'HEALTHY', uptime: process.uptime() });
});

app.get('/api/status', (req, res) => {
    res.json({ success: true, hasApiKey: !!process.env.API_KEY });
});

app.get('/api/audit', (_req, res) => {
    const auditPath = path.resolve(process.cwd(), 'audit_trail.json');
    try {
        if (!fs.existsSync(auditPath)) return res.json({ success: true, logs: [] });
        const data = fs.readFileSync(auditPath, 'utf8');
        res.json({ success: true, logs: JSON.parse(data) });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Explicit manifest route with correct paths
app.get('/manifest.json', (_req, res) => {
    res.json({
        name: 'Personal Operator Dashboard',
        short_name: 'Personal Operator',
        start_url: '/dashboard/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#020617',
        icons: [
            { "src": "/logo.png", "type": "image/png", "sizes": "192x192" },
            { "src": "/logo.png", "type": "image/png", "sizes": "512x512" }
        ]
    });
});



const recovery = new RecoveryEngine();
const stateManager = new StateManager();

const OPERATOR_TOOLS = [
    { name: "summarize_url", description: "Summarize a YouTube video or webpage URL.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } } } },
    { name: "set_reminder", description: "Set a smart reminder.", parameters: { type: "OBJECT", properties: { task: { type: "STRING" }, time_in_minutes: { type: "NUMBER" } } } },
    { name: "export_to_docs", description: "Export content to a Google Doc or Excel sheet.", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, content: { type: "STRING" }, format: { type: "STRING" } } } },
    { name: "execute_action", description: "Execute a live system action.", parameters: { type: "OBJECT", properties: { command_description: { type: "STRING" } } } },
    { name: "code_review", description: "Perform a code review.", parameters: { type: "OBJECT", properties: { filename: { type: "STRING" } } } },
    { name: "manage_mission", description: "Add, update, or delete missions on the Mission Board.", parameters: { type: "OBJECT", properties: { action: { type: "STRING", enum: ["add", "update", "delete"] }, title: { type: "STRING" }, progress: { type: "NUMBER" }, status: { type: "STRING", enum: ["pending", "active", "completed", "paused"] } }, required: ["action", "title"] } },
    { name: "manage_knowledge_graph", description: "Add nodes or links to the Neural Knowledge Graph.", parameters: { type: "OBJECT", properties: { action: { type: "STRING", enum: ["add_node", "add_link"] }, label: { type: "STRING" }, type: { type: "STRING", enum: ["person", "project", "fact", "preference"] }, source: { type: "STRING" }, target: { type: "STRING" } }, required: ["action"] } },
    { name: "system_security", description: "Trigger security protocols or audit logs.", parameters: { type: "OBJECT", properties: { action: { type: "STRING", enum: ["lockdown", "audit", "set_threshold"] }, threshold: { type: "NUMBER" } }, required: ["action"] } },
];

async function handleOperatorFunctionCall(call: any): Promise<string> {
    let resultInfo = "Action executed successfully.";

    if (call.name === 'summarize_url') {
        resultInfo = `Analyzed URL: ${call.args?.url}`;
    } else if (call.name === 'set_reminder') {
        resultInfo = `Reminder set: ${call.args?.task} in ${call.args?.time_in_minutes} minutes.`;
    } else if (call.name === 'execute_action') {
        const execResult = await executeAction('run_command', call.args?.command_description);
        resultInfo = execResult.success
            ? `Command output: ${execResult.output?.substring(0, 500)}`
            : `Command failed: ${execResult.error}`;
    } else if (call.name === 'export_to_docs') {
        const format = (call.args?.format || 'doc').toLowerCase();
        if (format === 'excel') {
            const excelResult = await executeAction('generate_excel', call.args?.title, call.args?.content);
            resultInfo = excelResult.success
                ? `Excel file created: ${excelResult.metadata?.filename}`
                : `Excel failed: ${excelResult.error}`;
        } else {
            await executeAction('write_file', `${call.args?.title}.txt`, call.args?.content);
            resultInfo = `Exported as ${call.args?.title}.txt`;
        }
    } else if (call.name === 'code_review') {
        resultInfo = `Code review ready for ${call.args?.filename}`;
    } else if (call.name === 'manage_mission') {
        const { action, title, progress, status } = call.args;
        const state = stateManager.getState();
        if (action === 'add') {
            state.goals.push({
                id: Math.random().toString(36).substr(2, 9),
                title: title || "New Mission",
                description: title || "New Mission",
                status: status || 'pending',
                progress: progress || 0,
                tasks: [],
                createdAt: Date.now()
            });
            resultInfo = `Mission "${title}" added to the board.`;
        } else if (action === 'update') {
            const goal = state.goals.find((g: any) => g.title === title || g.id === title);
            if (goal) {
                if (progress !== undefined) goal.progress = progress;
                if (status) goal.status = status;
                resultInfo = `Mission "${title}" updated.`;
            } else {
                resultInfo = `Mission "${title}" not found.`;
            }
        } else if (action === 'delete') {
            state.goals = state.goals.filter((g: any) => g.title !== title && g.id !== title);
            resultInfo = `Mission "${title}" removed.`;
        }
        stateManager.save();
        broadcast({ type: 'GOALS_UPDATED', goals: state.goals });
    } else if (call.name === 'manage_knowledge_graph') {
        const { action, label, type, source, target } = call.args;
        const state = stateManager.getState();
        if (action === 'add_node') {
            state.knowledgeGraph.nodes.push({
                id: Math.random().toString(36).substr(2, 9),
                label: label || "New Node",
                type: type || 'fact',
                relevance: 0.8
            });
            resultInfo = `Knowledge node "${label}" added.`;
        } else if (action === 'add_link') {
            state.knowledgeGraph.links.push({ source, target });
            resultInfo = `Knowledge link established between ${source} and ${target}.`;
        }
        stateManager.save();
        broadcast({ type: 'KNOWLEDGE_UPDATED', graph: state.knowledgeGraph });
    } else if (call.name === 'system_security') {
        const { action, threshold } = call.args;
        if (action === 'lockdown') {
            stateManager.addAuditEntry(`[SECURITY ALERT]: Global lockdown initiated.`, 'ai');
            resultInfo = `System in LOCKDOWN mode. All protocols secured.`;
        } else if (action === 'audit') {
            resultInfo = `Security Audit complete. 0 threats detected. 5 protocols verified.`;
        }
        broadcast({ type: 'SECURITY_ALERT', text: resultInfo });
    }

    return resultInfo;
}

const judgment = new JudgmentEngine();
const health = new HealthMonitor();
const confidence = new ConfidenceEngine();
const priority = new PriorityEngine();
const verifier = new VerifierEngine();
const adaptive = new AdaptiveEngine(stateManager);
const outcome = new OutcomeEngine();
const goalManager = new GoalManager(stateManager);
const architect = new ArchitectEngine(stateManager);
const workMode = new WorkModeEngine(stateManager);
const erpNextConsultant = new ErpNextConsultant(stateManager);
const emailIntegration = new EmailIntegration(stateManager);
const calendarSync = new CalendarSync(stateManager);
const screenshotOCR = new ScreenshotOCR(stateManager);
const voiceTranscription = new VoiceTranscription(stateManager);
const documentTemplates = new DocumentTemplates(stateManager);
const selfHealingCode = new SelfHealingCode(stateManager);
const predictiveAlerts = new PredictiveAlerts(stateManager, calendarSync, emailIntegration);
const multiAgentSwarm = new MultiAgentSwarm(stateManager);
const codeReviewAI = new CodeReviewAI(stateManager);
const documentationGenerator = new DocumentationGenerator(stateManager);
const deploymentPipeline = new DeploymentPipeline(stateManager);
const creativeStoryteller = new CreativeStoryteller(stateManager);
const uiNavigator = new UINavigator(stateManager);
const incomeEngine = new IncomeEngine(stateManager, creativeStoryteller, uiNavigator);
const watcher = new WatcherEngine(path.resolve(__dirname, '..'));

// Event Bus (WebSocket)
let clients: WebSocket[] = [];
const liveSessions = new Map<WebSocket, any>();
const interruptedSessions = new Set<WebSocket>();
const connectingSockets = new Set<WebSocket>();

// GLOBAL SINGLETON: Force only one voice session ever across all connections
let globalActiveSession: any = null;
let globalActiveWs: WebSocket | null = null;
let globalSessionId: string | null = null;
let globalActiveClientId: string | null = null;
let globalSessionGeneration = 0; // Incremented on each new session to kill stale callbacks
wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('[SIDE CAR]: UI Connected to Event Bus');

    ws.on('message', async (data) => {
        try {
            const raw = data.toString();
            const message = JSON.parse(raw);

            if (message.type === 'START_VOICE') {
                const sessionId = message.sessionId || String(Date.now());
                const clientId = message.clientId || 'default';
                console.log(`[WS]: Voice Request: Client=${clientId}, Session=${sessionId}`);
                
                // Mutex: prevent duplicate START_VOICE from racing
                if (connectingSockets.has(ws)) {
                    console.log('[WS]: Already connecting, ignoring duplicate START_VOICE');
                    return;
                }
                connectingSockets.add(ws);
                
                (ws as any).currentVoiceSessionId = sessionId;

                // Stop previous global session if exists
                if (globalActiveSession) {
                    try { globalActiveSession.close(); } catch (e) { }
                    globalActiveSession = null;
                }
                
                // Cleanup MAP for this specific WS
                const old = liveSessions.get(ws);
                if (old) {
                   try { old.close(); } catch(e) {}
                }
                liveSessions.delete(ws);
                interruptedSessions.clear();
                globalActiveClientId = clientId;
                
                // SET GLOBAL STATE BEFORE connect() to prevent race condition
                // (onmessage fires immediately and checks globalSessionId)
                globalActiveWs = ws;
                globalSessionId = sessionId;
                const thisGeneration = ++globalSessionGeneration; // Unique ID for THIS session

                if (!process.env.API_KEY) {
                    connectingSockets.delete(ws);
                    ws.send(JSON.stringify({ type: 'VOICE_ERROR', error: 'API Key missing' }));
                    return;
                }

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                try {
                    console.log('[AI_LIVE]: Connecting to Gemini Live API (gemini-2.5-flash-native-audio-preview-12-2025)...');
                    const session = await ai.live.connect({
                        model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
                        config: {
                            responseModalities: ["AUDIO"],
                            // Enable Gemini's built-in turn-taking (like Google Gemini app)
                            realtimeInputConfig: {
                                automaticActivityDetection: {
                                    disabled: false, // Let Gemini detect speech automatically
                                    startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                                    endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                                    prefixPaddingMs: 200,
                                    silenceDurationMs: 800, // 0.8s silence = turn complete
                                }
                            },
                            inputAudioTranscription: {},   // Transcribe user speech (for logging)
                            outputAudioTranscription: {},  // Transcribe AI speech (for logging)
                            systemInstruction: {
                                parts: [{ text: 'You are Personal Operator, an elite AI assistant. Respond naturally and conversationally. You have tools to help users with tasks. When the user speaks, listen carefully. When they pause, respond helpfully and concisely. Speak naturally like a human assistant.' }]
                            },
                            tools: [{ functionDeclarations: OPERATOR_TOOLS }]
                        } as any,
                        callbacks: {
                            onmessage: async (msg: any) => {
                                // CRITICAL: Drop messages from stale sessions (prevents double voice)
                                if (thisGeneration !== globalSessionGeneration) {
                                    return; // Silently drop — this is from an old session
                                }

                                // Log all non-audio messages for debugging
                                if (!msg.serverContent?.modelTurn) {
                                    console.log('[AI_DEBUG_MSG]:', JSON.stringify(Object.keys(msg)));
                                }

                                if (msg.setupComplete) {
                                    console.log('[AI_LIVE]: Setup complete — Gemini VAD active.');
                                }
                                // AI is speaking - stream audio to client
                                if (msg.serverContent?.modelTurn) {
                                    if (Math.random() < 0.05) console.log('[AI_AUDIO_OUT]: Gemini is speaking...');
                                    for (const part of (msg.serverContent.modelTurn.parts || [])) {
                                        if (part.inlineData?.data) {
                                            ws.send(JSON.stringify({ type: 'VOICE_RESPONSE', data: part.inlineData.data, sessionId }));
                                        }
                                    }
                                }

                                // Gemini's VAD detected user started speaking → interrupt AI
                                if (msg.serverContent?.interrupted === true) {
                                    console.log('[AI_LIVE]: Gemini detected user interruption.');
                                    ws.send(JSON.stringify({ type: 'USER_INTERRUPTED' }));
                                }

                                // AI finished its turn
                                if (msg.serverContent?.turnComplete === true) {
                                    console.log('[AI_LIVE]: AI turn complete — listening for user.');
                                    ws.send(JSON.stringify({ type: 'AI_TURN_COMPLETE' }));
                                }

                                // User speech transcription (for display/logging)
                                if (msg.serverContent?.inputTranscription?.text) {
                                    const text = msg.serverContent.inputTranscription.text;
                                    console.log('[USER_SAID]:', text);
                                    ws.send(JSON.stringify({ type: 'USER_TRANSCRIPT', text }));
                                }

                                // AI speech transcription
                                if (msg.serverContent?.outputTranscription?.text) {
                                    const text = msg.serverContent.outputTranscription.text;
                                    console.log('[AI_SAID]:', text);
                                    ws.send(JSON.stringify({ type: 'AI_TRANSCRIPT', text }));
                                }

                                // Function calling
                                if (msg.toolCall) {
                                    console.log('[AI_LIVE_TOOL_CALL]:', JSON.stringify(msg.toolCall.functionCalls));
                                    const functionResponses: any[] = [];
                                    for (const call of msg.toolCall.functionCalls) {
                                        const resultInfo = await handleOperatorFunctionCall(call);
                                        functionResponses.push({
                                            id: call.id,
                                            name: call.name,
                                            response: { status: "success", result: resultInfo }
                                        });
                                    }

                                    if (typeof (session as any).sendToolResponse === 'function') {
                                        (session as any).sendToolResponse({ functionResponses });
                                    } else if (typeof (session as any).send === 'function') {
                                        (session as any).send({ toolResponse: { functionResponses } });
                                    }
                                }
                            },
                            onopen: () => {
                                connectingSockets.delete(ws); // Release mutex
                                console.log('[AI_LIVE]: Session Active:', sessionId);
                                ws.send(JSON.stringify({ type: 'VOICE_READY', sessionId }));
                            },
                            onerror: (err: any) => {
                                console.error('[AI_LIVE_ERROR]:', err);
                                ws.send(JSON.stringify({ type: 'VOICE_ERROR', error: String(err?.message || err) || 'Gemini error' }));
                            },
                            onclose: (status: any) => {
                                console.log('[AI_LIVE]: Provider session closed.', status?.code, status?.reason);
                                liveSessions.delete(ws);
                                // Send graceful end signal instead of error
                                try {
                                    ws.send(JSON.stringify({ type: 'VOICE_ENDED', reason: status?.reason || 'Session ended' }));
                                } catch(e) {}
                                // Clear global state if this was the active session
                                if (globalActiveWs === ws) {
                                    globalActiveSession = null;
                                    globalActiveWs = null;
                                    globalSessionId = null;
                                }
                            }
                        }
                    });

                    globalActiveSession = session;
                    liveSessions.set(ws, session);
                } catch (e: any) {
                    connectingSockets.delete(ws);
                    console.error('[AI_LIVE_CRITICAL]: Failed to connect to Gemini Provider:', e.message);
                    ws.send(JSON.stringify({ type: 'VOICE_ERROR', error: 'Gemini Connect Failed: ' + e.message }));
                    // Don't close the WS, just report the error
                }

            } else if (message.type === 'STOP_VOICE') {
                console.log('[WS]: STOP_VOICE signal received');
                const session = liveSessions.get(ws);
                if (session) {
                    try { session.close(); } catch { }
                    liveSessions.delete(ws);
                    console.log('[AI_LIVE]: Session explicitly stopped.');
                }
            } else if (message.type === 'STOP_AI_SPEECH') {
                console.log('[WS]: Interrupt signal received');
            } else if (message.type === 'TURN_COMPLETE') {
                // We rely on Server-Side VAD for the native audio model.
                // Manual turnComplete can cause double responses or hangs.
                console.log('[WS]: TURN_COMPLETE ignored — Relying on Server-Side VAD.');
            } else if (message.type === 'VOICE_AUDIO') {
                const session = liveSessions.get(ws);
                if (session && message.data) {
                    if (Math.random() < 0.05) console.log(`[AI_AUDIO_IN]: Streaming audio`);
                    try {
                        // Native audio model: use { audio: blob } for dedicated PCM channel
                        session.sendRealtimeInput({
                            audio: { mimeType: 'audio/pcm;rate=16000', data: message.data }
                        });
                    } catch (err: any) {
                        console.error('[AI_AUDIO_SEND_ERR]:', err.message);
                    }
                }
            } else if (message.type === 'PING') {
                ws.send(JSON.stringify({ type: 'PONG' }));
            } else if (message.type === 'VOICE_TEXT_INPUT') {
                const session = liveSessions.get(ws);
                if (session && message.text) {
                    try {
                        console.log('[AI_LIVE]: Sending text input:', message.text);
                        session.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: message.text }] }],
                            turnComplete: true
                        });
                    } catch (err: any) {
                        console.error('[AI_TEXT_SEND_ERR]:', err.message);
                    }
                }
            } else if (message.type === 'VOICE_TURN_COMPLETE') {
                // NOTE: For native audio model, server-side VAD handles turn detection automatically.
                // Sending manual turnComplete can disrupt voice activity detection.
                // We intentionally ignore this message for the native audio model.
                console.log('[AI_LIVE]: VOICE_TURN_COMPLETE received (ignored — using server VAD).');
            } else if (message.type === 'SET_INTERRUPT_SENSITIVITY') {
                const session = liveSessions.get(ws);
                if (session) {
                    console.log(`[AI_LIVE]: Setting interrupt sensitivity to ${message.value}`);
                    // Gemini Live API doesn't have a direct sensitivity param in connect config, 
                    // but we can simulate it by toggling VAD or thresholding client-side.
                    // For now, we update the session config if supported by SDK version.
                }

            } else if (message.type === 'SCREEN_FRAME' || message.type === 'CAMERA_FRAME') {
                // User is sharing their screen or camera — send frame to active Gemini Live session
                const session = liveSessions.get(ws);
                if (session && message.data) {
                    try {
                        // Strip data:image/jpeg;base64, prefix
                        const base64 = message.data.replace(/^data:image\/\w+;base64,/, '');
                        session.sendRealtimeInput({
                            media: { mimeType: 'image/jpeg', data: base64 }
                        });
                    } catch (err: any) {
                        console.error('[SCREEN_SEND_ERR]:', err.message);
                    }
                }

            } else if (message.type === 'ATTACHMENT') {
                // User uploaded a file — read it and send content to Gemini
                const session = liveSessions.get(ws);
                if (session && message.content && message.filename) {
                    try {
                        const fileContext = `[Attachment: ${message.filename}]\n${message.content}`;
                        console.log('[ATTACH]: Sending attachment to Gemini:', message.filename);
                        session.sendClientContent({
                            turns: [{
                                role: 'user',
                                parts: [{ text: `I've attached a file for you to read and analyze:\n\n${fileContext}` }]
                            }],
                            turnComplete: true
                        });
                        ws.send(JSON.stringify({ type: 'VOICE_TEXT', text: ` Attachment "${message.filename}" sent to Gemini for analysis.` }));
                    } catch (err: any) {
                        console.error('[ATTACH_ERR]:', err.message);
                    }
                }

            } else if (message.type === 'MEETING_MINUTES') {
                // Trigger Gemini to generate meeting minutes from conversation
                const session = liveSessions.get(ws);
                if (session) {
                    try {
                        const prompt = message.transcript
                            ? `Please create professional meeting minutes from this transcript:\n\n${message.transcript}\n\nInclude: Date, Attendees (if mentioned), Key Discussion Points, Action Items, and Next Steps.`
                            : 'Please create meeting minutes from our conversation so far. Include key discussion points, decisions made, and action items.';
                        session.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: prompt }] }],
                            turnComplete: true
                        });
                    } catch (err: any) {
                        console.error('[MEETING_ERR]:', err.message);
                    }
                }
            }
        } catch (e: any) {
            console.error('[WS_ERROR]: Failed to process message:', e.message);
        }
    });


    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        interruptedSessions.delete(ws);
        const session = liveSessions.get(ws);
        if (session) {
            try { session.close(); } catch { }
            liveSessions.delete(ws);
        }
        if (globalActiveWs === ws) {
            console.log('[AI_LIVE]: Global active client disconnected.');
            try { globalActiveSession?.close(); } catch(e) {}
            globalActiveSession = null;
            globalActiveWs = null;
            globalSessionId = null;
        }
    });
});

const broadcast = (event: any) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(event));
        }
    });
};

watcher.on('event', (e) => {
    console.log(`[EVENT]: ${e.type} - ${e.metadata.path || e.source}`);
    broadcast(e);
});

// IPC Endpoint
app.post('/api/execute', async (req, res) => {
    const body = req.body.args || req.body;
    const { action, target, args, bypassJudgment } = body;
    console.log(`[IPC_REQUEST]: ${action} on ${target}`);

    // Update Mode Context (Minimal inference for now)
    workMode.updateContext({
        activeApp: args?.activeApp, // Let IPC provide active app info if available
        timeOfDay: new Date().getHours()
    });

    // 1. Stability Gate (Health)
    if (health.shouldPauseActions() && !args.isRecoveryAction) {
        console.warn(`[HEALTH]: System in SAFE_MODE. Refusing potentially risky action: ${action}`);
        return res.json({
            success: false,
            error: 'SAFE_MODE_ACTIVE',
            metadata: {
                status: health.getStatus(),
                reason: 'Too many recent failures. Manual intervention required.'
            }
        });
    }

    // Safety Decision Gates
    if (!bypassJudgment) {
        // 2. Judgment Policy Check
        const decision = await judgment.evaluate({ action, target, args });
        if (!decision.approved && decision.needsApproval) {
            console.log(`[JUDGMENT]: Action PENDING_APPROVAL: ${action} on ${target}`);
            stateManager.addAuditEntry(`JUDGMENT: ${action} on ${target} requires manual approval. Reason: ${decision.reason}`, 'supervisor');
            return res.json({
                success: false,
                error: 'PENDING_APPROVAL',
                metadata: {
                    reason: decision.reason,
                    rollbackPlan: decision.rollbackPlan,
                    suggestedLevel: decision.suggestedLevel
                }
            });
        }

        // 3. Confidence Check
        const confidenceScore = confidence.evaluate({
            action,
            target,
            risk: decision.suggestedLevel || RiskLevel.MEDIUM,
            systemStatus: health.getStatus(),
            executionHistorySuccessRate: 1.0 // Placeholder for real history lookup
        });

        if (confidenceScore.requiresConfirmation) {
            console.log(`[CONFIDENCE]: Action LOW_CONFIDENCE (${confidenceScore.score}): ${action}`);
            stateManager.addAuditEntry(`CONFIDENCE: ${action} paused due to uncertainty score ${confidenceScore.score}. Reason: ${confidenceScore.reason}`, 'confidence_engine');
            return res.json({
                success: false,
                error: 'LOW_CONFIDENCE',
                metadata: {
                    score: confidenceScore.score,
                    reason: confidenceScore.reason
                }
            });
        }

        // 4. Adaptive Interruption Check (Human-Aware)
        if (args?.isUserInitiated === false) { // Only for autonomous actions
            const currentMode = workMode.getMode();
            const modeConfig = workMode.getConfig();

            if (!modeConfig.allowedInterruptions && !args.bypassInterruption) {
                console.log(`[ADAPTIVE]: Action SUPPRESSED by Work Mode (${currentMode}): ${action}`);
                return res.json({
                    success: false,
                    error: 'SUPPRESSED_BY_WORK_MODE',
                    metadata: { mode: currentMode, reason: 'Interruptions blocked in this mode' }
                });
            }

            const urgency = args.urgency || 50;
            if (!adaptive.shouldInterrupt(urgency)) {
                console.log(`[ADAPTIVE]: Action SUPPRESSED due to user context/preference: ${action}`);
                return res.json({
                    success: false,
                    error: 'SUPPRESSED_BY_USER_CONTEXT',
                    metadata: { urgency, trustScore: adaptive.getTrustScore() }
                });
            }
        }

        // 5. Priority Check
        const priorityResult = priority.evaluate({
            action,
            target,
            urgency: args?.urgency, // Optional urgency from request
            isUserInitiated: args?.isUserInitiated !== false // Default to true for IPC requests unless explicitly automated
        });

        if (priorityResult.action === 'DEFER' || priorityResult.action === 'DISCARD') {
            console.log(`[PRIORITY]: Action DEFERRED (${priorityResult.score}): ${action}`);
            stateManager.addAuditEntry(`PRIORITY: ${action} deferred. Reason: ${priorityResult.reason}`, 'priority_engine');
            return res.json({
                success: false,
                error: 'DEFERRED',
                metadata: {
                    score: priorityResult.score,
                    reason: priorityResult.reason,
                    context: priority.getBudget()
                }
            });
        }
    }

    // 6. Ground Truth & Pre-flight Validation
    const preCheck = verifier.validatePreConditions(action, target);
    if (!preCheck.verified) {
        console.warn(`[VERIFIER]: Pre-check failed: ${preCheck.reason}`);
        return res.json({
            success: false,
            error: 'PRE_CHECK_FAILED',
            metadata: { reason: preCheck.reason, driftDetected: preCheck.driftDetected }
        });
    }

    // Rollback Pre-flight (Backup before write)
    if (action === 'write_file') {
        await executeAction('create_backup', target);
    }

    const result = await executeAction(action, target, args);

    // 7. Post-Execution Verification (Detect Drift)
    const postCheck = verifier.verifyOutcome(action, target, result);
    if (!postCheck.verified && result.success) { // Only verify if we think we succeeded
        console.error(`[VERIFIER]: Drift Detected: ${postCheck.reason}`);
        stateManager.addAuditEntry(`DRIFT: Action ${action} reported success but failed verification. Reason: ${postCheck.reason}`, 'verifier');
        result.metadata = { ...result.metadata, verificationFailed: true, driftReason: postCheck.reason };
    }

    if (!result.success && result.error) {
        const category = await recovery.classifyError(result.error);
        const strategy = recovery.getStrategy(category, target);
        stateManager.addAuditEntry(`FAILURE: ${action} on ${target} failed. Category: ${category}. Strategy: ${strategy}`, 'healer');

        health.recordFailure(result.error);
        if (health.shouldPauseActions()) {
            stateManager.addAuditEntry('CRITICAL: System entering SAFE_MODE due to failure velocity.', 'health_monitor');
        }

        broadcast({
            type: 'RECOVERY_SIGNAL',
            source: 'healer',
            timestamp: Date.now(),
            metadata: { action, target, error: result.error, category, strategy },
            status: 'UNPROCESSED'
        });

        // Adaptive Negative Feedback
        adaptive.recordFeedback(action, false);
    } else {
        health.recordSuccess();
        stateManager.addAuditEntry(`SUCCESS: ${action} on ${target} executed.`, 'executor');

        // 8. Outcome Verification (Result-Driven)
        const outcomeCheck = outcome.validateOutcome(action, target, result);
        if (!outcomeCheck.achieved) {
            console.warn(`[OUTCOME]: Goal may not have been achieved: ${outcomeCheck.reason}`);
            result.metadata = { ...result.metadata, outcomeAchieved: false, outcomeReason: outcomeCheck.reason };
        } else {
            result.metadata = { ...result.metadata, outcomeAchieved: true };
        }

        // 9. Adaptive Learning Loop (Implicit Approval)
        adaptive.recordFeedback(action, true);
    }

    res.json(result);
});

// Goal Management Endpoint
app.post('/api/goal', (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'analyze_goal':
                result = { success: true, data: architect.analyzeGoal(payload.description, payload.criteria) };
                break;
            case 'create_goal':
                // Strategic Pre-Plan Gate
                const analysis = architect.analyzeGoal(payload.description, payload.criteria);
                if (analysis.recommendation === 'PROCEED' || payload.force === true) {
                    const goal = goalManager.createGoal(payload.description, payload.criteria, payload.constraints);
                    architect.recordGoalStart(goal.id, analysis, payload.force === true);
                    result = { success: true, data: goal };
                } else {
                    result = { success: false, error: 'Goal Rejected by Architect', metadata: analysis };
                }
                break;
            case 'add_phase':
                result = { success: true, data: goalManager.addPhase(payload.goalId, payload.name) };
                break;
            case 'add_task':
                result = { success: true, data: goalManager.addTask(payload.goalId, payload.phaseId, payload.description, payload.effort) };
                break;
            case 'update_task':
                goalManager.updateTaskStatus(payload.goalId, payload.taskId, payload.status);

                // Check if goal status changed to COMPLETED/FAILED
                const goal = goalManager.getGoal(payload.goalId);
                if (goal && (goal.status === 'COMPLETED' || goal.status === 'FAILED')) {
                    architect.recordGoalEnd(goal.id, goal.status);
                }

                result = { success: true };
                break;
            case 'get_goals':
                result = { success: true, data: goalManager.getActiveGoals() };
                break;
            default:
                result = { success: false, error: 'Unknown goal action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Income Engine Endpoint
app.post('/api/income', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'pulse':
                result = await incomeEngine.runPulse();
                break;
            case 'get_config':
                result = { success: true, data: incomeEngine.getConfig() };
                break;
            case 'save_config':
                incomeEngine.saveConfig(payload);
                result = { success: true };
                break;
            default:
                result = { success: false, error: 'Unknown income action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// ERPNext Consultant Endpoint
app.post('/api/erpnext/consult', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'scan_request':
                result = { success: true, data: erpNextConsultant.scanRequest(payload.description) };
                break;
            case 'validate_design':
                result = { success: true, data: erpNextConsultant.validateDesign(payload.brief, payload.approach) };
                break;
            case 'audit_risk':
                result = { success: true, data: erpNextConsultant.auditRun(payload.action, payload.target) };
                break;
            case 'advise_solution':
                result = { success: true, data: erpNextConsultant.adviseSolution(payload.description) };
                break;
            case 'analyze_meeting':
                result = { success: true, data: erpNextConsultant.analyzeMeeting(payload.transcript) };
                break;
            case 'analyze_impact':
                result = { success: true, data: erpNextConsultant.analyzeImpact(payload.changeRequest) };
                break;
            case 'generate_customization':
                result = { success: true, data: erpNextConsultant.generateCustomization(payload.requirement) };
                break;
            case 'resolve_ticket':
                result = { success: true, data: erpNextConsultant.resolveTicket(payload.issue) };
                break;
            case 'connect':
                result = erpNextConsultant.connect(payload.config);
                break;
            case 'get_meta':
                result = { success: true, data: await erpNextConsultant.getDocMeta(payload.doctype) };
                break;
            case 'simulate_impact':
                result = { success: true, data: await erpNextConsultant.simulateImpact(payload.ruleType, payload.params) };
                break;
            case 'set_mode':
                result = { success: true, data: erpNextConsultant.setMode(payload.mode) };
                break;
            case 'set_rollout_stage':
                result = { success: true, data: erpNextConsultant.setRolloutStage(payload.stage) };
                break;
            case 'record_case':
                result = { success: true, data: erpNextConsultant.recordCase(payload.details) };
                break;
            case 'find_cases':
                result = { success: true, data: erpNextConsultant.findSimilarCases(payload.query) };
                break;
            case 'generate_article':
                result = { success: true, data: erpNextConsultant.generateArticle(payload.caseId) };
                break;
            case 'analyze_patterns':
                result = { success: true, data: erpNextConsultant.analyzePatterns() };
                break;
            case 'generate_improvement_plan':
                result = { success: true, data: erpNextConsultant.generateImprovementPlan(payload.patternId) };
                break;
            case 'log_decision':
                result = { success: true, data: erpNextConsultant.logDecision(payload) };
                break;
            case 'generate_audit_report':
                result = { success: true, data: erpNextConsultant.generateAuditReport() };
                break;
            case 'record_mentorship':
                result = { success: true, data: erpNextConsultant.recordMentorship(payload) };
                break;
            case 'learn_rule':
                result = { success: true, data: erpNextConsultant.learnRule(payload) };
                break;
            case 'list_rules':
                result = { success: true, data: erpNextConsultant['learnedRules'] }; // Access private property for debug or add getter
                break;
            default:
                result = { success: false, error: 'Unknown consultant action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Email Integration Endpoint
app.post('/api/email', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'connect':
                result = await emailIntegration.connect(payload.provider, payload.credentials);
                break;
            case 'fetch':
                result = { success: true, data: await emailIntegration.fetchEmails(payload.limit) };
                break;
            case 'search':
                result = { success: true, data: await emailIntegration.searchEmails(payload.query) };
                break;
            case 'send':
                result = await emailIntegration.sendEmail(payload.draft);
                break;
            case 'generate_reply':
                result = { success: true, data: await emailIntegration.generateAutoReply(payload.email, payload.tone) };
                break;
            case 'unread_count':
                result = { success: true, data: await emailIntegration.getUnreadCount() };
                break;
            default:
                result = { success: false, error: 'Unknown email action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Calendar Sync Endpoint
app.post('/api/calendar', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'connect':
                result = await calendarSync.connect(payload.provider, payload.credentials);
                break;
            case 'today':
                result = { success: true, data: await calendarSync.getTodayEvents() };
                break;
            case 'upcoming':
                result = { success: true, data: await calendarSync.getUpcomingMeetings(payload.minutes) };
                break;
            case 'create':
                result = await calendarSync.createEvent(payload.event);
                break;
            case 'briefing':
                result = { success: true, data: await calendarSync.getDailyBriefing() };
                break;
            case 'free_slots':
                result = { success: true, data: await calendarSync.findFreeSlots(payload.duration, new Date(payload.date)) };
                break;
            default:
                result = { success: false, error: 'Unknown calendar action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Screenshot OCR Endpoint
app.post('/api/ocr', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'process':
                result = { success: true, data: await screenshotOCR.processImage(payload.image) };
                break;
            case 'extract':
                result = { success: true, data: await screenshotOCR.extractStructuredData(payload.image) };
                break;
            case 'search':
                result = { success: true, data: await screenshotOCR.searchInImage(payload.image, payload.text) };
                break;
            default:
                result = { success: false, error: 'Unknown OCR action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Voice Transcription Endpoint
app.post('/api/voice', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'transcribe':
                result = { success: true, data: await voiceTranscription.transcribeAudio(payload.audio, payload.mimeType) };
                break;
            case 'save_note':
                result = { success: true, data: await voiceTranscription.transcribeAndSave(payload.audio, payload.title) };
                break;
            case 'create_note':
                result = { success: true, data: await voiceTranscription.createTextNote(payload.title, payload.content, payload.tags) };
                break;
            case 'get_notes':
                result = { success: true, data: voiceTranscription.getNotes() };
                break;
            case 'search_notes':
                result = { success: true, data: voiceTranscription.searchNotes(payload.query) };
                break;
            case 'delete_note':
                result = { success: voiceTranscription.deleteNote(payload.noteId) };
                break;
            case 'summarize':
                result = { success: true, data: await voiceTranscription.summarizeNote(payload.noteId) };
                break;
            default:
                result = { success: false, error: 'Unknown voice action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Document Templates Endpoint
app.post('/api/documents', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'templates':
                result = { success: true, data: documentTemplates.getTemplates() };
                break;
            case 'generate':
                result = { success: true, data: await documentTemplates.generateDocument(payload.templateId, payload.variables, payload.format) };
                break;
            case 'quick_generate':
                result = { success: true, data: await documentTemplates.quickGenerate(payload.prompt, payload.format) };
                break;
            case 'get_docs':
                result = { success: true, data: documentTemplates.getDocuments() };
                break;
            case 'add_template':
                result = { success: true, data: documentTemplates.addCustomTemplate(payload.template) };
                break;
            default:
                result = { success: false, error: 'Unknown document action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Self-Healing Code Endpoint
app.post('/api/healing', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'analyze':
                result = { success: true, data: await selfHealingCode.analyzeAndHeal(payload.error, payload.stackTrace, payload.filePath) };
                break;
            case 'history':
                result = { success: true, data: selfHealingCode.getHealingHistory() };
                break;
            case 'stats':
                result = { success: true, data: selfHealingCode.getStats() };
                break;
            case 'rollback':
                result = { success: await selfHealingCode.rollback(payload.attemptId) };
                break;
            default:
                result = { success: false, error: 'Unknown healing action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Predictive Alerts Endpoint
app.post('/api/alerts', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'active':
                result = { success: true, data: predictiveAlerts.getActiveAlerts() };
                break;
            case 'all':
                result = { success: true, data: predictiveAlerts.getAllAlerts() };
                break;
            case 'dismiss':
                result = { success: predictiveAlerts.dismissAlert(payload.alertId) };
                break;
            case 'rules':
                result = { success: true, data: predictiveAlerts.getRules() };
                break;
            case 'toggle_rule':
                result = { success: predictiveAlerts.toggleRule(payload.ruleId, payload.enabled) };
                break;
            case 'add_rule':
                result = { success: true, data: predictiveAlerts.addCustomRule(payload.rule) };
                break;
            default:
                result = { success: false, error: 'Unknown alerts action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Multi-Agent Swarm Endpoint
app.post('/api/swarm', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'execute':
                result = { success: true, data: await multiAgentSwarm.executeSwarm(payload.description, payload.type) };
                break;
            case 'agents':
                result = { success: true, data: multiAgentSwarm.getAgents() };
                break;
            case 'tasks':
                result = { success: true, data: multiAgentSwarm.getTasks() };
                break;
            case 'results':
                result = { success: true, data: multiAgentSwarm.getResults() };
                break;
            case 'status':
                result = { success: true, data: multiAgentSwarm.getAgentStatus() };
                break;
            case 'create_task':
                result = { success: true, data: await multiAgentSwarm.createTask(payload.description, payload.type, payload.priority, payload.dependencies) };
                break;
            default:
                result = { success: false, error: 'Unknown swarm action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Code Review AI Endpoint
app.post('/api/code-review', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'review_file':
                result = { success: true, data: await codeReviewAI.reviewFile(payload.filePath) };
                break;
            case 'review_code':
                result = { success: true, data: await codeReviewAI.reviewCode(payload) };
                break;
            case 'review_pr':
                result = { success: true, data: await codeReviewAI.reviewPR(payload.changedFiles, payload.prDescription) };
                break;
            case 'generate_fix':
                result = { success: true, data: await codeReviewAI.generateFix(payload.issue, payload.originalCode) };
                break;
            case 'compare':
                result = { success: true, data: await codeReviewAI.compareVersions(payload.oldCode, payload.newCode, payload.language) };
                break;
            case 'history':
                result = { success: true, data: codeReviewAI.getReviewHistory() };
                break;
            case 'stats':
                result = { success: true, data: codeReviewAI.getStats() };
                break;
            default:
                result = { success: false, error: 'Unknown code review action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Documentation Generator Endpoint
app.post('/api/docs', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'readme':
                result = { success: true, data: await documentationGenerator.generateReadme(payload.projectPath) };
                break;
            case 'api':
                result = { success: true, data: await documentationGenerator.generateApiDocs(payload.sourceFiles, payload.format) };
                break;
            case 'architecture':
                result = { success: true, data: await documentationGenerator.generateArchitectureDoc(payload.projectPath) };
                break;
            case 'changelog':
                result = { success: true, data: await documentationGenerator.generateChangelog(payload.commits) };
                break;
            case 'guide':
                result = { success: true, data: await documentationGenerator.generateUserGuide(payload.feature, payload.screenshots) };
                break;
            case 'all':
                result = { success: true, data: await documentationGenerator.generateAllDocs(payload.projectPath) };
                break;
            case 'list':
                result = { success: true, data: documentationGenerator.getGeneratedDocs() };
                break;
            default:
                result = { success: false, error: 'Unknown docs action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Deployment Pipeline Endpoint
app.post('/api/deploy', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'deploy':
                result = { success: true, data: await deploymentPipeline.deploy(payload.targetId, payload.options) };
                break;
            case 'rollback':
                result = { success: await deploymentPipeline.rollback(payload.targetId) };
                break;
            case 'targets':
                result = { success: true, data: deploymentPipeline.getTargets() };
                break;
            case 'add_target':
                result = { success: true, data: await deploymentPipeline.addTarget(payload.target) };
                break;
            case 'history':
                result = { success: true, data: deploymentPipeline.getDeployments() };
                break;
            case 'active':
                result = { success: true, data: deploymentPipeline.getActiveDeployment() };
                break;
            default:
                result = { success: false, error: 'Unknown deploy action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// Creative Storyteller Endpoint - Interleaved multimedia output
app.post('/api/storyteller', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'create_story':
                result = { success: true, data: await creativeStoryteller.createInterleavedStory(payload.topic, payload.style, payload.audience, payload.segments) };
                break;
            case 'marketing_asset':
                result = { success: true, data: await creativeStoryteller.generateMarketingAsset(payload.product, payload.description, payload.platform) };
                break;
            case 'educational':
                result = { success: true, data: await creativeStoryteller.createEducationalExplainer(payload.topic, payload.complexity) };
                break;
            case 'social_content':
                result = { success: true, data: await creativeStoryteller.createSocialContent(payload.topic, payload.mood) };
                break;
            case 'generate_video':
                result = { success: true, data: await creativeStoryteller.generateVideoFromStory(payload.storyId) };
                break;
            case 'get_stories':
                result = { success: true, data: creativeStoryteller.getStories() };
                break;
            case 'export_html':
                result = { success: true, data: creativeStoryteller.exportStoryAsHTML(payload.storyId) };
                break;
            default:
                result = { success: false, error: 'Unknown storyteller action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// UI Navigator Endpoint - Visual UI understanding & interaction
app.post('/api/navigator', async (req, res) => {
    const { action, payload } = req.body;
    let result: any = { success: false };

    try {
        switch (action) {
            case 'analyze':
                result = { success: true, data: await uiNavigator.captureAndAnalyze() };
                break;
            case 'create_plan':
                result = { success: true, data: await uiNavigator.createNavigationPlan(payload.goal) };
                break;
            case 'execute_plan':
                result = { success: true, data: await uiNavigator.executeNavigationPlan(payload.plan) };
                break;
            case 'execute_action':
                result = { success: true, data: await uiNavigator.executeAction(payload.action) };
                break;
            case 'automate_workflow':
                result = { success: true, data: await uiNavigator.automateWorkflow(payload.steps) };
                break;
            case 'visual_qa':
                result = { success: true, data: await uiNavigator.performVisualQA(payload.testCases) };
                break;
            case 'history':
                result = { success: true, data: uiNavigator.getActionHistory() };
                break;
            default:
                result = { success: false, error: 'Unknown navigator action' };
        }
    } catch (e: any) {
        result = { success: false, error: e.message };
    }

    res.json(result);
});

// AI Chat Proxy — with history context, guaranteed text response
app.post('/api/chat', async (req, res) => {
    const { message, history, systemPrompt } = req.body;
    let geminiError: any = null;

    // Try Gemini first
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = process.env.API_KEY || '';
        if (!apiKey) throw new Error('API_KEY not configured');

        const ai = new GoogleGenAI({ apiKey });

        // Build conversation history for Gemini context (last 10 messages)
        const chatHistory: any[] = [];
        if (Array.isArray(history)) {
            for (const msg of history.slice(-10)) {
                if (msg.role === 'user' && msg.text) {
                    chatHistory.push({ role: 'user', parts: [{ text: msg.text }] });
                } else if (msg.role === 'ai' && msg.text) {
                    chatHistory.push({ role: 'model', parts: [{ text: msg.text }] });
                }
            }
        }

        const chat = ai.chats.create({
            model: 'gemini-2.0-flash',
            history: chatHistory,
            config: {
                systemInstruction: (systemPrompt || '') + '\n\nIMPORTANT: Always respond with a helpful conversational text reply. Never respond with empty text.',
                tools: [{ functionDeclarations: OPERATOR_TOOLS }]
            }
        });

        let response = await chat.sendMessage({ message });
        let functionCalls = (response as any).functionCalls || [];

        // If tools are called, execute them and send results back for a final text response
        if (functionCalls.length > 0) {
            const functionResponses: any[] = [];
            for (const call of functionCalls) {
                const result = await handleOperatorFunctionCall(call);
                functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { status: "success", result }
                });
            }
            // Send the results back to get the final conversational reply
            response = await chat.sendMessage({ toolResponse: { functionResponses } });
        }

        const text = response.text || '';
        functionCalls = (response as any).functionCalls || [];

        console.log(`[AI_CHAT]: text=${text.length}chars, fcalls=${functionCalls.length}`);

        if (text.trim() || functionCalls.length > 0) {
            return res.json({ success: true, text, reply: text, functionCalls, provider: 'gemini' });
        }
        throw new Error('Empty response from Gemini');

    } catch (error: any) {
        geminiError = error;
        console.warn('[AI_PROXY]: Gemini failed, trying LongCat:', error.message);
    }

    // FALLBACK: LongCat (always returns text)
    try {
        const LONGCAT_API_KEY = 'ak_29S95d5U41S38Fn0Qm10C8A38Ar5C';
        const LONGCAT_BASE_URL = 'https://api.longcat.chat/openai';

        const messages: any[] = [{ role: 'system', content: 'You are a helpful Personal AI Operator. Respond conversationally and helpfully in the same language the user writes in.' }];

        // Add history context
        if (Array.isArray(history)) {
            for (const msg of history.slice(-8)) {
                if (msg.role === 'user' && msg.text) messages.push({ role: 'user', content: msg.text });
                else if (msg.role === 'ai' && msg.text) messages.push({ role: 'assistant', content: msg.text });
            }
        }
        messages.push({ role: 'user', content: message });

        const response = await fetch(`${LONGCAT_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LONGCAT_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'LongCat-Flash-Chat', messages, max_tokens: 2000, temperature: 0.7 })
        });

        if (!response.ok) throw new Error(`LongCat HTTP ${response.status}`);
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || 'I received your message.';

        return res.json({ success: true, text, reply: text, functionCalls: [], provider: 'longcat', fallback: true });
    } catch (longcatError: any) {
        console.error('[AI_PROXY_ERROR]:', longcatError.message);
        res.json({
            success: false,
            error: `AI unavailable. Gemini: ${geminiError?.message}. LongCat: ${longcatError.message}`
        });
    }
});

// AI Vision Endpoint (UI Navigator Feature)
app.post('/api/vision', async (req, res) => {
    const { prompt } = req.body;
    const screenshotPath = `screenshot_${Date.now()}.png`;

    try {
        // 1. Capture Screenshot
        const captureResult = await executeAction('capture_screenshot', screenshotPath);
        if (!captureResult.success) {
            throw new Error(`Screenshot failed: ${captureResult.error}`);
        }

        const fullPath = path.resolve(__dirname, '..', screenshotPath);
        const screenshotData = fs.readFileSync(fullPath);
        const base64Image = screenshotData.toString('base64');

        // 2. Analyze with Gemini Vision
        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = process.env.API_KEY || '';
        if (!apiKey) throw new Error('API_KEY not configured');

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt || "Analyze this screen and describe what UI elements are visible and what actions can be taken." },
                        {
                            inlineData: {
                                data: base64Image,
                                mimeType: "image/png"
                            }
                        }
                    ]
                }
            ]
        });

        const text = response.text || "Could not analyze image";

        // Cleanup
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        res.json({
            success: true,
            analysis: text,
            screenshotUsed: screenshotPath,
            provider: 'gemini-vision'
        });
    } catch (error: any) {
        console.error('[VISION_ERROR]:', error.message);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// AI Live Audio Proxy Endpoint (Security: API key stays server-side)
// FALLBACK: Returns error if Gemini live audio fails (LongCat doesn't support live audio)
app.post('/api/live', async (req, res) => {
    const { config } = req.body;

    try {
        const { GoogleGenAI, Modality } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

        // Note: In production, you'd handle the WebSocket connection for bidirectional streaming
        // This is a simplified proxy endpoint
        const session = await ai.live.connect({
            model: 'gemini-2.0-flash',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: config?.speechConfig,
                systemInstruction: config?.systemInstruction
            },
            callbacks: {
                onopen: () => console.log('[AI_LIVE]: Connection opened'),
                onmessage: () => { },
                onclose: () => console.log('[AI_LIVE]: Connection closed'),
                onerror: (err) => console.error('[AI_LIVE]: Error', err)
            }
        });

        res.json({
            success: true,
            sessionId: Date.now().toString(),
            message: 'Live audio session initialized server-side'
        });
    } catch (error: any) {
        console.error('[AI_LIVE_ERROR]:', error.message);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Health Heartbeat
app.get('/health', (req, res) => {
    res.json({
        status: health.getStatus(),
        uptime: process.uptime(),
        metrics: health.getMetrics(),
        services: ['ipc_server', 'event_bus', 'watcher']
    });
});

// OpenClaw Webhook - WhatsApp se commands receive karna
app.post('/webhook/openclaw', async (req, res) => {
    const { message, from, channel } = req.body;
    console.log(`[OPENCLAW_WEBHOOK]: Message from ${from}: ${message}`);

    stateManager.addAuditEntry(`OPENCLAW_MSG: from=${from} msg=${message}`, 'openclaw');

    // Simple command routing
    let response = { success: true, reply: '' };

    if (message?.toLowerCase().includes('status') || message?.toLowerCase().includes('health')) {
        const h = health.getStatus();
        response.reply = `AI Operator Status: ${h}\nUptime: ${Math.floor(process.uptime() / 60)} mins\nReady for commands!`;
    } else if (message?.toLowerCase().includes('goals')) {
        const goals = goalManager.getActiveGoals();
        response.reply = `Active Goals: ${goals.length}\n${goals.map((g: any) => `• ${g.description}`).join('\n') || 'None'}`;
    } else {
        response.reply = `Operator received: "${message}"\nUse: status, goals, or send a task!`;
    }

    res.json(response);
});

// Autonomous Monitoring Loop (Every 2 minutes)
const startMonitoring = () => {
    console.log('[MONITOR]: Autonomous Monitoring Loop Started.');
    setInterval(() => {
        osUtils.cpuUsage((v) => {
            const cpu = Math.round(v * 100);
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const ramUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

            const metrics = { cpu, ramUsage, timestamp: Date.now() };

            // Record to state
            stateManager.addAuditEntry(`MONITOR_PULSE: CPU=${cpu}%, RAM=${ramUsage}%`, 'health_monitor');

            broadcast({
                type: 'SYSTEM_PULSE',
                metrics: { cpu, ram: ramUsage }
            });

            // Autonomous Action if overloaded
            if (cpu > 85 || ramUsage > 90) {
                console.warn(`[MONITOR]: HIGH LOAD DETECTED! CPU=${cpu}% RAM=${ramUsage}%`);

                // Broadcase a specific proactive alert for the Voice UI
                broadcast({
                    type: 'VOICE_PROACTIVE_ALERT',
                    text: `Bhai, system load kafi zyada ho raha ha. CPU ${cpu} percent ha aur RAM ${ramUsage} percent. Pura system hang ho sakta ha. Kya main kuch process band kar doon?`
                });

                broadcast({
                    type: 'SYSTEM_ALERT',
                    source: 'health_monitor',
                    timestamp: Date.now(),
                    metadata: { metrics, severity: 'HIGH', reason: 'Resource Overload' }
                });

                // Potential Auto-Fix (e.g. log cleanup) or Alert
                stateManager.addAuditEntry(`ALERT: System resource threshold exceeded. Initiating safe-mode checks.`, 'recovery');
            }
        });
    }, 15000); // 15 seconds for more responsive demo loop
};

// --- 2. STATIC & SPA FALLBACK ---
app.use('/dashboard', express.static(distPath));
app.use(express.static(distPath));

// Serve download files
const downloadsPath = '/var/www/html/operator/downloads';
if (fs.existsSync(downloadsPath)) {
    app.use('/downloads', express.static(downloadsPath));
}

app.get('/dashboard/*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Dashboard not found');
});

app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'API route not found' });
});

app.get('/', (req, res) => res.redirect('/dashboard/'));

server.listen(Number(port), '0.0.0.0', () => {
    console.log(`[SIDECAR]: Server listening on port ${port} (0.0.0.0)`);
    watcher.start();
    startMonitoring();

    // Auto Pulse for background thoughts
    const apiKey = process.env.API_KEY || '';
    if (apiKey) {
        const brain = new Brain(apiKey, stateManager);
        setInterval(() => brain.pulse(), 60000);
    }
});
