import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Testing application startup logging...');

// Clear any existing log file
const logPath = 'logs/homeassistant-mcp.log';
if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
    console.log('📝 Cleared existing log file');
}

// Start the application
console.log('🎯 Starting the application...');
const child = spawn('node', ['dist/src/index.js'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
        ...process.env,
        HASS_HOST: 'http://localhost:8123',
        HASS_TOKEN: 'test_token_for_logging_demo',
        PORT: '4000'
    }
});

// Wait for 3 seconds then kill the process
setTimeout(() => {
    console.log('⏹️  Stopping the application...');
    child.kill('SIGTERM');
    
    // Wait a moment for the process to cleanup
    setTimeout(() => {
        // Check if log file was created
        if (fs.existsSync(logPath)) {
            console.log('✅ Log file created! Contents:');
            console.log('─'.repeat(50));
            const content = fs.readFileSync(logPath, 'utf8');
            console.log(content);
            console.log('─'.repeat(50));
        } else {
            console.log('❌ No log file found. Check if the application is starting correctly.');
        }
        
        process.exit(0);
    }, 1000);
}, 3000);

// Handle application output
child.stdout.on('data', (data) => {
    console.log('📤 App output:', data.toString().trim());
});

child.stderr.on('data', (data) => {
    console.log('🚨 App error:', data.toString().trim());
});

child.on('error', (error) => {
    console.log('💥 Failed to start application:', error.message);
    process.exit(1);
});
