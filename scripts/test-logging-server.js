import express from 'express';
import { logger } from '../dist/src/utils/logger.js';

// Minimal test server to verify error logging works
const app = express();
const PORT = 3001;

// Middleware to log requests
app.use(async (req, res, next) => {
    await logger.info('HTTP Request received', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});

// Test endpoint that always throws an error
app.get('/test-error', async (req, res) => {
    try {
        throw new Error('This is a test error for logging verification');
    } catch (error) {
        await logger.error('Test error endpoint hit', error, {
            endpoint: '/test-error',
            method: 'GET',
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({ error: 'Test error logged successfully' });
    }
});

// Test endpoint for authentication error
app.get('/test-auth-error', async (req, res) => {
    const authError = new Error('Invalid authentication token');
    await logger.error('Authentication failed', authError, {
        endpoint: '/test-auth-error',
        hasAuthHeader: !!req.headers.authorization,
        timestamp: new Date().toISOString()
    });
    
    res.status(401).json({ error: 'Authentication failed' });
});

// Global error handler
app.use(async (err, req, res, next) => {
    await logger.error('Unhandled Express error', err, {
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ error: 'Internal server error' });
});

// Start test server
app.listen(PORT, async () => {
    await logger.info('Test server started', {
        port: PORT,
        endpoints: ['/test-error', '/test-auth-error'],
        timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Test server running on http://localhost:${PORT}`);
    console.log('📝 Try these endpoints to test error logging:');
    console.log(`   http://localhost:${PORT}/test-error`);
    console.log(`   http://localhost:${PORT}/test-auth-error`);
    console.log('📁 Check logs/homeassistant-mcp.log for entries');
});
