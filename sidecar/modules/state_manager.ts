
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, '../../data/state.json');

export interface OperatorState {
    goals: any[];
    tasks: any[];
    auditTrail: any[];
    vault: any[];
    knowledgeGraph: { nodes: any[]; links: any[] };
    lastSeen: number;
}

export class StateManager {
    private state: OperatorState;

    constructor() {
        const dir = path.dirname(STATE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        if (fs.existsSync(STATE_FILE)) {
            this.state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        } else {
            this.state = {
                goals: [],
                tasks: [],
                auditTrail: [],
                vault: [],
                knowledgeGraph: { nodes: [], links: [] },
                lastSeen: Date.now()
            };
            this.save();
        }
    }

    getState(): OperatorState {
        return this.state;
    }

    updateState(patch: Partial<OperatorState>) {
        this.state = { ...this.state, ...patch, lastSeen: Date.now() };
        this.save();
    }

    save() {
        fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    }

    addAuditEntry(text: string, source: string) {
        console.log(`[STATE]: Adding audit entry from ${source}: ${text}`);
        this.state.auditTrail.unshift({
            id: Math.random().toString(36).substr(2, 9),
            text,
            source,
            timestamp: Date.now()
        });
        this.state.auditTrail = this.state.auditTrail.slice(0, 1000); // Persist more than UI
        this.save();
    }
}
