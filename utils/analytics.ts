import { useEffect, useCallback } from 'react';

interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
  sessionId: string;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadUserId();
    this.trackSessionStart();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadUserId(): void {
    this.userId = localStorage.getItem('analytics_user_id');
    if (!this.userId) {
      this.userId = this.generateSessionId();
      localStorage.setItem('analytics_user_id', this.userId);
    }
  }

  private trackSessionStart(): void {
    this.track('session_start', {
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      platform: navigator.platform
    });
  }

  track(type: string, data: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      data: {
        ...data,
        userId: this.userId,
        sessionId: this.sessionId,
        url: window.location.href
      },
      sessionId: this.sessionId
    };

    this.events.push(event);

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event);
    }

    // Send to server if batch is large enough
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  trackError(error: Error, context?: string): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      context,
      type: error.name
    });
  }

  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.track('performance', {
      metric,
      value,
      unit
    });
  }

  trackUserAction(action: string, details?: Record<string, any>): void {
    this.track('user_action', {
      action,
      ...details
    });
  }

  trackAIInteraction(prompt: string, responseTime: number, success: boolean): void {
    this.track('ai_interaction', {
      promptLength: prompt.length,
      responseTime,
      success,
      provider: 'gemini' // or 'longcat' based on fallback
    });
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // Send to analytics endpoint
      const response = await fetch('http://localhost:3000/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend })
      });

      if (!response.ok) {
        // Put events back if failed
        this.events.unshift(...eventsToSend);
      }
    } catch (error) {
      // Put events back if network failed
      this.events.unshift(...eventsToSend);
    }
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getSessionStats(): {
    duration: number;
    eventCount: number;
    errorCount: number;
    aiInteractions: number;
  } {
    const startTime = this.events.find(e => e.type === 'session_start')?.timestamp || Date.now();
    return {
      duration: Date.now() - startTime,
      eventCount: this.events.length,
      errorCount: this.events.filter(e => e.type === 'error').length,
      aiInteractions: this.events.filter(e => e.type === 'ai_interaction').length
    };
  }

  disable(): void {
    this.isEnabled = false;
  }

  enable(): void {
    this.isEnabled = true;
  }
}

export const analytics = new Analytics();

// React hook for analytics
export const useAnalytics = () => {
  const track = useCallback((type: string, data?: Record<string, any>) => {
    analytics.track(type, data);
  }, []);

  const trackError = useCallback((error: Error, context?: string) => {
    analytics.trackError(error, context);
  }, []);

  const trackPerformance = useCallback((metric: string, value: number, unit?: string) => {
    analytics.trackPerformance(metric, value, unit);
  }, []);

  return { track, trackError, trackPerformance };
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Measure initial load time
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      analytics.trackPerformance('page_load', navigation.loadEventEnd - navigation.startTime);
    }

    // Measure first contentful paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          analytics.trackPerformance('fcp', entry.startTime);
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });

    return () => observer.disconnect();
  }, []);
};

// Error boundary analytics integration
export const useErrorTracking = () => {
  useEffect(() => {
    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      if (error) {
        analytics.trackError(error, `window.onerror: ${source}:${lineno}:${colno}`);
      }
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    window.onunhandledrejection = (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      analytics.trackError(error, 'unhandledrejection');
      if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection(event);
      }
    };

    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  }, []);
};

export default analytics;
