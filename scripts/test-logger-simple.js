import { logger } from '../dist/src/utils/logger.js';

async function testLogger() {
    console.log('Testing logger...');
    
    await logger.info('Application startup test', {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
    
    await logger.error('Test error during startup', new Error('This is a test error'), {
        context: 'startup-test',
        timestamp: new Date().toISOString()
    });
    
    console.log('Logger test completed. Check logs/ directory.');
}

testLogger().catch(console.error);
