#!/usr/bin/env node

/**
 * Demonstration of Enhanced Template Sensor Creation Features
 * Shows the multiple approaches and YAML generation capabilities
 */

console.log('🧪 Enhanced Template Sensor Creation Demo\n');

console.log('✨ Key Enhancements Made:\n');

console.log('1️⃣ Multiple Creation Methods:');
console.log('   • Helper Entity + Automation: Creates input_text helper with automation');
console.log('   • Template Integration Config Entry: Direct template sensor creation');
console.log('   • REST Sensor Approach: Auto-updating sensor via template API');
console.log('   • YAML Generation: Fallback configuration for manual setup\n');

console.log('2️⃣ Template Validation:');
console.log('   • Validates templates using Home Assistant template API');
console.log('   • Prevents creation of invalid template sensors');
console.log('   • Provides immediate feedback on template syntax\n');

console.log('3️⃣ Comprehensive Configuration:');
console.log('   • Supports all sensor attributes (device_class, state_class, etc.)');
console.log('   • Custom attributes with template support');
console.log('   • Availability templates for sensor status');
console.log('   • Unique IDs for proper entity management\n');

console.log('4️⃣ Multiple Output Formats:');
console.log('   • Standard template sensor YAML');
console.log('   • REST sensor YAML for auto-updating');
console.log('   • Helper + automation configuration');
console.log('   • Detailed setup instructions\n');

console.log('📄 Example Template Sensor YAML (Generated):');
console.log('----------------------------------------');

const exampleYaml = `template:
  - sensor:
      - name: "Home Status Summary"
        state: "{{ states.person | selectattr('state', 'eq', 'home') | list | count }}"
        unit_of_measurement: "people"
        device_class: "enum"
        state_class: "measurement"
        icon: "mdi:home-account"
        unique_id: "complex_home_status_sensor"
        availability: "{{ states.person | list | count > 0 }}"
        attributes:
          people_home: "{{ states.person | selectattr('state', 'eq', 'home') | map(attribute='name') | join(', ') }}"
          total_people: "{{ states.person | list | count }}"
          away_people: "{{ states.person | selectattr('state', 'ne', 'home') | map(attribute='name') | join(', ') }}"
          last_updated: "{{ now().strftime('%Y-%m-%d %H:%M:%S') }}"`;

console.log(exampleYaml);

console.log('\n📄 Example REST Sensor YAML (Auto-updating):');
console.log('---------------------------------------------');

const restYaml = `# Add this to your configuration.yaml under sensor:
sensor:
  - platform: rest
    name: "Auto-Updating Template Sensor"
    resource: "http://homeassistant.local:8123/api/template"
    method: POST
    headers:
      Authorization: "Bearer YOUR_LONG_LIVED_ACCESS_TOKEN"
      Content-Type: "application/json"
    payload: '{"template": "{{ states(\"sensor.time\") }}"}'
    value_template: "{{ value }}"
    scan_interval: 60
    unit_of_measurement: "time"
    device_class: "timestamp"
    icon: "mdi:clock"

# This approach creates a REST sensor that calls the template API automatically
# The sensor will update based on the scan_interval (60 seconds by default)`;

console.log(restYaml);

console.log('\n🔄 Alternative Creation Approaches:');
console.log('-----------------------------------');

console.log('Helper + Automation Approach:');
console.log('• Creates input_text helper for sensor value');
console.log('• Automation updates helper every minute using template');
console.log('• Provides dynamic updates without YAML configuration');
console.log('• Can be created entirely via Home Assistant API\n');

console.log('Template Integration Config Entry:');
console.log('• Attempts to create template sensor via config entry');
console.log('• Works with newer Home Assistant versions');
console.log('• May require restart to appear in entity registry\n');

console.log('Manual UI Setup:');
console.log('• Use Home Assistant Developer Tools > Template for testing');
console.log('• Create via UI Helpers if template integration supports it');
console.log('• Add via YAML configuration for maximum compatibility\n');

console.log('📋 Setup Instructions Generated:');
console.log('--------------------------------');

const instructions = {
  template_approach: 'Add the template_yaml to your configuration.yaml under the template: section',
  rest_approach: 'Add the rest_sensor_yaml to your configuration.yaml under sensor: section for auto-updating',
  helper_approach: 'Use Home Assistant UI to create an input_text helper and automation manually'
};

Object.entries(instructions).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});

console.log('\n🎯 Benefits of Enhanced Implementation:');
console.log('--------------------------------------');
console.log('✅ No longer limited to static YAML-only configuration');
console.log('✅ Multiple dynamic creation approaches attempted');
console.log('✅ Comprehensive fallback with detailed instructions');
console.log('✅ Template validation prevents configuration errors');
console.log('✅ Auto-updating options available (REST sensor + helpers)');
console.log('✅ Full attribute and availability template support');
console.log('✅ Ready-to-use YAML configurations provided');

console.log('\n🚀 What This Solves:');
console.log('--------------------');
console.log('• Original limitation: Only generated YAML for manual pasting');
console.log('• Enhanced solution: Attempts API creation, provides multiple approaches');
console.log('• Auto-updating: REST sensor approach updates automatically');
console.log('• Dynamic creation: Helper + automation approach works via API');
console.log('• Comprehensive: Covers all template sensor configuration options');

console.log('\n📝 Usage Example:');
console.log('------------------');
console.log('Call: create_template_sensor with action "create"');
console.log('Result: Attempts 3 creation methods, provides YAML + instructions');
console.log('Fallback: Multiple configuration approaches if API creation fails');
console.log('Validation: All templates validated before attempting creation');

console.log('\n✨ Enhanced Template Sensor Creation is now much more dynamic!');