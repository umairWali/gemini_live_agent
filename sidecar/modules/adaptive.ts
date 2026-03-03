
import { StateManager } from './state_manager';

export interface UserPreferences {
    interruptionTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
    preferredWorkHours: { start: number; end: number }; // 0-23
    autoApproveLowRisk: boolean;
    trustScore: number; // 0-100
    learning: {
        lastFeedbackRequest: number;
        rejectedSuggestions: string[];
        approvedSuggestions: string[];
    };
}

export class AdaptiveEngine {
    private stateManager: StateManager;
    private prefs: UserPreferences;

    constructor(stateManager: StateManager) {
        this.stateManager = stateManager;
        const state = this.stateManager.getState();

        // Initialize or load
        this.prefs = (state as any).preferences || {
            interruptionTolerance: 'MEDIUM',
            preferredWorkHours: { start: 9, end: 17 },
            autoApproveLowRisk: true,
            trustScore: 80, // Start relatively high
            learning: {
                lastFeedbackRequest: 0,
                rejectedSuggestions: [],
                approvedSuggestions: []
            }
        };

        // Ensure state has preferences field if it didn't before
        if (!(state as any).preferences) {
            this.stateManager.updateState({ preferences: this.prefs } as any);
        }
    }

    shouldInterrupt(urgency: number): boolean {
        const hour = new Date().getHours();
        const isWorkHours = hour >= this.prefs.preferredWorkHours.start && hour <= this.prefs.preferredWorkHours.end;

        // If outside work hours, increase threshold significantly
        let threshold = isWorkHours ? 50 : 80;

        // Adjust based on tolerance
        if (this.prefs.interruptionTolerance === 'LOW') threshold += 20;
        if (this.prefs.interruptionTolerance === 'HIGH') threshold -= 10;

        // Trust factor: lower trust = harder to interrupt
        if (this.prefs.trustScore < 50) threshold += 15;

        return urgency >= threshold;
    }

    recordFeedback(actionType: string, approved: boolean) {
        if (approved) {
            this.prefs.trustScore = Math.min(100, this.prefs.trustScore + 2);
            this.prefs.learning.approvedSuggestions.push(actionType);
        } else {
            this.prefs.trustScore = Math.max(0, this.prefs.trustScore - 5);
            this.prefs.learning.rejectedSuggestions.push(actionType);
        }

        // Trim history
        if (this.prefs.learning.approvedSuggestions.length > 50) this.prefs.learning.approvedSuggestions.shift();
        if (this.prefs.learning.rejectedSuggestions.length > 50) this.prefs.learning.rejectedSuggestions.shift();

        this.save();
    }

    getTrustScore() {
        return this.prefs.trustScore;
    }

    private save() {
        this.stateManager.updateState({ preferences: this.prefs } as any);
    }
}
