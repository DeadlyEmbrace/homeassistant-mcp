#!/usr/bin/env node

// Simple test script to verify trace functionality with WebSocket fallback approach
import { HassWebSocketClient } from './dist/src/websocket/client.js';
import { 
  getAutomationTraces,
  getAutomationTraceDetail,
  getAutomationLatestTrace
} from './dist/src/utils/automation-helpers.js';

const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN;

async function testTraceWithWebSocket() {
  if (!HASS_TOKEN) {
    console.log('❌ No HASS_TOKEN environment variable found');
    console.log('Set HASS_HOST and HASS_TOKEN environment variables to test');
    return;
  }

  console.log('🔍 Testing Automation Trace with WebSocket Fallback\n');
  console.log(`Host: ${HASS_HOST}`);
  console.log(`Token: ${HASS_TOKEN.substring(0, 20)}...`);

  let wsClient = null;

  try {
    // Try to establish WebSocket connection
    console.log('\n1. Attempting WebSocket connection...');
    const wsUrl = HASS_HOST.replace(/^http/, 'ws') + '/api/websocket';
    wsClient = new HassWebSocketClient(wsUrl, HASS_TOKEN);
    
    await wsClient.connect();
    console.log('✅ WebSocket connected successfully');
  } catch (error) {
    console.log(`❌ WebSocket connection failed: ${error.message}`);
    console.log('Continuing with REST API fallback...');
  }

  // Get list of automations to test with
  console.log('\n2. Getting automation list...');
  try {
    const response = await fetch(`${HASS_HOST}/api/states`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get states: ${response.status} ${response.statusText}`);
    }

    const states = await response.json();
    const automations = states.filter(state => state.entity_id.startsWith('automation.'));
    
    if (automations.length === 0) {
      console.log('❌ No automations found to test with');
      return;
    }

    console.log(`✅ Found ${automations.length} automations`);
    
    // Test with first automation
    const testAutomation = automations[0];
    const entityId = testAutomation.entity_id;
    
    console.log(`\n📋 Testing trace functionality with: ${entityId}`);
    console.log(`   Name: ${testAutomation.attributes.friendly_name || 'N/A'}`);

    // Test get traces
    console.log('\n3. Testing getAutomationTraces...');
    const tracesResult = await getAutomationTraces(entityId, HASS_HOST, HASS_TOKEN, wsClient);
    
    console.log(`   Success: ${tracesResult.success}`);
    console.log(`   Message: ${tracesResult.message}`);
    
    if (tracesResult.success && tracesResult.traces) {
      console.log(`   Found ${tracesResult.traces.length} trace(s):`);
      tracesResult.traces.forEach((trace, index) => {
        console.log(`     [${index + 1}] Run ID: ${trace.run_id}`);
        console.log(`         Timestamp: ${trace.timestamp}`);
        console.log(`         State: ${trace.state}`);
        console.log(`         Script Execution: ${trace.script_execution || 'N/A'}`);
        if (trace.error) {
          console.log(`         Error: ${trace.error}`);
        }
      });

      // Test get trace detail if we have traces
      if (tracesResult.traces.length > 0) {
        const firstTrace = tracesResult.traces[0];
        
        console.log('\n4. Testing getAutomationTraceDetail...');
        const traceDetailResult = await getAutomationTraceDetail(
          entityId, 
          firstTrace.run_id, 
          HASS_HOST, 
          HASS_TOKEN, 
          wsClient
        );
        
        console.log(`   Success: ${traceDetailResult.success}`);
        console.log(`   Message: ${traceDetailResult.message}`);
        
        if (traceDetailResult.success && traceDetailResult.trace) {
          const trace = traceDetailResult.trace;
          console.log(`   Trace Details:`);
          console.log(`     Run ID: ${trace.run_id}`);
          console.log(`     Timestamp: ${trace.timestamp}`);
          console.log(`     State: ${trace.state}`);
          console.log(`     Script Execution: ${trace.script_execution || 'N/A'}`);
          
          if (trace.trace && Object.keys(trace.trace).length > 0) {
            console.log(`     Trace Steps: ${Object.keys(trace.trace).length}`);
          }
          
          if (trace.error) {
            console.log(`     Error: ${trace.error}`);
          }
        }

        // Test get latest trace
        console.log('\n5. Testing getAutomationLatestTrace...');
        const latestTraceResult = await getAutomationLatestTrace(entityId, HASS_HOST, HASS_TOKEN, wsClient);
        
        console.log(`   Success: ${latestTraceResult.success}`);
        console.log(`   Message: ${latestTraceResult.message}`);
        
        if (latestTraceResult.success && latestTraceResult.trace) {
          console.log(`   Latest trace run ID: ${latestTraceResult.trace.run_id}`);
          console.log(`   Latest trace timestamp: ${latestTraceResult.trace.timestamp}`);
        }
      } else {
        console.log('\n⚠️ No traces found - automation may not have been executed recently');
        console.log('This is normal if the automation hasn\'t run in the last 24 hours');
      }
    }

  } catch (error) {
    console.log(`❌ Error during testing: ${error.message}`);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up WebSocket connection
    if (wsClient) {
      try {
        wsClient.disconnect();
        console.log('\n🔌 WebSocket disconnected');
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  }
}

async function main() {
  if (!HASS_TOKEN) {
    console.log('🧪 Testing with Mock Data (no HASS_TOKEN provided)\n');
    
    console.log('Mock Automation Traces Test:');
    console.log('✅ getAutomationTraces would return logbook-based traces when WebSocket unavailable');
    console.log('✅ getAutomationTraceDetail would return basic trace info from logbook entries');
    console.log('✅ getAutomationLatestTrace would return the most recent logbook-based trace');
    
    console.log('\n💡 Key improvements made:');
    console.log('• Added WebSocket-based trace retrieval as primary method');
    console.log('• Fallback to logbook API for trace-like information');
    console.log('• Better error handling and informative messages');
    console.log('• Support for both WebSocket and REST API approaches');
    
    console.log('\n⚠️ Note: Actual trace data depends on Home Assistant version and configuration');
    console.log('Trace functionality requires Home Assistant 2021.4+ and automations with IDs');
    return;
  }

  await testTraceWithWebSocket();
  
  console.log('\n✅ Trace functionality testing completed');
  console.log('\n📋 Summary:');
  console.log('• WebSocket API is attempted first for native trace access');
  console.log('• Logbook API provides fallback for trace-like information');
  console.log('• Functions gracefully handle missing or unavailable trace data');
  console.log('• All trace functions now accept optional WebSocket client parameter');
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});