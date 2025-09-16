import { spawn } from 'child_process';

// Test device labels tool
function testDeviceLabels() {
  console.log('🔍 Testing Device Labels Tool...\n');

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
          
          console.log('✅ Device labels tool test completed!');
          
          if (result.result) {
            if (result.result.success) {
              console.log(`Total entities: ${result.result.total_entities || 0}`);
              console.log(`Total devices: ${result.result.total_devices || 0}`);
              
              if (result.result.devices && result.result.devices.length > 0) {
                console.log('\nDevices found:');
                result.result.devices.slice(0, 3).forEach((device, i) => {
                  console.log(`  ${i + 1}. ${device.name} - ${device.labels?.length || 0} labels`);
                });
              }
              
              if (result.result.entities && result.result.entities.length > 0) {
                console.log('\nEntities found:');
                result.result.entities.slice(0, 3).forEach((entity, i) => {
                  console.log(`  ${i + 1}. ${entity.entity_id} - ${entity.labels?.length || 0} labels`);
                });
              }
            } else {
              console.log(`❌ Tool failed: ${result.result.message}`);
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
          console.error('❌ Tool test failed');
          console.error('Error output:', errorOutput);
          console.log('Standard output:', output);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Send get_device_labels request for devices with "Living" in the name
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_device_labels',
        arguments: {
          device_names: ['Living'],
          include_label_details: true,
          show_unlabeled: true
        }
      }
    };
    
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

// Run the test
testDeviceLabels().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});