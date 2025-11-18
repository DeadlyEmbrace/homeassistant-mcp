/**
 * Test script for enhanced search_devices functionality
 * Tests combined filter support and pagination
 */

const testEnhancedSearch = async () => {
  console.log('=== Testing Enhanced Search Devices ===\n');

  const HASS_HOST = process.env.HASS_HOST || 'http://localhost:8123';
  const HASS_TOKEN = process.env.HASS_TOKEN;

  if (!HASS_TOKEN) {
    console.error('ERROR: HASS_TOKEN environment variable not set');
    process.exit(1);
  }

  // Test Case 1: Combined area + labels filter
  console.log('Test 1: Combined area + labels filter');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        area: 'office',
        labels: ['office'],
        include_area_info: true,
        include_label_info: true,
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Total found: ${result.total_found}`);
    console.log(`✓ Returned: ${result.returned}`);
    console.log(`✓ Filters applied:`, result.filters_applied);

    // Verify all results have office area and office label
    const allMatch = result.devices?.every(d => 
      d.area?.name?.toLowerCase().includes('office') &&
      d.label_names?.some(l => l.toLowerCase().includes('office'))
    );
    console.log(`✓ All devices match area AND label: ${allMatch ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 2: Area + domain + device_class filter
  console.log('Test 2: Area + domain + device_class (temperature sensors in office)');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        area: 'office',
        domain: 'sensor',
        device_class: 'temperature',
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Total found: ${result.total_found}`);
    
    // List all temperature sensors found
    console.log('\nTemperature sensors in office:');
    result.devices?.forEach(device => {
      console.log(`  - ${device.friendly_name}: ${device.state}${device.attributes?.unit_of_measurement || ''}`);
      console.log(`    Entity: ${device.entity_id}`);
      console.log(`    Area: ${device.area?.name || 'none'}`);
    });

    // Verify known sensors are present
    const knownSensors = [
      'sensor.hue_office_temperature_2',
      'sensor.airthings_tern_co2_014764_temperature',
    ];

    console.log('\nVerifying known sensors:');
    knownSensors.forEach(entityId => {
      const found = result.devices?.some(d => d.entity_id === entityId);
      console.log(`  ${found ? '✓' : '✗'} ${entityId}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    });

  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 3: Pagination with offset
  console.log('Test 3: Pagination with offset');
  try {
    // Get first page
    const response1 = await fetch(`http://localhost:4000/mcp/tools/search_devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'sensor',
        limit: 10,
        offset: 0,
      }),
    });

    const result1 = await response1.json();
    console.log(`✓ Page 1: ${result1.returned} devices`);
    console.log(`✓ Total available: ${result1.total_found}`);
    console.log(`✓ Has more: ${result1.has_more}`);
    console.log(`✓ Offset: ${result1.offset}, Limit: ${result1.limit}`);

    // Get second page
    if (result1.has_more) {
      const response2 = await fetch(`http://localhost:4000/mcp/tools/search_devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: 'sensor',
          limit: 10,
          offset: 10,
        }),
      });

      const result2 = await response2.json();
      console.log(`✓ Page 2: ${result2.returned} devices`);
      console.log(`✓ Offset: ${result2.offset}, Limit: ${result2.limit}`);

      // Verify no overlap
      const page1Ids = new Set(result1.devices?.map(d => d.entity_id) || []);
      const page2Ids = new Set(result2.devices?.map(d => d.entity_id) || []);
      const overlap = [...page1Ids].filter(id => page2Ids.has(id));
      console.log(`✓ No overlap between pages: ${overlap.length === 0 ? 'PASSED' : 'FAILED'}`);
    }

  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 4: Label info included by default
  console.log('Test 4: Label information included automatically');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'office',
        limit: 5,
        include_label_info: true,
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    
    // Check if labels are included
    const hasLabels = result.devices?.some(d => d.labels && d.labels.length > 0);
    console.log(`✓ Devices have label information: ${hasLabels ? 'YES' : 'NO'}`);

    if (hasLabels) {
      console.log('\nDevices with labels:');
      result.devices?.filter(d => d.labels?.length > 0).forEach(device => {
        console.log(`  - ${device.friendly_name}`);
        console.log(`    Labels: ${device.label_names?.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('✗ Test 4 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 5: Response structure consistency
  console.log('Test 5: Consistent response structure');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'light',
        limit: 5,
      }),
    });

    const result = await response.json();
    
    // Check for required response fields
    const requiredFields = [
      'success',
      'total_found',
      'returned',
      'offset',
      'limit',
      'has_more',
      'devices',
      'filters_applied',
    ];

    console.log('Checking response structure:');
    requiredFields.forEach(field => {
      const exists = field in result;
      console.log(`  ${exists ? '✓' : '✗'} ${field}: ${exists ? 'present' : 'MISSING'}`);
    });

    // Check device structure
    if (result.devices?.length > 0) {
      const device = result.devices[0];
      const deviceFields = [
        'entity_id',
        'state',
        'friendly_name',
        'domain',
        'last_changed',
      ];

      console.log('\nChecking device structure:');
      deviceFields.forEach(field => {
        const exists = field in device;
        console.log(`  ${exists ? '✓' : '✗'} ${field}: ${exists ? 'present' : 'MISSING'}`);
      });
    }

  } catch (error) {
    console.error('✗ Test 5 failed:', error.message);
  }

  console.log('\n=== Tests Complete ===\n');
};

// Run tests
testEnhancedSearch().catch(console.error);
