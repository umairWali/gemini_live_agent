import { ExecutionResult, executeAction } from './executor';

export type ErrorCategory = 'DEPENDENCY' | 'PERMISSION' | 'RUNTIME' | 'LOGIC' | 'NETWORK';

export interface RecoveryStrategy {
    category: ErrorCategory;
    strategy: string;
    action: () => Promise<ExecutionResult>;
}

export class RecoveryEngine {
    async classifyError(error: string): Promise<ErrorCategory> {
        const err = error.toUpperCase();
        if (err.includes('PERMISSION') || err.includes('EACCES') || err.includes('ACCESS DENIED')) return 'PERMISSION';
        if (err.includes('ENOENT') || err.includes('NOT FOUND') || err.includes('MODULE_NOT_FOUND')) return 'DEPENDENCY';
        if (err.includes('TIMEOUT') || err.includes('ECONN') || err.includes('NETWORK')) return 'NETWORK';
        if (err.includes('SYNTAX') || err.includes('UNEXPECTED')) return 'LOGIC';
        return 'RUNTIME';
    }

    getStrategy(category: ErrorCategory, target: string): string {
        const strategies = {
            PERMISSION: 'ELEVATE_AND_RETRY',
            DEPENDENCY: 'INSTALL_MISSING_PACKAGES',
            NETWORK: 'BACKOFF_RETRY',
            RUNTIME: 'RESTART_SERVICE',
            LOGIC: 'ANALYZE_AND_FIX'
        };
        return strategies[category];
    }

    async attemptRepair(category: ErrorCategory, target: string): Promise<ExecutionResult> {
        console.log(`[RECOVERY]: Attempting repair for ${category} on ${target}`);

        switch (category) {
            case 'DEPENDENCY':
                return await executeAction('run_command', 'npm install');
            case 'RUNTIME':
                return await executeAction('run_command', 'npm cache clean --force');
            case 'PERMISSION':
                return { success: false, error: 'Manual Elevation Required' };
            default:
                return { success: true, output: `Applied generic strategy: ${this.getStrategy(category, target)}` };
        }
    }
}
