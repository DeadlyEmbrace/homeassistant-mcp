#!/usr/bin/env node

/**
 * Test script to verify the enhanced Home Assistant action validation
 * This tests that delay actions and other special action types are properly validated
 */

import { validateAutomationConfig } from './dist/src/utils/automation-helpers.js';
import assert from 'assert';

// Test configurations with various action types
const testConfigurations = {
  // Configuration with delay action (should pass)
  delayAction: {
    alias: 'Test Delay Action',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.front_door' }],
    action: [
      { delay: '00:15:00' },
      { service: 'light.turn_on', target: { entity_id: 'light.living_room' } }
    ]
  },

  // Configuration with wait_template action (should pass)
  waitTemplateAction: {
    alias: 'Test Wait Template Action',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.motion' }],
    action: [
      { wait_template: "{{ is_state('light.living_room', 'off') }}" },
      { service: 'light.turn_on', target: { entity_id: 'light.living_room' } }
    ]
  },

  // Configuration with condition action (should pass)
  conditionAction: {
    alias: 'Test Condition Action',
    trigger: [{ platform: 'time', at: '06:00:00' }],
    action: [
      { condition: 'state', entity_id: 'input_boolean.vacation_mode', state: 'off' },
      { service: 'light.turn_on', target: { entity_id: 'light.bedroom' } }
    ]
  },

  // Configuration with choose action (should pass)
  chooseAction: {
    alias: 'Test Choose Action',
    trigger: [{ platform: 'state', entity_id: 'sensor.weather' }],
    action: [
      {
        choose: [
          {
            conditions: [{ condition: 'state', entity_id: 'sensor.weather', state: 'sunny' }],
            sequence: [{ service: 'light.turn_off', target: { entity_id: 'light.living_room' } }]
          }
        ],
        default: [{ service: 'light.turn_on', target: { entity_id: 'light.living_room' } }]
      }
    ]
  },

  // Configuration with repeat action (should pass)
  repeatAction: {
    alias: 'Test Repeat Action',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.doorbell' }],
    action: [
      {
        repeat: {
          count: 3,
          sequence: [
            { service: 'light.toggle', target: { entity_id: 'light.porch' } },
            { delay: '00:00:01' }
          ]
        }
      }
    ]
  },

  // Configuration with stop action (should pass)
  stopAction: {
    alias: 'Test Stop Action',
    trigger: [{ platform: 'state', entity_id: 'input_boolean.security_mode' }],
    action: [
      { condition: 'state', entity_id: 'input_boolean.security_mode', state: 'off' },
      { stop: 'Security mode is disabled' }
    ]
  },

  // Configuration with scene action (should pass)
  sceneAction: {
    alias: 'Test Scene Action',
    trigger: [{ platform: 'time', at: '20:00:00' }],
    action: [
      { scene: 'scene.movie_night' }
    ]
  },

  // Configuration with event action (should pass)
  eventAction: {
    alias: 'Test Event Action',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.motion' }],
    action: [
      { event: 'custom_motion_detected', event_data: { location: 'living_room' } }
    ]
  },

  // Configuration with parallel action (should pass)
  parallelAction: {
    alias: 'Test Parallel Action',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.alarm' }],
    action: [
      {
        parallel: [
          { service: 'light.turn_on', target: { entity_id: 'light.all' } },
          { service: 'notify.mobile_app', data: { message: 'Alarm triggered!' } }
        ]
      }
    ]
  },

  // Configuration with variables action (should pass)
  variablesAction: {
    alias: 'Test Variables Action',
    trigger: [{ platform: 'state', entity_id: 'sensor.temperature' }],
    action: [
      { variables: { temp_threshold: 25 } },
      { condition: 'template', value_template: '{{ states("sensor.temperature") | float > temp_threshold }}' },
      { service: 'climate.set_temperature', target: { entity_id: 'climate.living_room' }, data: { temperature: 22 } }
    ]
  },

  // Configuration with mixed action types (should pass)
  mixedActions: {
    alias: 'Test Mixed Actions',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.door' }],
    action: [
      { delay: '00:00:05' },
      { condition: 'state', entity_id: 'binary_sensor.door', state: 'on' },
      { service: 'light.turn_on', target: { entity_id: 'light.hallway' } },
      { wait_template: "{{ is_state('light.hallway', 'on') }}" },
      { event: 'door_opened', event_data: { timestamp: '{{ now() }}' } }
    ]
  },

  // Invalid configuration (should fail)
  invalidAction: {
    alias: 'Test Invalid Action',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.test' }],
    action: [
      { invalid_field: 'this should fail' } // This should be rejected
    ]
  }
};

/**
 * Test delay action validation
 */
function testDelayActionValidation() {
  console.log('🔍 Testing delay action validation...');
  
  const result = validateAutomationConfig(testConfigurations.delayAction);
  assert.strictEqual(result.valid, true, 'Delay action should be valid');
  assert.strictEqual(result.errors.length, 0, 'Delay action should have no errors');
  console.log('  ✅ Delay action validation passed');
}

/**
 * Test wait_template action validation
 */
function testWaitTemplateActionValidation() {
  console.log('🔍 Testing wait_template action validation...');
  
  const result = validateAutomationConfig(testConfigurations.waitTemplateAction);
  assert.strictEqual(result.valid, true, 'Wait template action should be valid');
  assert.strictEqual(result.errors.length, 0, 'Wait template action should have no errors');
  console.log('  ✅ Wait template action validation passed');
}

/**
 * Test condition action validation
 */
function testConditionActionValidation() {
  console.log('🔍 Testing condition action validation...');
  
  const result = validateAutomationConfig(testConfigurations.conditionAction);
  assert.strictEqual(result.valid, true, 'Condition action should be valid');
  assert.strictEqual(result.errors.length, 0, 'Condition action should have no errors');
  console.log('  ✅ Condition action validation passed');
}

/**
 * Test choose action validation
 */
function testChooseActionValidation() {
  console.log('🔍 Testing choose action validation...');
  
  const result = validateAutomationConfig(testConfigurations.chooseAction);
  assert.strictEqual(result.valid, true, 'Choose action should be valid');
  assert.strictEqual(result.errors.length, 0, 'Choose action should have no errors');
  console.log('  ✅ Choose action validation passed');
}

/**
 * Test repeat action validation
 */
function testRepeatActionValidation() {
  console.log('🔍 Testing repeat action validation...');
  
  const result = validateAutomationConfig(testConfigurations.repeatAction);
  assert.strictEqual(result.valid, true, 'Repeat action should be valid');
  assert.strictEqual(result.errors.length, 0, 'Repeat action should have no errors');
  console.log('  ✅ Repeat action validation passed');
}

/**
 * Test all special action types
 */
function testAllSpecialActionTypes() {
  console.log('🔍 Testing all special action types...');
  
  const actionTypes = ['stopAction', 'sceneAction', 'eventAction', 'parallelAction', 'variablesAction'];
  
  actionTypes.forEach(actionType => {
    const result = validateAutomationConfig(testConfigurations[actionType]);
    assert.strictEqual(result.valid, true, `${actionType} should be valid`);
    assert.strictEqual(result.errors.length, 0, `${actionType} should have no errors`);
    console.log(`  ✅ ${actionType} validation passed`);
  });
}

/**
 * Test mixed action types
 */
function testMixedActionTypes() {
  console.log('🔍 Testing mixed action types...');
  
  const result = validateAutomationConfig(testConfigurations.mixedActions);
  assert.strictEqual(result.valid, true, 'Mixed actions should be valid');
  assert.strictEqual(result.errors.length, 0, 'Mixed actions should have no errors');
  console.log('  ✅ Mixed actions validation passed');
  console.log(`     Actions validated: delay, condition, service, wait_template, event`);
}

/**
 * Test invalid action rejection
 */
function testInvalidActionRejection() {
  console.log('🔍 Testing invalid action rejection...');
  
  const result = validateAutomationConfig(testConfigurations.invalidAction);
  assert.strictEqual(result.valid, false, 'Invalid action should be rejected');
  assert(result.errors.length > 0, 'Invalid action should have errors');
  assert(result.errors.some(error => error.includes('missing \'service\' or \'action\' field')), 
    'Should report missing service/action field');
  console.log('  ✅ Invalid action properly rejected');
  console.log(`     Error: ${result.errors[0]}`);
}

/**
 * Test the original problem case
 */
function testOriginalProblemCase() {
  console.log('🔍 Testing original problem case (delay action)...');
  
  // This is similar to the configuration that was failing before
  const problemConfig = {
    alias: 'Front Porch Light',
    trigger: [{ platform: 'state', entity_id: 'binary_sensor.front_door', to: 'on' }],
    action: [
      { service: 'light.turn_on', target: { entity_id: 'light.front_porch' } },
      { delay: '00:15:00' }, // This was causing the error
      { service: 'light.turn_off', target: { entity_id: 'light.front_porch' } }
    ]
  };
  
  const result = validateAutomationConfig(problemConfig);
  assert.strictEqual(result.valid, true, 'Original problem case should now be valid');
  assert.strictEqual(result.errors.length, 0, 'Original problem case should have no errors');
  console.log('  ✅ Original problem case now passes validation');
  console.log('     Fixed: Delay actions are now properly recognized');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🚀 Starting Home Assistant action validation tests...\n');
  
  try {
    testDelayActionValidation();
    testWaitTemplateActionValidation();
    testConditionActionValidation();
    testChooseActionValidation();
    testRepeatActionValidation();
    testAllSpecialActionTypes();
    testMixedActionTypes();
    testInvalidActionRejection();
    testOriginalProblemCase();
    
    console.log('\n🎉 All Home Assistant action validation tests passed!');
    console.log('\n📋 Validation Improvements Summary:');
    console.log('• ✅ Delay actions: {"delay": "00:15:00"}');
    console.log('• ✅ Wait template actions: {"wait_template": "{{ ... }}"}');
    console.log('• ✅ Condition actions: {"condition": "state", ...}');
    console.log('• ✅ Choose actions: {"choose": [...]}');
    console.log('• ✅ Repeat actions: {"repeat": {...}}');
    console.log('• ✅ Stop actions: {"stop": "message"}');
    console.log('• ✅ Scene actions: {"scene": "scene.name"}');
    console.log('• ✅ Event actions: {"event": "event_name"}');
    console.log('• ✅ Parallel actions: {"parallel": [...]}');
    console.log('• ✅ Variables actions: {"variables": {...}}');
    console.log('• ✅ Mixed action sequences');
    console.log('• ✅ Invalid actions still properly rejected');
    
    console.log('\n🔧 The MCP validator is now compatible with all Home Assistant action types!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();