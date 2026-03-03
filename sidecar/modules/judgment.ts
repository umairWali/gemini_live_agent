
import fs from 'fs';
import path from 'path';
import { ExecutionResult } from './executor';

export enum RiskLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

export interface DecisionContext {
    action: string;
    target: string;
    args?: any;
    risk?: RiskLevel;
}

export interface JudgmentResult {
    approved: boolean;
    reason?: string;
    suggestedLevel?: RiskLevel;
    needsApproval: boolean;
    rollbackPlan?: string;
}

export class JudgmentEngine {
    private policy = {
        LOW: ['read_file', 'list_processes', 'health_check', 'get_state'],
        MEDIUM: ['write_file', 'run_command', 'create_backup', 'watch_dir', 'apply_repair'],
        HIGH: ['delete_file', 'rmdir', 'format_disk', 'system_reboot', 'external_deploy']
    };

    async evaluate(context: DecisionContext): Promise<JudgmentResult> {
        const { action, target } = context;
        console.log(`[JUDGMENT]: Evaluating ${action} on ${target}`);

        // 1. Identify Risk Level
        let level = RiskLevel.MEDIUM; // Default
        if (this.policy.LOW.includes(action)) level = RiskLevel.LOW;
        if (this.policy.HIGH.includes(action)) level = RiskLevel.HIGH;

        // 2. Decision Gates
        const ownershipOk = this.isWithinScope(target);
        if (!ownershipOk) {
            return { approved: false, reason: 'OUT_OF_SCOPE: Path is outside project directory.', needsApproval: true };
        }

        // 3. Reversibility & Approval Logic
        const needsApproval = level !== RiskLevel.LOW;

        const rollbackPlan = this.defineRollback(action, target);

        return {
            approved: !needsApproval, // Auto-approve only LOW risk
            suggestedLevel: level,
            needsApproval,
            rollbackPlan,
            reason: needsApproval ? `Action ${action} is classified as ${level} risk.` : 'Safe operation.'
        };
    }

    private isWithinScope(target: string): boolean {
        // Simple scope check: must be within the user folders or relative
        if (path.isAbsolute(target)) {
            return target.toLowerCase().includes('personal-ai-operator');
        }
        return true; // Relative paths are resolved by executor to project root anyway
    }

    private defineRollback(action: string, target: string): string {
        switch (action) {
            case 'write_file':
                return `Restore from ${target}.bak`;
            case 'run_command':
                return 'Command results are generally non-atomic; manual review required.';
            default:
                return 'No automatic rollback available.';
        }
    }
}
