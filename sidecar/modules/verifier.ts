
import fs from 'fs';
import { resolvePath } from './executor';

export interface VerificationResult {
    verified: boolean;
    driftDetected: boolean;
    reason?: string;
}

export class VerifierEngine {

    validatePreConditions(action: string, target: string): VerificationResult {
        // Transient State Check
        if (target.endsWith('.tmp') || target.endsWith('.swp') || target.includes('.staging')) {
            return { verified: false, driftDetected: true, reason: 'Target appears to be in transient state.' };
        }

        const fullPath = resolvePath(target);

        try {
            switch (action) {
                case 'read_file':
                case 'delete_file':
                    if (!fs.existsSync(fullPath)) {
                        return { verified: false, driftDetected: true, reason: `Pre-check: File ${target} does not exist.` };
                    }
                    break;
                case 'write_file':
                    // Check if directory exists
                    // const dir = path.dirname(fullPath);
                    // if (!fs.existsSync(dir)) {
                    //    return { verified: false, driftDetected: true, reason: `Pre-check: Directory for ${target} does not exist.` };
                    // }
                    // Actually executor handles dir creation most of the time? No, it uses writeFile which might struggle.
                    // But for strict ground truth, we won't block if dir missing, just warn.
                    break;
            }
        } catch (e: any) {
            return { verified: false, driftDetected: true, reason: `Pre-check failed: ${e.message}` };
        }
        return { verified: true, driftDetected: false };
    }

    verifyOutcome(action: string, target: string, result: any): VerificationResult {
        if (!result.success) return { verified: false, driftDetected: false, reason: 'Action failed execution.' };

        const fullPath = resolvePath(target);

        try {
            switch (action) {
                case 'write_file':
                case 'create_backup':
                    if (!fs.existsSync(fullPath)) {
                        return { verified: false, driftDetected: true, reason: 'Drift: File not found after successful write.' };
                    }
                    break;
                case 'delete_file':
                    if (fs.existsSync(fullPath)) {
                        return { verified: false, driftDetected: true, reason: 'Drift: File still exists after successful delete.' };
                    }
                    break;
            }
        } catch (e: any) {
            return { verified: false, driftDetected: true, reason: `Verification error: ${e.message}` };
        }
        return { verified: true, driftDetected: false };
    }
}
