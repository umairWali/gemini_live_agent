
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import fs from 'fs';
import path from 'path';

export interface CodeReviewResult {
  filePath: string;
  overallScore: number; // 0-100
  issues: CodeIssue[];
  summary: string;
  suggestions: string[];
  securityConcerns: SecurityIssue[];
  performanceNotes: string[];
  bestPractices: string[];
}

export interface CodeIssue {
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  category: 'syntax' | 'logic' | 'style' | 'security' | 'performance' | 'maintainability';
  message: string;
  suggestion: string;
  codeSnippet: string;
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'injection' | 'xss' | 'authentication' | 'data_exposure' | 'dependencies' | 'secrets';
  message: string;
  line: number;
  recommendation: string;
}

export interface ReviewRequest {
  filePath?: string;
  code?: string;
  language: string;
  prDescription?: string;
  changedFiles?: string[];
}

export class CodeReviewAI {
  private stateManager: StateManager;
  private apiKey: string;
  private reviewHistory: CodeReviewResult[] = [];

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
  }

  async reviewFile(filePath: string): Promise<CodeReviewResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const code = fs.readFileSync(filePath, 'utf8');
    const language = this.detectLanguage(filePath);
    
    return this.reviewCode({ filePath, code, language });
  }

  async reviewCode(request: ReviewRequest): Promise<CodeReviewResult> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const code = request.code || '';
    const fileName = request.filePath || 'unnamed';
    
    const prompt = `Perform a comprehensive code review for this ${request.language} file.

FILE: ${fileName}
${request.prDescription ? `CONTEXT: ${request.prDescription}\n` : ''}

CODE:
\`\`\`${request.language}
${code}
\`\`\`

Analyze for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Performance issues
4. Code style and maintainability
5. Best practices violations

Return JSON format:
{
  "overallScore": 85,
  "issues": [
    {
      "line": 10,
      "column": 5,
      "severity": "warning",
      "category": "style",
      "message": "Variable name too short",
      "suggestion": "Use descriptive variable names",
      "codeSnippet": "let x = 5;"
    }
  ],
  "summary": "Brief review summary",
  "suggestions": ["General improvement 1", "General improvement 2"],
  "securityConcerns": [
    {
      "severity": "high",
      "category": "injection",
      "message": "SQL injection risk",
      "line": 25,
      "recommendation": "Use parameterized queries"
    }
  ],
  "performanceNotes": ["Note 1"],
  "bestPractices": ["Practice 1"]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const resultText = response.text || '{}';
      let parsed: Partial<CodeReviewResult>;
      
      try {
        parsed = JSON.parse(resultText);
      } catch {
        // Fallback parsing
        parsed = this.parseReviewResponse(resultText, request.filePath || 'unknown');
      }

      const review: CodeReviewResult = {
        filePath: request.filePath || 'unnamed',
        overallScore: parsed.overallScore || 70,
        issues: parsed.issues || [],
        summary: parsed.summary || 'Review completed',
        suggestions: parsed.suggestions || [],
        securityConcerns: parsed.securityConcerns || [],
        performanceNotes: parsed.performanceNotes || [],
        bestPractices: parsed.bestPractices || []
      };

      this.reviewHistory.push(review);
      this.stateManager.addAuditEntry(`Code reviewed: ${path.basename(review.filePath)}`, 'code_review_ai');
      
      return review;
    } catch (e: any) {
      throw new Error(`Code review failed: ${e.message}`);
    }
  }

  async reviewPR(changedFiles: string[], prDescription: string): Promise<{ overall: CodeReviewResult; fileReviews: CodeReviewResult[] }> {
    const fileReviews: CodeReviewResult[] = [];
    
    for (const file of changedFiles) {
      if (fs.existsSync(file)) {
        try {
          const review = await this.reviewFile(file);
          fileReviews.push(review);
        } catch (e) {
          // Skip files that can't be reviewed
        }
      }
    }

    // Aggregate results
    const overall: CodeReviewResult = {
      filePath: 'PR Overall',
      overallScore: Math.round(fileReviews.reduce((sum, r) => sum + r.overallScore, 0) / (fileReviews.length || 1)),
      issues: fileReviews.flatMap(r => r.issues),
      summary: `Reviewed ${fileReviews.length} files. ${fileReviews.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0)} errors found.`,
      suggestions: [...new Set(fileReviews.flatMap(r => r.suggestions))],
      securityConcerns: fileReviews.flatMap(r => r.securityConcerns),
      performanceNotes: [...new Set(fileReviews.flatMap(r => r.performanceNotes))],
      bestPractices: [...new Set(fileReviews.flatMap(r => r.bestPractices))]
    };

    return { overall, fileReviews };
  }

  async generateFix(issue: CodeIssue, originalCode: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Fix this code issue:

ISSUE: ${issue.message}
SEVERITY: ${issue.severity}
CATEGORY: ${issue.category}
LINE: ${issue.line}
SUGGESTION: ${issue.suggestion}

CODE TO FIX:
\`\`\`
${originalCode}
\`\`\`

Provide ONLY the fixed code, no explanations.`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      return this.extractCode(response.text || '');
    } catch {
      return originalCode;
    }
  }

  async compareVersions(oldCode: string, newCode: string, language: string): Promise<{ improvements: string[]; regressions: string[] }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Compare these two versions of code and identify improvements and potential regressions:

OLD VERSION:
\`\`\`${language}
${oldCode}
\`\`\`

NEW VERSION:
\`\`\`${language}
${newCode}
\`\`\`

Return JSON:
{
  "improvements": ["Improvement 1", "Improvement 2"],
  "regressions": ["Potential issue 1"]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      return JSON.parse(response.text || '{"improvements": [], "regressions": []}');
    } catch {
      return { improvements: [], regressions: [] };
    }
  }

  getReviewHistory(): CodeReviewResult[] {
    return this.reviewHistory;
  }

  getStats(): {
    totalReviews: number;
    averageScore: number;
    totalIssues: number;
    criticalIssues: number;
  } {
    const totalReviews = this.reviewHistory.length;
    const averageScore = totalReviews > 0 
      ? this.reviewHistory.reduce((sum, r) => sum + r.overallScore, 0) / totalReviews 
      : 0;
    const totalIssues = this.reviewHistory.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = this.reviewHistory.reduce(
      (sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0
    );

    return {
      totalReviews,
      averageScore: Math.round(averageScore),
      totalIssues,
      criticalIssues
    };
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin'
    };
    return langMap[ext] || 'plaintext';
  }

  private parseReviewResponse(text: string, filePath: string): CodeReviewResult {
    // Simple fallback parsing
    return {
      filePath,
      overallScore: 70,
      issues: [],
      summary: text.substring(0, 200),
      suggestions: [],
      securityConcerns: [],
      performanceNotes: [],
      bestPractices: []
    };
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  }
}
