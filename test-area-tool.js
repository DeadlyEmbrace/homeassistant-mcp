import { spawn } from 'child_process';

// Test the working area tool to verify WebSocket is functioning
function testAreaTool() {
  console.log('🔍 Testing Area Tool (Known Working)...\n');

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
          
          console.log('✅ Area tool test completed!');
          
          if (result.result) {
            if (result.result.success) {
              console.log(`Total areas: ${result.result.total_areas || 0}`);
              
              if (result.result.areas && result.result.areas.length > 0) {
                console.log('\nFirst 3 areas:');
                result.result.areas.slice(0, 3).forEach((area, i) => {
                  console.log(`  ${i + 1}. ${area.name} (${area.area_id})`);
                });
              }
            } else {
              console.log(`❌ Area tool failed: ${result.result.message}`);
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

    // Send get_available_areas request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_available_areas',
        arguments: {}
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
testAreaTool().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});