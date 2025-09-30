#!/usr/bin/env node

// Test script to verify automation trace functionality
import { 
  getAutomationTraces,
  getAutomationTraceDetail,
  getAutomationLatestTrace,
  getActualAutomationId
} from './src/utils/automation-helpers.js';

const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN;

async function testAutomationTraces() {
  if (!HASS_TOKEN) {
    console.log('❌ No HASS_TOKEN environment variable found');
    return;
  }

  console.log('🔍 Testing Home Assistant Automation Trace Functionality\n');
  console.log(`Host: ${HASS_HOST}`);
  console.log(`Token: ${HASS_TOKEN.substring(0, 20)}...`);

  // Test with different automation ID formats
  const testAutomationIds = [
    'automation.morning_routine',
    'morning_routine',
    '1', // numeric ID
    'automation.test_automation'
  ];

  for (const automationId of testAutomationIds) {
    console.log(`\n📋 Testing automation: ${automationId}`);
    console.log('=' .repeat(50));

    // Test 1: Get actual automation ID (prerequisite for traces)
    console.log('\n1. Testing automation ID resolution...');
    try {
      const idResult = await getActualAutomationId(automationId, HASS_HOST, HASS_TOKEN);
      console.log(`   Success: ${idResult.success}`);
      console.log(`   Message: ${idResult.message}`);
      if (idResult.success) {
        console.log(`   Internal ID: ${idResult.internal_id}`);
        console.log(`   Entity ID: ${idResult.entity_id}`);
      }

      if (!idResult.success) {
        console.log('   ⚠️ Skipping trace tests - automation not found');
        continue;
      }

      // Test 2: Get automation traces list
      console.log('\n2. Testing automation traces list...');
      const tracesResult = await getAutomationTraces(automationId, HASS_HOST, HASS_TOKEN);
      console.log(`   Success: ${tracesResult.success}`);
      console.log(`   Message: ${tracesResult.message}`);
      
      if (tracesResult.success && tracesResult.traces) {
        console.log(`   Found ${tracesResult.traces.length} trace(s):`);
        tracesResult.traces.forEach((trace, index) => {
          console.log(`     [${index + 1}] Run ID: ${trace.run_id}`);
          console.log(`         Timestamp: ${trace.timestamp}`);
          console.log(`         State: ${trace.state}`);
          console.log(`         Script Execution: ${trace.script_execution || 'N/A'}`);
          console.log(`         Error: ${trace.error || 'None'}`);
        });

        // Test 3: Get specific trace detail (if traces exist)
        if (tracesResult.traces.length > 0) {
          const firstTrace = tracesResult.traces[0];
          
          console.log('\n3. Testing trace detail retrieval...');
          const traceDetailResult = await getAutomationTraceDetail(
            automationId, 
            firstTrace.run_id, 
            HASS_HOST, 
            HASS_TOKEN
          );
          
          console.log(`   Success: ${traceDetailResult.success}`);
          console.log(`   Message: ${traceDetailResult.message}`);
          
          if (traceDetailResult.success && traceDetailResult.trace) {
            const trace = traceDetailResult.trace;
            console.log(`   Trace Details:`);
            console.log(`     Run ID: ${trace.run_id}`);
            console.log(`     Automation ID: ${trace.automation_id}`);
            console.log(`     Timestamp: ${trace.timestamp}`);
            console.log(`     State: ${trace.state}`);
            console.log(`     Context ID: ${trace.context.id}`);
            
            if (trace.trigger) {
              console.log(`     Trigger: ${JSON.stringify(trace.trigger, null, 2).substring(0, 200)}...`);
            }
            
            if (trace.variables && Object.keys(trace.variables).length > 0) {
              console.log(`     Variables: ${Object.keys(trace.variables).join(', ')}`);
            }
            
            if (trace.trace && Object.keys(trace.trace).length > 0) {
              console.log(`     Trace Steps: ${Object.keys(trace.trace).length} step(s)`);
              Object.keys(trace.trace).forEach((stepPath, index) => {
                console.log(`       [${index + 1}] ${stepPath}: ${trace.trace[stepPath].length} substep(s)`);
              });
            }
            
            if (trace.error) {
              console.log(`     Error: ${trace.error}`);
            }
          } else {
            console.log(`   ❌ Failed to get trace detail: ${traceDetailResult.message}`);
          }

          // Test 4: Get latest trace (convenience function)
          console.log('\n4. Testing latest trace retrieval...');
          const latestTraceResult = await getAutomationLatestTrace(automationId, HASS_HOST, HASS_TOKEN);
          console.log(`   Success: ${latestTraceResult.success}`);
          console.log(`   Message: ${latestTraceResult.message}`);
          
          if (latestTraceResult.success && latestTraceResult.trace) {
            console.log(`   Latest trace run ID: ${latestTraceResult.trace.run_id}`);
            console.log(`   Latest trace timestamp: ${latestTraceResult.trace.timestamp}`);
          }
        } else {
          console.log('   ⚠️ No traces found - automation may not have been executed recently');
        }
      } else {
        console.log(`   ❌ Failed to get traces: ${tracesResult.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Error during testing: ${error.message}`);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Mock data for testing without a live Home Assistant instance
function testMockTraceData() {
  console.log('\n🧪 Testing with Mock Data\n');
  console.log('Mock Automation Trace List:');
  
  const mockTraces = [
    {
      run_id: 'mock-run-001',
      timestamp: '2024-01-15T10:30:00Z',
      state: 'stopped',
      script_execution: 'finished',
      last_step: 'action/0',
      error: null
    },
    {
      run_id: 'mock-run-002',
      timestamp: '2024-01-15T10:15:00Z',
      state: 'stopped',
      script_execution: 'finished',
      last_step: 'action/1',
      error: null
    }
  ];

  mockTraces.forEach((trace, index) => {
    console.log(`[${index + 1}] Run ID: ${trace.run_id}`);
    console.log(`    Timestamp: ${trace.timestamp}`);
    console.log(`    State: ${trace.state}`);
    console.log(`    Script Execution: ${trace.script_execution}`);
    console.log(`    Last Step: ${trace.last_step}`);
    console.log(`    Error: ${trace.error || 'None'}`);
    console.log('');
  });

  console.log('Mock Automation Trace Detail:');
  const mockTraceDetail = {
    run_id: 'mock-run-001',
    automation_id: 'morning_routine',
    timestamp: '2024-01-15T10:30:00Z',
    trigger: {
      platform: 'time',
      at: '07:00:00'
    },
    variables: {
      trigger: {
        platform: 'time',
        now: '2024-01-15T10:30:00Z'
      }
    },
    config: {
      alias: 'Morning Routine',
      mode: 'single'
    },
    context: {
      id: 'context-123',
      user_id: null
    },
    state: 'stopped',
    script_execution: 'finished',
    trace: {
      'trigger/0': [
        {
          path: 'trigger/0',
          timestamp: '2024-01-15T10:30:00.000Z',
          changed_variables: {
            trigger: {
              platform: 'time',
              now: '2024-01-15T10:30:00Z'
            }
          }
        }
      ],
      'action/0': [
        {
          path: 'action/0',
          timestamp: '2024-01-15T10:30:01.000Z',
          result: {
            service: 'light.turn_on',
            entity_id: 'light.living_room'
          }
        }
      ]
    },
    last_step: 'action/0',
    error: null
  };

  console.log(`Run ID: ${mockTraceDetail.run_id}`);
  console.log(`Automation ID: ${mockTraceDetail.automation_id}`);
  console.log(`Timestamp: ${mockTraceDetail.timestamp}`);
  console.log(`State: ${mockTraceDetail.state}`);
  console.log(`Script Execution: ${mockTraceDetail.script_execution}`);
  console.log(`Trigger: ${JSON.stringify(mockTraceDetail.trigger, null, 2)}`);
  console.log(`Variables: ${Object.keys(mockTraceDetail.variables).join(', ')}`);
  console.log(`Trace Steps: ${Object.keys(mockTraceDetail.trace).length}`);
  
  Object.keys(mockTraceDetail.trace).forEach((stepPath, index) => {
    console.log(`  [${index + 1}] ${stepPath}: ${mockTraceDetail.trace[stepPath].length} substep(s)`);
    mockTraceDetail.trace[stepPath].forEach((substep, subIndex) => {
      console.log(`      [${subIndex + 1}] ${substep.timestamp}`);
      if (substep.changed_variables) {
        console.log(`          Changed variables: ${Object.keys(substep.changed_variables).join(', ')}`);
      }
      if (substep.result) {
        console.log(`          Result: ${JSON.stringify(substep.result)}`);
      }
    });
  });
}

// Main execution
async function main() {
  // Test with mock data first
  testMockTraceData();
  
  // Test with real Home Assistant if token is available
  if (HASS_TOKEN) {
    await testAutomationTraces();
  } else {
    console.log('\n⚠️ Skipping live Home Assistant tests - no HASS_TOKEN provided');
    console.log('Set HASS_HOST and HASS_TOKEN environment variables to test with real Home Assistant');
  }
  
  console.log('\n✅ Automation trace testing completed');
}

// Run the test if this is the main module  
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

export {
  testAutomationTraces,
  testMockTraceData
};