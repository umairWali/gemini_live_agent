
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import { executeAction } from './executor';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Brain {
    private ai: GoogleGenAI;
    private stateManager: StateManager;

    constructor(apiKey: string, stateManager: StateManager) {
        this.ai = new GoogleGenAI({ apiKey });
        this.stateManager = stateManager;
    }

    async pulse() {
        const state = this.stateManager.getState();
        this.stateManager.addAuditEntry("DAEMON_PULSE: Starting Co-Developer initiative cycle.", "brain");

        // 1. Analyze Environment
        const files = fs.readdirSync(path.resolve(__dirname, '../../'));
        const missingReadme = !files.includes('README.md');
        const hasLockFile = files.includes('package-lock.json');

        // 2. Rank opportunities
        if (missingReadme) {
            this.stateManager.addAuditEntry("INITIATIVE: Detected missing README.md. Proposal: Generate structural documentation.", "brain");
        }

        if (!hasLockFile) {
            this.stateManager.addAuditEntry("INITIATIVE: Missing lockfile. Proposal: Run 'npm install' to stabilize dependencies.", "brain");
        }

        // 3. Log active goals status
        state.goals.forEach(goal => {
            this.stateManager.addAuditEntry(`GOAL_MONITOR: Goal "${goal.title}" is at ${goal.progress}%`, "brain");
        });
    }
}
