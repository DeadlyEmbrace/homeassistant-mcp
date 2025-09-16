#!/usr/bin/env node

/**
 * Test Area Assignment Fix
 * Tests the fixed area assignment functionality using WebSocket instead of REST API
 */

import fs from 'fs';

// Configuration
const MCP_HOST = 'http://localhost:3000';
const TEST_AUTOMATION_ENTITY = 'automation.sleep_lights_enhanced_motion_bedside_only';
const TEST_AREA = 'bedroom';

async function makeRequest(path, body = null) {
  const url = `${MCP_HOST}${path}`;
  const options = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testAreaAssignmentFix() {
  console.log('🔧 Testing Fixed Area Assignment Functionality\n');

  console.log('🎯 Testing the exact case that was failing:');
  console.log(`Entity: ${TEST_AUTOMATION_ENTITY}`);
  console.log(`Area: ${TEST_AREA}`);
  console.log(`Verify Area Exists: true\n`);

  // Test the area assignment that was failing
  console.log('1️⃣ Testing Area Assignment with WebSocket Fix');
  const assignResult = await makeRequest('/tools/assign_device_area/invoke', {
    arguments: {
      entity_id: TEST_AUTOMATION_ENTITY,
      area_id: TEST_AREA,
      verify_area_exists: true
    }
  });

  if (assignResult.success) {
    console.log('✅ Area assignment request successful!');
    
    try {
      const response = JSON.parse(assignResult.data.content[0].text);
      console.log('📊 Assignment result:', response.success ? 'SUCCESS' : 'FAILED');
      console.log('📝 Message:', response.message);
      console.log('🔍 Entity ID:', response.entity_id);
      console.log('🏠 Area ID:', response.area_id);
      
      if (response.entity_type) {
        console.log('📱 Entity Type:', response.entity_type);
      }
      
      if (response.device_id) {
        console.log('🔌 Device ID:', response.device_id);
      }
      
      if (response.current_area_id) {
        console.log('📍 Current Area:', response.current_area_id);
      }
      
      // Check what type of update was performed
      if (response.success) {
        if (response.entity_type === 'standalone_entity') {
          console.log('✨ Update Type: Entity area assignment (automation/script/etc.)');
        } else if (response.entity_type === 'device_entity') {
          console.log('✨ Update Type: Device area assignment (physical device)');
        }
      }
      
    } catch (parseError) {
      console.log('ℹ️ Raw response:', assignResult.data.content[0].text);
    }
  } else {
    console.log('❌ Area assignment request failed:', assignResult.error || assignResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test different scenarios
  console.log('2️⃣ Testing Other Area Assignment Scenarios');
  
  // Test with a non-existent entity
  console.log('\n🔍 Testing non-existent entity:');
  const nonExistentResult = await makeRequest('/tools/assign_device_area/invoke', {
    arguments: {
      entity_id: 'automation.non_existent_automation',
      area_id: TEST_AREA,
      verify_area_exists: true
    }
  });

  if (nonExistentResult.success) {
    try {
      const response = JSON.parse(nonExistentResult.data.content[0].text);
      console.log('📊 Non-existent entity result:', response.success ? 'SUCCESS' : 'FAILED');
      console.log('📝 Message:', response.message);
    } catch (parseError) {
      console.log('ℹ️ Raw response:', nonExistentResult.data.content[0].text);
    }
  } else {
    console.log('❌ Non-existent entity test failed:', nonExistentResult.error);
  }

  // Test with a non-existent area
  console.log('\n🔍 Testing non-existent area:');
  const nonExistentAreaResult = await makeRequest('/tools/assign_device_area/invoke', {
    arguments: {
      entity_id: TEST_AUTOMATION_ENTITY,
      area_id: 'non_existent_area',
      verify_area_exists: true
    }
  });

  if (nonExistentAreaResult.success) {
    try {
      const response = JSON.parse(nonExistentAreaResult.data.content[0].text);
      console.log('📊 Non-existent area result:', response.success ? 'SUCCESS' : 'FAILED');
      console.log('📝 Message:', response.message);
    } catch (parseError) {
      console.log('ℹ️ Raw response:', nonExistentAreaResult.data.content[0].text);
    }
  } else {
    console.log('❌ Non-existent area test failed:', nonExistentAreaResult.error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  console.log('🔍 Key Improvements Made:');
  console.log('━'.repeat(60));
  console.log('✅ Fixed: Changed from REST API to WebSocket API for registry access');
  console.log('✅ Fixed: Using wsClient.callWS() instead of fetch() for registries');
  console.log('✅ Enhanced: Support for both device entities and standalone entities');
  console.log('✅ Enhanced: Proper entity area assignment for automations/scripts');
  console.log('✅ Enhanced: Better error handling and diagnostics');
  console.log('✅ Enhanced: Clear distinction between entity types');

  console.log('\n📋 What Was Wrong Before:');
  console.log('━'.repeat(60));
  console.log('❌ Used REST API: /api/config/entity_registry (Not Found)');
  console.log('❌ Used REST API: /api/config/device_registry/ID (Limited access)');
  console.log('❌ No fallback for non-device entities (automations, scripts)');
  console.log('❌ Didn\'t check WebSocket client availability');

  console.log('\n📋 What\'s Fixed Now:');
  console.log('━'.repeat(60));
  console.log('✅ Uses WebSocket: config/entity_registry/list');
  console.log('✅ Uses WebSocket: config/entity_registry/update');
  console.log('✅ Uses WebSocket: config/device_registry/update');
  console.log('✅ Handles automations/scripts (standalone entities)');
  console.log('✅ Proper WebSocket client availability check');

  console.log('\n🎯 Area Assignment Fix Test Complete!');
}

// Run the test
testAreaAssignmentFix().catch(console.error);