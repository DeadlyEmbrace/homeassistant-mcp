#!/usr/bin/env node

// Simple demonstration script for error logging
import { logger } from '../dist/src/utils/logger.js';

async function demonstrateLogging() {
    console.log('🚀 Demonstrating error logging functionality...\n');

    // Create logs directory if it doesn't exist
    console.log('1. Testing info logging...');
    await logger.info('Application started', {
        version: '0.1.0',
        environment: 'development',
        port: 4000
    });

    // Simulate a warning
    console.log('2. Testing warning logging...');
    await logger.warn('Rate limit approaching threshold', {
        currentRequests: 85,
        limit: 100,
        timeWindow: '15 minutes'
    });

    // Simulate an error with metadata
    console.log('3. Testing error logging with metadata...');
    const mockError = new Error('Connection timeout to Home Assistant');
    mockError.stack = `Error: Connection timeout to Home Assistant
    at HassApi.callService (src/hass/api.ts:45:13)
    at async POST /control (src/index.ts:156:20)
    at async Express.app (src/index.ts:45:3)`;

    await logger.error('Failed to control device', mockError, {
        endpoint: '/control',
        method: 'POST',
        entity_id: 'light.living_room',
        action: 'turn_on',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ip: '192.168.1.50',
        timestamp: new Date().toISOString()
    });

    // Simulate MCP protocol error
    console.log('4. Testing MCP transport error logging...');
    const mcpError = new Error('Method not found: invalid_tool');
    await logger.error('MCP HTTP Transport error', mcpError, {
        mcpMethod: 'tools/call',
        requestId: 'req_12345',
        params: {
            name: 'invalid_tool',
            arguments: {}
        },
        timestamp: new Date().toISOString()
    });

    // Simulate AI processing error
    console.log('5. Testing AI router error logging...');
    const aiError = new Error('Failed to classify intent');
    await logger.error('AI Router error', aiError, {
        endpoint: '/ai/interpret',
        method: 'POST',
        input: 'turn on the thing in the place',
        context: {
            session_id: 'sess_abc123',
            location: 'living_room',
            previous_actions: []
        },
        model: 'claude',
        timestamp: new Date().toISOString()
    });

    console.log('\n✅ Logging demonstration complete!');
    console.log('\n📁 Check the logs directory for generated log files:');
    console.log('   - logs/homeassistant-mcp.log (main log file)');
    console.log('\n💡 You can monitor logs in real-time with:');
    console.log('   tail -f logs/homeassistant-mcp.log');
    console.log('\n🔍 Search for errors with:');
    console.log('   grep "ERROR" logs/homeassistant-mcp.log');
}

// Run the demonstration
demonstrateLogging().catch(error => {
    console.error('Failed to run logging demonstration:', error);
    process.exit(1);
});
