
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
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import osUtils from 'os-utils';

import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/' });

app.use(cors());
app.use(express.json());

// Serve dashboard static files
const distPath = path.join(process.cwd(), 'dashboard');
console.log(`[SIDECAR]: Serving dashboard from ${distPath}`);

if (!fs.existsSync(distPath)) {
    console.error(`[SIDECAR_ERROR]: Dashboard directory not found at ${distPath}`);
}

// Serve static assets from dashboard build at both /dashboard and root
app.use('/dashboard', express.static(distPath));
app.use(express.static(distPath));

// Favicon fallback (prevent 404)
app.get('/favicon.ico', (_req, res) => {
    const faviconPath = path.join(distPath, 'favicon.ico');
    if (fs.existsSync(faviconPath)) {
        res.sendFile(faviconPath);
    } else {
        res.status(204).end();
    }
});

// Manifest fallback
app.get('/manifest.json', (_req, res) => {
    res.json({
        name: 'Personal AI Operator',
        short_name: 'AI Operator',
        start_url: '/dashboard/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#020617',
        icons: []
    });
});

app.get('/', (_req: any, res: any) => res.redirect('/dashboard/'));

// SPA fallback for /dashboard/* routes
app.get('/dashboard/*', (_req: any, res: any) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Dashboard not found');
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ success: true, status: 'HEALTHY', uptime: process.uptime() });
});

const recovery = new RecoveryEngine();
const stateManager = new StateManager();
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
const watcher = new WatcherEngine(path.resolve(__dirname, '..'));

// Event Bus (WebSocket)
let clients: WebSocket[] = [];
const liveSessions = new Map<WebSocket, any>();

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('[SIDE CAR]: UI Connected to Event Bus');

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());

            if (message.type === 'START_VOICE') {
                // Close existing session if any
                const existingSession = liveSessions.get(ws);
                if (existingSession) {
                    try { existingSession.close(); } catch { }
                    liveSessions.delete(ws);
                }

                console.log('[AI_LIVE]: Starting Gemini Live session');
                const { GoogleGenAI, Modality } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

                const session = await ai.live.connect({
                    model: 'gemini-live-2.5-flash-preview',
                    config: {
                        responseModalities: [Modality.AUDIO, Modality.TEXT],
                        systemInstruction: 'You are a smart Personal AI Operator voice assistant. Be concise, natural, and helpful. Always respond in the same language the user speaks (Urdu or English). Keep responses brief.',
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: 'Aoede' }
                            }
                        },
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        tools: [{
                            functionDeclarations: [
                                {
                                    name: "execute_action",
                                    description: "Execute local system commands on user PC, read/write files, or open tools.",
                                    parameters: {
                                        type: "OBJECT",
                                        properties: {
                                            action: {
                                                type: "STRING",
                                                enum: ["run_command", "write_file", "read_file", "move_file", "delete_file", "create_dir", "get_knowledge", "set_knowledge"],
                                                description: "The action to perform."
                                            },
                                            target: { type: "STRING", description: "Command, file path, or knowledge key." },
                                            args: { type: "STRING", description: "Content, destination path, or knowledge value." }
                                        },
                                        required: ["action", "target"]
                                    }
                                }
                            ]
                        }]
                    },
                    callbacks: {
                        onmessage: async (msg: any) => {
                            try {
                                // --- Audio response chunks ---
                                const parts = msg.serverContent?.modelTurn?.parts || [];
                                for (const part of parts) {
                                    if (part.inlineData?.data) {
                                        ws.send(JSON.stringify({
                                            type: 'VOICE_RESPONSE',
                                            data: part.inlineData.data,
                                            mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                                        }));
                                    }
                                    if (part.text) {
                                        ws.send(JSON.stringify({ type: 'VOICE_TEXT', text: part.text }));
                                    }
                                    // Extract Function Call
                                    if (part.functionCall) {
                                        const { name, args } = part.functionCall;
                                        if (name === 'execute_action') {
                                            ws.send(JSON.stringify({ type: 'VOICE_TEXT', text: `[SYSTEM: Running tool ${args.action} on ${args.target}]` }));
                                            executeAction(args.action, args.target, args.args).then((res) => {
                                                try {
                                                    session.sendClientContent({
                                                        turns: [{
                                                            role: 'user',
                                                            parts: [{
                                                                functionResponse: {
                                                                    name: 'execute_action',
                                                                    response: { result: res.output || res.error || "done" }
                                                                }
                                                            }]
                                                        }],
                                                        turnComplete: true
                                                    });
                                                } catch (e) {
                                                    console.error('[AI_LIVE]: sendClientContent functionResponse error', e);
                                                }
                                            });
                                        }
                                    }
                                }

                                // --- Output transcript (what AI is saying) ---
                                if (msg.serverContent?.outputTranscription?.text) {
                                    ws.send(JSON.stringify({
                                        type: 'VOICE_TEXT',
                                        text: msg.serverContent.outputTranscription.text
                                    }));
                                }

                                // --- Input transcript (what user said) ---
                                if (msg.serverContent?.inputTranscription?.text) {
                                    ws.send(JSON.stringify({
                                        type: 'VOICE_INPUT_TEXT',
                                        text: msg.serverContent.inputTranscription.text
                                    }));
                                }

                                // --- Turn signals ---
                                if (msg.serverContent?.turnComplete) {
                                    ws.send(JSON.stringify({ type: 'VOICE_TURN_COMPLETE' }));
                                }
                                if (msg.serverContent?.interrupted) {
                                    ws.send(JSON.stringify({ type: 'VOICE_INTERRUPTED' }));
                                }
                            } catch (parseErr) {
                                console.error('[AI_LIVE]: onmessage parse error', parseErr);
                            }
                        },
                        onopen: () => console.log('[AI_LIVE]: Session opened'),
                        onclose: () => {
                            console.log('[AI_LIVE]: Session closed by Gemini');
                            liveSessions.delete(ws);
                        },
                        onerror: (err: any) => {
                            const errMsg = String(err?.message || err || 'Live API error');
                            console.error('[AI_LIVE]: Error:', errMsg);
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'VOICE_ERROR', error: errMsg }));
                            }
                        }
                    }
                });

                liveSessions.set(ws, session);
                ws.send(JSON.stringify({ type: 'VOICE_READY' }));
                console.log('[AI_LIVE]: VOICE_READY sent to client');

            } else if (message.type === 'VOICE_AUDIO') {
                // Realtime PCM audio chunk from browser mic (base64, 16kHz)
                const session = liveSessions.get(ws);
                if (session) {
                    try {
                        session.sendRealtimeInput({
                            media: { data: message.data, mimeType: 'audio/pcm;rate=16000' }
                        });
                    } catch (e: any) {
                        console.error('[AI_LIVE]: sendRealtimeInput error:', e.message);
                    }
                }

            } else if (message.type === 'VOICE_TEXT_INPUT') {
                // Text message sent during an active voice session
                const session = liveSessions.get(ws);
                if (session && message.text) {
                    try {
                        session.sendClientContent({ turns: message.text, turnComplete: true });
                    } catch (e: any) {
                        console.error('[AI_LIVE]: sendClientContent error:', e.message);
                    }
                }

            } else if (message.type === 'VOICE_VISION_FRAME') {
                // Realtime vision chunk from screen share
                const session = liveSessions.get(ws);
                if (session && message.data) {
                    try {
                        session.sendRealtimeInput({
                            media: { data: message.data, mimeType: 'image/jpeg' }
                        });
                    } catch (e: any) {
                        console.error('[AI_LIVE]: sendRealtimeInput vision error:', e.message);
                    }
                }

            } else if (message.type === 'STOP_VOICE') {
                const session = liveSessions.get(ws);
                if (session) {
                    try { session.close(); } catch { }
                    liveSessions.delete(ws);
                    console.log('[AI_LIVE]: Session stopped by user');
                }
            }
        } catch (e) {
            // Non-JSON or unexpected messages — ignore silently
        }
    });

    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        const session = liveSessions.get(ws);
        if (session) {
            try { session.close(); } catch { }
            liveSessions.delete(ws);
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
app.post('/execute', async (req, res) => {
    const { action, target, args, bypassJudgment } = req.body.args;
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
app.post('/goal', (req, res) => {
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

// ERPNext Consultant Endpoint
app.post('/erpnext/consult', async (req, res) => {
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

// AI Chat Proxy — with history context, guaranteed text response
app.post('/ai/chat', async (req, res) => {
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
                systemInstruction: (systemPrompt || '') + '\n\nIMPORTANT: Always respond with a helpful conversational text reply. Never respond with empty text.'
            }
        });

        const response = await chat.sendMessage({ message });
        const text = response.text || '';
        const functionCalls = (response as any).functionCalls || [];

        console.log(`[AI_CHAT]: text=${text.length}chars, fcalls=${functionCalls.length}`);

        if (text.trim() || functionCalls.length > 0) {
            return res.json({ success: true, text, functionCalls, provider: 'gemini' });
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

        return res.json({ success: true, text, functionCalls: [], provider: 'longcat', fallback: true });
    } catch (longcatError: any) {
        console.error('[AI_PROXY_ERROR]:', longcatError.message);
        res.json({
            success: false,
            error: `AI unavailable. Gemini: ${geminiError?.message}. LongCat: ${longcatError.message}`
        });
    }
});

// AI Vision Endpoint (UI Navigator Feature)
app.post('/ai/vision', async (req, res) => {
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
app.post('/ai/live', async (req, res) => {
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

server.listen(port, () => {
    console.log(`[SIDECAR]: Server listening on port ${port}`);
    watcher.start();
    startMonitoring();

    // Auto Pulse for background thoughts
    const apiKey = process.env.API_KEY || '';
    if (apiKey) {
        const brain = new Brain(apiKey, stateManager);
        setInterval(() => brain.pulse(), 60000);
    }
});
