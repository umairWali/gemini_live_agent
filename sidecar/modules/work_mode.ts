
import { StateManager } from './state_manager';

export type WorkMode = 'DEVELOPMENT' | 'TESTING' | 'PLANNING' | 'MEETING' | 'MAINTENANCE';

export interface ModeConfig {
    allowedInterruptions: boolean;
    autoResponseLevel: 'HIGH' | 'MEDIUM' | 'LOW'; // HIGH = detailed, LOW = concise
    proactiveSuggestions: boolean;
}

export class WorkModeEngine {
    private currentMode: WorkMode = 'DEVELOPMENT';
    private stateManager: StateManager;

    private modeConfigs: Record<WorkMode, ModeConfig> = {
        DEVELOPMENT: { allowedInterruptions: true, autoResponseLevel: 'LOW', proactiveSuggestions: true },
        TESTING: { allowedInterruptions: false, autoResponseLevel: 'HIGH', proactiveSuggestions: false },
        PLANNING: { allowedInterruptions: true, autoResponseLevel: 'MEDIUM', proactiveSuggestions: true },
        MEETING: { allowedInterruptions: false, autoResponseLevel: 'LOW', proactiveSuggestions: false },
        MAINTENANCE: { allowedInterruptions: true, autoResponseLevel: 'LOW', proactiveSuggestions: true }
    };

    constructor(stateManager: StateManager) {
        this.stateManager = stateManager;
    }

    // Called by event bus listeners or polling loops
    updateContext(signals: {
        activeApp?: string;
        openFiles?: string[];
        calendarEvent?: boolean;
        timeOfDay?: number
    }) {
        this.currentMode = this.inferMode(signals);
    }

    private inferMode(signals: { activeApp?: string; openFiles?: string[]; calendarEvent?: boolean; timeOfDay?: number }): WorkMode {
        if (signals.calendarEvent || signals.activeApp?.match(/zoom|teams|meet/i)) {
            return 'MEETING';
        }

        if (signals.openFiles?.some(f => f.includes('.test.') || f.includes('.spec.'))) {
            return 'TESTING';
        }

        if (signals.openFiles?.some(f => f.endsWith('.md') || f.endsWith('.txt'))) {
            return 'PLANNING';
        }

        if (signals.activeApp?.match(/code|cursor|idea|vim/i)) {
            return 'DEVELOPMENT';
        }

        const hour = signals.timeOfDay || new Date().getHours();
        if (hour < 8 || hour > 19) {
            return 'MAINTENANCE';
        }

        return 'DEVELOPMENT'; // Default
    }

    getMode(): WorkMode {
        return this.currentMode;
    }

    getConfig(): ModeConfig {
        return this.modeConfigs[this.currentMode];
    }
}
