import { spawn } from 'child_process';

// Test template sensor functionality
function testTemplateSensor() {
  console.log('🔍 Testing Template Sensor Tool...\n');

  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';
    let responded = false;

    child.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check if we got a response
      if (output.includes('"result"') && !responded) {
        responded = true;
        child.kill();
        
        try {
          const lines = output.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          
          console.log('📋 Template Sensor Test Response:');
          
          if (result.result && result.result.content) {
            const content = JSON.parse(result.result.content[0].text);
            
            if (content.success) {
              console.log('✅ Template sensor test completed successfully!');
              console.log(`Total template sensors: ${content.total_template_sensors || 0}`);
              
              if (content.template_sensors && content.template_sensors.length > 0) {
                console.log('\nExisting template sensors:');
                content.template_sensors.slice(0, 5).forEach((sensor, i) => {
                  console.log(`  ${i + 1}. ${sensor.entity_id} - ${sensor.name}`);
                  console.log(`     State: ${sensor.current_state}`);
                  console.log(`     Device Class: ${sensor.attributes?.device_class || 'none'}`);
                });
              } else {
                console.log('No existing template sensors found');
              }
            } else {
              console.log(`❌ Test failed: ${content.message}`);
            }
          }
          
          resolve(result);
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message);
          console.log('Raw output:', output);
          reject(error);
        }
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (!responded) {
        if (code !== 0) {
          console.error('❌ Template sensor test failed');
          console.error('Error output:', errorOutput);
          console.log('Standard output:', output);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Send template sensor list request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'template_sensor',
        arguments: {
          action: 'list'
        }
      }
    };
    
    console.log('Testing template sensor list functionality...');
    
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!responded) {
        child.kill();
        reject(new Error('Timeout waiting for response'));
      }
    }, 15000);
  });
}

// Test template validation
function testTemplateValidation() {
  console.log('🧪 Testing Template Validation...\n');

  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';
    let responded = false;

    child.stdout.on('data', (data) => {
      output += data.toString();
      
      if (output.includes('"result"') && !responded) {
        responded = true;
        child.kill();
        
        try {
          const lines = output.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          
          console.log('📋 Template Validation Response:');
          
          if (result.result && result.result.content) {
            const content = JSON.parse(result.result.content[0].text);
            
            if (content.success && content.template_valid) {
              console.log('✅ Template validation successful!');
              console.log(`Template: ${content.template}`);
              console.log(`Rendered value: ${content.rendered_value}`);
            } else {
              console.log(`❌ Template validation failed: ${content.error_message || content.message}`);
            }
          }
          
          resolve(result);
        } catch (error) {
          console.error('❌ Failed to parse validation response:', error.message);
          reject(error);
        }
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (!responded) {
        if (code !== 0) {
          console.error('❌ Template validation test failed');
          console.error('Error output:', errorOutput);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Test a simple template
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'template_sensor',
        arguments: {
          action: 'validate_template',
          test_template: '{{ states("sun.sun") }}'
        }
      }
    };
    
    console.log('Testing template validation with sun state...');
    
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    setTimeout(() => {
      if (!responded) {
        child.kill();
        reject(new Error('Timeout waiting for validation response'));
      }
    }, 15000);
  });
}

// Test template sensor creation
function testTemplateSensorCreation() {
  console.log('🔧 Testing Template Sensor Creation...\n');

  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';
    let responded = false;

    child.stdout.on('data', (data) => {
      output += data.toString();
      
      if (output.includes('"result"') && !responded) {
        responded = true;
        child.kill();
        
        try {
          const lines = output.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          
          console.log('📋 Template Sensor Creation Response:');
          
          if (result.result && result.result.content) {
            const content = JSON.parse(result.result.content[0].text);
            
            if (content.success) {
              console.log('✅ Template sensor creation successful!');
              console.log(`Message: ${content.message}`);
              console.log(`Sensor Name: ${content.sensor_name}`);
              console.log(`Entity ID: ${content.entity_id}`);
              console.log(`Creation Method: ${content.creation_method}`);
              
              if (content.yaml_configuration) {
                console.log('\nGenerated YAML Configuration:');
                console.log(content.yaml_configuration);
              }
              
              if (content.instructions) {
                console.log(`\nInstructions: ${content.instructions}`);
              }
            } else {
              console.log(`❌ Creation failed: ${content.message}`);
            }
          }
          
          resolve(result);
        } catch (error) {
          console.error('❌ Failed to parse creation response:', error.message);
          reject(error);
        }
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (!responded) {
        if (code !== 0) {
          console.error('❌ Template sensor creation test failed');
          console.error('Error output:', errorOutput);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Test creating a simple template sensor
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'template_sensor',
        arguments: {
          action: 'create',
          sensor_name: 'test_sun_elevation',
          friendly_name: 'Sun Elevation Test',
          value_template: '{{ state_attr("sun.sun", "elevation") | round(2) }}',
          unit_of_measurement: '°',
          device_class: 'temperature',
          icon: 'mdi:weather-sunny',
          unique_id: 'mcp_test_sun_elevation_001'
        }
      }
    };
    
    console.log('Testing template sensor creation with sun elevation...');
    
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    setTimeout(() => {
      if (!responded) {
        child.kill();
        reject(new Error('Timeout waiting for creation response'));
      }
    }, 15000);
  });
}

// Run all tests
async function runAllTests() {
  try {
    console.log('🚀 Starting Template Sensor Tests...\n');
    
    await testTemplateSensor();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testTemplateValidation();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testTemplateSensorCreation();
    
    console.log('\n🎉 All template sensor tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests();