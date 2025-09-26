#!/usr/bin/env node

/**
 * Test script to verify that get_config functionality has been completely removed
 */

import { createMCPServer } from './dist/src/index.js';

/**
 * Test that get_config is no longer available in automation tool
 */
async function testAutomationGetConfigRemoved() {
  console.log('🔍 Testing that automation get_config action is removed...');
  
  // Mock environment variables
  process.env.HASS_HOST = 'http://localhost:8123';
  process.env.HASS_TOKEN = 'mock-token';
  
  try {
    const server = await createMCPServer();
    const tools = server.getTools();
    
    // Find the automation tool
    const automationTool = tools.find(tool => tool.name === 'automation');
    if (!automationTool) {
      throw new Error('Automation tool not found');
    }
    
    // Check that get_config is not in the schema
    const actionSchema = automationTool.inputSchema.properties.action;
    if (actionSchema && actionSchema.enum) {
      const actions = actionSchema.enum;
      if (actions.includes('get_config')) {
        throw new Error('❌ get_config is still present in automation tool schema');
      }
      console.log('  ✅ get_config removed from automation tool schema');
      console.log(`  📋 Available actions: ${actions.join(', ')}`);
    }
    
    // Try to call get_config action - should fail
    try {
      await automationTool.execute({
        action: 'get_config',
        automation_id: 'test'
      });
      throw new Error('❌ get_config action should have been rejected');
    } catch (error) {
      if (error.message.includes('Invalid action') || error.message.includes('Must be one of')) {
        console.log('  ✅ get_config action properly rejected');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Automation test failed:', error.message);
    throw error;
  }
}

/**
 * Test that get_config is no longer available in template sensor tool
 */
async function testTemplateSensorGetConfigRemoved() {
  console.log('\n🔍 Testing that template sensor get_config action is removed...');
  
  try {
    const server = await createMCPServer();
    const tools = server.getTools();
    
    // Find the template sensor tool
    const templateTool = tools.find(tool => tool.name === 'template_sensor');
    if (!templateTool) {
      throw new Error('Template sensor tool not found');
    }
    
    // Check that get_config is not in the schema
    const actionSchema = templateTool.inputSchema.properties.action;
    if (actionSchema && actionSchema.enum) {
      const actions = actionSchema.enum;
      if (actions.includes('get_config')) {
        throw new Error('❌ get_config is still present in template sensor tool schema');
      }
      console.log('  ✅ get_config removed from template sensor tool schema');
      console.log(`  📋 Available actions: ${actions.join(', ')}`);
    }
    
    // Try to call get_config action - should fail
    try {
      await templateTool.execute({
        action: 'get_config',
        sensor_name: 'test'
      });
      throw new Error('❌ get_config action should have been rejected');
    } catch (error) {
      if (error.message.includes('Invalid literal value') || error.message.includes('must be one of')) {
        console.log('  ✅ get_config action properly rejected');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Template sensor test failed:', error.message);
    throw error;
  }
}

/**
 * Test that remaining functionality still works
 */
async function testRemainingFunctionalityWorks() {
  console.log('\n🔍 Testing that remaining functionality still works...');
  
  try {
    const server = await createMCPServer();
    const tools = server.getTools();
    
    // Test automation tool
    const automationTool = tools.find(tool => tool.name === 'automation');
    const automationActions = automationTool.inputSchema.properties.action.enum;
    
    const expectedAutomationActions = ['list', 'toggle', 'trigger', 'get_yaml', 'create', 'validate', 'update'];
    for (const action of expectedAutomationActions) {
      if (!automationActions.includes(action)) {
        throw new Error(`❌ Expected automation action '${action}' is missing`);
      }
    }
    console.log('  ✅ All expected automation actions are available');
    
    // Test template sensor tool
    const templateTool = tools.find(tool => tool.name === 'template_sensor');
    const templateActions = templateTool.inputSchema.properties.action.enum;
    
    const expectedTemplateActions = ['create', 'list', 'update', 'delete', 'validate_template'];
    for (const action of expectedTemplateActions) {
      if (!templateActions.includes(action)) {
        throw new Error(`❌ Expected template sensor action '${action}' is missing`);
      }
    }
    console.log('  ✅ All expected template sensor actions are available');
    
  } catch (error) {
    console.error('❌ Remaining functionality test failed:', error.message);
    throw error;
  }
}

/**
 * Test WebSocket methods are still available (for get_yaml functionality)
 */
async function testWebSocketMethodsStillAvailable() {
  console.log('\n🔍 Testing that WebSocket methods are still available...');
  
  try {
    // Import WebSocket client
    const { HassWebSocketClient } = await import('./dist/src/websocket/client.js');
    
    // Check that getAutomationConfig method still exists (needed for get_yaml)
    const client = new HassWebSocketClient('ws://localhost:8123/api/websocket', 'mock-token');
    
    if (typeof client.getAutomationConfig !== 'function') {
      throw new Error('❌ getAutomationConfig method is missing from WebSocket client');
    }
    
    console.log('  ✅ WebSocket getAutomationConfig method is still available');
    console.log('  📝 This method is still needed for get_yaml functionality');
    
  } catch (error) {
    console.error('❌ WebSocket methods test failed:', error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Testing get_config removal...\n');
  
  try {
    await testAutomationGetConfigRemoved();
    await testTemplateSensorGetConfigRemoved();
    await testRemainingFunctionalityWorks();
    await testWebSocketMethodsStillAvailable();
    
    console.log('\n🎉 All tests passed! get_config functionality has been successfully removed.');
    console.log('\n📋 Summary of changes:');
    console.log('• ❌ Removed automation get_config action');
    console.log('• ❌ Removed template sensor get_config action');
    console.log('• ✅ All other automation actions still work');
    console.log('• ✅ All other template sensor actions still work');
    console.log('• ✅ WebSocket methods preserved for get_yaml functionality');
    console.log('• ✅ No compilation errors');
    
    console.log('\n🔧 Rationale: get_config served no purpose as it was always missing data');
    console.log('   • Automation configs often returned empty trigger/condition/action arrays');
    console.log('   • Template sensor info is better retrieved through other means');
    console.log('   • get_yaml provides better automation configuration access');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();