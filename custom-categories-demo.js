#!/usr/bin/env node

/**
 * Custom Automation Categories Demo
 * Demonstrates the enhanced automation category functionality with custom categories
 */

console.log('🎨 Custom Automation Categories Demo\n');

console.log('✨ Enhanced Features:');
console.log('━'.repeat(60));
console.log('✅ Predefined categories (30+ Home Assistant standard categories)');
console.log('✅ Custom categories (any text you want)');
console.log('✅ Category type tracking (predefined vs custom)');
console.log('✅ Custom category discovery and management');
console.log('✅ Enhanced validation and error handling');
console.log('✅ Separate listing of predefined vs custom categories\n');

console.log('🎯 Key Improvements:');
console.log('━'.repeat(60));
console.log('• is_custom parameter to use custom category names');
console.log('• Category validation for custom names');
console.log('• Discovery of existing custom categories');
console.log('• Enhanced listing with category type information');
console.log('• Better error messages and suggestions\n');

console.log('📄 Example Usage - Custom Categories:');
console.log('━'.repeat(60));

console.log('\n1️⃣ Assign Custom Category:');
const customAssignExample = {
  tool: 'assign_automation_category',
  arguments: {
    automation_id: 'automation.my_bedroom_automation',
    category: 'bedroom_automation',
    is_custom: true,
    verify_automation_exists: true
  }
};
console.log(JSON.stringify(customAssignExample, null, 2));

console.log('\n📤 Expected Response:');
const customAssignResponse = {
  success: true,
  message: "Successfully assigned custom category 'bedroom_automation' to automation 'automation.my_bedroom_automation'",
  automation_id: 'automation.my_bedroom_automation',
  category: 'bedroom_automation',
  category_type: 'custom',
  previous_category: null
};
console.log(JSON.stringify(customAssignResponse, null, 2));

console.log('\n2️⃣ Assign Predefined Category:');
const predefinedAssignExample = {
  tool: 'assign_automation_category',
  arguments: {
    automation_id: 'automation.my_light_automation',
    category: 'light',
    is_custom: false, // or omit, defaults to false
    verify_automation_exists: true
  }
};
console.log(JSON.stringify(predefinedAssignExample, null, 2));

console.log('\n3️⃣ Discover Custom Categories:');
const discoverExample = {
  tool: 'manage_automation_categories',
  arguments: {
    action: 'discover_custom_categories'
  }
};
console.log(JSON.stringify(discoverExample, null, 2));

console.log('\n📤 Expected Response:');
const discoverResponse = {
  success: true,
  message: 'Custom categories discovered in your automations',
  custom_categories: ['bedroom_automation', 'kitchen_helpers', 'weekend_routines'],
  custom_category_usage: {
    'bedroom_automation': ['automation.bedroom_lights', 'automation.bedroom_climate'],
    'kitchen_helpers': ['automation.morning_coffee', 'automation.dinner_prep'],
    'weekend_routines': ['automation.saturday_cleaning', 'automation.sunday_relaxation']
  },
  total_custom_categories: 3,
  total_automations_with_custom_categories: 6
};
console.log(JSON.stringify(discoverResponse, null, 2));

console.log('\n4️⃣ List All Categories In Use:');
const listAllExample = {
  tool: 'manage_automation_categories',
  arguments: {
    action: 'list_all_categories_in_use'
  }
};
console.log(JSON.stringify(listAllExample, null, 2));

console.log('\n📤 Expected Response:');
const listAllResponse = {
  success: true,
  message: 'All categories currently in use',
  categories_in_use: ['light', 'security', 'bedroom_automation', 'kitchen_helpers'],
  predefined_in_use: ['light', 'security'],
  custom_in_use: ['bedroom_automation', 'kitchen_helpers'],
  total_categories_in_use: 4,
  total_predefined_in_use: 2,
  total_custom_in_use: 2
};
console.log(JSON.stringify(listAllResponse, null, 2));

console.log('\n5️⃣ Enhanced Category Listing:');
const enhancedListExample = {
  tool: 'manage_automation_categories',
  arguments: {
    action: 'list_by_category',
    include_custom: true
  }
};
console.log(JSON.stringify(enhancedListExample, null, 2));

console.log('\n📤 Expected Response Structure:');
const enhancedListResponse = {
  success: true,
  message: 'Automations grouped by category',
  predefined_categories: {
    light: [
      {
        entity_id: 'automation.morning_lights',
        name: 'Morning Lights',
        category: 'light',
        category_type: 'predefined'
      }
    ]
  },
  custom_categories: {
    bedroom_automation: [
      {
        entity_id: 'automation.bedroom_climate',
        name: 'Bedroom Climate',
        category: 'bedroom_automation',
        category_type: 'custom'
      }
    ]
  },
  total_predefined_categories: 1,
  total_custom_categories: 1,
  total_categorized: 2,
  total_uncategorized: 0
};
console.log(JSON.stringify(enhancedListResponse, null, 2));

console.log('\n🔧 Custom Category Validation:');
console.log('━'.repeat(60));
console.log('✅ Length: 1-50 characters');
console.log('✅ Characters: letters, numbers, spaces, hyphens, underscores');
console.log('✅ Examples: "bedroom_automation", "weekend-routines", "morning helpers"');
console.log('❌ Invalid: "@#$%", "", "very-very-very-long-category-name-that-exceeds-limit"');

console.log('\n📊 Error Handling Examples:');
console.log('━'.repeat(60));

console.log('\nInvalid Custom Category:');
const invalidExample = {
  tool: 'assign_automation_category',
  arguments: {
    automation_id: 'automation.test',
    category: 'invalid@category!',
    is_custom: true
  }
};
console.log(JSON.stringify(invalidExample, null, 2));

console.log('\nResponse:');
const invalidResponse = {
  success: false,
  message: 'Custom category can only contain letters, numbers, spaces, hyphens, and underscores',
  automation_id: 'automation.test',
  category: 'invalid@category!'
};
console.log(JSON.stringify(invalidResponse, null, 2));

console.log('\nTrying Custom Name as Predefined:');
const wrongTypeExample = {
  tool: 'assign_automation_category',
  arguments: {
    automation_id: 'automation.test',
    category: 'my_custom_category',
    is_custom: false // Wrong! Should be true
  }
};
console.log(JSON.stringify(wrongTypeExample, null, 2));

console.log('\nResponse:');
const wrongTypeResponse = {
  success: false,
  message: "Invalid predefined category 'my_custom_category'. Use is_custom: true for custom categories, or choose from: light, switch, fan, ...",
  suggestion: 'Set is_custom: true to use this as a custom category',
  available_predefined: ['light', 'switch', 'fan', '...']
};
console.log(JSON.stringify(wrongTypeResponse, null, 2));

console.log('\n🚀 Use Cases for Custom Categories:');
console.log('━'.repeat(60));
console.log('1. Room-specific: "bedroom_automation", "kitchen_helpers", "garage_controls"');
console.log('2. Time-based: "morning_routines", "evening_tasks", "weekend_activities"');
console.log('3. Seasonal: "winter_heating", "summer_cooling", "holiday_decorations"');
console.log('4. Family-specific: "kids_bedtime", "guest_routines", "pet_care"');
console.log('5. Activity-based: "movie_night", "workout_time", "cooking_helpers"');
console.log('6. System-specific: "backup_routines", "maintenance_tasks", "diagnostics"');

console.log('\n📋 Migration from Predefined Categories:');
console.log('━'.repeat(60));
console.log('• Existing predefined categories continue to work normally');
console.log('• No breaking changes to existing functionality');
console.log('• Enhanced features are additive and optional');
console.log('• Can mix predefined and custom categories freely');

console.log('\n🎯 Benefits of Custom Categories:');
console.log('━'.repeat(60));
console.log('✅ Unlimited flexibility - create categories that match your workflow');
console.log('✅ Personal organization - use terms that make sense to you');
console.log('✅ Room/area specificity - "bedroom_automation" vs generic "light"');
console.log('✅ Activity grouping - "movie_night" includes lights, media, climate');
console.log('✅ Seasonal organization - "holiday_decorations", "summer_routines"');
console.log('✅ Family workflows - "kids_bedtime", "guest_routines"');

console.log('\n🔄 Integration with Areas:');
console.log('━'.repeat(60));
console.log('Perfect combination for complete organization:');

const integrationExample = {
  entity_id: 'automation.bedroom_morning_routine',
  area_id: 'bedroom',                    // WHERE (physical location)
  category: 'morning_routines'           // WHAT (custom activity category)
};
console.log(JSON.stringify(integrationExample, null, 2));

console.log('\nThis gives you both:');
console.log('• Physical location (bedroom, kitchen, living room)');
console.log('• Activity/purpose (morning routines, security checks, entertainment)');

console.log('\n✨ Custom Automation Categories are now available!');
console.log('\n🎉 Create your own categories that perfectly match your home automation needs!');