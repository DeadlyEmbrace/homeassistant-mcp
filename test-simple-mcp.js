import { spawn } from 'child_process';

// Test the MCP server with a simple tools/list call
function testMCPServer() {
  console.log('🔍 Testing MCP Server...\n');

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
          
          console.log('✅ MCP Server is working!');
          console.log(`Tools available: ${result.result?.tools?.length || 0}`);
          
          if (result.result?.tools) {
            const labelTools = result.result.tools.filter(t => t.name.includes('label'));
            console.log(`Label management tools: ${labelTools.length}`);
            labelTools.forEach(tool => console.log(`  - ${tool.name}`));
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
          console.error('❌ MCP Server failed to start');
          console.error('Error output:', errorOutput);
          console.log('Standard output:', output);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          reject(new Error('No response received'));
        }
      }
    });

    // Send tools/list request
    const request = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!responded) {
        child.kill();
        reject(new Error('Timeout waiting for response'));
      }
    }, 10000);
  });
}

// Run the test
testMCPServer().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});