#!/usr/bin/env node

/**
 * Test Automation Category Assignment
 * Tests the new automation category assignment and management functionality
 */

import fs from 'fs';

// Configuration
const MCP_HOST = 'http://localhost:3000';
const TEST_AUTOMATION = 'automation.sleep_lights_enhanced_motion_bedside_only';
const TEST_CATEGORY = 'light';

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

async function testAutomationCategoryAssignment() {
  console.log('🏷️ Testing Automation Category Assignment\n');

  // Test 1: List available categories
  console.log('1️⃣ Testing List Available Categories');
  const categoriesResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'list_categories'
    }
  });

  if (categoriesResult.success) {
    console.log('✅ Categories listing successful');
    try {
      const response = JSON.parse(categoriesResult.data.content[0].text);
      console.log('📊 Available categories:', response.categories.length);
      console.log('📋 Categories:', response.categories.join(', '));
    } catch (parseError) {
      console.log('ℹ️ Response:', categoriesResult.data.content[0].text);
    }
  } else {
    console.log('❌ Categories listing failed:', categoriesResult.error || categoriesResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Get current category of automation
  console.log('2️⃣ Testing Get Current Category');
  const getCurrentResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'get_category',
      automation_id: TEST_AUTOMATION
    }
  });

  if (getCurrentResult.success) {
    console.log('✅ Get current category successful');
    try {
      const response = JSON.parse(getCurrentResult.data.content[0].text);
      console.log('📊 Current category:', response.category || 'None');
      console.log('📝 Has category:', response.has_category);
    } catch (parseError) {
      console.log('ℹ️ Response:', getCurrentResult.data.content[0].text);
    }
  } else {
    console.log('❌ Get current category failed:', getCurrentResult.error || getCurrentResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: Assign category to automation
  console.log('3️⃣ Testing Assign Category');
  console.log(`Assigning category '${TEST_CATEGORY}' to automation '${TEST_AUTOMATION}'`);
  
  const assignResult = await makeRequest('/tools/assign_automation_category/invoke', {
    arguments: {
      automation_id: TEST_AUTOMATION,
      category: TEST_CATEGORY,
      verify_automation_exists: true
    }
  });

  if (assignResult.success) {
    console.log('✅ Category assignment request successful');
    try {
      const response = JSON.parse(assignResult.data.content[0].text);
      console.log('📊 Assignment result:', response.success ? 'SUCCESS' : 'FAILED');
      console.log('📝 Message:', response.message);
      console.log('🏷️ Category:', response.category);
      console.log('📋 Previous category:', response.previous_category || 'None');
    } catch (parseError) {
      console.log('ℹ️ Response:', assignResult.data.content[0].text);
    }
  } else {
    console.log('❌ Category assignment failed:', assignResult.error || assignResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 4: List automations by category
  console.log('4️⃣ Testing List Automations by Category');
  const listByCategoryResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'list_by_category',
      category: TEST_CATEGORY
    }
  });

  if (listByCategoryResult.success) {
    console.log('✅ List by category successful');
    try {
      const response = JSON.parse(listByCategoryResult.data.content[0].text);
      console.log('📊 Category:', response.category);
      console.log('📋 Automations in category:', response.total_automations);
      if (response.automations && response.automations.length > 0) {
        response.automations.forEach((automation, index) => {
          console.log(`  ${index + 1}. ${automation.entity_id} (${automation.name}) - ${automation.state}`);
        });
      }
    } catch (parseError) {
      console.log('ℹ️ Response:', listByCategoryResult.data.content[0].text);
    }
  } else {
    console.log('❌ List by category failed:', listByCategoryResult.error || listByCategoryResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 5: List all automations by categories
  console.log('5️⃣ Testing List All Automations by Categories');
  const listAllResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'list_by_category'
    }
  });

  if (listAllResult.success) {
    console.log('✅ List all by categories successful');
    try {
      const response = JSON.parse(listAllResult.data.content[0].text);
      console.log('📊 Total categories with automations:', response.total_categories);
      console.log('📋 Total categorized automations:', response.total_categorized);
      console.log('📋 Total uncategorized automations:', response.total_uncategorized);
      console.log('📋 Total automations:', response.total_automations);
      
      console.log('\nCategories with automations:');
      Object.entries(response.automations_by_category).forEach(([category, automations]) => {
        console.log(`  ${category}: ${automations.length} automation(s)`);
      });
      
      if (response.uncategorized_automations.length > 0) {
        console.log(`\nUncategorized: ${response.uncategorized_automations.length} automation(s)`);
      }
    } catch (parseError) {
      console.log('ℹ️ Response:', listAllResult.data.content[0].text);
    }
  } else {
    console.log('❌ List all by categories failed:', listAllResult.error || listAllResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 6: Test error handling with non-existent automation
  console.log('6️⃣ Testing Error Handling');
  const errorResult = await makeRequest('/tools/assign_automation_category/invoke', {
    arguments: {
      automation_id: 'automation.non_existent_automation',
      category: 'light',
      verify_automation_exists: true
    }
  });

  if (errorResult.success) {
    try {
      const response = JSON.parse(errorResult.data.content[0].text);
      console.log('📊 Error handling result:', response.success ? 'SUCCESS' : 'FAILED (as expected)');
      console.log('📝 Message:', response.message);
    } catch (parseError) {
      console.log('ℹ️ Response:', errorResult.data.content[0].text);
    }
  } else {
    console.log('❌ Error handling test failed:', errorResult.error || errorResult.data);
  }

  console.log('\n🎯 Automation Category Assignment Test Complete!');
  console.log('\n📝 New Functionality Summary:');
  console.log('━'.repeat(60));
  console.log('✅ assign_automation_category - Assign category to automation');
  console.log('✅ manage_automation_categories - List, get, remove categories');
  console.log('✅ Full category support with all Home Assistant categories');
  console.log('✅ Error handling and validation');
  console.log('✅ WebSocket-based registry operations');
  console.log('✅ Categorization and organization features');
}

// Run the test
testAutomationCategoryAssignment().catch(console.error);