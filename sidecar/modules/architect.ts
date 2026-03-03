
import { StateManager } from './state_manager';

export type Recommendation = 'PROCEED' | 'MODIFY' | 'DEFER' | 'REJECT';
export type Effort = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DecisionBrief {
    id: string;
    goalDescription: string;
    expectedBenefit: string;
    effortEstimate: Effort;
    risks: string[];
    alignmentScore: number;
    roiScore: number;
    recommendation: Recommendation;
    reasoning: string;
    alternatives?: string[];
    timestamp: number;
}

export interface CalibrationMetrics {
    totalDecisions: number;
    successfulOutcomes: number; // Goals we approved that succeeded
    badRecommendations: number; // Goals we approved that failed OR rejected goals that user forced and succeeded
    strictnessMultiplier: number; // 0.5 (lax) to 1.5 (strict), default 1.0
}

export class ArchitectEngine {
    private stateManager: StateManager;
    private metrics: CalibrationMetrics;
    private decisionLog: Record<string, { brief: DecisionBrief, overridden: boolean }>; // Map GoalID -> Decision

    constructor(stateManager: StateManager) {
        this.stateManager = stateManager;
        const state = this.stateManager.getState();

        // Initialize persistent state
        const architectState = (state as any).architect || {};
        this.metrics = architectState.metrics || {
            totalDecisions: 0,
            successfulOutcomes: 0,
            badRecommendations: 0,
            strictnessMultiplier: 1.0
        };
        this.decisionLog = architectState.decisionLog || {};

        // Persist initial state if missing
        if (!(state as any).architect) {
            this.save();
        }
    }

    analyzeGoal(description: string, criteria: string[]): DecisionBrief {
        const lowerDesc = description.toLowerCase();
        let effort: Effort = 'MEDIUM';
        let risks: string[] = [];
        let benefit = 'Improve system usage';
        let alignment = 80;

        // Heuristic Analysis (Simulated Brain)
        if (lowerDesc.includes('refactor') || lowerDesc.includes('rewrite')) {
            effort = 'HIGH';
            risks.push('Regression bugs', 'Time sink', 'Feature parity gaps');
            benefit = 'Long-term maintainability';
            alignment = 50;
        } else if (lowerDesc.includes('fix') || lowerDesc.includes('repair') || lowerDesc.includes('patch')) {
            effort = 'LOW';
            benefit = 'System stability';
            alignment = 100;
        } else if (lowerDesc.includes('deploy') || lowerDesc.includes('release')) {
            effort = 'MEDIUM';
            risks.push('Downtime', 'Configuration drift');
            benefit = 'User value delivery';
            alignment = 90;
        } else if (lowerDesc.includes('explore') || lowerDesc.includes('research')) {
            effort = 'LOW';
            benefit = 'Knowledge acquisition';
            alignment = 70;
        }

        // ROI Calculation
        let roi = 50;
        if (benefit === 'System stability') roi += 30;
        if (benefit === 'User value delivery') roi += 20;
        if (effort === 'LOW') roi += 20;
        if (effort === 'HIGH') roi -= 20;
        if (risks.length > 0) roi -= (risks.length * 10);
        if (alignment > 80) roi += 10;

        // Apply Strictness Calibration
        // If strictness > 1, we artificially lower ROI to be more conservative
        // If strictness < 1, we boost ROI to be more permissive
        const strictness = this.metrics.strictnessMultiplier;
        const adjustedRoi = roi * (1 / strictness);

        // Recommendation Logic
        let recommendation: Recommendation = 'PROCEED';
        let reasoning = 'Goal aligns with stability and reasonable effort.';
        let alternatives: string[] = [];

        if (adjustedRoi < 40) {
            recommendation = 'REJECT';
            reasoning = `ROI (${roi}) is too low (Strictness: ${strictness}). Effort/Risk outweighs benefit.`;
        } else if (alignment < 50) {
            recommendation = 'REJECT';
            reasoning = 'Strategic alignment is poor.';
        } else if (effort === 'HIGH' && adjustedRoi < 70) {
            recommendation = 'DEFER';
            reasoning = 'High effort for moderate return.';
        } else if (risks.includes('Regression bugs') || risks.includes('Downtime')) {
            recommendation = 'MODIFY';
            reasoning = 'Significant risks detected. Requires mitigation plan.';
            alternatives = ['Prototype first', 'Feature flag', 'Incremental rollout'];
        }

        return {
            id: Math.random().toString(36).substr(2, 9),
            goalDescription: description,
            expectedBenefit: benefit,
            effortEstimate: effort,
            risks,
            alignmentScore: alignment,
            roiScore: Math.round(adjustedRoi),
            recommendation,
            reasoning,
            alternatives: alternatives.length > 0 ? alternatives : undefined,
            timestamp: Date.now()
        };
    }

    recordGoalStart(goalId: string, brief: DecisionBrief, overridden: boolean) {
        this.decisionLog[goalId] = { brief, overridden };
        this.metrics.totalDecisions++;
        this.save();
    }

    recordGoalEnd(goalId: string, status: 'COMPLETED' | 'FAILED') {
        const record = this.decisionLog[goalId];
        if (!record) return;

        const { brief, overridden } = record;
        const successful = status === 'COMPLETED';

        let correctDecision = false;

        // Evaluation Matrix
        if (brief.recommendation === 'PROCEED') {
            if (successful) correctDecision = true; // We said go, it worked. Good.
            else correctDecision = false; // We said go, it failed. Bad.
        } else {
            // REJECT/MODIFY/DEFER
            if (overridden) {
                if (successful) correctDecision = false; // We said no, user forced it and succeeded. We were too strict.
                else correctDecision = true; // We said no, user forced it and failed. We were right.
            }
        }

        // Update Metrics
        if (correctDecision) {
            this.metrics.successfulOutcomes++;
            // If we were right, gently relax strictness if it was a rejection that failed (not applicable logic really)
            // or just maintain.
        } else {
            this.metrics.badRecommendations++;
            this.calibrate(overridden, successful);
        }

        // Cleanup log to save space (optional, maybe keep for history)
        // delete this.decisionLog[goalId];

        this.save();
    }

    private calibrate(overridden: boolean, successful: boolean) {
        // Self-Correction Logic
        if (overridden && successful) {
            // We were too strict (False Rejection)
            this.metrics.strictnessMultiplier = Math.max(0.5, this.metrics.strictnessMultiplier - 0.1);
            console.log(`[ARCHITECT]: Calibrating - decreasing strictness to ${this.metrics.strictnessMultiplier}`);
        } else if (!overridden && !successful) {
            // We were too lax (False Acceptance)
            this.metrics.strictnessMultiplier = Math.min(1.5, this.metrics.strictnessMultiplier + 0.1);
            console.log(`[ARCHITECT]: Calibrating - increasing strictness to ${this.metrics.strictnessMultiplier}`);
        }
    }

    getMetrics() {
        return this.metrics;
    }

    private save() {
        this.stateManager.updateState({
            architect: {
                metrics: this.metrics,
                decisionLog: this.decisionLog
            }
        } as any);
    }
}
