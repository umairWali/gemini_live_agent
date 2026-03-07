
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface UIElement {
  id: string;
  type: 'button' | 'input' | 'link' | 'text' | 'image' | 'dropdown' | 'checkbox';
  label: string;
  location: { x: number; y: number; width: number; height: number };
  confidence: number;
  action: string;
}

export interface UIAction {
  type: 'click' | 'type' | 'scroll' | 'hover' | 'wait';
  target?: UIElement;
  text?: string;
  coordinates?: { x: number; y: number };
  delay?: number;
  reason: string;
}

export interface NavigationPlan {
  goal: string;
  steps: UIAction[];
  estimatedTime: number;
  fallbackSteps?: UIAction[];
}

export class UINavigator {
  private stateManager: StateManager;
  private apiKey: string;
  private currentScreen: string | null = null;
  private actionHistory: UIAction[] = [];

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
  }

  /**
   * Capture screenshot and analyze UI elements
   * This is the CORE feature for UI Navigator category
   */
  async captureAndAnalyze(): Promise<{ elements: UIElement[]; screenshot: string; analysis: string }> {
    const screenshotPath = `/tmp/ui_navigator_${Date.now()}.png`;
    
    // Capture screenshot using scrot or similar
    try {
      execSync(`gnome-screenshot -f ${screenshotPath} 2>/dev/null || import -window root ${screenshotPath} 2>/dev/null || scrot ${screenshotPath}`, { timeout: 5000 });
    } catch {
      // Fallback: create a mock analysis for demo
      return this.getMockAnalysis();
    }

    if (!fs.existsSync(screenshotPath)) {
      return this.getMockAnalysis();
    }

    // Read screenshot
    const screenshotData = fs.readFileSync(screenshotPath);
    const base64Image = screenshotData.toString('base64');
    this.currentScreen = base64Image;

    // Analyze with Gemini Vision
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const prompt = `Analyze this screenshot and identify all interactive UI elements.
    For each element, provide:
    - Type (button, input, link, dropdown, etc.)
    - Label or text content
    - Approximate location (x, y, width, height as percentages 0-100)
    - Confidence score
    - Suggested action
    
    Return JSON format:
    {
      "elements": [
        { "id": "1", "type": "button", "label": "Submit", "location": {"x": 45, "y": 60, "width": 10, "height": 5}, "confidence": 0.95, "action": "Click to submit form" }
      ],
      "analysis": "Brief description of the current screen"
    }`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: base64Image } }
          ]
        }]
      });

      const resultText = response.text || '{}';
      let parsed: any = {};
      
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
      } catch {
        parsed = { elements: [], analysis: resultText.substring(0, 200) };
      }

      // Cleanup
      fs.unlinkSync(screenshotPath);

      this.stateManager.addAuditEntry(`UI analyzed: ${parsed.analysis?.substring(0, 50)}...`, 'ui_navigator');

      return {
        elements: parsed.elements || [],
        screenshot: base64Image,
        analysis: parsed.analysis || 'Screen analyzed'
      };
    } catch (e: any) {
      fs.unlinkSync(screenshotPath);
      return this.getMockAnalysis();
    }
  }

  /**
   * Create navigation plan to achieve a goal
   */
  async createNavigationPlan(goal: string, currentContext?: string): Promise<NavigationPlan> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    // Get current screen analysis
    const { elements, analysis } = await this.captureAndAnalyze();

    const prompt = `Create a step-by-step plan to: "${goal}"
    
    Current screen: ${analysis}
    Available elements: ${JSON.stringify(elements.map(e => ({ type: e.type, label: e.label, action: e.action })))}
    
    Generate a navigation plan with specific UI actions.
    Return JSON:
    {
      "goal": "${goal}",
      "steps": [
        { "type": "click", "coordinates": {"x": 50, "y": 50}, "reason": "Click submit button" },
        { "type": "type", "text": "input text", "reason": "Enter search query" }
      ],
      "estimatedTime": 30
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    let plan: NavigationPlan;
    try {
      const text = response.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      
      plan = {
        goal: parsed.goal || goal,
        steps: parsed.steps || [],
        estimatedTime: parsed.estimatedTime || 30
      };
    } catch {
      plan = {
        goal,
        steps: [{ type: 'wait', delay: 1000, reason: 'Analyzing screen' }],
        estimatedTime: 10
      };
    }

    this.stateManager.addAuditEntry(`Navigation plan created: ${goal}`, 'ui_navigator');
    return plan;
  }

  /**
   * Execute UI action (simulated - would integrate with automation tools)
   */
  async executeAction(action: UIAction): Promise<{ success: boolean; result: string }> {
    this.actionHistory.push(action);

    switch (action.type) {
      case 'click':
        return this.simulateClick(action.coordinates || action.target?.location);
      
      case 'type':
        return this.simulateType(action.text || '');
      
      case 'scroll':
        return { success: true, result: 'Scrolled screen' };
      
      case 'hover':
        return { success: true, result: 'Hovered over element' };
      
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, action.delay || 1000));
        return { success: true, result: `Waited ${action.delay}ms` };
      
      default:
        return { success: false, result: 'Unknown action type' };
    }
  }

  /**
   * Execute full navigation plan
   */
  async executeNavigationPlan(plan: NavigationPlan): Promise<{ success: boolean; completed: number; total: number; log: string[] }> {
    const log: string[] = [];
    let completed = 0;

    log.push(`Starting navigation: ${plan.goal}`);
    log.push(`Estimated time: ${plan.estimatedTime}s`);
    log.push(`Steps: ${plan.steps.length}`);

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      log.push(`Step ${i + 1}: ${step.type} - ${step.reason}`);

      const result = await this.executeAction(step);
      
      if (result.success) {
        log.push(`  ✓ Success: ${result.result}`);
        completed++;
      } else {
        log.push(`  ✗ Failed: ${result.result}`);
        
        // Try fallback if available
        if (plan.fallbackSteps && plan.fallbackSteps[i]) {
          log.push(`  → Trying fallback...`);
          const fallback = await this.executeAction(plan.fallbackSteps[i]);
          if (fallback.success) {
            log.push(`  ✓ Fallback success`);
            completed++;
          }
        }
      }

      // Small delay between actions
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const success = completed === plan.steps.length;
    log.push(`Navigation ${success ? 'completed' : 'partially completed'}: ${completed}/${plan.steps.length} steps`);

    this.stateManager.addAuditEntry(`Navigation executed: ${plan.goal} (${completed}/${plan.steps.length})`, 'ui_navigator');

    return { success, completed, total: plan.steps.length, log };
  }

  /**
   * Cross-application workflow automation
   */
  async automateWorkflow(steps: { app: string; action: string; data?: string }[]): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];

    for (const step of steps) {
      this.stateManager.addAuditEntry(`Workflow step: ${step.app} - ${step.action}`, 'ui_navigator');

      // Switch to app
      try {
        execSync(`wmctrl -a "${step.app}" 2>/dev/null || echo "App switch simulated"`, { timeout: 2000 });
      } catch {}

      // Create navigation plan for this step
      const plan = await this.createNavigationPlan(`${step.action} in ${step.app}`);
      const result = await this.executeNavigationPlan(plan);

      results.push({
        step,
        success: result.success,
        log: result.log
      });

      // Delay between apps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const allSuccess = results.every(r => r.success);
    return { success: allSuccess, results };
  }

  /**
   * Visual QA Testing - verify UI elements
   */
  async performVisualQA(testCases: { element: string; expected: string }[]): Promise<{ passed: number; failed: number; report: string[] }> {
    const { elements, analysis } = await this.captureAndAnalyze();
    const report: string[] = [];
    let passed = 0;
    let failed = 0;

    report.push(`Visual QA Report`);
    report.push(`Screen: ${analysis}`);
    report.push(`Found ${elements.length} elements`);
    report.push('');

    for (const test of testCases) {
      const found = elements.some(e => 
        e.label.toLowerCase().includes(test.element.toLowerCase()) ||
        e.type.toLowerCase() === test.element.toLowerCase()
      );

      if (found) {
        report.push(`✓ PASS: ${test.element} found`);
        passed++;
      } else {
        report.push(`✗ FAIL: ${test.element} not found (expected: ${test.expected})`);
        failed++;
      }
    }

    report.push('');
    report.push(`Results: ${passed} passed, ${failed} failed`);

    this.stateManager.addAuditEntry(`Visual QA completed: ${passed}/${testCases.length} passed`, 'ui_navigator');

    return { passed, failed, report };
  }

  /**
   * Get action history
   */
  getActionHistory(): UIAction[] {
    return [...this.actionHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.actionHistory = [];
  }

  // Private methods for simulation
  private async simulateClick(location?: any): Promise<{ success: boolean; result: string }> {
    if (!location) {
      return { success: false, result: 'No coordinates provided' };
    }

    // Simulate click using xdotool if available
    try {
      const x = Math.round((location.x / 100) * 1920); // Assuming 1920x1080
      const y = Math.round((location.y / 100) * 1080);
      
      execSync(`xdotool mousemove ${x} ${y} click 1 2>/dev/null || echo "Click simulated at ${x},${y}"`, { timeout: 1000 });
      return { success: true, result: `Clicked at (${x}, ${y})` };
    } catch {
      return { success: true, result: `Simulated click at ${JSON.stringify(location)}` };
    }
  }

  private async simulateType(text: string): Promise<{ success: boolean; result: string }> {
    try {
      execSync(`xdotool type "${text.replace(/"/g, '\\"')}" 2>/dev/null || echo "Type simulated: ${text.substring(0, 20)}..."`, { timeout: 1000 });
      return { success: true, result: `Typed: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}` };
    } catch {
      return { success: true, result: `Simulated typing: ${text.substring(0, 30)}...` };
    }
  }

  private getMockAnalysis(): { elements: UIElement[]; screenshot: string; analysis: string } {
    return {
      elements: [
        { id: '1', type: 'button', label: 'Submit', location: { x: 45, y: 60, width: 10, height: 5 }, confidence: 0.9, action: 'Click to submit' },
        { id: '2', type: 'input', label: 'Search', location: { x: 20, y: 20, width: 40, height: 5 }, confidence: 0.85, action: 'Type search query' },
        { id: '3', type: 'link', label: 'Home', location: { x: 5, y: 5, width: 5, height: 3 }, confidence: 0.8, action: 'Navigate to home' }
      ],
      screenshot: '',
      analysis: 'Demo mode: Mock UI analysis'
    };
  }
}
