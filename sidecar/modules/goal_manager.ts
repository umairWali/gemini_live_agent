
import { StateManager } from './state_manager';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED';

export interface Task {
    id: string;
    description: string;
    status: TaskStatus;
    dependencies: string[]; // task IDs
    estimatedEffort: 'SMALL' | 'MEDIUM' | 'LARGE';
}

export interface Phase {
    id: string;
    name: string;
    tasks: Task[];
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
}

export interface Goal {
    id: string;
    description: string;
    successCriteria: string[];
    constraints: string[];
    createdAt: number;
    phases: Phase[];
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    progress: number; // 0-100
}

export class GoalManager {
    private stateManager: StateManager;

    constructor(stateManager: StateManager) {
        this.stateManager = stateManager;
    }

    createGoal(description: string, criteria: string[] = [], constraints: string[] = []): Goal {
        const goal: Goal = {
            id: Math.random().toString(36).substr(2, 9),
            description,
            successCriteria: criteria,
            constraints,
            createdAt: Date.now(),
            phases: [],
            status: 'ACTIVE',
            progress: 0
        };
        const state = this.stateManager.getState();
        state.goals.push(goal);
        this.stateManager.save();
        return goal;
    }

    addPhase(goalId: string, name: string): Phase | null {
        const state = this.stateManager.getState();
        const goal = state.goals.find((g: Goal) => g.id === goalId);
        if (!goal) return null;

        const phase: Phase = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            tasks: [],
            status: 'PENDING'
        };
        goal.phases.push(phase);
        this.stateManager.save();
        return phase;
    }

    addTask(goalId: string, phaseId: string, description: string, effort: 'SMALL' | 'MEDIUM' | 'LARGE' = 'MEDIUM'): Task | null {
        const state = this.stateManager.getState();
        const goal = state.goals.find((g: Goal) => g.id === goalId);
        if (!goal) return null;

        const phase = goal.phases.find((p: Phase) => p.id === phaseId);
        if (!phase) return null;

        const task: Task = {
            id: Math.random().toString(36).substr(2, 9),
            description,
            status: 'PENDING',
            dependencies: [],
            estimatedEffort: effort
        };
        phase.tasks.push(task);
        this.stateManager.save();
        return task;
    }

    updateTaskStatus(goalId: string, taskId: string, status: TaskStatus) {
        const state = this.stateManager.getState();
        const goal = state.goals.find((g: Goal) => g.id === goalId);
        if (!goal) return;

        let taskFound = false;
        for (const phase of goal.phases) {
            const task = phase.tasks.find((t: Task) => t.id === taskId);
            if (task) {
                task.status = status;
                taskFound = true;
                break;
            }
        }

        if (taskFound) {
            this.recalculateProgress(goal);
            this.stateManager.save();
        }
    }

    private recalculateProgress(goal: Goal) {
        let totalTasks = 0;
        let completedTasks = 0;

        for (const phase of goal.phases) {
            for (const task of phase.tasks) {
                totalTasks++;
                if (task.status === 'COMPLETED') completedTasks++;
            }
        }

        if (totalTasks === 0) {
            goal.progress = 0;
        } else {
            goal.progress = Math.round((completedTasks / totalTasks) * 100);
        }

        if (goal.progress === 100) {
            goal.status = 'COMPLETED';
        }
    }

    getGoal(goalId: string): Goal | undefined {
        const state = this.stateManager.getState();
        return state.goals.find((g: Goal) => g.id === goalId);
    }

    getActiveGoals(): Goal[] {
        const state = this.stateManager.getState();
        return state.goals.filter((g: Goal) => g.status === 'ACTIVE');
    }
}
