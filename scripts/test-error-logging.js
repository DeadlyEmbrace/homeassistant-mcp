#!/usr/bin/env node

// Script to trigger various errors for testing logging
// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:4000';
const FAKE_TOKEN = 'fake_token_for_testing';

console.log('🧪 Testing error logging by triggering various errors...\n');

async function testEndpointErrors() {
    console.log('1. Testing authentication errors...');
    
    try {
        // Test unauthorized access
        const response1 = await fetch(`${BASE_URL}/list_devices`);
        console.log('   ✅ Triggered: Missing authorization');
    } catch (error) {
        console.log('   ❌ Connection failed:', error.message);
    }

    try {
        // Test invalid token
        const response2 = await fetch(`${BASE_URL}/list_devices`, {
            headers: { 'Authorization': `Bearer ${FAKE_TOKEN}` }
        });
        console.log('   ✅ Triggered: Invalid token');
    } catch (error) {
        console.log('   ❌ Connection failed:', error.message);
    }

    console.log('\n2. Testing control endpoint errors...');
    
    try {
        // Test invalid control request
        const response3 = await fetch(`${BASE_URL}/control`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FAKE_TOKEN}`
            },
            body: JSON.stringify({
                entity_id: 'light.nonexistent',
                action: 'turn_on'
            })
        });
        console.log('   ✅ Triggered: Control endpoint error');
    } catch (error) {
        console.log('   ❌ Connection failed:', error.message);
    }

    console.log('\n3. Testing MCP endpoint errors...');
    
    try {
        // Test invalid MCP request
        const response4 = await fetch(`${BASE_URL}/mcp/tools/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: {
                    name: 'nonexistent_tool',
                    arguments: {}
                }
            })
        });
        console.log('   ✅ Triggered: MCP endpoint error');
    } catch (error) {
        console.log('   ❌ Connection failed:', error.message);
    }

    console.log('\n✅ Error testing complete!');
    console.log('📁 Check logs/homeassistant-mcp.log for the logged errors');
}

// Check if server is running
console.log('🔍 Checking if server is running...');
fetch(`${BASE_URL}/health`)
    .then(response => {
        if (response.ok) {
            console.log('✅ Server is running, starting error tests...\n');
            return testEndpointErrors();
        } else {
            console.log('❌ Server returned error:', response.status);
            console.log('💡 Make sure the server is running with: npm start');
        }
    })
    .catch(error => {
        console.log('❌ Server is not running or not accessible');
        console.log('💡 Start the server first with: npm start');
        console.log('   Error:', error.message);
    });
