import { logger } from '../dist/src/utils/logger.js';

console.log('Testing logger directly...');

async function test() {
    try {
        console.log('1. Calling logger.info...');
        await logger.info('Direct logger test', { test: true });
        console.log('2. Logger.info completed');
        
        console.log('3. Calling logger.error...');
        await logger.error('Direct logger error test', new Error('Test error'));
        console.log('4. Logger.error completed');
        
        console.log('✅ Direct logger test completed successfully');
    } catch (error) {
        console.error('❌ Logger test failed:', error);
    }
}

test();
