
export type UserContext = 'FOCUSED_WORK' | 'EXPLORATION' | 'MEETING' | 'IDLE' | 'MAINTENANCE';

export interface PriorityInput {
    action: string;
    target: string;
    urgency?: number; // 0-100
    isUserInitiated: boolean;
    context?: UserContext;
}

export interface PriorityResult {
    score: number;
    action: 'EXECUTE' | 'DEFER' | 'DISCARD';
    reason: string;
}

export class PriorityEngine {
    private interruptionBudget = 5; // max per window
    private windowStart = Date.now();
    private WINDOW_SIZE = 30 * 60 * 1000; // 30 mins
    private lastContext: UserContext = 'IDLE';

    setContext(ctx: UserContext) {
        this.lastContext = ctx;
    }

    evaluate(input: PriorityInput): PriorityResult {
        // Reset budget if window passed
        if (Date.now() - this.windowStart > this.WINDOW_SIZE) {
            this.interruptionBudget = 5;
            this.windowStart = Date.now();
        }

        let score = input.urgency || 50;

        // 1. User Initiation overrides almost everything
        if (input.isUserInitiated) {
            return { score: 100, action: 'EXECUTE', reason: 'User initiated action.' };
        }

        // 2. Context Adjustments
        switch (this.lastContext) {
            case 'MEETING':
                score -= 40; // Heavy penalty
                break;
            case 'FOCUSED_WORK':
                score -= 20;
                break;
            case 'IDLE':
                score += 10;
                break;
        }

        // 3. Action Type Adjustments
        if (input.action === 'create_backup') score += 10; // Safety first
        if (input.action === 'write_file') score -= 5; // Potential noise

        // 4. Interruption Budget for Non-Critical
        if (score < 70) {
            if (this.interruptionBudget <= 0) {
                return { score, action: 'DEFER', reason: 'Interruption budget exhausted.' };
            }
        }

        // 5. Final Thresholds
        if (score < 40) {
            return { score, action: 'DEFER', reason: 'Priority score too low (<40).' };
        }

        // Consume budget if it's an interruption (autonomous action)
        if (!input.isUserInitiated) {
            this.interruptionBudget--;
        }

        return { score, action: 'EXECUTE', reason: `Priority Score ${score} passed threshold.` };
    }

    getBudget() {
        return this.interruptionBudget;
    }
}
