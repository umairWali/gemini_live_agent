/**
 * OPERATOR DASHBOARD — Application Logic v2
 * Connects to sidecar API at http://localhost:3000
 * Features: Section navigation, Voice UI, Read-aloud, ERPNext connect,
 *           Governance view, Logs stream, Rules list, Knowledge base.
 */

(() => {
    'use strict';

    // ── Config ──────────────────────────────────────
    // ── Config ──────────────────────────────────────
    const API_BASE = window.location.origin;
    const WS_URL = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws/';
    const POLL_INTERVAL = 5000;

    // ── State ───────────────────────────────────────
    const state = {
        mode: 'OBSERVATION',
        rollout: 'SHADOW',
        connection: 'OFFLINE',
        confidence: 0,
        uptime: 0,
        currentSection: 'ask',
        analyses: [],
        rules: [],
        knowledge: [],
        cases: [],
        logs: [],
        events: [],
        governance: { info: 0, review: 0, critical: 0, accepted: 0, rejected: 0, rollbacks: 0, overrides: 0, incidents: 0 },
        topic: '—',
        lastDecision: '—',
        isRecording: false,
        isSpeaking: false,
        recognition: null,
        ws: null,
    };

    // ── DOM Refs ────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        queryInput: $('query-input'),
        btnSend: $('btn-send'),
        btnMic: $('btn-mic'),
        voiceIndicator: $('voice-indicator'),
        liveTranscript: $('live-transcript'),
        voiceCommands: $('voice-commands'),
        responseTimeline: $('response-timeline'),
        welcomeCard: $('welcome-card'),
        contextBar: $('context-bar'),
        ctxTopic: $('ctx-topic'),
        ctxDecision: $('ctx-decision'),
        ctxMode: $('ctx-mode'),
        statusMode: $('status-mode'),
        statusRollout: $('status-rollout'),
        statusConnection: $('status-connection'),
        statusUptime: $('status-uptime'),
        confidenceBar: $('confidence-bar'),
        confidenceValue: $('confidence-value'),
        lastActionCard: $('last-action-card'),
        learningFeed: $('learning-feed'),
        eventLog: $('event-log'),
        logsStream: $('logs-stream'),
        healthIndicator: $('health-indicator'),
        ctrlMode: $('ctrl-mode'),
        ctrlRollout: $('ctrl-rollout'),
        btnApplyCtrl: $('btn-apply-ctrl'),
        modalOverlay: $('modal-overlay'),
        modalTitle: $('modal-title'),
        modalBody: $('modal-body'),
        modalCancel: $('modal-cancel'),
        modalConfirm: $('modal-confirm'),
        erpModal: $('erp-modal'),
        erpUrl: $('erp-url'),
        btnConnectErp: $('btn-connect-erp'),
        // Badges
        badgeAnalyses: $('badge-analyses'),
        badgeRules: $('badge-rules'),
        badgeKnowledge: $('badge-knowledge'),
        badgeCases: $('badge-cases'),
        // Section bodies
        analysesList: $('analyses-list'),
        rulesList: $('rules-list'),
        knowledgeList: $('knowledge-list'),
        casesList: $('cases-list'),
    };

    // ── Utilities ───────────────────────────────────
    const timeStr = (d = new Date()) => d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatUptime = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}h ${m}m`; };

    function safeJSON(str) {
        try { return JSON.parse(str); } catch { return null; }
    }

    // ── Section Navigation ──────────────────────────
    function switchSection(section) {
        state.currentSection = section;

        // Update nav items
        $$('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Show/hide section content
        $$('.section-content').forEach(el => {
            const match = el.dataset.section === section;
            el.style.display = match ? 'flex' : 'none';
            el.classList.toggle('active', match);
        });

        // Show/hide input bar (only for 'ask')
        const inputBar = $('input-bar');
        if (inputBar) inputBar.style.display = section === 'ask' ? '' : 'none';
    }

    $$('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    // ── API Communication ───────────────────────────
    async function apiCall(action, payload = {}) {
        try {
            const res = await fetch(`${API_BASE}/erpnext/consult`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, payload }),
            });
            return await res.json();
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async function healthCheck() {
        try {
            const res = await fetch(`${API_BASE}/health`);
            const data = await res.json();
            updateConnectionStatus('HEALTHY', data);
            return data;
        } catch {
            updateConnectionStatus('OFFLINE');
            return null;
        }
    }

    // ── Status Updates ──────────────────────────────
    function updateConnectionStatus(status, data = null) {
        state.connection = status;
        els.statusConnection.textContent = status;
        els.statusConnection.className = 'status-value status-badge';
        if (status === 'HEALTHY') {
            els.statusConnection.classList.add('badge--emerald');
            els.statusConnection.textContent = 'CONNECTED';
        } else if (status === 'DEGRADED') {
            els.statusConnection.classList.add('badge--amber');
        } else {
            els.statusConnection.classList.add('badge--slate');
        }

        // Health indicator in nav footer
        const dot = els.healthIndicator.querySelector('.health-dot');
        const text = els.healthIndicator.querySelector('.health-text');
        dot.className = 'health-dot';
        if (status === 'HEALTHY') { dot.classList.add('health-dot--ready'); text.textContent = 'READY'; text.style.color = 'var(--accent-emerald)'; }
        else if (status === 'DEGRADED') { dot.classList.add('health-dot--degraded'); text.textContent = 'DEGRADED'; text.style.color = 'var(--accent-amber)'; }
        else { dot.classList.add('health-dot--blocked'); text.textContent = 'OFFLINE'; text.style.color = 'var(--accent-red)'; }

        // Uptime
        if (data && data.uptime) {
            state.uptime = data.uptime;
            els.statusUptime.textContent = formatUptime(data.uptime);
        }
    }

    function updateMode(mode) {
        state.mode = mode;
        els.statusMode.textContent = mode;
        els.ctxMode.textContent = mode;
        els.statusMode.className = 'status-value status-badge';
        if (mode === 'ACTIVE') els.statusMode.classList.add('badge--red');
        else if (mode === 'ADVISORY') els.statusMode.classList.add('badge--amber');
        else els.statusMode.classList.add('badge--teal');
    }

    function updateRollout(stage) {
        state.rollout = stage;
        els.statusRollout.textContent = stage;
        els.statusRollout.className = 'status-value status-badge';
        if (stage === 'TRUSTED') els.statusRollout.classList.add('badge--emerald');
        else if (stage === 'CO_PILOT') els.statusRollout.classList.add('badge--teal');
        else if (stage === 'ASSISTED') els.statusRollout.classList.add('badge--amber');
        else els.statusRollout.classList.add('badge--amber');
    }

    function updateConfidence(score) {
        state.confidence = score;
        const pct = Math.min(100, Math.max(0, score));
        els.confidenceBar.style.width = pct + '%';
        els.confidenceValue.textContent = pct + '%';
    }

    function updateLastAction(action, time) {
        els.lastActionCard.innerHTML = `
            <span class="la-action">${action}</span>
            <div class="la-time">${time || timeStr()}</div>
        `;
    }

    function updateContext(topic, decision) {
        if (topic) { state.topic = topic; els.ctxTopic.textContent = topic; }
        if (decision) { state.lastDecision = decision; els.ctxDecision.textContent = decision; }
    }

    // ── Badge Counts ────────────────────────────────
    function updateBadges() {
        els.badgeAnalyses.textContent = state.analyses.length;
        els.badgeRules.textContent = state.rules.length;
        els.badgeKnowledge.textContent = state.knowledge.length;
        els.badgeCases.textContent = state.cases.length;
    }

    // ── Response Card Builder ───────────────────────
    function createResponseCard(type, contentHTML, meta = {}) {
        if (els.welcomeCard) els.welcomeCard.style.display = 'none';

        const card = document.createElement('div');
        card.className = `response-card response-card--${type}`;

        const senderLabel = type === 'user' ? 'YOU' : type === 'error' ? 'ERROR' : 'OPERATOR';
        const summary = meta.summary || '';

        card.innerHTML = `
            <div class="rc-header">
                <span class="rc-sender rc-sender--${type}">${senderLabel}</span>
                <div class="rc-header-actions">
                    ${type === 'system' ? `<button class="btn-read-aloud" onclick="window.__readAloud(this, '${encodeURIComponent(summary)}')">🔊 Read</button>` : ''}
                    <span class="rc-timestamp">${timeStr()}</span>
                </div>
            </div>
            <div class="rc-body">${contentHTML}</div>
        `;

        els.responseTimeline.appendChild(card);
        card.scrollIntoView({ behavior: 'smooth', block: 'end' });
        return card;
    }

    // ── Read Aloud ──────────────────────────────────
    window.__readAloud = function (btn, encodedText) {
        if (state.isSpeaking) {
            window.speechSynthesis.cancel();
            state.isSpeaking = false;
            btn.classList.remove('speaking');
            btn.textContent = '🔊 Read';
            return;
        }

        const text = decodeURIComponent(encodedText);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.onend = () => {
            state.isSpeaking = false;
            btn.classList.remove('speaking');
            btn.textContent = '🔊 Read';
        };

        state.isSpeaking = true;
        btn.classList.add('speaking');
        btn.textContent = 'Stop';
        window.speechSynthesis.speak(utterance);
    };

    // ── Render Helpers ──────────────────────────────
    function renderAdvisoryCard(data) {
        const d = data.data || data;
        const risk = (d.riskLevel || d.risk_level || 'MEDIUM').toUpperCase();
        const confidence = d.confidence || d.confidence_score || 70;
        const intent = d.detectedIntent || d.intent || d.category || '';
        const solution = d.solution || d.recommendation || d.answer || '';
        const impact = d.businessImpact || d.impact || '';
        const steps = d.steps || d.configSteps || d.configuration_steps || [];
        const sideEffects = d.sideEffects || d.side_effects || [];
        const rejected = d.rejectedAlternatives || d.rejected_alternatives || [];
        const assumptions = d.assumptions || d.assumptions_made || [];
        const knownFacts = d.knownFacts || d.known_facts || [];
        const verifications = d.verificationNeeded || d.verification_needed || [];
        const mentorInsight = d.mentorshipInsight || d.mentorship_insight || '';
        const evidenceLevel = d.evidenceStatus || 'INFERRED';

        const summaryText = `Risk: ${risk}. ${solution.substring(0, 120)}`;
        updateConfidence(confidence);
        updateLastAction(intent || 'Advisory', timeStr());
        updateContext(intent, risk + ' risk — ' + solution.substring(0, 60));

        // Store in analyses
        state.analyses.unshift({ time: timeStr(), intent, risk, solution, confidence });
        updateBadges();
        refreshAnalysesList();

        // Governance tracking
        if (risk === 'HIGH' || risk === 'CRITICAL') state.governance.critical++;
        else if (risk === 'MEDIUM') state.governance.review++;
        else state.governance.info++;

        let html = `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
                <span class="risk-badge risk-badge--${risk.toLowerCase()}">${risk} RISK</span>
                <span class="confidence-badge confidence-badge--${confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low'}">Confidence: ${confidence}%</span>
                ${intent ? `<span class="tag">${intent}</span>` : ''}
                <span class="tag">${evidenceLevel}</span>
            </div>
        `;

        // Tabs
        html += `
            <div class="tab-bar">
                <button class="tab-btn active" onclick="window.__switchTab(this, 'summary')">Summary</button>
                ${steps.length ? '<button class="tab-btn" onclick="window.__switchTab(this, \'steps\')">Steps</button>' : ''}
                ${sideEffects.length || rejected.length ? '<button class="tab-btn" onclick="window.__switchTab(this, \'analysis\')">Analysis</button>' : ''}
                ${assumptions.length || verifications.length || knownFacts.length ? '<button class="tab-btn" onclick="window.__switchTab(this, \'evidence\')">Evidence</button>' : ''}
            </div>
        `;

        // Summary tab
        html += `<div class="tab-content active" data-tab="summary">`;
        if (solution) html += `<p>${solution}</p>`;
        if (impact) html += `<p style="color:var(--accent-amber);font-size:13px"><strong>Business Impact:</strong> ${impact}</p>`;
        if (mentorInsight) html += `<div class="mentorship-block"><div class="mb-label">🎓 Mentorship Insight</div><div class="mb-text">${mentorInsight}</div></div>`;
        html += `</div>`;

        // Steps tab
        if (steps.length) {
            html += `<div class="tab-content" data-tab="steps"><ol class="steps-list">`;
            steps.forEach(s => { html += `<li>${typeof s === 'string' ? s : s.description || s.step || JSON.stringify(s)}</li>`; });
            html += `</ol></div>`;
        }

        // Analysis tab
        if (sideEffects.length || rejected.length) {
            html += `<div class="tab-content" data-tab="analysis">`;
            if (sideEffects.length) {
                html += `<div class="evidence-section"><h4>Side Effects</h4><ul class="steps-list">`;
                sideEffects.forEach(s => { html += `<li>${typeof s === 'string' ? s : JSON.stringify(s)}</li>`; });
                html += `</ul></div>`;
            }
            if (rejected.length) {
                html += `<div class="evidence-section"><h4>Rejected Alternatives</h4><ul class="steps-list">`;
                rejected.forEach(s => { html += `<li>${typeof s === 'string' ? s : s.alternative + (s.reason ? ' — ' + s.reason : '')}</li>`; });
                html += `</ul></div>`;
            }
            html += `</div>`;
        }

        // Evidence tab
        if (assumptions.length || verifications.length || knownFacts.length) {
            html += `<div class="tab-content" data-tab="evidence">`;
            if (knownFacts.length) {
                html += `<div class="assumption-block verification-block"><h5>✓ Known Facts</h5><ul>`;
                knownFacts.forEach(f => { html += `<li>${f}</li>`; });
                html += `</ul></div>`;
            }
            if (assumptions.length) {
                html += `<div class="assumption-block"><h5>⚠ Assumptions Made</h5><ul>`;
                assumptions.forEach(a => { html += `<li>${a}</li>`; });
                html += `</ul></div>`;
            }
            if (verifications.length) {
                html += `<div class="assumption-block" style="border-color:rgba(96,165,250,0.2)"><h5 style="color:var(--accent-blue)">Verification Needed</h5><ul>`;
                verifications.forEach(v => { html += `<li>${v}</li>`; });
                html += `</ul></div>`;
            }
            html += `</div>`;
        }

        createResponseCard('system', html, { summary: summaryText });
    }

    function renderHealthCard(data) {
        const d = data.data || data;
        const html = `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
                <span class="status-badge badge--emerald">${d.status || 'HEALTHY'}</span>
            </div>
            <table class="evidence-table">
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Uptime</td><td>${formatUptime(d.uptime || 0)}</td></tr>
                <tr><td>Total Requests</td><td>${d.metrics?.requestsTotal ?? 0}</td></tr>
                <tr><td>Failed Requests</td><td>${d.metrics?.requestsFailed ?? 0}</td></tr>
                <tr><td>Recovery Attempts</td><td>${d.metrics?.recoveryAttempts ?? 0}</td></tr>
                <tr><td>Consecutive Failures</td><td>${d.metrics?.consecutiveFailures ?? 0}</td></tr>
            </table>
        `;
        createResponseCard('system', html, { summary: `System ${d.status || 'HEALTHY'}. Uptime ${formatUptime(d.uptime || 0)}.` });
    }

    function renderErrorCard(message) {
        createResponseCard('error', `<p style="color:var(--accent-red)">${message}</p>`);
    }

    function renderGenericCard(data) {
        const d = data.data || data;
        let html = '';
        if (typeof d === 'string') {
            html = `<p>${d}</p>`;
        } else {
            html = `<pre style="font-family:var(--font-mono);font-size:12px;white-space:pre-wrap;color:var(--text-secondary)">${JSON.stringify(d, null, 2)}</pre>`;
        }
        createResponseCard('system', html, { summary: typeof d === 'string' ? d.substring(0, 100) : 'Operator response' });
    }

    // ── Tab Switching ───────────────────────────────
    window.__switchTab = function (btn, tabName) {
        const card = btn.closest('.response-card') || btn.closest('.section-content');
        card.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        card.querySelectorAll('.tab-content').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        btn.classList.add('active');
    };

    // ── Section Renderers ───────────────────────────
    function refreshAnalysesList() {
        if (!els.analysesList) return;
        if (state.analyses.length === 0) {
            els.analysesList.innerHTML = '<p class="empty-state">No analyses yet. Ask the Operator a question to get started.</p>';
            return;
        }
        els.analysesList.innerHTML = state.analyses.map((a, i) => `
            <div class="response-card response-card--system" style="margin-bottom:10px">
                <div class="rc-header">
                    <span class="rc-sender rc-sender--system">${a.intent || 'ANALYSIS'}</span>
                    <div class="rc-header-actions">
                        <span class="risk-badge risk-badge--${(a.risk || 'medium').toLowerCase()}">${a.risk || 'MEDIUM'}</span>
                        <span class="rc-timestamp">${a.time}</span>
                    </div>
                </div>
                <div class="rc-body">
                    <p>${a.solution || 'Advisory completed.'}</p>
                    <div style="margin-top:8px;display:flex;gap:6px">
                        <span class="confidence-badge confidence-badge--${a.confidence >= 80 ? 'high' : a.confidence >= 60 ? 'medium' : 'low'}">Confidence: ${a.confidence}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function refreshRulesList() {
        if (!els.rulesList) return;
        if (state.rules.length === 0) {
            els.rulesList.innerHTML = '<p class="empty-state">No rules learned yet.</p>';
            return;
        }
        els.rulesList.innerHTML = state.rules.map(r => `
            <div class="rule-card">
                <div class="rule-card-header">
                    <span class="rule-trigger">${r.trigger || r.trigger_pattern || '—'}</span>
                    <span class="rule-status ${r.validated ? 'rule-status--validated' : 'rule-status--tentative'}">${r.validated ? 'VALIDATED' : 'TENTATIVE'}</span>
                </div>
                <div class="rule-action">→ ${r.action || '—'}</div>
                ${r.rationale ? `<div class="rule-rationale">"${r.rationale}"</div>` : ''}
                <div class="rule-meta">
                    <span>Source: mentorship</span>
                    ${r.uses ? `<span>Used ${r.uses}×</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    function refreshLearningFeed() {
        if (state.rules.length === 0) {
            els.learningFeed.innerHTML = '<p class="empty-state">No learned rules yet.</p>';
            return;
        }
        els.learningFeed.innerHTML = state.rules.slice(0, 5).map(r => `
            <div class="learning-item">
                <div class="li-trigger">${r.trigger || '—'}</div>
                <div class="li-action">→ ${r.action || '—'}</div>
            </div>
        `).join('');
    }

    function addLogEntry(source, message, level = 'info') {
        state.logs.push({ time: timeStr(), source, message, level });
        if (els.logsStream) {
            const empty = els.logsStream.querySelector('.empty-state');
            if (empty) empty.remove();
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `<span class="log-time">${timeStr()}</span><span class="log-source">${source}</span><span class="log-msg">${message}</span>`;
            els.logsStream.appendChild(entry);
            els.logsStream.scrollTop = els.logsStream.scrollHeight;
        }
    }

    function addEventEntry(type, message, level = 'info') {
        const empty = els.eventLog.querySelector('.empty-state');
        if (empty) empty.remove();
        state.events.push({ time: timeStr(), type, message, level });
        // Keep only last 50
        if (state.events.length > 50) state.events.shift();

        const entry = document.createElement('div');
        entry.className = `event-entry event-entry--${level}`;
        entry.innerHTML = `<span class="ee-time">${timeStr()}</span><span class="ee-type">[${type}]</span> ${message}`;
        els.eventLog.appendChild(entry);
        els.eventLog.scrollTop = els.eventLog.scrollHeight;
    }

    // ── Send Query ──────────────────────────────────
    async function sendQuery(text) {
        if (!text.trim()) return;

        // Check for mentor/learn commands
        let action = 'advise_solution';
        let payload = { prompt: text };

        if (text.startsWith('mentor:')) {
            action = 'record_mentorship';
            const parts = text.slice(7).split('|').map(s => s.trim());
            payload = { topic: parts[0] || '', summary: parts[1] || '', decision: parts[2] || '', rationale: parts[3] || '' };
        } else if (text.startsWith('learn:')) {
            action = 'learn_rule';
            const parts = text.slice(6).split('|').map(s => s.trim());
            payload = { trigger: parts[0] || '', action: parts[1] || '', rationale: parts[2] || '' };
        }

        // Show user card
        createResponseCard('user', `<p>${text}</p>`);
        els.queryInput.value = '';

        // Loading
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-dots';
        loadingEl.innerHTML = '<span></span><span></span><span></span>';
        els.responseTimeline.appendChild(loadingEl);

        addLogEntry('query', `Sent: ${action}`, 'info');

        const result = await apiCall(action, payload);
        loadingEl.remove();

        if (!result.success) {
            renderErrorCard(result.error || 'Request failed');
            addLogEntry('error', result.error || 'Request failed', 'error');
            return;
        }

        addLogEntry('response', `Received: ${action} (success)`, 'info');

        if (action === 'advise_solution') {
            renderAdvisoryCard(result);
        } else if (action === 'record_mentorship') {
            createResponseCard('system', `<p>Mentorship session recorded: <strong>${payload.topic}</strong></p><p style="color:var(--text-muted);font-size:12px">Decision: ${payload.decision}<br>Rationale: ${payload.rationale}</p>`, { summary: `Mentorship: ${payload.topic}` });
            updateLastAction('Mentorship: ' + payload.topic, timeStr());
        } else if (action === 'learn_rule') {
            const newRule = { trigger: payload.trigger, action: payload.action, rationale: payload.rationale, validated: false, uses: 0 };
            state.rules.unshift(newRule);
            updateBadges();
            refreshRulesList();
            refreshLearningFeed();
            createResponseCard('system', `<p>Rule learned: <span style="color:var(--accent-purple);font-weight:600">${payload.trigger}</span> → ${payload.action}</p>`, { summary: `Rule learned: ${payload.trigger}` });
            updateLastAction('Rule learned', timeStr());
        } else {
            renderGenericCard(result);
        }
    }

    // ── Quick Actions ───────────────────────────────
    $$('.quick-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            const prompt = btn.dataset.prompt || '';

            if (action === 'health') {
                createResponseCard('user', '<p>Health Check</p>');
                const loadingEl = document.createElement('div');
                loadingEl.className = 'loading-dots';
                loadingEl.innerHTML = '<span></span><span></span><span></span>';
                els.responseTimeline.appendChild(loadingEl);
                const data = await healthCheck();
                loadingEl.remove();
                if (data) renderHealthCard(data);
                else renderErrorCard('Could not reach sidecar health endpoint.');
                return;
            }

            const text = prompt || action.replace(/_/g, ' ');
            await sendQuery(text);
        });
    });

    // ── Input Handlers ──────────────────────────────
    els.queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendQuery(els.queryInput.value);
        }
    });

    els.btnSend.addEventListener('click', () => sendQuery(els.queryInput.value));

    // ── Voice Input (Web Speech API) ────────────────
    function initVoice() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            els.btnMic.title = 'Voice input not supported in this browser';
            els.btnMic.style.opacity = '0.3';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = true;
        state.recognition.lang = 'en-US';

        state.recognition.onstart = () => {
            state.isRecording = true;
            els.btnMic.classList.add('recording');
            els.voiceIndicator.style.display = 'flex';
            els.liveTranscript.style.display = 'block';
            els.voiceCommands.style.display = 'flex';
            els.queryInput.style.display = 'none';
        };

        state.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            els.liveTranscript.textContent = transcript;
            if (event.results[event.results.length - 1].isFinal) {
                els.queryInput.value = transcript;
            }
        };

        state.recognition.onend = () => {
            state.isRecording = false;
            els.btnMic.classList.remove('recording');
            els.voiceIndicator.style.display = 'none';
            els.liveTranscript.style.display = 'none';
            els.voiceCommands.style.display = 'none';
            els.queryInput.style.display = '';
            // Auto-send if we got text
            if (els.queryInput.value.trim()) {
                sendQuery(els.queryInput.value);
            }
        };

        state.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            state.isRecording = false;
            els.btnMic.classList.remove('recording');
            els.voiceIndicator.style.display = 'none';
            els.liveTranscript.style.display = 'none';
            els.voiceCommands.style.display = 'none';
            els.queryInput.style.display = '';
        };

        els.btnMic.addEventListener('click', () => {
            if (state.isRecording) {
                state.recognition.stop();
            } else {
                state.recognition.start();
            }
        });
    }

    // Voice commands
    $$('.voice-cmd').forEach(btn => {
        btn.addEventListener('click', () => {
            const cmd = btn.dataset.cmd;
            if (cmd === 'stop speaking') {
                window.speechSynthesis.cancel();
                state.isSpeaking = false;
            } else if (cmd === 'repeat') {
                // Re-read last system card
                const cards = $$('.response-card--system');
                if (cards.length) {
                    const lastBtn = cards[cards.length - 1].querySelector('.btn-read-aloud');
                    if (lastBtn) lastBtn.click();
                }
            }
        });
    });

    // ── Controls ────────────────────────────────────
    els.btnApplyCtrl.addEventListener('click', () => {
        const newMode = els.ctrlMode.value;
        const newRollout = els.ctrlRollout.value;

        // Require confirmation for ACTIVE mode or TRUSTED stage
        if (newMode === 'ACTIVE' || newRollout === 'TRUSTED') {
            showModal(
                'Confirm Control Change',
                `You are switching to <strong>${newMode}</strong> mode with <strong>${newRollout}</strong> rollout stage. This increases autonomous action scope. Proceed?`,
                () => {
                    updateMode(newMode);
                    updateRollout(newRollout);
                    addEventEntry('CONTROL', `Mode → ${newMode}, Rollout → ${newRollout}`, 'warn');
                    addLogEntry('controls', `Applied: mode=${newMode}, rollout=${newRollout}`, 'info');
                }
            );
        } else {
            updateMode(newMode);
            updateRollout(newRollout);
            addEventEntry('CONTROL', `Mode → ${newMode}, Rollout → ${newRollout}`, 'info');
            addLogEntry('controls', `Applied: mode=${newMode}, rollout=${newRollout}`, 'info');
        }
    });

    // ── Modal ───────────────────────────────────────
    let modalCallback = null;

    function showModal(title, body, onConfirm) {
        els.modalTitle.textContent = title;
        els.modalBody.innerHTML = body;
        els.modalOverlay.style.display = 'flex';
        modalCallback = onConfirm;
    }

    els.modalCancel.addEventListener('click', () => {
        els.modalOverlay.style.display = 'none';
        modalCallback = null;
    });

    els.modalConfirm.addEventListener('click', () => {
        els.modalOverlay.style.display = 'none';
        if (modalCallback) modalCallback();
        modalCallback = null;
    });

    // ── ERPNext Connect Modal ───────────────────────
    els.btnConnectErp.addEventListener('click', () => {
        els.erpModal.style.display = 'flex';
    });

    $('erp-modal-cancel').addEventListener('click', () => {
        els.erpModal.style.display = 'none';
    });

    $('erp-modal-confirm').addEventListener('click', async () => {
        const url = $('erp-connect-url').value.trim();
        const key = $('erp-connect-key').value.trim();
        const secret = $('erp-connect-secret').value.trim();

        if (!url) return;

        els.erpModal.style.display = 'none';
        addLogEntry('erpnext', `Connecting to ${url}...`, 'info');

        const result = await apiCall('connect', { url, api_key: key, api_secret: secret });

        if (result.success) {
            els.erpUrl.textContent = url;
            els.erpUrl.style.color = 'var(--accent-teal)';
            addEventEntry('ERP', `Connected: ${url}`, 'info');
            addLogEntry('erpnext', 'Connected successfully', 'info');
        } else {
            addEventEntry('ERP', `Connection failed: ${result.error}`, 'error');
            addLogEntry('erpnext', `Failed: ${result.error}`, 'error');
        }
    });

    // ── WebSocket Event Stream ──────────────────────
    function connectWebSocket() {
        try {
            state.ws = new WebSocket(WS_URL);

            state.ws.onopen = () => {
                addEventEntry('WS', 'Connected to event bus', 'info');
                addLogEntry('websocket', 'Event bus connected', 'info');
            };

            state.ws.onmessage = (evt) => {
                const event = safeJSON(evt.data);
                if (!event) return;

                const type = event.type || 'EVENT';
                const source = event.source || 'system';
                const message = event.metadata?.message || event.message || JSON.stringify(event.metadata || {});
                const level = event.level || 'info';

                addEventEntry(type, message, level);
                addLogEntry(source, `[${type}] ${message}`, level);

                // Auto-react to certain events
                if (type === 'FILE_CHANGE') {
                    addEventEntry('WATCHER', `File changed: ${event.metadata?.path || 'unknown'}`, 'info');
                } else if (type === 'ERROR') {
                    addEventEntry('RECOVERY', `Error detected: ${message}`, 'error');
                } else if (type === 'HEALTH') {
                    if (event.metadata?.status === 'DEGRADED') {
                        updateConnectionStatus('DEGRADED');
                    }
                }
            };

            state.ws.onclose = () => {
                addEventEntry('WS', 'Disconnected — retrying in 5s', 'warn');
                setTimeout(connectWebSocket, 5000);
            };

            state.ws.onerror = () => {
                // Will trigger onclose
            };
        } catch {
            setTimeout(connectWebSocket, 5000);
        }
    }

    // ── Fetch Rules from Sidecar ────────────────────
    async function fetchRules() {
        const result = await apiCall('list_rules');
        if (result.success && Array.isArray(result.data)) {
            state.rules = result.data;
            updateBadges();
            refreshRulesList();
            refreshLearningFeed();
        }
    }

    // ── Polling Loop ────────────────────────────────
    function startPolling() {
        setInterval(async () => {
            await healthCheck();
        }, POLL_INTERVAL);
    }

    // ── Init ────────────────────────────────────────
    async function init() {
        addLogEntry('system', 'Dashboard initialized', 'info');
        addEventEntry('BOOT', 'Dashboard started', 'info');

        // Initial health check
        await healthCheck();

        // Fetch rules
        await fetchRules();

        // Start polling
        startPolling();

        // Connect WebSocket
        connectWebSocket();

        // Init voice
        initVoice();

        // Set initial section
        switchSection('ask');

        addLogEntry('system', 'All subsystems ready', 'info');
    }

    init();
})();
