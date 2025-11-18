#!/usr/bin/env node

/**
 * Test script for Home Assistant Helper Management Tool
 * Tests: create, list, get, update, delete operations for all helper types
 */

const HASS_URL = process.env.HASS_URL || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN;

if (!HASS_TOKEN) {
  console.error('❌ Error: HASS_TOKEN environment variable is required');
  process.exit(1);
}

async function callMCP(tool, params) {
  const { MCPClient } = await import('./dist/client.js');
  const client = new MCPClient(HASS_URL, HASS_TOKEN);
  
  try {
    await client.connect();
    const result = await client.callTool(tool, params);
    return result;
  } finally {
    await client.disconnect();
  }
}

async function testHelperManagement() {
  console.log('🧪 Testing Home Assistant Helper Management\n');

  // Test 1: List all helpers
  console.log('Test 1: List all helpers');
  const listAll = await callMCP('manage_helpers', { action: 'list' });
  console.log(`✅ Found ${listAll.total_helpers} total helpers`);
  console.log(`   Types: ${Object.keys(listAll.helpers_by_type).join(', ')}`);
  console.log();

  // Test 2: List specific helper type (input_boolean)
  console.log('Test 2: List input_boolean helpers');
  const listBoolean = await callMCP('manage_helpers', { 
    action: 'list', 
    helper_type: 'input_boolean' 
  });
  console.log(`✅ Found ${listBoolean.total_helpers} input_boolean helpers`);
  console.log();

  // Test 3: Create input_boolean
  console.log('Test 3: Create input_boolean helper');
  const createBoolean = await callMCP('manage_helpers', {
    action: 'create',
    helper_type: 'input_boolean',
    name: 'Test Boolean',
    icon: 'mdi:toggle-switch',
    initial: false
  });
  console.log(`✅ ${createBoolean.message}`);
  console.log(`   Entity: ${createBoolean.entity_id}`);
  const booleanEntityId = createBoolean.entity_id;
  console.log();

  // Test 4: Create input_number
  console.log('Test 4: Create input_number helper');
  const createNumber = await callMCP('manage_helpers', {
    action: 'create',
    helper_type: 'input_number',
    name: 'Test Temperature',
    icon: 'mdi:thermometer',
    min: 15,
    max: 30,
    step: 0.5,
    mode: 'slider',
    unit_of_measurement: '°C'
  });
  console.log(`✅ ${createNumber.message}`);
  console.log(`   Entity: ${createNumber.entity_id}`);
  const numberEntityId = createNumber.entity_id;
  console.log();

  // Test 5: Create input_text
  console.log('Test 5: Create input_text helper');
  const createText = await callMCP('manage_helpers', {
    action: 'create',
    helper_type: 'input_text',
    name: 'Test Name',
    icon: 'mdi:form-textbox',
    min_length: 3,
    max_length: 50,
    text_mode: 'text'
  });
  console.log(`✅ ${createText.message}`);
  console.log(`   Entity: ${createText.entity_id}`);
  const textEntityId = createText.entity_id;
  console.log();

  // Test 6: Create input_select
  console.log('Test 6: Create input_select helper');
  const createSelect = await callMCP('manage_helpers', {
    action: 'create',
    helper_type: 'input_select',
    name: 'Test Mode',
    icon: 'mdi:form-dropdown',
    options: ['Home', 'Away', 'Sleep', 'Vacation']
  });
  console.log(`✅ ${createSelect.message}`);
  console.log(`   Entity: ${createSelect.entity_id}`);
  const selectEntityId = createSelect.entity_id;
  console.log();

  // Test 7: Create input_datetime
  console.log('Test 7: Create input_datetime helper');
  const createDateTime = await callMCP('manage_helpers', {
    action: 'create',
    helper_type: 'input_datetime',
    name: 'Test Alarm Time',
    icon: 'mdi:clock-outline',
    has_date: true,
    has_time: true
  });
  console.log(`✅ ${createDateTime.message}`);
  console.log(`   Entity: ${createDateTime.entity_id}`);
  const datetimeEntityId = createDateTime.entity_id;
  console.log();

  // Test 8: Create counter
  console.log('Test 8: Create counter helper');
  const createCounter = await callMCP('manage_helpers', {
    action: 'create',
    helper_type: 'counter',
    name: 'Test Counter',
    icon: 'mdi:counter',
    counter_initial: 0,
    counter_step: 1,
    counter_minimum: 0,
    counter_maximum: 100
  });
  console.log(`✅ ${createCounter.message}`);
  console.log(`   Entity: ${createCounter.entity_id}`);
  const counterEntityId = createCounter.entity_id;
  console.log();

  // Test 9: Create timer
  console.log('Test 9: Create timer helper');
  const createTimer = await callMCP('manage_helpers', {
    action: 'create',
    helper_type: 'timer',
    name: 'Test Timer',
    icon: 'mdi:timer',
    duration: '00:05:00'
  });
  console.log(`✅ ${createTimer.message}`);
  console.log(`   Entity: ${createTimer.entity_id}`);
  const timerEntityId = createTimer.entity_id;
  console.log();

  // Wait a moment for helpers to be fully created
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 10: Get specific helper
  console.log('Test 10: Get specific helper details');
  const getHelper = await callMCP('manage_helpers', {
    action: 'get',
    entity_id: numberEntityId
  });
  console.log(`✅ Retrieved helper: ${getHelper.helper.name}`);
  console.log(`   State: ${getHelper.helper.state}`);
  console.log(`   Type: ${getHelper.helper.type}`);
  console.log();

  // Test 11: Update helper
  console.log('Test 11: Update input_number helper');
  const updateHelper = await callMCP('manage_helpers', {
    action: 'update',
    entity_id: numberEntityId,
    name: 'Updated Temperature',
    min: 10,
    max: 35
  });
  console.log(`✅ ${updateHelper.message}`);
  console.log(`   Updated fields: ${updateHelper.updated_fields.join(', ')}`);
  console.log();

  // Test 12: Delete helpers (cleanup)
  console.log('Test 12: Delete test helpers (cleanup)');
  const entitiesToDelete = [
    booleanEntityId,
    numberEntityId,
    textEntityId,
    selectEntityId,
    datetimeEntityId,
    counterEntityId,
    timerEntityId
  ];

  for (const entityId of entitiesToDelete) {
    try {
      const deleteResult = await callMCP('manage_helpers', {
        action: 'delete',
        entity_id: entityId
      });
      console.log(`✅ Deleted: ${entityId}`);
    } catch (error) {
      console.log(`⚠️  Could not delete ${entityId}: ${error.message}`);
    }
  }
  console.log();

  // Test 13: Verify deletion
  console.log('Test 13: Verify helpers were deleted');
  const finalList = await callMCP('manage_helpers', { action: 'list' });
  console.log(`✅ Final helper count: ${finalList.total_helpers}`);
  console.log();

  console.log('✅ All tests completed!');
}

// Run tests
testHelperManagement().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
