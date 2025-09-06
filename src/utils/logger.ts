import fs from 'fs';
import path from 'path';

interface LogLevel {
    ERROR: 'ERROR';
    WARN: 'WARN';
    INFO: 'INFO';
    DEBUG: 'DEBUG';
}

const LOG_LEVELS: LogLevel = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

interface LogEntry {
    timestamp: string;
    level: keyof LogLevel;
    message: string;
    error?: Error;
    metadata?: Record<string, any>;
}

class FileLogger {
    private logDir: string;
    private logFile: string;
    private maxFileSize: number;
    private maxFiles: number;

    constructor(options: {
        logDir?: string;
        logFile?: string;
        maxFileSize?: number;
        maxFiles?: number;
    } = {}) {
        this.logDir = options.logDir || 'logs';
        this.logFile = options.logFile || 'app.log';
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFiles = options.maxFiles || 5;

        // Ensure log directory exists
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            // Fallback to current directory if we can't create logs directory
            this.logDir = '.';
        }
    }

    private getLogPath(): string {
        return path.join(this.logDir, this.logFile);
    }

    private formatLogEntry(entry: LogEntry): string {
        const { timestamp, level, message, error, metadata } = entry;
        let logLine = `${timestamp} [${level}] ${message}`;

        if (error) {
            logLine += `\nError: ${error.message}`;
            if (error.stack) {
                logLine += `\nStack: ${error.stack}`;
            }
        }

        if (metadata) {
            logLine += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
        }

        return logLine + '\n';
    }

    private async rotateLogIfNeeded(): Promise<void> {
        const logPath = this.getLogPath();
        
        try {
            const stats = await fs.promises.stat(logPath);
            if (stats.size > this.maxFileSize) {
                await this.rotateLog();
            }
        } catch (error) {
            // File doesn't exist yet, no need to rotate
        }
    }

    private async rotateLog(): Promise<void> {
        const logPath = this.getLogPath();
        const logName = path.parse(this.logFile).name;
        const logExt = path.parse(this.logFile).ext;

        try {
            // Rotate existing logs
            for (let i = this.maxFiles - 1; i > 0; i--) {
                const oldFile = path.join(this.logDir, `${logName}.${i}${logExt}`);
                const newFile = path.join(this.logDir, `${logName}.${i + 1}${logExt}`);
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxFiles - 1) {
                        // Delete the oldest file
                        await fs.promises.unlink(oldFile);
                    } else {
                        await fs.promises.rename(oldFile, newFile);
                    }
                }
            }

            // Rename current log to .1
            if (fs.existsSync(logPath)) {
                const rotatedFile = path.join(this.logDir, `${logName}.1${logExt}`);
                await fs.promises.rename(logPath, rotatedFile);
            }
        } catch (error) {
            // If rotation fails, continue with logging
            console.error('Failed to rotate log file:', error);
        }
    }

    private async writeLog(entry: LogEntry): Promise<void> {
        try {
            await this.rotateLogIfNeeded();
            const logLine = this.formatLogEntry(entry);
            const logPath = this.getLogPath();
            
            await fs.promises.appendFile(logPath, logLine, 'utf8');
        } catch (error) {
            // Fallback to console if file logging fails
            console.error('Failed to write to log file:', error);
        }
    }

    public async log(level: keyof LogLevel, message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            error,
            metadata
        };

        await this.writeLog(entry);
    }

    public async error(message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
        await this.log(LOG_LEVELS.ERROR, message, error, metadata);
    }

    public async warn(message: string, metadata?: Record<string, any>): Promise<void> {
        await this.log(LOG_LEVELS.WARN, message, undefined, metadata);
    }

    public async info(message: string, metadata?: Record<string, any>): Promise<void> {
        await this.log(LOG_LEVELS.INFO, message, undefined, metadata);
    }

    public async debug(message: string, metadata?: Record<string, any>): Promise<void> {
        await this.log(LOG_LEVELS.DEBUG, message, undefined, metadata);
    }
}

// Create a singleton logger instance
export const logger = new FileLogger({
    logDir: process.env.LOG_DIR || 'logs',
    logFile: process.env.LOG_FILE || 'homeassistant-mcp.log',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
});

export { LOG_LEVELS };
export type { LogEntry };
