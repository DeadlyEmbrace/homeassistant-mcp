#!/usr/bin/env node

/**
 * Test Enhanced Template Sensor Creation
 * Tests multiple approaches for creating template sensors dynamically
 */

import fs from 'fs';
import path from 'path';

// Configuration
const MCP_HOST = 'http://localhost:3000';
const TEST_SENSOR_NAME = 'dynamic_test_sensor';

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

async function testEnhancedTemplateSensorCreation() {
  console.log('🧪 Testing Enhanced Template Sensor Creation\n');

  // Test 1: Create a simple template sensor with multiple approaches
  console.log('1️⃣ Testing Simple Template Sensor Creation');
  const simpleResult = await makeRequest('/tools/create_template_sensor/invoke', {
    arguments: {
      action: 'create',
      sensor_name: TEST_SENSOR_NAME,
      friendly_name: 'Dynamic Test Sensor',
      value_template: '{{ states("sensor.time") }}',
      unit_of_measurement: 'time',
      icon: 'mdi:clock',
      device_class: 'timestamp'
    }
  });

  if (simpleResult.success) {
    console.log('✅ Simple template sensor creation result:', simpleResult.data.content[0].text);
    
    // Parse the response to see what methods were attempted
    try {
      const response = JSON.parse(simpleResult.data.content[0].text);
      console.log('📊 Creation method:', response.creation_method);
      console.log('📋 Instructions:', response.instructions || response.note);
      
      if (response.yaml_configuration) {
        console.log('📄 YAML Configuration Generated:');
        console.log(response.yaml_configuration);
      }
      
      if (response.template_yaml) {
        console.log('📄 Template YAML:');
        console.log(response.template_yaml);
      }
      
      if (response.rest_sensor_yaml) {
        console.log('📄 REST Sensor YAML:');
        console.log(response.rest_sensor_yaml);
      }
      
      if (response.alternative_approaches) {
        console.log('🔄 Alternative approaches available:');
        Object.entries(response.alternative_approaches).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
      }
    } catch (parseError) {
      console.log('ℹ️ Response content:', simpleResult.data.content[0].text);
    }
  } else {
    console.log('❌ Simple template sensor creation failed:', simpleResult.error || simpleResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Create a complex template sensor with attributes
  console.log('2️⃣ Testing Complex Template Sensor with Attributes');
  const complexResult = await makeRequest('/tools/create_template_sensor/invoke', {
    arguments: {
      action: 'create',
      sensor_name: 'complex_home_status',
      friendly_name: 'Home Status Summary',
      value_template: '{{ states.person | selectattr("state", "eq", "home") | list | count }}',
      unit_of_measurement: 'people',
      device_class: 'enum',
      state_class: 'measurement',
      icon: 'mdi:home-account',
      unique_id: 'complex_home_status_sensor',
      attributes: {
        people_home: '{{ states.person | selectattr("state", "eq", "home") | map(attribute="name") | join(", ") }}',
        total_people: '{{ states.person | list | count }}',
        away_people: '{{ states.person | selectattr("state", "ne", "home") | map(attribute="name") | join(", ") }}',
        last_updated: '{{ now().strftime("%Y-%m-%d %H:%M:%S") }}'
      },
      availability_template: '{{ states.person | list | count > 0 }}'
    }
  });

  if (complexResult.success) {
    console.log('✅ Complex template sensor creation result:', complexResult.data.content[0].text);
    
    try {
      const response = JSON.parse(complexResult.data.content[0].text);
      console.log('📊 Creation method:', response.creation_method);
      
      if (response.yaml_configuration) {
        console.log('📄 Generated YAML Configuration:');
        console.log(response.yaml_configuration);
      }
      
      if (response.instructions) {
        console.log('📋 Setup Instructions:');
        if (typeof response.instructions === 'string') {
          console.log(response.instructions);
        } else {
          Object.entries(response.instructions).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        }
      }
    } catch (parseError) {
      console.log('ℹ️ Response content:', complexResult.data.content[0].text);
    }
  } else {
    console.log('❌ Complex template sensor creation failed:', complexResult.error || complexResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: List existing template sensors to see what's available
  console.log('3️⃣ Testing Template Sensor Listing');
  const listResult = await makeRequest('/tools/create_template_sensor/invoke', {
    arguments: {
      action: 'list'
    }
  });

  if (listResult.success) {
    console.log('✅ Template sensor listing successful');
    try {
      const response = JSON.parse(listResult.data.content[0].text);
      console.log(`📊 Found ${response.template_sensors.length} template sensors`);
      response.template_sensors.forEach((sensor, index) => {
        console.log(`  ${index + 1}. ${sensor.entity_id} (${sensor.name})`);
      });
    } catch (parseError) {
      console.log('ℹ️ Response content:', listResult.data.content[0].text);
    }
  } else {
    console.log('❌ Template sensor listing failed:', listResult.error || listResult.data);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 4: Validate a template
  console.log('4️⃣ Testing Template Validation');
  const validateResult = await makeRequest('/tools/create_template_sensor/invoke', {
    arguments: {
      action: 'validate_template',
      template: '{{ (states("sensor.living_room_temperature") | float + states("sensor.bedroom_temperature") | float) / 2 }}'
    }
  });

  if (validateResult.success) {
    console.log('✅ Template validation successful');
    try {
      const response = JSON.parse(validateResult.data.content[0].text);
      console.log('📊 Validation result:', response.valid ? 'Valid' : 'Invalid');
      if (response.rendered_value !== undefined) {
        console.log('📄 Rendered value:', response.rendered_value);
      }
      if (response.error) {
        console.log('❌ Validation error:', response.error);
      }
    } catch (parseError) {
      console.log('ℹ️ Response content:', validateResult.data.content[0].text);
    }
  } else {
    console.log('❌ Template validation failed:', validateResult.error || validateResult.data);
  }

  console.log('\n🎯 Enhanced Template Sensor Creation Test Complete!');
  console.log('\n📝 Summary:');
  console.log('- The enhanced implementation attempts multiple creation methods');
  console.log('- When direct API creation fails, it provides comprehensive YAML configurations');
  console.log('- Multiple approaches include: Config Entry, Helper + Automation, REST Sensor');
  console.log('- Fallback provides detailed setup instructions for manual configuration');
  console.log('- All templates are validated before attempting creation');
}

// Run the test
testEnhancedTemplateSensorCreation().catch(console.error);