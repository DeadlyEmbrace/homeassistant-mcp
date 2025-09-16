import { spawn } from 'child_process';

// Test a specific label management tool
function testLabelTool() {
  console.log('🔍 Testing Label Management Tool...\n');

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
          
          console.log('✅ Label tool test completed!');
          
          if (result.result) {
            console.log(`Total labels found: ${result.result.total_labels || 0}`);
            console.log(`Labels in use: ${result.result.labels_in_use || 0}`);
            
            if (result.result.labels && result.result.labels.length > 0) {
              console.log('\nTop 5 labels by usage:');
              result.result.labels.slice(0, 5).forEach((label, i) => {
                console.log(`  ${i + 1}. ${label.name} (${label.total_usage || 0} uses) - ${label.color || 'no color'}`);
              });
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

    // Send get_available_labels request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_available_labels',
        arguments: {
          include_usage_stats: true,
          sort_by: 'usage'
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
testLabelTool().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});