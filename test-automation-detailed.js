import { spawn } from 'child_process';

// Test the automation creation with detailed error output
function testAutomationCreationDetailed() {
  console.log('🔍 Testing Automation Creation with Detailed Output...\n');

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
          
          console.log('📋 Full Response:');
          console.log(JSON.stringify(result, null, 2));
          console.log();
          
          if (result.result && result.result.success) {
            console.log('✅ Automation creation succeeded!');
          } else {
            console.log('❌ Automation creation failed');
            console.log('Error details:', result.result);
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
          console.error('❌ Process failed');
          console.error('Error output:', errorOutput);
          console.log('Standard output:', output);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Send a simpler automation request for testing
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'automation',
        arguments: {
          action: 'create',
          alias: 'Simple Test Light',
          mode: 'single',
          description: 'Simple test automation',
          triggers: '[{"platform": "state", "entity_id": "binary_sensor.motion_sensor", "to": "on"}]',
          action_config: '[{"service": "light.turn_on", "target": {"entity_id": "light.test_light"}}]'
        }
      }
    };
    
    console.log('Sending simplified automation request...');
    
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    // Timeout after 20 seconds
    setTimeout(() => {
      if (!responded) {
        child.kill();
        reject(new Error('Timeout waiting for response'));
      }
    }, 20000);
  });
}

// Run the test
testAutomationCreationDetailed().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});