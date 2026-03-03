
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { exec } from 'child_process';

export class WatcherEngine extends EventEmitter {
    private fsWatcher: chokidar.FSWatcher | null = null;
    private projectPath: string;

    constructor(projectPath: string) {
        super();
        this.projectPath = projectPath;
    }

    start() {
        console.log(`[WATCHER]: Starting on ${this.projectPath}`);
        this.startFilesystemWatcher();
        this.startGitWatcher();
        this.startProcessWatcher();
    }

    private startFilesystemWatcher() {
        this.fsWatcher = chokidar.watch(this.projectPath, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true
        });

        this.fsWatcher.on('all', (event, path) => {
            this.emit('event', {
                type: 'FS_CHANGE',
                source: 'filesystem',
                timestamp: Date.now(),
                metadata: { event, path },
                status: 'UNPROCESSED'
            });
        });
    }

    private startGitWatcher() {
        let lastHash = '';
        setInterval(() => {
            exec('git rev-parse HEAD', { cwd: this.projectPath }, (error, stdout) => {
                if (!error && stdout) {
                    const hash = stdout.trim();
                    if (lastHash && hash !== lastHash) {
                        this.emit('event', {
                            type: 'GIT_CHANGE',
                            source: 'git',
                            timestamp: Date.now(),
                            metadata: { hash, prevHash: lastHash },
                            status: 'UNPROCESSED'
                        });
                    }
                    lastHash = hash;
                }
            });
        }, 15000);
    }

    private startProcessWatcher() {
        setInterval(() => {
            // Get Active Window Title via PowerShell
            const psCmd = 'powershell "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object MainWindowTitle"';
            exec(psCmd, (error, stdout) => {
                if (!error && stdout) {
                    const titles = stdout.split('\n').map(t => t.trim()).filter(t => t && t !== 'MainWindowTitle' && t !== '---------------');
                    if (titles.length > 0) {
                        this.emit('event', {
                            type: 'WINDOW_FOCUS',
                            source: 'window_watcher',
                            timestamp: Date.now(),
                            metadata: { activeTitle: titles[0] },
                            status: 'UNPROCESSED'
                        });
                    }
                }
            });

            exec('tasklist /FI "IMAGENAME eq Code.exe"', (error, stdout) => {
                if (stdout.includes('Code.exe')) {
                    // Logic to detect state change could go here
                }
            });
        }, 30000);
    }

    stop() {
        if (this.fsWatcher) this.fsWatcher.close();
    }
}
