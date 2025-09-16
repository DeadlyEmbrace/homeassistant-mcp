#!/usr/bin/env node

/**
 * Automation Category Assignment Demo
 * Demonstrates the new automation category functionality
 */

console.log('🏷️ Automation Category Assignment Demo\n');

console.log('✨ New Tools Added:');
console.log('━'.repeat(60));
console.log('1️⃣ assign_automation_category - Assign categories to automations');
console.log('2️⃣ manage_automation_categories - Comprehensive category management\n');

console.log('🎯 Key Features:');
console.log('━'.repeat(60));
console.log('✅ 30+ predefined categories matching Home Assistant standards');
console.log('✅ WebSocket-based registry operations for reliability');
console.log('✅ Complete CRUD operations (Create, Read, Update, Delete)');
console.log('✅ Bulk listing and filtering by categories');
console.log('✅ Error handling and validation');
console.log('✅ Integration with existing area assignment\n');

console.log('📋 Available Categories:');
console.log('━'.repeat(60));

const categories = [
  { category: 'light', description: 'Light control automations' },
  { category: 'switch', description: 'Switch control automations' },
  { category: 'fan', description: 'Fan control automations' },
  { category: 'cover', description: 'Cover/blind/garage door automations' },
  { category: 'climate', description: 'Climate/HVAC automations' },
  { category: 'lock', description: 'Lock control automations' },
  { category: 'security', description: 'Security system automations' },
  { category: 'camera', description: 'Camera-related automations' },
  { category: 'media_player', description: 'Media control automations' },
  { category: 'sensor', description: 'Sensor-based automations' },
  { category: 'vacuum', description: 'Vacuum control automations' },
  { category: 'notify', description: 'Notification automations' },
  { category: 'scene', description: 'Scene activation automations' },
  { category: 'schedule', description: 'Time-based/scheduled automations' },
  { category: 'energy', description: 'Energy management automations' },
  { category: 'other', description: 'Miscellaneous automations' }
];

categories.forEach((cat, index) => {
  console.log(`  ${(index + 1).toString().padStart(2, '0')}. ${cat.category.padEnd(12)} - ${cat.description}`);
});

console.log('\n📄 Example Usage:');
console.log('━'.repeat(60));

console.log('\n1️⃣ Assign Category to Automation:');
const assignExample = {
  tool: 'assign_automation_category',
  arguments: {
    automation_id: 'automation.sleep_lights_enhanced_motion_bedside_only',
    category: 'light',
    verify_automation_exists: true
  }
};
console.log(JSON.stringify(assignExample, null, 2));

console.log('\n📤 Expected Response:');
const assignResponse = {
  success: true,
  message: "Successfully assigned category 'light' to automation 'automation.sleep_lights_enhanced_motion_bedside_only'",
  automation_id: 'automation.sleep_lights_enhanced_motion_bedside_only',
  category: 'light',
  previous_category: null
};
console.log(JSON.stringify(assignResponse, null, 2));

console.log('\n2️⃣ List Automations by Category:');
const listExample = {
  tool: 'manage_automation_categories',
  arguments: {
    action: 'list_by_category',
    category: 'light'
  }
};
console.log(JSON.stringify(listExample, null, 2));

console.log('\n📤 Expected Response:');
const listResponse = {
  success: true,
  message: "Automations in category 'light'",
  category: 'light',
  automations: [
    {
      entity_id: 'automation.morning_lights',
      name: 'Morning Lights',
      state: 'on',
      category: 'light'
    },
    {
      entity_id: 'automation.sleep_lights_enhanced_motion_bedside_only',
      name: 'Sleep Lights Enhanced Motion Bedside Only',
      state: 'on',
      category: 'light'
    }
  ],
  total_automations: 2
};
console.log(JSON.stringify(listResponse, null, 2));

console.log('\n3️⃣ Get All Categories Overview:');
const overviewExample = {
  tool: 'manage_automation_categories',
  arguments: {
    action: 'list_by_category'
  }
};
console.log(JSON.stringify(overviewExample, null, 2));

console.log('\n📤 Expected Response:');
const overviewResponse = {
  success: true,
  message: 'Automations grouped by category',
  automations_by_category: {
    light: [
      { entity_id: 'automation.morning_lights', name: 'Morning Lights', state: 'on', category: 'light' },
      { entity_id: 'automation.bedroom_lights', name: 'Bedroom Lights', state: 'on', category: 'light' }
    ],
    security: [
      { entity_id: 'automation.door_lock_check', name: 'Door Lock Check', state: 'on', category: 'security' }
    ]
  },
  uncategorized_automations: [
    { entity_id: 'automation.misc_automation', name: 'Misc Automation', state: 'on', category: null }
  ],
  total_categories: 2,
  total_categorized: 3,
  total_uncategorized: 1,
  total_automations: 4
};
console.log(JSON.stringify(overviewResponse, null, 2));

console.log('\n4️⃣ Remove Category:');
const removeExample = {
  tool: 'manage_automation_categories',
  arguments: {
    action: 'remove_category',
    automation_id: 'automation.sleep_lights_enhanced_motion_bedside_only'
  }
};
console.log(JSON.stringify(removeExample, null, 2));

console.log('\n🔧 Technical Implementation:');
console.log('━'.repeat(60));
console.log('• Uses WebSocket API for entity registry operations');
console.log('• Stores categories in entity registry categories field');
console.log('• Validates automation existence before assignment');
console.log('• Handles both categorized and uncategorized automations');
console.log('• Provides detailed error messages and validation');

console.log('\n📊 Integration with Area Assignment:');
console.log('━'.repeat(60));
console.log('Categories complement area assignments:');
console.log('• Area: WHERE the automation operates (bedroom, kitchen, etc.)');
console.log('• Category: WHAT the automation controls (light, security, etc.)');

const integrationExample = {
  entity_id: 'automation.bedroom_lights',
  area_id: 'bedroom',      // Physical location
  category: 'light'        // Functional purpose
};
console.log('\nExample automation with both:');
console.log(JSON.stringify(integrationExample, null, 2));

console.log('\n🎯 Benefits:');
console.log('━'.repeat(60));
console.log('✅ Better organization - Group automations by function');
console.log('✅ Easier discovery - Find automations by purpose');
console.log('✅ UI enhancement - Categories appear in Home Assistant');
console.log('✅ Self-documenting - Clear automation purposes');
console.log('✅ Filtering capabilities - Filter by category in interfaces');
console.log('✅ Management efficiency - Bulk operations on categories');

console.log('\n🚀 Use Cases:');
console.log('━'.repeat(60));
console.log('1. Organize lighting automations under "light" category');
console.log('2. Group security automations under "security" category');
console.log('3. Categorize scheduled automations under "schedule" category');
console.log('4. Find all notification automations under "notify" category');
console.log('5. Identify uncategorized automations for organization');
console.log('6. Create category-based automation dashboards');

console.log('\n✨ Automation Category Assignment is now available!');
console.log('\n🎉 Your automations can now be properly organized and categorized!');