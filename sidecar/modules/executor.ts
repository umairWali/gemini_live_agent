
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import shell from 'shelljs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export const resolvePath = (p: string) => path.isAbsolute(p) ? p : path.resolve(PROJECT_ROOT, p);

export interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    metadata?: any;
}

export const executeAction = async (action: string, target: string, args?: string): Promise<ExecutionResult> => {
    console.log(`[EXECUTOR]: Action=${action}, Target=${target}`);

    try {
        switch (action) {
            case 'open_app':
                return await openApp(target);
            case 'run_command':
                return await runCommand(target);
            case 'read_file':
                return await readFile(target);
            case 'write_file':
                return await writeFile(target, args || '');
            case 'move_file':
                return await moveFile(target, args || '');
            case 'delete_file':
                return await deleteFile(target);
            case 'create_dir':
                return await createDir(target);
            case 'get_knowledge':
                return await getKnowledge(target);
            case 'set_knowledge':
                return await setKnowledge(target, args || '');
            case 'list_processes':
                return await listProcesses();
            case 'create_backup':
                return await createBackup(target);
            case 'capture_screenshot':
                return await captureScreenshot(target);
            case 'update_goal':
                return { success: true, output: `Goal ${target} updated successfully.` };
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    } catch (error: any) {
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
};

const writeFile = async (filePath: string, data: string): Promise<ExecutionResult> => {
    try {
        fs.writeFileSync(resolvePath(filePath), data, 'utf8');
        return { success: true, output: `File written to ${filePath}` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

const listProcesses = async (): Promise<ExecutionResult> => {
    return new Promise((resolve) => {
        exec('tasklist', (error, stdout) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true, output: stdout });
            }
        });
    });
};

const createBackup = async (filePath: string): Promise<ExecutionResult> => {
    try {
        const fullPath = resolvePath(filePath);
        const backupPath = `${fullPath}.${Date.now()}.bak`;
        fs.copyFileSync(fullPath, backupPath);
        return { success: true, output: `Backup created at ${backupPath}`, metadata: { backupPath } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
const createDir = async (dirPath: string): Promise<ExecutionResult> => {
    try {
        const fullPath = resolvePath(dirPath);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return { success: true, output: `Directory created: ${dirPath}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

const moveFile = async (src: string, dest: string): Promise<ExecutionResult> => {
    try {
        fs.renameSync(resolvePath(src), resolvePath(dest));
        return { success: true, output: `Moved ${src} to ${dest}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

const deleteFile = async (filePath: string): Promise<ExecutionResult> => {
    try {
        fs.unlinkSync(resolvePath(filePath));
        return { success: true, output: `Deleted ${filePath}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

const KNOWLEDGE_FILE = path.resolve(PROJECT_ROOT, 'personal_knowledge.json');

const getKnowledge = async (key: string): Promise<ExecutionResult> => {
    try {
        if (!fs.existsSync(KNOWLEDGE_FILE)) return { success: true, output: "{}" };
        const data = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
        return { success: true, output: JSON.stringify(data[key] || "No info found.") };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

const setKnowledge = async (key: string, value: string): Promise<ExecutionResult> => {
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
};
