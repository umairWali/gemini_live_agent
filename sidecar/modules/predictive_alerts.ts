
import { StateManager } from './state_manager';
import { CalendarSync } from './calendar_sync';
import { EmailIntegration } from './email_integration';

export interface Alert {
  id: string;
  type: 'meeting' | 'deadline' | 'email' | 'system' | 'weather' | 'traffic' | 'health' | 'custom';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  triggerTime: number;
  context: Record<string, any>;
  actionable: boolean;
  action?: string;
  dismissed: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  alertType: Alert['type'];
  priority: Alert['priority'];
  messageTemplate: string;
  enabled: boolean;
  cooldownMinutes: number;
}

export class PredictiveAlerts {
  private stateManager: StateManager;
  private calendar: CalendarSync;
  private email: EmailIntegration;
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private lastTriggered: Map<string, number> = new Map();

  constructor(stateManager: StateManager, calendar: CalendarSync, email: EmailIntegration) {
    this.stateManager = stateManager;
    this.calendar = calendar;
    this.email = email;
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'meeting_soon',
        name: 'Upcoming Meeting Alert',
        condition: 'meeting_in_15_minutes',
        alertType: 'meeting',
        priority: 'high',
        messageTemplate: 'Meeting "{meeting_title}" starts in {minutes} minutes',
        enabled: true,
        cooldownMinutes: 30
      },
      {
        id: 'unread_emails',
        name: 'Unread Email Digest',
        condition: 'unread_count > 5',
        alertType: 'email',
        priority: 'medium',
        messageTemplate: 'You have {count} unread emails',
        enabled: true,
        cooldownMinutes: 60
      },
      {
        id: 'deadline_approaching',
        name: 'Deadline Warning',
        condition: 'deadline_within_24h',
        alertType: 'deadline',
        priority: 'urgent',
        messageTemplate: 'Deadline for "{task_title}" is approaching in {hours} hours',
        enabled: true,
        cooldownMinutes: 1440
      },
      {
        id: 'high_cpu',
        name: 'High CPU Usage',
        condition: 'cpu > 80',
        alertType: 'system',
        priority: 'medium',
        messageTemplate: 'System CPU usage is at {cpu}%',
        enabled: true,
        cooldownMinutes: 15
      },
      {
        id: 'traffic_check',
        name: 'Meeting Traffic Alert',
        condition: 'meeting_in_45_minutes_outside_office',
        alertType: 'traffic',
        priority: 'medium',
        messageTemplate: 'Leave now for "{meeting_title}" - traffic is heavy',
        enabled: true,
        cooldownMinutes: 60
      }
    ];
  }

  private startMonitoring(): void {
    // Check every minute
    setInterval(() => this.checkAlerts(), 60000);
    // Initial check
    this.checkAlerts();
  }

  private async checkAlerts(): Promise<void> {
    const now = Date.now();

    // Check meeting alerts
    await this.checkMeetingAlerts(now);
    
    // Check email alerts
    await this.checkEmailAlerts(now);
    
    // Check deadline alerts
    await this.checkDeadlineAlerts(now);
    
    // Check system health
    await this.checkSystemAlerts(now);
  }

  private async checkMeetingAlerts(now: number): Promise<void> {
    if (!this.calendar.isConnected()) return;

    const upcoming = await this.calendar.getUpcomingMeetings(30);
    
    for (const meeting of upcoming) {
      const minutesUntil = Math.round((meeting.startTime - now) / 60000);
      
      if (minutesUntil <= 15 && minutesUntil > 0) {
        const rule = this.rules.find(r => r.id === 'meeting_soon');
        if (rule && this.shouldTrigger(rule.id)) {
          this.createAlert({
            id: `mtg_${meeting.id}_${now}`,
            type: 'meeting',
            title: 'Upcoming Meeting',
            message: rule.messageTemplate
              .replace('{meeting_title}', meeting.title)
              .replace('{minutes}', String(minutesUntil)),
            priority: rule.priority,
            triggerTime: now,
            context: { meetingId: meeting.id, minutesUntil },
            actionable: true,
            action: `Open ${meeting.platform} meeting`,
            dismissed: false
          });
          this.recordTrigger('meeting_soon');
        }
      }
    }
  }

  private async checkEmailAlerts(now: number): Promise<void> {
    if (!this.email.isConnected()) return;

    const unreadCount = await this.email.getUnreadCount();
    
    if (unreadCount > 5) {
      const rule = this.rules.find(r => r.id === 'unread_emails');
      if (rule && this.shouldTrigger(rule.id)) {
        this.createAlert({
          id: `email_${now}`,
          type: 'email',
          title: 'Unread Emails',
          message: rule.messageTemplate.replace('{count}', String(unreadCount)),
          priority: rule.priority,
          triggerTime: now,
          context: { unreadCount },
          actionable: true,
          action: 'Open email client',
          dismissed: false
        });
        this.recordTrigger('unread_emails');
      }
    }
  }

  private async checkDeadlineAlerts(now: number): Promise<void> {
    // Check goals with approaching deadlines
    // This would integrate with goal manager
  }

  private async checkSystemAlerts(now: number): Promise<void> {
    // Check CPU, memory
    // Mock check - would use actual system metrics
  }

  private shouldTrigger(ruleId: string): boolean {
    const lastTrigger = this.lastTriggered.get(ruleId) || 0;
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return false;
    
    const cooldownMs = rule.cooldownMinutes * 60000;
    return (Date.now() - lastTrigger) > cooldownMs;
  }

  private recordTrigger(ruleId: string): void {
    this.lastTriggered.set(ruleId, Date.now());
  }

  private createAlert(alert: Alert): void {
    this.alerts.push(alert);
    this.stateManager.addAuditEntry(`Alert created: ${alert.title}`, 'predictive_alerts');
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.dismissed);
  }

  getAllAlerts(): Alert[] {
    return [...this.alerts].sort((a, b) => b.triggerTime - a.triggerTime);
  }

  dismissAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      return true;
    }
    return false;
  }

  addCustomRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}`
    };
    this.rules.push(newRule);
    return newRule;
  }

  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  getRules(): AlertRule[] {
    return this.rules;
  }

  // Smart contextual alerts
  async generateContextualAlert(context: string, data: any): Promise<Alert | null> {
    // Use AI to generate intelligent alerts based on context
    return null;
  }
}
