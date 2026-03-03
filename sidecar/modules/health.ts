
import fs from 'fs';
import path from 'path';

export type SystemStatus = 'HEALTHY' | 'DEGRADED' | 'SAFE_MODE';

export class HealthMonitor {
    private metrics = {
        requestsTotal: 0,
        requestsFailed: 0,
        recoveryAttempts: 0,
        lastErrorTimestamp: 0,
        consecutiveFailures: 0
    };

    private ERROR_THRESHOLD = 5; // failures in short window
    private RECOVERY_WINDOW = 60000; // 1 minute

    getStatus(): SystemStatus {
        if (this.metrics.consecutiveFailures >= 3) return 'SAFE_MODE';

        const errorRate = this.metrics.requestsTotal > 0
            ? (this.metrics.requestsFailed / this.metrics.requestsTotal)
            : 0;

        if (errorRate > 0.2 && this.metrics.requestsTotal > 10) return 'DEGRADED';

        return 'HEALTHY';
    }

    recordSuccess() {
        this.metrics.requestsTotal++;
        this.metrics.consecutiveFailures = 0;
    }

    recordFailure(error: any) {
        this.metrics.requestsTotal++;
        this.metrics.requestsFailed++;
        this.metrics.consecutiveFailures++;
        this.metrics.lastErrorTimestamp = Date.now();
        console.error('[HEALTH]: Recorded failure:', error.message || error);
    }

    recordRecovery() {
        this.metrics.recoveryAttempts++;
    }

    getMetrics() {
        return {
            ...this.metrics,
            status: this.getStatus(),
            uptime: process.uptime()
        };
    }

    shouldPauseActions(): boolean {
        return this.getStatus() === 'SAFE_MODE';
    }
}
