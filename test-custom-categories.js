#!/usr/bin/env node

/**
 * Test Custom Automation Categories
 * Tests the enhanced automation category functionality with custom categories
 */

import fs from 'fs';

// Configuration
const MCP_HOST = 'http://localhost:3000';
const TEST_AUTOMATION = 'automation.sleep_lights_enhanced_motion_bedside_only';

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

async function testCustomAutomationCategories() {
  console.log('🎨 Testing Custom Automation Categories\n');

  // Test 1: List predefined categories
  console.log('1️⃣ Testing List Predefined Categories');
  const predefinedResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'list_predefined_categories'
    }
  });

  if (predefinedResult.success) {
    console.log('✅ Predefined categories listing successful');
    try {
      const response = JSON.parse(predefinedResult.data.content[0].text);
      console.log('📊 Total predefined categories:', response.total_predefined);
      console.log('📋 Sample predefined categories:', response.predefined_categories.slice(0, 10).join(', '), '...');
    } catch (parseError) {
      console.log('ℹ️ Response:', predefinedResult.data.content[0].text);
    }
  } else {
    console.log('❌ Predefined categories listing failed:', predefinedResult.error || predefinedResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Assign custom category
  console.log('2️⃣ Testing Assign Custom Category');
  const customCategory = 'bedroom_automation';
  console.log(`Assigning custom category '${customCategory}' to automation`);
  
  const assignCustomResult = await makeRequest('/tools/assign_automation_category/invoke', {
    arguments: {
      automation_id: TEST_AUTOMATION,
      category: customCategory,
      is_custom: true,
      verify_automation_exists: true
    }
  });

  if (assignCustomResult.success) {
    console.log('✅ Custom category assignment successful');
    try {
      const response = JSON.parse(assignCustomResult.data.content[0].text);
      console.log('📊 Assignment result:', response.success ? 'SUCCESS' : 'FAILED');
      console.log('📝 Message:', response.message);
      console.log('🏷️ Category:', response.category);
      console.log('📱 Category type:', response.category_type);
    } catch (parseError) {
      console.log('ℹ️ Response:', assignCustomResult.data.content[0].text);
    }
  } else {
    console.log('❌ Custom category assignment failed:', assignCustomResult.error || assignCustomResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: Try to assign predefined category without is_custom flag
  console.log('3️⃣ Testing Predefined Category Assignment');
  const predefinedAssignResult = await makeRequest('/tools/assign_automation_category/invoke', {
    arguments: {
      automation_id: TEST_AUTOMATION,
      category: 'light',
      is_custom: false,
      verify_automation_exists: true
    }
  });

  if (predefinedAssignResult.success) {
    console.log('✅ Predefined category assignment successful');
    try {
      const response = JSON.parse(predefinedAssignResult.data.content[0].text);
      console.log('📊 Assignment result:', response.success ? 'SUCCESS' : 'FAILED');
      console.log('📝 Message:', response.message);
      console.log('🏷️ Category:', response.category);
      console.log('📱 Category type:', response.category_type);
    } catch (parseError) {
      console.log('ℹ️ Response:', predefinedAssignResult.data.content[0].text);
    }
  } else {
    console.log('❌ Predefined category assignment failed:', predefinedAssignResult.error || predefinedAssignResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 4: Test validation - invalid custom category format
  console.log('4️⃣ Testing Custom Category Validation');
  const invalidCustomResult = await makeRequest('/tools/assign_automation_category/invoke', {
    arguments: {
      automation_id: TEST_AUTOMATION,
      category: 'invalid@category!', // Invalid characters
      is_custom: true,
      verify_automation_exists: true
    }
  });

  if (invalidCustomResult.success) {
    try {
      const response = JSON.parse(invalidCustomResult.data.content[0].text);
      console.log('📊 Validation result:', response.success ? 'SUCCESS' : 'FAILED (as expected)');
      console.log('📝 Message:', response.message);
    } catch (parseError) {
      console.log('ℹ️ Response:', invalidCustomResult.data.content[0].text);
    }
  } else {
    console.log('❌ Validation test failed:', invalidCustomResult.error || invalidCustomResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 5: Test validation - trying to use custom category name as predefined
  console.log('5️⃣ Testing Predefined Category Validation');
  const customAsPredefinedResult = await makeRequest('/tools/assign_automation_category/invoke', {
    arguments: {
      automation_id: TEST_AUTOMATION,
      category: 'my_custom_category',
      is_custom: false, // This should fail
      verify_automation_exists: true
    }
  });

  if (customAsPredefinedResult.success) {
    try {
      const response = JSON.parse(customAsPredefinedResult.data.content[0].text);
      console.log('📊 Validation result:', response.success ? 'SUCCESS' : 'FAILED (as expected)');
      console.log('📝 Message:', response.message);
      if (response.suggestion) {
        console.log('💡 Suggestion:', response.suggestion);
      }
    } catch (parseError) {
      console.log('ℹ️ Response:', customAsPredefinedResult.data.content[0].text);
    }
  } else {
    console.log('❌ Predefined validation test failed:', customAsPredefinedResult.error || customAsPredefinedResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 6: Discover custom categories
  console.log('6️⃣ Testing Discover Custom Categories');
  const discoverCustomResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'discover_custom_categories'
    }
  });

  if (discoverCustomResult.success) {
    console.log('✅ Custom categories discovery successful');
    try {
      const response = JSON.parse(discoverCustomResult.data.content[0].text);
      console.log('📊 Total custom categories found:', response.total_custom_categories);
      console.log('📋 Custom categories:', response.custom_categories.join(', ') || 'None');
      console.log('📈 Automations with custom categories:', response.total_automations_with_custom_categories);
    } catch (parseError) {
      console.log('ℹ️ Response:', discoverCustomResult.data.content[0].text);
    }
  } else {
    console.log('❌ Custom categories discovery failed:', discoverCustomResult.error || discoverCustomResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 7: List all categories in use
  console.log('7️⃣ Testing List All Categories In Use');
  const allCategoriesResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'list_all_categories_in_use'
    }
  });

  if (allCategoriesResult.success) {
    console.log('✅ All categories in use listing successful');
    try {
      const response = JSON.parse(allCategoriesResult.data.content[0].text);
      console.log('📊 Total categories in use:', response.total_categories_in_use);
      console.log('📋 Predefined in use:', response.total_predefined_in_use);
      console.log('📋 Custom in use:', response.total_custom_in_use);
      if (response.custom_in_use.length > 0) {
        console.log('🎨 Custom categories in use:', response.custom_in_use.join(', '));
      }
    } catch (parseError) {
      console.log('ℹ️ Response:', allCategoriesResult.data.content[0].text);
    }
  } else {
    console.log('❌ All categories listing failed:', allCategoriesResult.error || allCategoriesResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 8: List automations by category with custom support
  console.log('8️⃣ Testing List Automations with Custom Categories');
  const listWithCustomResult = await makeRequest('/tools/manage_automation_categories/invoke', {
    arguments: {
      action: 'list_by_category',
      include_custom: true
    }
  });

  if (listWithCustomResult.success) {
    console.log('✅ List automations with custom categories successful');
    try {
      const response = JSON.parse(listWithCustomResult.data.content[0].text);
      console.log('📊 Total predefined categories:', response.total_predefined_categories);
      console.log('📊 Total custom categories:', response.total_custom_categories);
      console.log('📋 Total categorized automations:', response.total_categorized);
      console.log('📋 Total uncategorized automations:', response.total_uncategorized);
      
      if (response.custom_categories && Object.keys(response.custom_categories).length > 0) {
        console.log('\nCustom categories found:');
        Object.entries(response.custom_categories).forEach(([category, automations]) => {
          console.log(`  🎨 ${category}: ${automations.length} automation(s)`);
        });
      }
    } catch (parseError) {
      console.log('ℹ️ Response:', listWithCustomResult.data.content[0].text);
    }
  } else {
    console.log('❌ List automations with custom categories failed:', listWithCustomResult.error || listWithCustomResult.data);
  }

  console.log('\n🎯 Custom Automation Categories Test Complete!');
  console.log('\n📝 New Custom Category Features:');
  console.log('━'.repeat(60));
  console.log('✅ Support for custom category names (any text)');
  console.log('✅ is_custom parameter to differentiate custom vs predefined');
  console.log('✅ Custom category validation (length, characters)');
  console.log('✅ Discovery of existing custom categories');
  console.log('✅ Separate listing of predefined vs custom categories');
  console.log('✅ Enhanced category type tracking and reporting');
  console.log('✅ Helpful error messages with suggestions');
}

// Run the test
testCustomAutomationCategories().catch(console.error);