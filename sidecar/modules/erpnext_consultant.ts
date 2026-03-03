
import { StateManager } from './state_manager';

export interface ConsultationBrief {
    businessGoal: string;
    involvedRoles: string[];
    standardDoctypes: string[];
    requiredFields: string[];
    workflows: string[];
    reports: string[];
    gaps: string[];
}

export interface DesignSolution {
    approach: 'STANDARD' | 'CUSTOM_FIELD' | 'WORKFLOW' | 'SERVER_SCRIPT' | 'CUSTOM_APP';
    configurationSteps: string[];
    automationIdeas: string[];
    risks: string[];
}

export type ProblemCategory = 'FINANCIAL_CONTROL' | 'OPERATIONAL_FLOW' | 'COMPLIANCE' | 'REPORTING' | 'DATA_QUALITY';
export type ConsultingMode = 'OBSERVATION' | 'ADVISORY' | 'ACTIVE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RolloutStage = 'SHADOW' | 'ASSISTED' | 'CO_PILOT' | 'TRUSTED';
export type ClientVisibility = 'INTERNAL_ONLY' | 'REVIEW_REQUIRED' | 'CLIENT_READY';
export type GovernanceTier = 'INFO' | 'REVIEW' | 'CRITICAL';
export type HumanDecision = 'ACCEPT' | 'MODIFY' | 'REJECT';
export type EvidenceStatus = 'VERIFIED' | 'INFERRED' | 'ASSUMED' | 'UNKNOWN';

export interface AdvisoryReport {
    detectedIntent: string;
    category: ProblemCategory;
    recommendedSolution: string;
    configurationSteps: string[];
    rejectedAlternatives: string[]; // with reasons
    validationChecks: string[];
    sideEffects: string[];
    // Safe Consulting Fields
    riskLevel: RiskLevel;
    confidence: ConfidenceLevel;
    businessImpact: string;
    consultantNote: string;
    clientVisibility: ClientVisibility;
    governanceTier: GovernanceTier;
    // Uncertainty & Assumption Fields
    evidenceStatus: EvidenceStatus;
    knownFacts: string[];
    assumptionsMade: string[];
    missingInformation: string[];
    verificationNeeded: string[];
    assumptionSummary: string;
}

// --- Governance Interfaces ---

export interface GovernanceLog {
    id: string;
    timestamp: number;
    recommendationType: string; // e.g., 'Advisory', 'Improvement'
    tier: GovernanceTier;
    humanDecision: HumanDecision;
    overrideReason?: string;
    modificationNote?: string;
}

export interface AuditReport {
    period: string;
    totalDecisions: number;
    acceptanceRate: string;
    rejectionRate: string;
    criticalActionsReviewed: number;
    overrides: GovernanceLog[];
    calibrationNote: string;
}

// --- Mentorship & Learning Interfaces ---

export interface MentorshipSession {
    id: string;
    timestamp: number;
    topic: string;
    transcriptSummary: string;
    expertDecision: string;
    rationale: string;
}

export interface LearnedRule {
    id: string;
    sourceSessionId: string;
    triggerPattern: string; // keyword or simple phrase
    action: string;
    rationale: string;
    safetyNotes: string;
    status: 'TENTATIVE' | 'VALIDATED';
    usageCount: number;
}

// --- Advanced Operations Interfaces ---

export interface MeetingAnalysis {
    summary: string;
    decisions: string[];
    openQuestions: string[];
    risks: string[];
    actionItems: string[];
    clientVisibility: ClientVisibility;
}

export interface ChangeImpact {
    changeRequest: string;
    affectedModules: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    breakingPoints: string[];
    saferAlternative?: string;
}

export interface CustomizationPlan {
    implementationSteps: string[];
    rollbackPlan: string[];
    migrationSafety: string;
    testChecklist: string[];
}

export interface SupportResolution {
    issue: string;
    probableCauses: string[];
    diagnosticChecks: string[];
    resolutionSteps: string[];
    preventionTip: string;
}

// --- Live Intelligence Interfaces ---

export interface ConnectionConfig {
    url: string;
    apiKey: string;
    apiSecret: string;
}

export interface LiveAnalysis {
    finding: string;
    evidence: any[];
    riskSummary: string;
}

// --- Knowledge Base Interfaces ---

export interface CaseRecord {
    id: string;
    timestamp: number;
    project?: string;
    module: string;
    symptoms: string;
    rootCause: string;
    resolution: string;
    tags: string[];
}

export interface KnowledgeArticle {
    id: string;
    title: string;
    problemPattern: string;
    diagnosisSteps: string[];
    fixSteps: string[];
    prevention: string;
    relatedCases?: string[];
    confidence?: ConfidenceLevel;
}

// --- Continuous Improvement Interfaces ---

export interface PatternRecord {
    patternId: string;
    frequency: number;
    modules: string[];
    symptoms: string[];
    rootCauses: string[];
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ImprovementProposal {
    problemPattern: string;
    rootCause: string;
    recommendedChange: string;
    implementationSteps: string[];
    expectedBenefit: string;
    riskLevel: RiskLevel;
}

export class ErpNextConsultant {
    private stateManager: StateManager;
    private connection: ConnectionConfig | null = null;
    private mode: ConsultingMode = 'OBSERVATION';
    private rolloutStage: RolloutStage = 'SHADOW';
    private knowledgeBase: { cases: CaseRecord[], articles: KnowledgeArticle[] } = { cases: [], articles: [] };
    private governanceLogs: GovernanceLog[] = [];
    private learnedRules: LearnedRule[] = [];
    private mentorshipSessions: MentorshipSession[] = [];

    constructor(stateManager: StateManager) {
        this.stateManager = stateManager;
        // In a real implementation, load knowledgeBase from StateManager
    }

    setMode(mode: ConsultingMode) {
        this.mode = mode;
        return { success: true, message: `Consultant mode switched to ${mode}` };
    }

    setRolloutStage(stage: RolloutStage) {
        this.rolloutStage = stage;
        return { success: true, message: `Rollout stage set to ${stage}` };
    }

    // --- Live Connection Methods ---

    connect(config: ConnectionConfig) {
        // Basic validation
        if (!config.url || !config.apiKey || !config.apiSecret) {
            throw new Error('Invalid connection config');
        }
        this.connection = config;
        return { success: true, message: 'Credentials stored in memory for session.' };
    }

    async getDocMeta(doctype: string): Promise<any> {
        if (!this.connection) throw new Error('Not connected. Call connect() first.');

        try {
            const response = await fetch(`${this.connection.url}/api/resource/DocType/${doctype}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.connection.apiKey}:${this.connection.apiSecret}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch metadata: ${response.statusText}`);
            }

            const json = await response.json();
            return json.data;
        } catch (error: any) {
            return { error: error.message, note: 'Ensure API access is enabled for this user.' };
        }
    }

    async simulateImpact(ruleType: string, params: any): Promise<LiveAnalysis> {
        if (!this.connection) return { finding: 'Offline', evidence: [], riskSummary: 'Cannot simulate without live connection.' };

        // Real integration would involve fetching data samples and running logic
        // Here we implement the logic structure for the requested features

        let finding = '';
        let evidence: any[] = [];
        let risk = 'LOW';

        try {
            if (ruleType === 'PRICING_RULE') {
                // Fetch random Item Price or Sales Order Item to check impact
                const response = await fetch(`${this.connection.url}/api/resource/Item Price?limit=5`, {
                    headers: { 'Authorization': `token ${this.connection.apiKey}:${this.connection.apiSecret}` }
                });
                const prices = (await response.json()).data || [];

                finding = `Simulated ${ruleType} on ${prices.length} records.`;
                evidence = prices.map((p: any) => ({
                    item_code: p.item_code,
                    old_price: p.price_list_rate,
                    new_price: p.price_list_rate * (1 - (params.discount_percentage || 0) / 100),
                    impact: 'Margin reduced'
                }));
                risk = 'MEDIUM';
            }

            if (ruleType === 'CREDIT_LIMIT') {
                // Fetch customers near credit limit
                const response = await fetch(`${this.connection.url}/api/resource/Customer?fields=["name","credit_limit","outstanding_amount"]&limit=5`, {
                    headers: { 'Authorization': `token ${this.connection.apiKey}:${this.connection.apiSecret}` }
                });
                const customers = (await response.json()).data || [];

                finding = 'Credit Limit Enforcement Analysis';
                evidence = customers.map((c: any) => ({
                    customer: c.name,
                    limit: c.credit_limit,
                    current: c.outstanding_amount,
                    will_block: c.outstanding_amount > (c.credit_limit || 0)
                }));
                risk = evidence.some(e => e.will_block) ? 'HIGH' : 'LOW';
            }
        } catch (e: any) {
            finding = `Simulation Error: ${e.message}`;
        }

        return {
            finding,
            evidence,
            riskSummary: risk
        };
    }

    // --- Original Consultant Methods ---

    scanRequest(description: string): ConsultationBrief {
        const lowerDesc = description.toLowerCase();

        // Simple Heuristic Extraction (In a real scenario, this would use NLP)
        const roles = ['System Manager', 'Administrator', 'Employee', 'Customer', 'Supplier', 'Accounts User', 'Sales User'];
        const doctypes = ['Sales Invoice', 'Purchase Order', 'Quotation', 'Customer', 'Item', 'Payment Entry', 'Journal Entry'];

        const foundRoles = roles.filter(r => lowerDesc.includes(r.toLowerCase()));
        const foundDoctypes = doctypes.filter(d => lowerDesc.includes(d.toLowerCase()));

        return {
            businessGoal: description,
            involvedRoles: foundRoles.length > 0 ? foundRoles : ['User'],
            standardDoctypes: foundDoctypes,
            requiredFields: [], // collaborative fill
            workflows: lowerDesc.includes('approve') || lowerDesc.includes('review') ? ['Approval Workflow'] : [],
            reports: lowerDesc.includes('report') ? ['Custom Report'] : [],
            gaps: foundDoctypes.length === 0 ? ['No standard Doctype identified'] : []
        };
    }

    validateDesign(brief: ConsultationBrief, suggestedApproach: DesignSolution['approach']): DesignSolution {
        const risks: string[] = [];
        let steps: string[] = [];

        // Design Policy Checks
        if (suggestedApproach === 'CUSTOM_APP') {
            risks.push('High maintenance. Verify if Server Script or Client Script suffices.');
        }

        if (suggestedApproach === 'SERVER_SCRIPT') {
            steps.push('Check allow_server_script in site_config.json');
        }

        // Accounting Integrity Checks
        if (brief.standardDoctypes.includes('Sales Invoice') || brief.standardDoctypes.includes('Payment Entry')) {
            if (brief.businessGoal.includes('pricing') || brief.businessGoal.includes('discount')) {
                risks.push('Verify impact on GL Entry and Tax Templates.');
                steps.push('Test on Staging first.');
            }
        }

        // Workflow Modeling
        if (brief.workflows.length > 0) {
            steps.push('Define Workflow States: Draft -> Pending -> Approved -> Rejected');
            steps.push('Configure Workflow Actions and Transitions');
            steps.push('Set Role-based permissions for each state');
        }

        return {
            approach: suggestedApproach,
            configurationSteps: steps,
            automationIdeas: ['Auto-email on submission', 'Daily summary report'],
            risks: risks
        };
    }

    auditRun(action: string, target: string): string[] {
        const warnings: string[] = [];
        if (action === 'delete_file' && target.includes('erpnext')) {
            warnings.push('Destructive action on ERPNext files. Require Backup.');
        }
        if (action === 'write_file' && target.endsWith('.json')) {
            warnings.push('Modifying JSON config. ensuring JSON validity.');
        }
        return warnings;
    }

    // --- Solution Advisor Mode (New) ---

    adviseSolution(description: string): AdvisoryReport {
        const lowerDesc = description.toLowerCase();
        let category: ProblemCategory = 'OPERATIONAL_FLOW'; // default
        let intent = 'General Improvement';

        // 1. Intent Discovery & Classification
        if (lowerDesc.match(/credit|limit|exposure|outstanding/)) {
            category = 'FINANCIAL_CONTROL';
            intent = 'Credit Control / Exposure Limits';
        } else if (lowerDesc.match(/margin|discount|price|rate/)) {
            category = 'FINANCIAL_CONTROL';
            intent = 'Margin Protection / Discount Governance';
        } else if (lowerDesc.match(/stock|reserve|available|warehouse/)) {
            category = 'OPERATIONAL_FLOW'; // or DATA_QUALITY
            intent = 'Stock Reservation / Availability Assurance';
        } else if (lowerDesc.match(/approve|audit|comply|sign|validation/)) {
            category = 'COMPLIANCE';
            intent = 'Approval Accountability / Audit Compliance';
        } else if (lowerDesc.match(/report|dashboard|chart|analytics/)) {
            category = 'REPORTING';
            intent = 'Visibility / Analysis';
        } else if (lowerDesc.match(/mandatory|validate|format|duplicate/)) {
            category = 'DATA_QUALITY';
            intent = 'Data Integrity';
        }

        // 2. Solution Selection & Side Effects
        const steps: string[] = [];
        const rejected: string[] = [];
        const validations: string[] = [];
        const sideEffects: string[] = [];
        let solution = '';

        switch (category) {
            case 'FINANCIAL_CONTROL':
                solution = 'Standard Settings + Pricing Rules';
                steps.push('Configure Credit Limit in Customer Group or Customer');
                steps.push('Enable "Check Credit Limit" in Global Defaults');
                steps.push('Use Pricing Rules for Discount thresholds (avoid custom scripts if possible)');
                rejected.push('Custom Script for Validation (Reason: Hard to maintain, native features exist)');
                sideEffects.push('Impacts Sales Order submission if limit exceeded');
                sideEffects.push('Verify multi-company settings if applicable');
                break;
            case 'COMPLIANCE':
                solution = 'Workflow + Role Permissions';
                steps.push('Create Workflow with specific states (Draft > Reviewed > Approved)');
                steps.push('Assign "Workflow Action" permissions to distinct Roles');
                steps.push('Use "DocShare" only for exceptions');
                rejected.push('Simple "Submit" permission (Reason: Lack of audit trail for intermediate steps)');
                sideEffects.push('Existing documents might need status update if workflow is applied retroactively');
                break;
            case 'OPERATIONAL_FLOW':
                solution = 'Standard DocStatus Transitions';
                steps.push('Use standard Submit/Cancel flow where possible');
                steps.push('Automate Status updates via "StatusUpdater" (if python access)');
                sideEffects.push('Observe Stock Ledger Entries on Submit');
                sideEffects.push('Review GL Entries on Submit');
                break;
            case 'REPORTING':
                solution = 'Report Builder / Auto Email Reports';
                steps.push('Use Report Builder for simple columnar data');
                steps.push('Use Script Report only for complex aggregation');
                rejected.push('Direct SQL Access (Reason: Security risk, bypasses permission engine)');
                break;
            case 'DATA_QUALITY':
                solution = 'DocType Configuration (Mandatory Fields)';
                steps.push('Set fields as Mandatory in Customize Form');
                steps.push('Use "Validation DocType" for foreign key constraints');
                rejected.push('Client Script for validation (Reason: Bypassed by API/Import)');
                break;
        }

        // Universal Side Effects
        if (lowerDesc.includes('gl') || lowerDesc.includes('posting') || category === 'FINANCIAL_CONTROL') {
            sideEffects.push('CRITICAL: Check GL Entry creation. Test with "Payment Entry" and "Journal Entry".');
        }

        // --- Safe Consulting Logic ---

        // 1. Risk Assessment
        let riskLevel: RiskLevel = 'LOW';
        if (category === 'FINANCIAL_CONTROL' || sideEffects.length > 0) riskLevel = 'MEDIUM';
        if (lowerDesc.includes('delete') || lowerDesc.includes('loss')) riskLevel = 'HIGH';

        // 2. Confidence Scoring
        let confidence: ConfidenceLevel = 'MEDIUM';
        if (this.connection) confidence = 'HIGH'; // Live connection increases confidence
        else if (lowerDesc.length < 10) confidence = 'LOW'; // Vague input

        // 3. Business Translation
        let businessImpact = 'This change affects system configuration.';
        if (category === 'FINANCIAL_CONTROL') businessImpact = 'This will affect how financial transactions are recorded and may impact Profit/Loss reports.';
        if (category === 'OPERATIONAL_FLOW') businessImpact = 'This will change the daily workflow for staff members.';
        if (category === 'COMPLIANCE') businessImpact = 'This introduces new audit steps that users must follow.';

        // 4. Mode-Aware Messaging
        let note = '';
        if (this.mode === 'OBSERVATION') {
            note = 'OBSERVATION MODE: Based on the request, this appears to be a valid requirement. No changes recommended yet. Please review the potential impact.';
            // steps = []; // Commented out re-assignment to avoid error if steps was const, or just let it pass if it is let. 
            // Actually, I should check if steps is const or let. In line 51 it is 'let'.
            // However, maybe the TS compiler sees it as const in some scope?
            // Let's just clear the array instead of reassigning.
            steps.length = 0;
        } else if (this.mode === 'ADVISORY') {
            note = `ADVISORY MODE: Recommended approach is ${solution}. Please verify the business impact before proceeding.`;
        } else {
            note = `ACTIVE MODE: Ready to configure. Ensure backup is taken before applying steps.`;
        }

        // 5. Client Visibility (Rollout Protocol)
        let visibility: ClientVisibility = 'INTERNAL_ONLY';
        if (this.rolloutStage === 'SHADOW') visibility = 'INTERNAL_ONLY';
        else if (this.rolloutStage === 'ASSISTED' || this.rolloutStage === 'CO_PILOT') visibility = 'REVIEW_REQUIRED';
        else if (this.rolloutStage === 'TRUSTED') {
            visibility = (riskLevel === 'HIGH' || solution.includes('Configuration')) ? 'REVIEW_REQUIRED' : 'CLIENT_READY';
        }

        const report = {
            detectedIntent: intent,
            category: category,
            recommendedSolution: solution,
            configurationSteps: steps,
            rejectedAlternatives: rejected,
            validationChecks: validations,
            sideEffects: sideEffects,
            riskLevel: riskLevel,
            confidence: confidence,
            businessImpact: businessImpact,
            consultantNote: note,
            clientVisibility: visibility,
            governanceTier: (riskLevel === 'HIGH' || category === 'FINANCIAL_CONTROL') ? 'CRITICAL' : 'REVIEW'
        };

        // 6. Uncertainty & Assumption Disclosure
        let evidenceStatus: EvidenceStatus = 'ASSUMED';
        const knownFacts: string[] = [`User request: "${description}"`];
        const assumptions: string[] = ['Standard ERPNext functionality applies', 'No custom scripts interfere'];
        const missing: string[] = [];
        const verification: string[] = [];

        // 7. Apply Learned Rules (Mentorship)
        const applicableRules = this.suggestLearnedRules(description);
        let learnedAdvice = '';
        if (applicableRules.length > 0) {
            learnedAdvice = `\n[MENTORSHIP INSIGHT]: Found ${applicableRules.length} learned rules. Top advice: ${applicableRules[0].action} (Rationale: ${applicableRules[0].rationale})`;
            note += learnedAdvice;
            // Boost confidence if we have a validated rule matching this EXACT situation
            if (applicableRules[0].status === 'VALIDATED') {
                // logic to potentially boost confidence
            }
        }

        if (this.connection) {
            evidenceStatus = 'VERIFIED'; // Or INFERRED depending on depth, treating metadata access as VERIFIED for structure
            knownFacts.push('Live connection active (metadata available)');
        } else {
            evidenceStatus = 'ASSUMED';
            missing.push('Live instance data');
            missing.push('Current customization state');
            verification.push('Verify solution in sandbox environment');
        }

        // Downgrade confidence if assumptions exist
        if (evidenceStatus === 'ASSUMED') {
            confidence = 'LOW';
        }

        const assumptionSummary = `Confidence is ${confidence} because evidence is ${evidenceStatus}. ${missing.length > 0 ? missing.length + ' missing data points.' : 'Data verified.'}`;

        return {
            ...report, // Warning: Spread causes getters/methods to be lost if report was class instance, but it is plain object here.
            evidenceStatus,
            knownFacts,
            assumptionsMade: assumptions,
            missingInformation: missing,
            verificationNeeded: verification,
            assumptionSummary,
            confidence: confidence, // Override confidence with adjusted value
            consultantNote: note, // Override note with updated value (including mentorship insight)
            governanceTier: ((report.riskLevel === 'HIGH' || report.category === 'FINANCIAL_CONTROL') ? 'CRITICAL' : 'REVIEW') as GovernanceTier
        };
    }

    // --- Governance Methods ---

    logDecision(data: { type: string, tier: GovernanceTier, decision: HumanDecision, reason?: string, note?: string }) {
        const log: GovernanceLog = {
            id: `GOV-${Date.now()}`,
            timestamp: Date.now(),
            recommendationType: data.type,
            tier: data.tier,
            humanDecision: data.decision,
            overrideReason: data.reason,
            modificationNote: data.note
        };
        this.governanceLogs.push(log);
        return { success: true, message: 'Decision logged', id: log.id };
    }

    generateAuditReport(): AuditReport {
        const total = this.governanceLogs.length;
        if (total === 0) {
            return {
                period: 'All Time',
                totalDecisions: 0,
                acceptanceRate: '0%',
                rejectionRate: '0%',
                criticalActionsReviewed: 0,
                overrides: [],
                calibrationNote: 'No decisions recorded yet.'
            };
        }

        const accepted = this.governanceLogs.filter(l => l.humanDecision === 'ACCEPT').length;
        const rejected = this.governanceLogs.filter(l => l.humanDecision === 'REJECT').length;
        const critical = this.governanceLogs.filter(l => l.tier === 'CRITICAL').length;
        const overrides = this.governanceLogs.filter(l => l.humanDecision !== 'ACCEPT');

        const accRate = (accepted / total) * 100;
        const rejRate = (rejected / total) * 100;

        let note = 'Balanced usage detected.';
        if (accRate > 80) note = 'WARNING: High acceptance rate detected. Ensure consultant is critically reviewing outputs.';
        if (rejRate > 80) note = 'WARNING: High rejection rate detected. Calibration required.';

        return {
            period: 'All Time',
            totalDecisions: total,
            acceptanceRate: `${accRate.toFixed(1)}%`,
            rejectionRate: `${rejRate.toFixed(1)}%`,
            criticalActionsReviewed: critical,
            overrides: overrides,
            calibrationNote: note
        };
    }

    // --- Knowledge Base Methods ---

    recordCase(details: { project?: string, module: string, symptoms: string, rootCause: string, resolution: string }): CaseRecord {
        const newCase: CaseRecord = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            project: details.project,
            module: details.module,
            symptoms: details.symptoms,
            rootCause: details.rootCause,
            resolution: details.resolution,
            tags: [details.module, ...details.rootCause.split(' ')]
        };
        this.knowledgeBase.cases.push(newCase);
        return newCase;
    }

    findSimilarCases(query: string): CaseRecord[] {
        const lowerQuery = query.toLowerCase();
        return this.knowledgeBase.cases.filter(c =>
            c.symptoms.toLowerCase().includes(lowerQuery) ||
            c.rootCause.toLowerCase().includes(lowerQuery) ||
            c.module.toLowerCase().includes(lowerQuery)
        );
    }

    generateArticle(caseId: string): KnowledgeArticle | null {
        const caseRecord = this.knowledgeBase.cases.find(c => c.id === caseId);
        if (!caseRecord) return null;

        const article: KnowledgeArticle = {
            id: `ART-${Date.now()}`,
            title: `Resolution for: ${caseRecord.symptoms}`,
            problemPattern: caseRecord.symptoms,
            diagnosisSteps: ['Check error logs', 'Verify permissions', 'Review configuration'],
            fixSteps: [caseRecord.resolution],
            prevention: 'Update role permissions or add validation script',
            relatedCases: [caseId],
            confidence: 'HIGH'
        };

        // Avoid duplicates (simple check)
        const existing = this.knowledgeBase.articles.find(a => a.title === article.title);
        if (!existing) {
            this.knowledgeBase.articles.push(article);
            return article;
        }
        return existing;
    }

    // --- Mentorship & Learning Methods ---

    recordMentorship(data: { topic: string, summary: string, decision: string, rationale: string }): MentorshipSession {
        const session: MentorshipSession = {
            id: `MENTOR-${Date.now()}`,
            timestamp: Date.now(),
            topic: data.topic,
            transcriptSummary: data.summary,
            expertDecision: data.decision,
            rationale: data.rationale
        };
        this.mentorshipSessions.push(session);
        return session;
    }

    learnRule(data: { sessionId: string, trigger: string, action: string, rationale: string, safety?: string }): LearnedRule {
        const rule: LearnedRule = {
            id: `RULE-${Date.now()}`,
            sourceSessionId: data.sessionId,
            triggerPattern: data.trigger,
            action: data.action,
            rationale: data.rationale,
            safetyNotes: data.safety || 'Verify before applying.',
            status: 'TENTATIVE',
            usageCount: 0
        };
        this.learnedRules.push(rule);
        return rule;
    }

    suggestLearnedRules(context: string): LearnedRule[] {
        // Simple keyword matching for now
        return this.learnedRules.filter(r => context.toLowerCase().includes(r.triggerPattern.toLowerCase()));
    }

    // --- Continuous Improvement Methods ---

    analyzePatterns(): PatternRecord[] {
        // Simple grouping by Root Cause to detect recurrence
        const patterns: Record<string, PatternRecord> = {};

        this.knowledgeBase.cases.forEach(c => {
            const key = c.rootCause;
            if (!patterns[key]) {
                patterns[key] = {
                    patternId: `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Unique ID generation
                    frequency: 0,
                    modules: [],
                    symptoms: [],
                    rootCauses: [key],
                    impactLevel: 'LOW'
                };
            }
            patterns[key].frequency++;
            if (!patterns[key].modules.includes(c.module)) patterns[key].modules.push(c.module);
            if (!patterns[key].symptoms.includes(c.symptoms)) patterns[key].symptoms.push(c.symptoms);
        });

        // Filter for significant patterns (e.g., frequency > 1 for demo, usually >= 3)
        return Object.values(patterns).filter(p => p.frequency > 1).map(p => {
            if (p.frequency >= 3) p.impactLevel = 'HIGH';
            else if (p.frequency === 2) p.impactLevel = 'MEDIUM';
            return p;
        });
    }

    generateImprovementPlan(patternId: string): ImprovementProposal | null {
        // Recover pattern from analysis (in a real app, patterns might be persisted)
        // For now, we re-analyze to find it, or we assume the ID is passed back from a fresh analysis
        const patterns = this.analyzePatterns();
        const pattern = patterns.find(p => p.patternId === patternId) || patterns.find(p => p.rootCauses[0] === patternId); // Fallback to rootCause search if ID doesn't match/exist in this session

        if (!pattern) return null;

        // heuristic to propose solution
        let solution = '';
        let steps: string[] = [];
        let benefit = '';
        let risk: RiskLevel = 'LOW';

        const rootCause = pattern.rootCauses[0].toLowerCase();

        if (rootCause.includes('permission')) {
            solution = 'Role Permission Manager Update';
            steps = ['Identify affected Role', 'Adjust permissions for DocType in Role Permission Manager', 'Validate with user'];
            benefit = 'Eliminates repetitive access requests.';
        } else if (rootCause.includes('validation') || rootCause.includes('data')) {
            solution = 'Add Validation Rule';
            steps = ['Create client script or server script', 'Add validation logic', 'Test with sample data'];
            benefit = 'Prevents invalid data entry at source.';
            risk = 'MEDIUM';
        } else {
            solution = 'Review Workflow Configuration';
            steps = ['Audit current workflow states', 'Adjust transitions', 'Update Role permissions if needed'];
            benefit = 'Streamlines process flow.';
        }

        return {
            problemPattern: pattern.symptoms.join(', '),
            rootCause: pattern.rootCauses[0],
            recommendedChange: solution,
            implementationSteps: steps,
            expectedBenefit: benefit,
            riskLevel: risk
        };
    }

    // --- Advanced Operations Methods ---

    analyzeMeeting(transcript: string): MeetingAnalysis {
        const lowerTranscript = transcript.toLowerCase();
        const sentences = transcript.split(/[.!?\n]/).filter(s => s.trim().length > 0);

        const decisions = sentences.filter(s => s.match(/agree|decid|confirm|approved/i)).map(s => s.trim());
        const questions = sentences.filter(s => s.match(/\?|ask|clarify|unknown/i)).map(s => s.trim());
        const actions = sentences.filter(s => s.match(/todo|action|task|assigned/i)).map(s => s.trim());
        const risks = lowerTranscript.includes('risk') ? ['Potential project delay identified', 'Scope creep detected'] : [];
        const summary = `Meeting processed. Detected ${decisions.length} decisions and ${actions.length} action items.`;

        // Determine visibility based on stage
        let visibility: ClientVisibility = 'INTERNAL_ONLY';
        if (this.rolloutStage === 'SHADOW') visibility = 'INTERNAL_ONLY';
        else if (this.rolloutStage === 'ASSISTED') visibility = 'REVIEW_REQUIRED';
        else visibility = 'CLIENT_READY'; // Co-Pilot and Trusted can share summaries

        return {
            summary: summary,
            decisions: decisions,
            openQuestions: questions.length > 0 ? questions : ['Clarify specific implementation timeline', 'Confirm budget approval'],
            risks: risks,
            actionItems: actions,
            clientVisibility: visibility
        };
    }

    analyzeImpact(changeRequest: string): ChangeImpact {
        const lowerReq = changeRequest.toLowerCase();
        const affected: string[] = [];
        let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        const breaks: string[] = [];

        if (lowerReq.match(/price|tax|account|ledger|gl/)) {
            affected.push('Accounting');
            risk = 'MEDIUM';
        }
        if (lowerReq.match(/stock|warehouse|serial|batch/)) {
            affected.push('Stock');
            risk = 'MEDIUM';
        }
        if (lowerReq.match(/permission|role|user/)) {
            affected.push('Security');
            risk = 'HIGH';
        }
        if (lowerReq.match(/delete|remove|drop/)) {
            risk = 'HIGH';
            breaks.push('Data Loss identified');
        }

        return {
            changeRequest: changeRequest,
            affectedModules: affected,
            riskLevel: risk,
            breakingPoints: breaks,
            saferAlternative: risk === 'HIGH' ? 'Archive/Rename instead of Delete, or use Role Profiles instead of direct Permission edits.' : undefined
        };
    }

    generateCustomization(requirement: string): CustomizationPlan {
        let steps: string[] = [];
        let rollback: string[] = [];
        let method = 'SETTINGS';

        if (requirement.match(/field|column|data/i)) method = 'CUSTOM_FIELD';
        if (requirement.match(/logic|calc|auto/i)) method = 'SERVER_SCRIPT';

        switch (method) {
            case 'SETTINGS':
                steps = ['Check Module Settings', 'Check Global Defaults'];
                rollback = ['Revert setting value'];
                break;
            case 'CUSTOM_FIELD':
                steps = ['Go to Customize Form', 'Add Row', 'Set Type and Label', 'Update'];
                rollback = ['Delete Custom Field row (Careful with data)'];
                break;
            case 'SERVER_SCRIPT':
                steps = ['Create Server Script', 'Set DocType hook', 'Write Python logic', 'Enable'];
                rollback = ['Disable Server Script'];
                break;
        }

        return {
            implementationSteps: steps,
            rollbackPlan: rollback,
            migrationSafety: method === 'CUSTOM_FIELD' ? 'Export Customizations to App for persistence' : 'Safe if kept in DB',
            testChecklist: ['Verify UI appearance', 'Check permission visibility', 'Test logic with test data']
        };
    }

    resolveTicket(issue: string): SupportResolution {
        const lowerIssue = issue.toLowerCase();
        let probable: string[] = [];
        let checks: string[] = [];
        let fix: string[] = [];

        if (lowerIssue.match(/permission|access|denied|hidden/)) {
            probable = ['Role Permission missing', 'User Role Assignment missing', 'Level permission issue'];
            checks = ['Check Role Permissions Manager', 'Check User Roles', 'Check Perm Level in Customize Form'];
            fix = ['Add role to user', 'Adjust permission manager'];
        } else if (lowerIssue.match(/slow|timeout|stuck/)) {
            probable = ['Large dataset query', 'Unoptimized script', 'Lock wait'];
            checks = ['Check Background Jobs', 'Check Slow Log', 'Analyze mariaDB processes'];
            fix = ['Optimize index', 'Restart scheduler if stuck'];
        } else {
            probable = ['Configuration Error', 'Data Issue'];
            checks = ['Check Error Log List', 'Reproduce in Staging'];
            fix = ['Correct configuration'];
        }

        return {
            issue: issue,
            probableCauses: probable,
            diagnosticChecks: checks,
            resolutionSteps: fix,
            preventionTip: 'Regularly monitor Error Logs and Permission Audit.'
        };
    }
}
