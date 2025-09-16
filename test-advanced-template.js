import { spawn } from 'child_process';

// Test advanced template sensor creation
function testAdvancedTemplateSensor() {
  console.log('🔬 Testing Advanced Template Sensor Creation...\n');

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
          
          console.log('📋 Advanced Template Sensor Response:');
          
          if (result.result && result.result.content) {
            const content = JSON.parse(result.result.content[0].text);
            
            if (content.success) {
              console.log('✅ Advanced template sensor creation successful!');
              console.log(`Message: ${content.message}`);
              console.log(`Sensor Name: ${content.sensor_name}`);
              console.log(`Entity ID: ${content.entity_id}`);
              
              if (content.yaml_configuration) {
                console.log('\n📄 Generated YAML Configuration:');
                console.log(content.yaml_configuration);
                console.log('\n📖 This template sensor demonstrates:');
                console.log('  • Complex Jinja2 template with calculations');
                console.log('  • Custom attributes with their own templates');
                console.log('  • Proper device class and state class');
                console.log('  • Availability template for reliability');
                console.log('  • Unit of measurement and icon');
              }
            } else {
              console.log(`❌ Creation failed: ${content.message}`);
            }
          }
          
          resolve(result);
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message);
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
          console.error('❌ Advanced template test failed');
          console.error('Error output:', errorOutput);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Test creating an advanced template sensor with attributes
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'template_sensor',
        arguments: {
          action: 'create',
          sensor_name: 'advanced_power_consumption',
          friendly_name: 'Advanced Power Consumption',
          value_template: '{% set total = 0 %}{% for entity in states.sensor %}{% if "power" in entity.entity_id and entity.state | float > 0 %}{% set total = total + (entity.state | float) %}{% endif %}{% endfor %}{{ total | round(2) }}',
          unit_of_measurement: 'W',
          device_class: 'power',
          state_class: 'measurement',
          icon: 'mdi:lightning-bolt',
          unique_id: 'mcp_advanced_power_consumption',
          availability_template: '{{ states("sensor.energy_meter") not in ["unknown", "unavailable"] }}',
          attributes: {
            'device_count': '{% set count = 0 %}{% for entity in states.sensor %}{% if "power" in entity.entity_id and entity.state | float > 0 %}{% set count = count + 1 %}{% endif %}{% endfor %}{{ count }}',
            'highest_consumer': '{% set max_power = 0 %}{% set max_entity = "" %}{% for entity in states.sensor %}{% if "power" in entity.entity_id and entity.state | float > max_power %}{% set max_power = entity.state | float %}{% set max_entity = entity.name %}{% endif %}{% endfor %}{{ max_entity }}',
            'calculation_time': '{{ now().strftime("%Y-%m-%d %H:%M:%S") }}'
          }
        }
      }
    };
    
    console.log('Creating advanced template sensor with attributes and complex logic...');
    
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    setTimeout(() => {
      if (!responded) {
        child.kill();
        reject(new Error('Timeout waiting for advanced creation response'));
      }
    }, 15000);
  });
}

testAdvancedTemplateSensor().catch(error => {
  console.error('Advanced test failed:', error.message);
  process.exit(1);
});