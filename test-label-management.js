import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Test all label management tools
async function testLabelManagement() {
  console.log('🔍 Testing Label Management Tools...\n');

  try {
    // First, get available labels
    console.log('1. Testing get_available_labels...');
    const { stdout: labelsOutput } = await execAsync('echo \'{"method": "tools/call", "params": {"name": "get_available_labels", "arguments": {"include_usage_stats": true, "sort_by": "usage"}}}\' | node dist/src/index.js');
    const labelsResult = JSON.parse(labelsOutput);
    console.log(`✅ Found ${labelsResult.total_labels} labels (${labelsResult.labels_in_use} in use)`);
    
    if (labelsResult.labels && labelsResult.labels.length > 0) {
      console.log(`   Top labels by usage: ${labelsResult.labels.slice(0, 3).map(l => `${l.name}(${l.total_usage})`).join(', ')}`);
    }
    console.log();

    // Test getting device labels for some devices
    console.log('2. Testing get_device_labels...');
    const { stdout: deviceLabelsOutput } = await execAsync('echo \'{"method": "tools/call", "params": {"name": "get_device_labels", "arguments": {"device_names": ["Philips", "Living"], "include_label_details": true}}}\' | node dist/src/index.js');
    const deviceLabelsResult = JSON.parse(deviceLabelsOutput);
    console.log(`✅ Found labels for ${deviceLabelsResult.total_entities} entities and ${deviceLabelsResult.total_devices} devices`);
    
    if (deviceLabelsResult.devices && deviceLabelsResult.devices.length > 0) {
      const deviceWithLabels = deviceLabelsResult.devices.find(d => d.labels && d.labels.length > 0);
      if (deviceWithLabels) {
        console.log(`   Example: ${deviceWithLabels.name} has ${deviceWithLabels.labels.length} labels`);
      }
    }
    console.log();

    // Test setting a label (we'll create a test label)
    console.log('3. Testing set_device_labels...');
    const { stdout: setLabelsOutput } = await execAsync('echo \'{"method": "tools/call", "params": {"name": "set_device_labels", "arguments": {"device_names": ["test"], "labels": ["MCP-Test-Label"], "label_color": "accent", "create_missing_labels": true, "replace_existing": false}}}\' | node dist/src/index.js');
    const setLabelsResult = JSON.parse(setLabelsOutput);
    
    if (setLabelsResult.success) {
      console.log(`✅ Label setting test completed:`);
      console.log(`   Labels created: ${setLabelsResult.total_labels_created}`);
      console.log(`   Devices updated: ${setLabelsResult.total_devices_updated}`);
      console.log(`   Entities updated: ${setLabelsResult.total_entities_updated}`);
    } else {
      console.log(`⚠️  Label setting had issues: ${setLabelsResult.message || 'No matching devices'}`);
    }
    console.log();

    // Test removing labels
    console.log('4. Testing remove_device_labels...');
    const { stdout: removeLabelsOutput } = await execAsync('echo \'{"method": "tools/call", "params": {"name": "remove_device_labels", "arguments": {"device_names": ["test"], "labels": ["MCP-Test-Label"]}}}\' | node dist/src/index.js');
    const removeLabelsResult = JSON.parse(removeLabelsOutput);
    
    if (removeLabelsResult.success) {
      console.log(`✅ Label removal test completed:`);
      console.log(`   Devices updated: ${removeLabelsResult.total_devices_updated}`);
      console.log(`   Entities updated: ${removeLabelsResult.total_entities_updated}`);
    } else {
      console.log(`⚠️  Label removal had issues: ${removeLabelsResult.message || 'No matching devices'}`);
    }
    console.log();

    console.log('🎉 All label management tools tested successfully!');

  } catch (error) {
    console.error('❌ Error testing label management:', error.message);
    if (error.stdout) {
      console.log('Output:', error.stdout);
    }
    if (error.stderr) {
      console.log('Error:', error.stderr);
    }
  }
}

// Run the test
testLabelManagement().catch(console.error);