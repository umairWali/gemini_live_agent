
import { SystemStatus } from './health';
import { RiskLevel } from './judgment';

export interface ConfidenceContext {
    action: string;
    target: string;
    risk: RiskLevel;
    systemStatus: SystemStatus;
    executionHistorySuccessRate: number; // 0-1
}

export interface ConfidenceResult {
    score: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    requiresConfirmation: boolean;
    reason: string;
}

export class ConfidenceEngine {

    evaluate(ctx: ConfidenceContext): ConfidenceResult {
        let score = 100;
        const deductions: string[] = [];

        // 1. System Stability Impact
        if (ctx.systemStatus === 'DEGRADED') {
            score -= 20;
            deductions.push('System is DEGRADED (-20)');
        }
        if (ctx.systemStatus === 'SAFE_MODE') {
            score -= 50;
            deductions.push('System is in SAFE_MODE (-50)');
        }

        // 2. Risk Level Impact
        if (ctx.risk === 'HIGH') {
            score -= 30;
            deductions.push('High Risk Action (-30)');
        } else if (ctx.risk === 'MEDIUM') {
            score -= 10;
            deductions.push('Medium Risk Action (-10)');
        }

        // 3. Historical Success Context (Simulated logic)
        // In a real system, we'd query StateManager for success rate of this specific action
        if (ctx.executionHistorySuccessRate < 0.8) {
            score -= 15;
            deductions.push('Low historical success rate (-15)');
        }

        // 4. Action Specifics
        if (ctx.action === 'delete_file') {
            score -= 10;
            deductions.push('Destructive operation (-10)');
        }

        // Normalize
        score = Math.max(0, score);

        // Classification
        let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
        let requiresConfirmation = false;

        if (score < 60) {
            level = 'LOW';
            requiresConfirmation = true; // Auto-block or hard confirm
        } else if (score < 80) {
            level = 'MEDIUM';
            requiresConfirmation = true;
        } else {
            level = 'HIGH';
            requiresConfirmation = false;
        }

        return {
            score,
            level,
            requiresConfirmation,
            reason: deductions.length > 0 ? deductions.join(', ') : 'High confidence.'
        };
    }
}
