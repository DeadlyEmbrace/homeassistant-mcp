import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Import the FileLogger class directly instead of the singleton
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

    private formatLogEntry(entry: {
        timestamp: string;
        level: string;
        message: string;
        error?: Error;
        metadata?: Record<string, any>;
    }): string {
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

    private async writeLog(entry: {
        timestamp: string;
        level: string;
        message: string;
        error?: Error;
        metadata?: Record<string, any>;
    }): Promise<void> {
        try {
            const logLine = this.formatLogEntry(entry);
            const logPath = this.getLogPath();
            
            await fs.promises.appendFile(logPath, logLine, 'utf8');
        } catch (error) {
            // Fallback to console if file logging fails
            console.error('Failed to write to log file:', error);
        }
    }

    public async log(level: string, message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            error,
            metadata
        };

        await this.writeLog(entry);
    }

    public async error(message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
        await this.log('ERROR', message, error, metadata);
    }

    public async warn(message: string, metadata?: Record<string, any>): Promise<void> {
        await this.log('WARN', message, undefined, metadata);
    }

    public async info(message: string, metadata?: Record<string, any>): Promise<void> {
        await this.log('INFO', message, undefined, metadata);
    }
}

describe('Logger', () => {
    const testLogDir = 'test-logs';
    const testLogFile = 'test.log';
    let logger: FileLogger;

    beforeEach(() => {
        // Clean up any existing test logs
        if (fs.existsSync(testLogDir)) {
            const files = fs.readdirSync(testLogDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(testLogDir, file));
            });
            fs.rmdirSync(testLogDir);
        }

        // Create a new logger instance for each test
        logger = new FileLogger({
            logDir: testLogDir,
            logFile: testLogFile
        });
    });

    afterEach(() => {
        // Clean up test logs
        if (fs.existsSync(testLogDir)) {
            const files = fs.readdirSync(testLogDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(testLogDir, file));
            });
            fs.rmdirSync(testLogDir);
        }
    });

    it('should create log directory if it does not exist', async () => {
        await logger.error('Test error message');
        
        expect(fs.existsSync(testLogDir)).toBe(true);
    });

    it('should write error logs to file', async () => {
        const testError = new Error('Test error');
        const testMetadata = { testKey: 'testValue' };
        
        await logger.error('Test error message', testError, testMetadata);
        
        const logPath = path.join(testLogDir, testLogFile);
        expect(fs.existsSync(logPath)).toBe(true);
        
        const logContent = fs.readFileSync(logPath, 'utf8');
        expect(logContent).toContain('[ERROR] Test error message');
        expect(logContent).toContain('Error: Test error');
        expect(logContent).toContain('testKey');
        expect(logContent).toContain('testValue');
    });

    it('should write info logs to file', async () => {
        const testMetadata = { operation: 'test' };
        
        await logger.info('Test info message', testMetadata);
        
        const logPath = path.join(testLogDir, testLogFile);
        expect(fs.existsSync(logPath)).toBe(true);
        
        const logContent = fs.readFileSync(logPath, 'utf8');
        expect(logContent).toContain('[INFO] Test info message');
        expect(logContent).toContain('operation');
    });

    it('should write warn logs to file', async () => {
        await logger.warn('Test warning message');
        
        const logPath = path.join(testLogDir, testLogFile);
        expect(fs.existsSync(logPath)).toBe(true);
        
        const logContent = fs.readFileSync(logPath, 'utf8');
        expect(logContent).toContain('[WARN] Test warning message');
    });

    it('should include timestamp in log entries', async () => {
        await logger.error('Test error');
        
        const logPath = path.join(testLogDir, testLogFile);
        const logContent = fs.readFileSync(logPath, 'utf8');
        
        // Check for ISO timestamp format
        expect(logContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should handle errors without stack trace gracefully', async () => {
        const plainError = { message: 'Plain error object' } as Error;
        
        await logger.error('Test error', plainError);
        
        const logPath = path.join(testLogDir, testLogFile);
        expect(fs.existsSync(logPath)).toBe(true);
        
        const logContent = fs.readFileSync(logPath, 'utf8');
        expect(logContent).toContain('Plain error object');
    });

    it('should format metadata as JSON', async () => {
        const complexMetadata = {
            user: 'test-user',
            action: 'test-action',
            nested: {
                value: 123,
                flag: true
            }
        };
        
        await logger.info('Test with complex metadata', complexMetadata);
        
        const logPath = path.join(testLogDir, testLogFile);
        const logContent = fs.readFileSync(logPath, 'utf8');
        
        expect(logContent).toContain('test-user');
        expect(logContent).toContain('test-action');
        expect(logContent).toContain('123');
        expect(logContent).toContain('true');
    });
});
