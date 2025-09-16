import { spawn } from 'child_process';

// Test the automation creation with the exact same parameters that failed
function testAutomationCreation() {
  console.log('🔍 Testing Automation Creation Fix...\n');

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
          
          console.log('✅ Automation creation test completed!');
          
          if (result.result && result.result.success) {
            console.log(`Success: ${result.result.message}`);
            console.log(`Automation ID: ${result.result.automation_id}`);
            console.log(`Entity ID: ${result.result.entity_id}`);
            console.log(`Source: ${result.result.source}`);
          } else {
            console.log(`❌ Creation failed: ${result.result?.message || 'Unknown error'}`);
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
          console.error('❌ Automation test failed');
          console.error('Error output:', errorOutput);
          console.log('Standard output:', output);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Send the exact automation request that was failing
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'automation',
        arguments: {
          mode: 'single',
          alias: 'Test Automation - Motion Light',
          action: 'create',
          triggers: '[{"platform": "state", "entity_id": "binary_sensor.motion_sensor", "to": "on"}]',
          description: 'A test automation that demonstrates basic trigger and action functionality',
          action_config: '[{"service": "light.turn_on", "target": {"entity_id": "light.test_light"}, "data": {"brightness": 255}}]'
        }
      }
    };
    
    console.log('Sending automation creation request...');
    console.log('Request:', JSON.stringify(request, null, 2));
    console.log();
    
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
testAutomationCreation().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});