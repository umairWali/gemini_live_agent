
import { StateManager } from './state_manager';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface DeployTarget {
  id: string;
  name: string;
  type: 'cloud_run' | 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure' | 'docker' | 'kubernetes';
  config: Record<string, any>;
  url?: string;
  status: 'ready' | 'deploying' | 'error' | 'offline';
}

export interface Deployment {
  id: string;
  targetId: string;
  version: string;
  commitHash: string;
  status: 'pending' | 'building' | 'testing' | 'deploying' | 'completed' | 'failed' | 'rolled_back';
  logs: string[];
  startedAt: number;
  completedAt?: number;
  url?: string;
  healthCheck?: boolean;
}

export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs: string[];
  duration?: number;
}

export class DeploymentPipeline {
  private stateManager: StateManager;
  private targets: DeployTarget[] = [];
  private deployments: Deployment[] = [];
  private activeDeployment: Deployment | null = null;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.initializeDefaultTargets();
  }

  private initializeDefaultTargets(): void {
    // Read from deploy.sh if exists
    const deployShPath = path.resolve(process.cwd(), 'deploy.sh');
    if (fs.existsSync(deployShPath)) {
      this.targets.push({
        id: 'gcp_cloud_run',
        name: 'Google Cloud Run',
        type: 'cloud_run',
        config: { script: deployShPath },
        status: 'ready'
      });
    }

    // Check for other config files
    if (fs.existsSync(path.resolve(process.cwd(), 'vercel.json'))) {
      this.targets.push({
        id: 'vercel',
        name: 'Vercel',
        type: 'vercel',
        config: {},
        status: 'ready'
      });
    }

    if (fs.existsSync(path.resolve(process.cwd(), 'Dockerfile'))) {
      this.targets.push({
        id: 'docker_local',
        name: 'Docker Local',
        type: 'docker',
        config: { dockerfile: 'Dockerfile' },
        status: 'ready'
      });
    }
  }

  async deploy(targetId: string, options: { skipTests?: boolean; canary?: boolean } = {}): Promise<Deployment> {
    const target = this.targets.find(t => t.id === targetId);
    if (!target) throw new Error(`Deploy target not found: ${targetId}`);

    target.status = 'deploying';

    const deployment: Deployment = {
      id: `deploy_${Date.now()}`,
      targetId,
      version: this.getVersion(),
      commitHash: this.getCommitHash(),
      status: 'pending',
      logs: [],
      startedAt: Date.now()
    };

    this.deployments.push(deployment);
    this.activeDeployment = deployment;

    this.stateManager.addAuditEntry(`Deployment started: ${target.name}`, 'deployment_pipeline');

    try {
      // Pipeline stages
      await this.runStage(deployment, 'build', () => this.build());
      
      if (!options.skipTests) {
        await this.runStage(deployment, 'test', () => this.test());
      }
      
      await this.runStage(deployment, 'deploy', () => this.executeDeploy(target, deployment, options));
      
      await this.runStage(deployment, 'health_check', () => this.healthCheck(target, deployment));

      deployment.status = 'completed';
      deployment.completedAt = Date.now();
      target.status = 'ready';
      target.url = deployment.url;

      this.stateManager.addAuditEntry(`Deployment completed: ${deployment.url}`, 'deployment_pipeline');
    } catch (error: any) {
      deployment.status = 'failed';
      deployment.logs.push(`[ERROR] ${error.message}`);
      target.status = 'error';

      this.stateManager.addAuditEntry(`Deployment failed: ${error.message}`, 'deployment_pipeline');
      
      // Auto-rollback on failure
      await this.rollback(targetId);
    }

    return deployment;
  }

  private async runStage(deployment: Deployment, stageName: string, fn: () => Promise<void>): Promise<void> {
    deployment.logs.push(`[${stageName.toUpperCase()}] Starting...`);
    const startTime = Date.now();
    
    try {
      deployment.status = stageName as any;
      await fn();
      const duration = Date.now() - startTime;
      deployment.logs.push(`[${stageName.toUpperCase()}] Completed in ${duration}ms`);
    } catch (error: any) {
      deployment.logs.push(`[${stageName.toUpperCase()}] Failed: ${error.message}`);
      throw error;
    }
  }

  private async build(): Promise<void> {
    try {
      execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
    } catch (error: any) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  private async test(): Promise<void> {
    try {
      // Check if test script exists
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      if (pkg.scripts?.test) {
        execSync('npm test', { stdio: 'pipe', cwd: process.cwd() });
      }
    } catch (error: any) {
      throw new Error(`Tests failed: ${error.message}`);
    }
  }

  private async executeDeploy(target: DeployTarget, deployment: Deployment, options: { canary?: boolean }): Promise<void> {
    switch (target.type) {
      case 'cloud_run':
        await this.deployToCloudRun(target, deployment, options);
        break;
      case 'vercel':
        await this.deployToVercel(target, deployment);
        break;
      case 'docker':
        await this.deployDocker(target, deployment);
        break;
      default:
        throw new Error(`Deployment type ${target.type} not implemented`);
    }
  }

  private async deployToCloudRun(target: DeployTarget, deployment: Deployment, options: { canary?: boolean }): Promise<void> {
    const scriptPath = target.config.script;
    if (!scriptPath || !fs.existsSync(scriptPath)) {
      throw new Error('Deploy script not found');
    }

    try {
      const output = execSync(`bash ${scriptPath}`, { 
        stdio: 'pipe', 
        cwd: process.cwd(),
        env: { ...process.env, CANARY: options.canary ? 'true' : 'false' }
      });
      
      deployment.logs.push(output.toString());
      
      // Extract URL from output
      const urlMatch = output.toString().match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        deployment.url = urlMatch[0];
      }
    } catch (error: any) {
      throw new Error(`Cloud Run deploy failed: ${error.message}`);
    }
  }

  private async deployToVercel(target: DeployTarget, deployment: Deployment): Promise<void> {
    try {
      const output = execSync('npx vercel --yes', { 
        stdio: 'pipe', 
        cwd: process.cwd() 
      });
      
      deployment.logs.push(output.toString());
      
      const urlMatch = output.toString().match(/https:\/\/[^\s]+\.vercel\.app/);
      if (urlMatch) {
        deployment.url = urlMatch[0];
      }
    } catch (error: any) {
      throw new Error(`Vercel deploy failed: ${error.message}`);
    }
  }

  private async deployDocker(target: DeployTarget, deployment: Deployment): Promise<void> {
    try {
      // Build
      execSync('docker build -t personal-operator:latest .', { 
        stdio: 'pipe', 
        cwd: process.cwd() 
      });
      
      // Run
      execSync('docker run -d -p 3000:3000 --name personal-operator personal-operator:latest', { 
        stdio: 'pipe', 
        cwd: process.cwd() 
      });
      
      deployment.url = 'http://localhost:3000';
    } catch (error: any) {
      throw new Error(`Docker deploy failed: ${error.message}`);
    }
  }

  private async healthCheck(target: DeployTarget, deployment: Deployment): Promise<void> {
    if (!deployment.url) return;

    // Wait a bit for service to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      const response = await fetch(`${deployment.url}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      deployment.healthCheck = true;
    } catch (error: any) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async rollback(targetId: string): Promise<boolean> {
    const target = this.targets.find(t => t.id === targetId);
    if (!target) return false;

    this.stateManager.addAuditEntry(`Rollback initiated: ${target.name}`, 'deployment_pipeline');

    try {
      switch (target.type) {
        case 'cloud_run':
          // Rollback to previous revision
          execSync('gcloud run services update-traffic --to-revisions LATEST=0,PREVIOUS=100', { 
            stdio: 'pipe' 
          });
          break;
        case 'docker':
          execSync('docker stop personal-operator && docker rm personal-operator', { stdio: 'pipe' });
          break;
      }

      const deployment = this.activeDeployment;
      if (deployment) {
        deployment.status = 'rolled_back';
      }

      return true;
    } catch (error: any) {
      this.stateManager.addAuditEntry(`Rollback failed: ${error.message}`, 'deployment_pipeline');
      return false;
    }
  }

  async addTarget(target: Omit<DeployTarget, 'id' | 'status'>): Promise<DeployTarget> {
    const newTarget: DeployTarget = {
      ...target,
      id: `target_${Date.now()}`,
      status: 'ready'
    };
    this.targets.push(newTarget);
    return newTarget;
  }

  getTargets(): DeployTarget[] {
    return this.targets;
  }

  getDeployments(): Deployment[] {
    return this.deployments.sort((a, b) => b.startedAt - a.startedAt);
  }

  getActiveDeployment(): Deployment | null {
    return this.activeDeployment;
  }

  private getVersion(): string {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      return pkg.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private getCommitHash(): string {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: process.cwd() }).trim();
    } catch {
      return 'unknown';
    }
  }
}
