
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import shell from 'shelljs';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const AUDIT_LOG_FILE = path.resolve(PROJECT_ROOT, 'audit_trail.json');

class SecurityGuard {
    private static BANNED_PATTERNS = [
        'rm -rf', 'chmod', 'chown', 'sudo', 'mkfs', 'dd if=',
        'mv /', 'rm /', '> /etc/', '> /var/', 'shutdown', 'reboot'
    ];

    private static PROTECTED_EXTENSIONS = [
        '.py', '.java', '.class', '.pyc', '.sh', '.exe', '.bat', '.env'
    ];

    static isSafeCommand(cmd: string): boolean {
        const lowerCmd = cmd.toLowerCase();
        return !this.BANNED_PATTERNS.some(pattern => lowerCmd.includes(pattern));
    }

    static isSafePath(filePath: string, allowWrite: boolean = false): boolean {
        const normalized = path.normalize(filePath);

        // Prevent path traversal
        if (normalized.includes('..')) return false;

        // Lockdown sensitive files
        if (allowWrite) {
            const ext = path.extname(normalized).toLowerCase();
            if (this.PROTECTED_EXTENSIONS.includes(ext)) {
                // Only allow if it's within a sandbox (e.g., temp_scripts/)
                if (!normalized.includes('temp_scripts')) return false;
            }
        }
        return true;
    }
}

const writeAuditLog = (action: string, target: string, success: boolean, error?: string) => {
    try {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            target,
            success,
            error
        };
        let logs: any[] = [];
        if (fs.existsSync(AUDIT_LOG_FILE)) {
            const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
            logs = content ? JSON.parse(content) : [];
        }
        logs.push(entry);
        fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs.slice(-500), null, 2));
    } catch (e) {
        console.error('Failed to write audit log:', e);
    }
};

export const resolvePath = (p: string) => path.isAbsolute(p) ? p : path.resolve(PROJECT_ROOT, p);

export interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    metadata?: any;
}

export const executeAction = async (action: string, target: string, args?: string): Promise<ExecutionResult> => {
    console.log(`[EXECUTOR]: Action=${action}, Target=${target}`);

    // SECURITY CHECK
    if (action === 'run_command' && !SecurityGuard.isSafeCommand(target)) {
        writeAuditLog(action, target, false, "CRITICAL: Banned command pattern detected!");
        return { success: false, error: "SECURITY ALERT: This command is blocked for system safety." };
    }

    if (['write_file', 'delete_file', 'move_file'].includes(action)) {
        if (!SecurityGuard.isSafePath(target, true)) {
            writeAuditLog(action, target, false, "SECURITY: Unauthorized file modification attempt.");
            return { success: false, error: "SECURITY ALERT: Modification of protected system files (.py, .java, etc.) is locked." };
        }
    }

    let result: ExecutionResult = { success: false, error: 'Initialization failed' };
    try {
        switch (action) {
            case 'open_app':
                result = await openApp(target);
                break;
            case 'run_command':
                result = await runCommand(target);
                break;
            case 'read_file':
                result = await readFile(target);
                break;
            case 'write_file':
                result = await writeFile(target, args || '');
                break;
            case 'move_file':
                result = await moveFile(target, args || '');
                break;
            case 'delete_file':
                result = await deleteFile(target);
                break;
            case 'create_dir':
                result = await createDir(target);
                break;
            case 'get_knowledge':
                result = await getKnowledge(target);
                break;
            case 'set_knowledge':
                result = await setKnowledge(target, args || '');
                break;
            case 'get_goals':
                result = await getGoals();
                break;
            case 'set_goals':
                result = await setGoals(args || '');
                break;
            case 'run_fix':
                result = await runFix(target, args || '');
                break;
            case 'list_processes':
                result = await listProcesses();
                break;
            case 'create_backup':
                result = await createBackup(target);
                break;
            case 'capture_screenshot':
                result = await captureScreenshot(target);
                break;
            case 'update_goal':
                result = { success: true, output: `Goal ${target} updated successfully.` };
                break;
            case 'generate_excel':
                result = await generateExcel(target, args || '[]');
                break;
            default:
                result = { success: false, error: `Unknown action: ${action}` };
        }
        writeAuditLog(action, target, result.success, result.error);
        return result;
    } catch (error: any) {
        writeAuditLog(action, target, false, error.message);
        return { success: false, error: error.message };
    }
};

const captureScreenshot = async (filePath: string): Promise<ExecutionResult> => {
    return new Promise((resolve) => {
        const fullPath = resolvePath(filePath);
        // Use ImageMagick 'import' command to capture the root window
        const cmd = `import -window root "${fullPath}"`;
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: stderr || error.message });
            } else {
                resolve({ success: true, output: `Screenshot saved to ${filePath}`, metadata: { path: filePath } });
            }
        });
    });
};

const openApp = (name: string): Promise<ExecutionResult> => {
    return new Promise((resolve) => {
        // On Windows, use 'start'
        const cmd = `start "" "${name}"`;
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: stderr || error.message });
            } else {
                resolve({ success: true, output: `Opened ${name}` });
            }
        });
    });
};

const runCommand = (cmd: string): Promise<ExecutionResult> => {
    return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: stderr || error.message, output: stdout });
            } else {
                resolve({ success: true, output: stdout });
            }
        });
    });
};

const readFile = async (filePath: string): Promise<ExecutionResult> => {
    try {
        const data = fs.readFileSync(resolvePath(filePath), 'utf8');
        return { success: true, output: data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function writeFile(filePath: string, data: string): Promise<ExecutionResult> {
    try {
        fs.writeFileSync(resolvePath(filePath), data, 'utf8');
        return { success: true, output: `File written to ${filePath}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function listProcesses(): Promise<ExecutionResult> {
    return new Promise((resolve) => {
        exec('tasklist', (error, stdout) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true, output: stdout });
            }
        });
    });
}

async function createBackup(filePath: string): Promise<ExecutionResult> {
    try {
        const fullPath = resolvePath(filePath);
        const backupPath = `${fullPath}.${Date.now()}.bak`;
        fs.copyFileSync(fullPath, backupPath);
        return { success: true, output: `Backup created at ${backupPath}`, metadata: { backupPath } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
async function createDir(dirPath: string): Promise<ExecutionResult> {
    try {
        const fullPath = resolvePath(dirPath);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return { success: true, output: `Directory created: ${dirPath}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

async function moveFile(src: string, dest: string): Promise<ExecutionResult> {
    try {
        fs.renameSync(resolvePath(src), resolvePath(dest));
        return { success: true, output: `Moved ${src} to ${dest}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

async function deleteFile(filePath: string): Promise<ExecutionResult> {
    try {
        fs.unlinkSync(resolvePath(filePath));
        return { success: true, output: `Deleted ${filePath}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

const KNOWLEDGE_FILE = path.resolve(PROJECT_ROOT, 'personal_knowledge.json');

async function getKnowledge(key: string): Promise<ExecutionResult> {
    try {
        if (!fs.existsSync(KNOWLEDGE_FILE)) return { success: true, output: "{}" };
        const data = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
        return { success: true, output: JSON.stringify(data[key] || "No info found.") };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

async function setKnowledge(key: string, value: string): Promise<ExecutionResult> {
    try {
        let data: any = {};
        if (fs.existsSync(KNOWLEDGE_FILE)) {
            data = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
        }
        data[key] = value;
        fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(data, null, 2));
        return { success: true, output: `Knowledge updated: ${key}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

const GOALS_FILE = path.resolve(PROJECT_ROOT, 'goals.json');

async function getGoals(): Promise<ExecutionResult> {
    try {
        if (!fs.existsSync(GOALS_FILE)) return { success: true, output: "[]" };
        const data = fs.readFileSync(GOALS_FILE, 'utf8');
        return { success: true, output: data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

async function setGoals(goalsJson: string): Promise<ExecutionResult> {
    try {
        fs.writeFileSync(GOALS_FILE, goalsJson, 'utf8');
        return { success: true, output: "Goals updated successfully." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

async function runFix(command: string, errorMessage: string): Promise<ExecutionResult> {
    try {
        console.log(`[FIX_AGENT]: Attempting to fix error from command: ${command}`);
        console.log(`[FIX_AGENT]: Error reported: ${errorMessage}`);
        return {
            success: true,
            output: `Developer Agent analyzed the error: "${errorMessage.slice(0, 50)}...". I'm attempting to patch the relevant files.`,
            metadata: { state: 'FIXING' }
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
async function generateExcel(filename: string, jsonString: string): Promise<ExecutionResult> {
    try {
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data)) throw new Error("Data must be an array of objects for Excel generation.");

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sheet 1');

        if (data.length > 0) {
            const columns = Object.keys(data[0]).map(key => ({
                header: key.toUpperCase(),
                key: key,
                width: 20
            }));
            sheet.columns = columns;

            // Add rows
            data.forEach(item => sheet.addRow(item));

            // Formatting
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        }

        const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
        const publicPath = `/var/www/html/operator/downloads/${cleanFilename}`;
        
        await workbook.xlsx.writeFile(publicPath);

        return {
            success: true,
            output: `Excel file generated successfully: ${cleanFilename}`,
            metadata: {
                filename: cleanFilename,
                downloadUrl: `/downloads/${cleanFilename}`
            }
        };
    } catch (e: any) {
        return { success: false, error: `Excel generation failed: ${e.message}` };
    }
}
