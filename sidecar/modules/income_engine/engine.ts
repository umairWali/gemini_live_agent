
import { StateManager } from '../state_manager';
import { CreativeStoryteller, GeneratedStory } from '../creative_storyteller';
import { UINavigator } from '../ui_navigator';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_INCOME_CONFIG, IncomeConfig } from './config';
import { CONTENT_PROMPTS } from './prompts';
import fs from 'fs';
import path from 'path';

export class IncomeEngine {
    private stateManager: StateManager;
    private storyteller: CreativeStoryteller;
    private navigator: UINavigator;
    private config: IncomeConfig = DEFAULT_INCOME_CONFIG;
    private apiKey: string;
    private lastReportPath: string;

    constructor(stateManager: StateManager, storyteller: CreativeStoryteller, navigator: UINavigator) {
        this.stateManager = stateManager;
        this.storyteller = storyteller;
        this.navigator = navigator;
        this.apiKey = process.env.API_KEY || '';
        this.lastReportPath = path.resolve(process.cwd(), 'data', 'income_report.json');
        this.loadConfig();
    }

    private loadConfig() {
        const configPath = path.resolve(process.cwd(), 'data', 'income_config.json');
        if (fs.existsSync(configPath)) {
            try {
                this.config = { ...DEFAULT_INCOME_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
            } catch (e) { }
        }
    }

    saveConfig(newConfig: Partial<IncomeConfig>) {
        this.config = { ...this.config, ...newConfig };
        const dataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'income_config.json'), JSON.stringify(this.config, null, 2));
        this.stateManager.addAuditEntry(`Income Engine Config Updated: ${this.config.niche}`, 'income_engine');
    }

    async runPulse(): Promise<{ status: string; log: string[] }> {
        const log: string[] = [];
        log.push(`🚀 Income Pulse Started: ${new Date().toLocaleString()}`);
        log.push(`Niche: ${this.config.niche}`);

        try {
            // 1. Research Trend
            const ai = new GoogleGenAI({ apiKey: this.apiKey });
            const researchResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-native-audio-latest',
                contents: [{ role: 'user', parts: [{ text: CONTENT_PROMPTS.trending_search(this.config.niche) }] }]
            });
            const trends = JSON.parse(researchResponse.text?.match(/\[[\s\S]*\]/)?.[0] || '[]');
            const targetTopic = trends[0] || `Best ${this.config.niche} tools 2025`;
            log.push(`🎯 Target Topic Found: ${targetTopic}`);

            // 2. Content Creation (Urdu/English Hybrid)
            const story = await this.storyteller.createInterleavedStory(
                targetTopic,
                'marketing',
                'social'
            );
            log.push(`✍️ Content Generated: ${story.title} (${story.segments.length} segments)`);

            // 3. Auto-Posting via UI Navigator
            if (this.config.targetPlatforms.includes('medium')) {
                log.push(`⏳ Posting to Medium... (Simulated)`);
                const plan = await this.navigator.createNavigationPlan(`Post this article to Medium: ${targetTopic}`);
                // In a real scenario, Navigator would carry out the sequence on the browser
                log.push(`✅ Navigation Plan Created: ${plan.steps.length} steps ready.`);
            }

            this.stateManager.addAuditEntry(`Income Pulse SUCCESS: ${targetTopic}`, 'income_engine');
            this.recordEarningReport(targetTopic, 'SUCCESS');
            return { status: 'SUCCESS', log };

        } catch (e: any) {
            log.push(`❌ ERROR: ${e.message}`);
            this.stateManager.addAuditEntry(`Income Pulse FAILED: ${e.message}`, 'income_engine');
            return { status: 'FAILED', log };
        }
    }

    private recordEarningReport(topic: string, status: string) {
        const report = { timestamp: Date.now(), topic, status, niche: this.config.niche };
        fs.appendFileSync(this.lastReportPath, JSON.stringify(report) + '\n');
    }

    getConfig(): IncomeConfig {
        return this.config;
    }
}
