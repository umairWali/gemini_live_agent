
import { GoogleGenAI } from '@google/genai';
import { StateManager } from './state_manager';

export interface Agent {
  id: string;
  name: string;
  role: 'researcher' | 'coder' | 'reviewer' | 'planner' | 'tester' | 'documenter';
  expertise: string[];
  status: 'idle' | 'working' | 'completed' | 'error';
  currentTask?: string;
  output?: string;
}

export interface SwarmTask {
  id: string;
  description: string;
  type: 'research' | 'code' | 'review' | 'plan' | 'test' | 'document';
  priority: 'low' | 'medium' | 'high';
  assignedAgent?: string;
  input: string;
  output?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  createdAt: number;
  completedAt?: number;
}

export interface SwarmResult {
  taskId: string;
  success: boolean;
  result: string;
  agentId: string;
  executionTime: number;
}

export class MultiAgentSwarm {
  private stateManager: StateManager;
  private apiKey: string;
  private agents: Agent[] = [];
  private tasks: SwarmTask[] = [];
  private results: Map<string, SwarmResult> = new Map();

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.apiKey = process.env.API_KEY || '';
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.agents = [
      {
        id: 'agent_researcher',
        name: 'Research Agent',
        role: 'researcher',
        expertise: ['web_search', 'data_analysis', 'trends', 'market_research'],
        status: 'idle'
      },
      {
        id: 'agent_coder',
        name: 'Code Agent',
        role: 'coder',
        expertise: ['typescript', 'python', 'javascript', 'react', 'nodejs', 'database'],
        status: 'idle'
      },
      {
        id: 'agent_reviewer',
        name: 'Review Agent',
        role: 'reviewer',
        expertise: ['code_review', 'security_audit', 'performance_analysis', 'best_practices'],
        status: 'idle'
      },
      {
        id: 'agent_planner',
        name: 'Planner Agent',
        role: 'planner',
        expertise: ['architecture', 'roadmap', 'estimation', 'risk_analysis'],
        status: 'idle'
      },
      {
        id: 'agent_tester',
        name: 'Test Agent',
        role: 'tester',
        expertise: ['unit_tests', 'integration_tests', 'e2e_tests', 'test_coverage'],
        status: 'idle'
      },
      {
        id: 'agent_documenter',
        name: 'Doc Agent',
        role: 'documenter',
        expertise: ['technical_writing', 'api_docs', 'user_guides', 'diagrams'],
        status: 'idle'
      }
    ];
  }

  async executeSwarm(description: string, type: 'parallel' | 'sequential' | 'hierarchical' = 'hierarchical'): Promise<SwarmResult[]> {
    this.stateManager.addAuditEntry(`Swarm execution started: ${description.substring(0, 50)}...`, 'multi_agent_swarm');
    
    // Decompose task into subtasks
    const subtasks = await this.decomposeTask(description);
    
    // Create tasks
    const taskIds: string[] = [];
    for (const subtask of subtasks) {
      const taskId = await this.createTask(subtask.description, subtask.type, subtask.priority, subtask.dependencies);
      taskIds.push(taskId);
    }

    // Execute based on strategy
    let results: SwarmResult[] = [];
    
    if (type === 'parallel') {
      results = await this.executeParallel(taskIds);
    } else if (type === 'sequential') {
      results = await this.executeSequential(taskIds);
    } else {
      results = await this.executeHierarchical(taskIds);
    }

    this.stateManager.addAuditEntry(`Swarm execution completed: ${results.length} tasks`, 'multi_agent_swarm');
    return results;
  }

  private async decomposeTask(description: string): Promise<Array<{ description: string; type: SwarmTask['type']; priority: string; dependencies: string[] }>> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `Decompose this task into subtasks. Return JSON array:
[
  { "description": "subtask description", "type": "research|code|review|plan|test|document", "priority": "high|medium|low", "dependencies": [] }
]

Task: ${description}`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const result = response.text || '[]';
      try {
        return JSON.parse(result);
      } catch {
        return [{ description, type: 'plan', priority: 'high', dependencies: [] }];
      }
    } catch {
      return [{ description, type: 'plan', priority: 'high', dependencies: [] }];
    }
  }

  async createTask(description: string, type: SwarmTask['type'], priority: 'low' | 'medium' | 'high' = 'medium', dependencies: string[] = []): Promise<string> {
    const task: SwarmTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      type,
      priority,
      input: description,
      status: 'pending',
      dependencies,
      createdAt: Date.now()
    };

    this.tasks.push(task);
    return task.id;
  }

  private async executeParallel(taskIds: string[]): Promise<SwarmResult[]> {
    const promises = taskIds.map(id => this.executeTask(id));
    return Promise.all(promises);
  }

  private async executeSequential(taskIds: string[]): Promise<SwarmResult[]> {
    const results: SwarmResult[] = [];
    for (const id of taskIds) {
      const result = await this.executeTask(id);
      results.push(result);
    }
    return results;
  }

  private async executeHierarchical(taskIds: string[]): Promise<SwarmResult[]> {
    // Sort by dependencies - tasks with no deps first
    const pending = new Set(taskIds);
    const completed = new Set<string>();
    const results: SwarmResult[] = [];

    while (pending.size > 0) {
      const ready = Array.from(pending).filter(id => {
        const task = this.tasks.find(t => t.id === id);
        return task && task.dependencies.every(dep => completed.has(dep));
      });

      if (ready.length === 0 && pending.size > 0) {
        // Circular dependency or stuck
        break;
      }

      // Execute ready tasks in parallel
      const batchResults = await Promise.all(ready.map(id => this.executeTask(id)));
      results.push(...batchResults);

      ready.forEach(id => {
        pending.delete(id);
        completed.add(id);
      });
    }

    return results;
  }

  private async executeTask(taskId: string): Promise<SwarmResult> {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      return { taskId, success: false, result: 'Task not found', agentId: '', executionTime: 0 };
    }

    task.status = 'in_progress';
    const startTime = Date.now();

    // Find best agent
    const agent = this.findBestAgent(task.type);
    if (!agent) {
      task.status = 'failed';
      return { taskId, success: false, result: 'No suitable agent', agentId: '', executionTime: 0 };
    }

    agent.status = 'working';
    agent.currentTask = taskId;

    // Execute
    const result = await this.runAgent(agent, task);

    // Update
    task.status = result.success ? 'completed' : 'failed';
    task.output = result.result;
    task.completedAt = Date.now();
    task.assignedAgent = agent.id;

    agent.status = 'idle';
    agent.currentTask = undefined;

    const swarmResult: SwarmResult = {
      taskId,
      success: result.success,
      result: result.result,
      agentId: agent.id,
      executionTime: Date.now() - startTime
    };

    this.results.set(taskId, swarmResult);
    return swarmResult;
  }

  private findBestAgent(type: SwarmTask['type']): Agent | undefined {
    const roleMap: Record<string, string> = {
      'research': 'researcher',
      'code': 'coder',
      'review': 'reviewer',
      'plan': 'planner',
      'test': 'tester',
      'document': 'documenter'
    };

    const targetRole = roleMap[type];
    return this.agents.find(a => a.role === targetRole && a.status === 'idle');
  }

  private async runAgent(agent: Agent, task: SwarmTask): Promise<{ success: boolean; result: string }> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const systemPrompt = `You are ${agent.name}, an AI agent specialized in ${agent.expertise.join(', ')}.
Execute the following task professionally and return clear results.`;

    try {
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        config: { systemInstruction: { parts: [{ text: systemPrompt }] } },
        contents: [{ role: 'user', parts: [{ text: task.input }] }]
      });

      return { success: true, result: response.text || 'No output' };
    } catch (e: any) {
      return { success: false, result: `Error: ${e.message}` };
    }
  }

  getAgents(): Agent[] {
    return this.agents;
  }

  getTasks(): SwarmTask[] {
    return this.tasks;
  }

  getResults(): SwarmResult[] {
    return Array.from(this.results.values());
  }

  getAgentStatus(): { id: string; name: string; status: string; currentTask?: string }[] {
    return this.agents.map(a => ({
      id: a.id,
      name: a.name,
      status: a.status,
      currentTask: a.currentTask
    }));
  }
}
