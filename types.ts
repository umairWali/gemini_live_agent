
export enum WorkMode {
  DEVELOPMENT = 'DEVELOPMENT',
  TESTING = 'TESTING',
  PLANNING = 'PLANNING',
  MEETING = 'MEETING',
  DAILY_CONTROL = 'DAILY_CONTROL',
  INTERVENTION = 'INTERVENTION',
  DEPLOYMENT = 'DEPLOYMENT',
  CLIENT_CONVERSATION = 'CLIENT_CONVERSATION',
  OS_CONTROL = 'OS_CONTROL',
  SELF_UPGRADE = 'SELF_UPGRADE',
  AUDIT = 'AUDIT',
  DAEMON = 'DAEMON'
}

export enum TaskCategory {
  TASK = 'TASK',
  PLANNED = 'PLANNED',
  IDEA = 'IDEA',
  BUG = 'BUG',
  REMINDER = 'REMINDER',
  SYSTEM_PATCH = 'SYSTEM_PATCH'
}

export enum AgentRole {
  PLANNER = 'PLANNER',
  EXECUTOR = 'EXECUTOR',
  TESTER = 'TESTER',
  RESEARCH = 'RESEARCH',
  SUPERVISOR = 'SUPERVISOR',
  AUTONOMOUS_ENGINEER = 'AUTONOMOUS_ENGINEER',
  HEALER = 'HEALER'
}

export type ErrorCategory = 'DEPENDENCY' | 'PERMISSION' | 'RUNTIME' | 'LOGIC' | 'NETWORK';

export interface WatcherEvent {
  id: string;
  type: 'FS' | 'GIT' | 'PROCESS' | 'WINDOW' | 'LOG';
  source: string;
  timestamp: number;
  metadata: any;
  status: 'UNPROCESSED' | 'PLANNING' | 'HANDLED' | 'IGNORED';
}

export interface RecoveryAttempt {
  id: string;
  targetId: string;
  errorCategory: ErrorCategory;
  strategy: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'ROLLBACK' | 'PENDING';
  timestamp: number;
}

export interface ServiceStatus {
  name: string;
  status: 'RUNNING' | 'STOPPED' | 'CRASHED' | 'RECOVERING';
  lastHeartbeat: number;
  uptime: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  status: 'running' | 'sleeping' | 'zombie';
}

export interface VerifierFeature {
  name: string;
  status: 'REAL' | 'SIMULATED' | 'NOT PRESENT';
  location: string;
  trigger: string;
  executionPath: string;
  proof: string;
}

export interface DaemonState {
  isBooted: boolean;
  services: ServiceStatus[];
  processes: ProcessInfo[];
  events: WatcherEvent[];
  recoveryLog: RecoveryAttempt[];
  activeQueue: string[];
}

export interface OSState {
  connected: boolean;
  platform: 'windows' | 'linux' | 'darwin' | 'unknown';
  runningApps: string[];
  lastError?: string;
  bridgeUrl: string;
}

export interface TelemetryPoint {
  id: string;
  action: string;
  duration: number;
  success: boolean;
  errorCode?: string;
  resourceUsage: { cpu: number; mem: number };
  timestamp: number;
}

export interface Goal {
  id: string;
  title: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
}

export interface VaultEntry {
  id: string;
  key: string;
  value: string;
  timestamp: number;
}

export interface AuditTrailEntry {
  id: string;
  text: string;
  source: 'bridge' | 'ai' | 'system' | 'user' | 'terminal';
  timestamp: number;
}

export interface SelfEvolutionLog {
  id: string;
  action: string;
  stage: 'PLANNING' | 'CANARY' | 'PROMOTED' | 'HEALING';
  timestamp: number;
}

export interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  actions?: ExecutableAction[];
  agentBadge?: AgentRole;
  internalDebate?: string[];
  isExplainMode?: boolean;
  explanation?: string;
}

export interface AppState {
  currentMode: WorkMode;
  isAutonomous: boolean;
  isSandbox: boolean;
  daemon: DaemonState;
  tasks: OperatorTask[];
  checklists: VerificationCheck[];
  activeStack: string[];
  agentActivities: AgentActivity[];
  goals: Goal[];
  vault: VaultEntry[];
  auditTrail: AuditTrailEntry[];
  history: Message[];
  savedSessions?: { id: string; title: string; history: Message[]; timestamp: number }[];
  envSignals: EnvSignal[];
  evolutionLogs: SelfEvolutionLog[];
  telemetry: TelemetryPoint[];
  osState: OSState;
  realtimeMetrics: { cpu: number; ram: number };
  githubFeed: any[];
  isSessionStarted: boolean;
  systemHealth: 'optimal' | 'degraded' | 'critical' | 'blocked';
  isOverloaded: boolean;
  usage: {
    tokens: number;
    estimatedCost: number;
    executionCount: number;
    fixAttempts: Record<string, number>;
  };
  policies: {
    riskThreshold: number;
    maxRuntime: number;
    allowedDirectories: string[];
    allowedDomains: string[];
    canaryStabilityWindow: number;
  };
}

export interface AgentActivity {
  agent: AgentRole;
  status: 'thinking' | 'acting' | 'verifying' | 'healing' | 'idle';
  message: string;
  timestamp: number;
}

export interface OperatorTask { id: string; title: string; category: TaskCategory; description?: string; status: 'active' | 'pending' | 'completed' | 'paused'; createdAt: number; }
export interface VerificationCheck { id: string; label: string; checked: boolean; }
export interface EnvSignal { type: 'URL' | 'TERMINAL' | 'GIT' | 'PROCESS' | 'LOG'; value: string; }
export interface ExecutableAction { id: string; command: string; description: string; status: 'pending' | 'executing' | 'done' | 'failed' | 'healing'; requiresConfirmation: boolean; }
