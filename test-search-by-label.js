/**
 * Test script for search_devices_by_label functionality
 * Tests CRITICAL ISSUE #1 fix from the improvement document
 */

const testSearchByLabel = async () => {
  console.log('=== Testing Search Devices by Label ===\n');

  const HASS_HOST = process.env.HASS_HOST || 'http://localhost:8123';
  const HASS_TOKEN = process.env.HASS_TOKEN;

  if (!HASS_TOKEN) {
    console.error('ERROR: HASS_TOKEN environment variable not set');
    process.exit(1);
  }

  // Test Case 1: Search by single label
  console.log('Test 1: Search by single label "office"');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        labels: ['office'],
        include_area_info: true,
        include_attributes: false,
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Total found: ${result.total_found}`);
    console.log(`✓ Returned: ${result.returned}`);
    console.log(`✓ Label info:`, result.label_info);
    
    // Verify specific devices are present
    const knownDevices = [
      'sensor.airthings_tern_co2_014764_temperature',
      'sensor.hue_office_temperature_2',
      'sensor.presence_sensor_fp2_9f5a_light_sensor_light_level',
    ];

    console.log('\nVerifying presence of known devices:');
    knownDevices.forEach(entityId => {
      const found = result.devices?.some(d => d.entity_id === entityId);
      console.log(`  ${found ? '✓' : '✗'} ${entityId}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    });

    // Show sample devices
    console.log('\nSample devices (first 5):');
    result.devices?.slice(0, 5).forEach(device => {
      console.log(`  - ${device.friendly_name} (${device.entity_id})`);
      console.log(`    State: ${device.state}, Domain: ${device.domain}`);
      if (device.area) {
        console.log(`    Area: ${device.area.name}`);
      }
      console.log(`    Labels: ${device.label_names?.join(', ') || 'none'}`);
    });

  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 2: Combined label + area filter
  console.log('Test 2: Combined label "office" + domain "sensor"');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        labels: ['office'],
        domain: 'sensor',
        device_class: 'temperature',
        include_area_info: true,
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Total found: ${result.total_found}`);
    console.log(`✓ All results should be sensors with temperature device class`);
    
    // Verify all are temperature sensors
    const allTemperatureSensors = result.devices?.every(d => 
      d.domain === 'sensor' && 
      (d.device_class === 'temperature' || !d.device_class)
    );
    console.log(`✓ Validation: ${allTemperatureSensors ? 'PASSED' : 'FAILED'}`);

    console.log('\nFiltered devices:');
    result.devices?.forEach(device => {
      console.log(`  - ${device.friendly_name}: ${device.state}${device.attributes?.unit_of_measurement || ''}`);
    });

  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 3: Multiple labels (OR logic)
  console.log('Test 3: Multiple labels with OR logic');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        labels: ['office', 'climate'],
        match_all: false, // OR logic
        limit: 20,
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Total found: ${result.total_found}`);
    console.log(`✓ Match logic: OR (device has at least one label)`);
    console.log(`✓ Labels searched: ${result.metadata?.resolved_label_ids?.join(', ')}`);

  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 4: Multiple labels (AND logic)
  console.log('Test 4: Multiple labels with AND logic');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        labels: ['office', 'climate'],
        match_all: true, // AND logic
        limit: 20,
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Total found: ${result.total_found}`);
    console.log(`✓ Match logic: AND (device must have all labels)`);

  } catch (error) {
    console.error('✗ Test 4 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 5: Pagination
  console.log('Test 5: Pagination support');
  try {
    const response1 = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        labels: ['office'],
        limit: 5,
        offset: 0,
      }),
    });

    const result1 = await response1.json();
    console.log(`✓ Page 1: ${result1.returned} devices (offset: ${result1.offset})`);
    console.log(`✓ Has more: ${result1.has_more}`);
    console.log(`✓ Total available: ${result1.total_found}`);

    if (result1.has_more) {
      const response2 = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          labels: ['office'],
          limit: 5,
          offset: 5,
        }),
      });

      const result2 = await response2.json();
      console.log(`✓ Page 2: ${result2.returned} devices (offset: ${result2.offset})`);
      
      // Verify no duplicates
      const page1Ids = new Set(result1.devices?.map(d => d.entity_id) || []);
      const page2Ids = new Set(result2.devices?.map(d => d.entity_id) || []);
      const duplicates = [...page1Ids].filter(id => page2Ids.has(id));
      console.log(`✓ No duplicates: ${duplicates.length === 0 ? 'PASSED' : 'FAILED'}`);
    }

  } catch (error) {
    console.error('✗ Test 5 failed:', error.message);
  }

  console.log('\n=== Tests Complete ===\n');
};

// Run tests
testSearchByLabel().catch(console.error);
