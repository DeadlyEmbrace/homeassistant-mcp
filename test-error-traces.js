#!/usr/bin/env node

// Test script to demonstrate error trace functionality
import { HassWebSocketClient } from './dist/src/websocket/client.js';
import { 
  getAutomationErrorTraces,
  getFilteredAutomationTraces
} from './dist/src/utils/automation-helpers.js';

const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN;

async function testErrorTraces() {
  if (!HASS_TOKEN) {
    console.log('🧪 Testing Error Trace Functionality (Mock Mode)\n');
    
    console.log('Error Trace Use Cases:');
    console.log('✅ getAutomationErrorTraces() - Find traces with errors');
    console.log('✅ getFilteredAutomationTraces() - Filter by execution status');
    
    console.log('\nExample Error Trace Scenarios:');
    console.log('• script_execution: "failed" - Action failed to execute');
    console.log('• script_execution: "timeout" - Execution timed out'); 
    console.log('• script_execution: "cancelled" - Execution was cancelled');
    console.log('• error field present - Explicit error message');
    
    console.log('\nFiltering Options:');
    console.log('• has_error: true/false - Presence of errors');
    console.log('• script_execution: finished|failed|timeout|cancelled');
    console.log('• state: running|stopped|debugged');
    console.log('• since: ISO timestamp for time filtering');
    console.log('• limit: Maximum number of results');
    
    console.log('\n💡 Set HASS_HOST and HASS_TOKEN to test with real Home Assistant');
    return;
  }

  console.log('🔍 Testing Error Trace Functionality with Live Home Assistant\n');
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
    
    // Test with first few automations to increase chance of finding errors
    const testAutomations = automations.slice(0, Math.min(3, automations.length));
    
    for (const automation of testAutomations) {
      const entityId = automation.entity_id;
      
      console.log(`\n📋 Testing error traces for: ${entityId}`);
      console.log(`   Name: ${automation.attributes.friendly_name || 'N/A'}`);

      // Test 1: Get error traces
      console.log('\n   🔍 Testing getAutomationErrorTraces...');
      const errorTracesResult = await getAutomationErrorTraces(
        entityId, 
        HASS_HOST, 
        HASS_TOKEN, 
        wsClient
      );
      
      console.log(`     Success: ${errorTracesResult.success}`);
      console.log(`     Message: ${errorTracesResult.message}`);
      console.log(`     Total traces: ${errorTracesResult.total_traces || 0}`);
      console.log(`     Error traces: ${errorTracesResult.error_count || 0}`);
      
      if (errorTracesResult.success && errorTracesResult.error_traces && errorTracesResult.error_traces.length > 0) {
        console.log(`     ⚠️ Found ${errorTracesResult.error_traces.length} error trace(s):`);
        errorTracesResult.error_traces.forEach((trace, index) => {
          console.log(`       [${index + 1}] Run ID: ${trace.run_id}`);
          console.log(`           Timestamp: ${trace.timestamp}`);
          console.log(`           State: ${trace.state}`);
          console.log(`           Script Execution: ${trace.script_execution || 'N/A'}`);
          console.log(`           Error: ${trace.error || 'No explicit error message'}`);
        });
      } else if (errorTracesResult.success) {
        console.log(`     ✅ No error traces found - automation appears to be running successfully`);
      }

      // Test 2: Get filtered traces (failed executions)
      console.log('\n   🔍 Testing filtered traces (failed executions)...');
      const failedTracesResult = await getFilteredAutomationTraces(
        entityId,
        { 
          script_execution: 'failed',
          limit: 5 
        },
        HASS_HOST,
        HASS_TOKEN,
        wsClient
      );
      
      console.log(`     Success: ${failedTracesResult.success}`);
      console.log(`     Message: ${failedTracesResult.message}`);
      
      if (failedTracesResult.success && failedTracesResult.traces && failedTracesResult.traces.length > 0) {
        console.log(`     ❌ Found ${failedTracesResult.traces.length} failed execution(s)`);
      }

      // Test 3: Get recent traces with errors (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      console.log('\n   🔍 Testing recent error traces (last 24 hours)...');
      const recentErrorsResult = await getFilteredAutomationTraces(
        entityId,
        {
          has_error: true,
          since: yesterday,
          limit: 10
        },
        HASS_HOST,
        HASS_TOKEN,
        wsClient
      );
      
      console.log(`     Success: ${recentErrorsResult.success}`);
      console.log(`     Message: ${recentErrorsResult.message}`);
      
      if (recentErrorsResult.success && recentErrorsResult.traces && recentErrorsResult.traces.length > 0) {
        console.log(`     ⚠️ Found ${recentErrorsResult.traces.length} recent error(s)`);
        recentErrorsResult.traces.forEach((trace, index) => {
          console.log(`       [${index + 1}] ${trace.timestamp}: ${trace.error || trace.script_execution || 'Unknown error'}`);
        });
      }

      // If we found any errors, break early to focus on them
      if ((errorTracesResult.error_count && errorTracesResult.error_count > 0) ||
          (failedTracesResult.traces && failedTracesResult.traces.length > 0) ||
          (recentErrorsResult.traces && recentErrorsResult.traces.length > 0)) {
        console.log(`\n   🎯 Found errors in ${entityId}, focusing on this automation for detailed analysis`);
        break;
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

async function demonstrateErrorTraceUseCases() {
  console.log('\n📚 Error Trace Use Cases and Examples\n');
  
  console.log('1. 🚨 Finding Failed Automations');
  console.log('   Use: getAutomationErrorTraces(automationId, ...)');
  console.log('   Returns: Only traces that encountered errors');
  console.log('   Benefits: Quick identification of problematic executions\n');
  
  console.log('2. 🔍 Debugging Specific Failure Types');
  console.log('   Use: getFilteredAutomationTraces(automationId, { script_execution: "failed" })');
  console.log('   Returns: Traces filtered by execution status');
  console.log('   Benefits: Focus on specific types of failures\n');
  
  console.log('3. 📊 Error Pattern Analysis');
  console.log('   Use: getFilteredAutomationTraces(automationId, { has_error: true, limit: 50 })');
  console.log('   Returns: Recent error history for pattern analysis');
  console.log('   Benefits: Identify recurring issues and trends\n');
  
  console.log('4. ⏰ Time-Based Error Investigation');
  console.log('   Use: getFilteredAutomationTraces(automationId, { has_error: true, since: "2024-01-01T00:00:00Z" })');
  console.log('   Returns: Errors since specific timestamp');
  console.log('   Benefits: Correlate errors with system changes\n');
  
  console.log('5. 🎯 Timeout and Cancellation Analysis');  
  console.log('   Use: getFilteredAutomationTraces(automationId, { script_execution: "timeout" })');
  console.log('   Returns: Executions that timed out');
  console.log('   Benefits: Identify performance issues and bottlenecks\n');
  
  console.log('MCP Action Examples:');
  console.log('```json');
  console.log('{');
  console.log('  "tool": "automation",');
  console.log('  "action": "get_error_traces",');
  console.log('  "automation_id": "automation.morning_routine"');
  console.log('}');
  console.log('```\n');
  
  console.log('```json');
  console.log('{');
  console.log('  "tool": "automation",');
  console.log('  "action": "get_filtered_traces",');
  console.log('  "automation_id": "automation.morning_routine",');
  console.log('  "filter_has_error": true,');
  console.log('  "filter_limit": 10');
  console.log('}');
  console.log('```');
}

async function main() {
  await testErrorTraces();
  await demonstrateErrorTraceUseCases();
  
  console.log('\n✅ Error trace testing completed');
  console.log('\n🎯 Key Benefits:');
  console.log('• Quickly identify automation failures');
  console.log('• Filter traces by error type and execution status');
  console.log('• Analyze error patterns over time');
  console.log('• Debug timeout and cancellation issues');
  console.log('• Improve automation reliability through error insights');
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});