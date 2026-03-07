
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface ErrorPattern {
  id: string;
  errorType: string;
  pattern: string; // regex or string match
  fixStrategy: string;
  autoFixable: boolean;
  successRate: number;
}

export interface HealingAttempt {
  id: string;
  error: string;
  filePath: string;
  lineNumber?: number;
  attemptedFix: string;
  success: boolean;
  originalCode: string;
  fixedCode: string;
  timestamp: number;
  backupPath: string;
}

export class SelfHealingCode {
  private stateManager: StateManager;
  private apiKey: string;
  private patterns: ErrorPattern[] = [];
  private healingHistory: HealingAttempt[] = [];
  private backupDir: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
    this.backupDir = path.resolve(process.cwd(), 'data', 'backups');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    this.initializePatterns();
    this.loadHistory();
  }

  private initializePatterns(): void {
    this.patterns = [
      {
        id: 'missing_import',
        errorType: 'ReferenceError|Module not found',
        pattern: 'Cannot find module|is not defined|ReferenceError',
        fixStrategy: 'Add missing import statement',
        autoFixable: true,
        successRate: 0.85
      },
      {
        id: 'type_error',
        errorType: 'TypeError',
        pattern: 'Cannot read property|undefined is not|of undefined',
        fixStrategy: 'Add null check or optional chaining',
        autoFixable: true,
        successRate: 0.75
      },
      {
        id: 'syntax_error',
        errorType: 'SyntaxError',
        pattern: 'Unexpected token|Missing semicolon',
        fixStrategy: 'Fix syntax issue',
        autoFixable: false,
        successRate: 0.60
      },
      {
        id: 'missing_async',
        errorType: 'SyntaxError',
        pattern: 'await is only valid in async',
        fixStrategy: 'Add async keyword to function',
        autoFixable: true,
        successRate: 0.90
      },
      {
        id: 'unclosed_bracket',
        errorType: 'SyntaxError',
        pattern: 'Unexpected end of input|missing.*after element list',
        fixStrategy: 'Close brackets/parentheses',
        autoFixable: true,
        successRate: 0.80
      },
      {
        id: 'missing_return',
        errorType: 'TypeError',
        pattern: '.* is not a function|then is not a function',
        fixStrategy: 'Add return statement to function',
        autoFixable: true,
        successRate: 0.70
      }
    ];
  }

  async analyzeAndHeal(error: string, stackTrace?: string, filePath?: string): Promise<HealingAttempt | null> {
    // Find matching pattern
    const pattern = this.patterns.find(p => 
      new RegExp(p.pattern, 'i').test(error) || 
      (stackTrace && new RegExp(p.pattern, 'i').test(stackTrace))
    );

    if (!pattern) {
      this.stateManager.addAuditEntry(`No healing pattern found for error: ${error.substring(0, 100)}`, 'self_healing');
      return null;
    }

    if (!pattern.autoFixable || pattern.successRate < 0.7) {
      this.stateManager.addAuditEntry(`Pattern found but not auto-fixable: ${pattern.id}`, 'self_healing');
      return null;
    }

    // Attempt healing
    const attempt = await this.attemptHealing(error, stackTrace, filePath, pattern);
    return attempt;
  }

  private async attemptHealing(error: string, stackTrace?: string, filePath?: string, pattern?: ErrorPattern): Promise<HealingAttempt | null> {
    if (!filePath || !fs.existsSync(filePath)) {
      this.stateManager.addAuditEntry(`Cannot heal: file path not available`, 'self_healing');
      return null;
    }

    const originalCode = fs.readFileSync(filePath, 'utf8');
    
    // Create backup
    const backupPath = path.join(this.backupDir, `${path.basename(filePath)}.${Date.now()}.bak`);
    fs.writeFileSync(backupPath, originalCode);

    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const prompt = `Fix this error in the code:

ERROR: ${error}
${stackTrace ? `STACK: ${stackTrace}` : ''}
PATTERN: ${pattern?.fixStrategy}

CODE:
${originalCode}

Provide ONLY the fixed code, no explanations.`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const fixedCode = this.extractCode(response.text || '');

      // Write fixed code
      fs.writeFileSync(filePath, fixedCode);

      // Verify fix by syntax check
      const success = await this.verifyFix(filePath, originalCode);

      const attempt: HealingAttempt = {
        id: `heal_${Date.now()}`,
        error,
        filePath,
        attemptedFix: pattern?.fixStrategy || 'AI generated fix',
        success,
        originalCode,
        fixedCode,
        timestamp: Date.now(),
        backupPath
      };

      this.healingHistory.push(attempt);
      this.saveHistory();

      if (success) {
        this.stateManager.addAuditEntry(`Auto-healed: ${path.basename(filePath)}`, 'self_healing');
      } else {
        // Restore backup
        fs.writeFileSync(filePath, originalCode);
        this.stateManager.addAuditEntry(`Healing failed, restored backup: ${path.basename(filePath)}`, 'self_healing');
      }

      return attempt;
    } catch (e: any) {
      // Restore backup on error
      fs.writeFileSync(filePath, originalCode);
      this.stateManager.addAuditEntry(`Healing error: ${e.message}`, 'self_healing');
      return null;
    }
  }

  private extractCode(response: string): string {
    // Extract code from markdown code blocks if present
    const codeBlockMatch = response.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return response.trim();
  }

  private async verifyFix(filePath: string, originalCode: string): Promise<boolean> {
    try {
      // Try TypeScript compilation check
      if (filePath.endsWith('.ts')) {
        execSync(`npx tsc --noEmit ${filePath}`, { stdio: 'pipe' });
      }
      
      // Try to parse as JS
      if (filePath.endsWith('.js')) {
        execSync(`node --check ${filePath}`, { stdio: 'pipe' });
      }
      
      return true;
    } catch {
      return false;
    }
  }

  async rollback(attemptId: string): Promise<boolean> {
    const attempt = this.healingHistory.find(h => h.id === attemptId);
    if (!attempt) return false;

    if (fs.existsSync(attempt.backupPath)) {
      fs.writeFileSync(attempt.filePath, attempt.originalCode);
      this.stateManager.addAuditEntry(`Rolled back healing: ${path.basename(attempt.filePath)}`, 'self_healing');
      return true;
    }
    return false;
  }

  getHealingHistory(): HealingAttempt[] {
    return [...this.healingHistory].sort((a, b) => b.timestamp - a.timestamp);
  }

  getStats(): { total: number; successful: number; failed: number; successRate: number } {
    const total = this.healingHistory.length;
    const successful = this.healingHistory.filter(h => h.success).length;
    return {
      total,
      successful,
      failed: total - successful,
      successRate: total > 0 ? successful / total : 0
    };
  }

  addCustomPattern(pattern: Omit<ErrorPattern, 'id'>): ErrorPattern {
    const newPattern: ErrorPattern = {
      ...pattern,
      id: `custom_${Date.now()}`
    };
    this.patterns.push(newPattern);
    return newPattern;
  }

  private saveHistory(): void {
    const historyPath = path.join(this.backupDir, 'healing_history.json');
    fs.writeFileSync(historyPath, JSON.stringify(this.healingHistory, null, 2));
  }

  private loadHistory(): void {
    const historyPath = path.join(this.backupDir, 'healing_history.json');
    if (fs.existsSync(historyPath)) {
      this.healingHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  }
}
