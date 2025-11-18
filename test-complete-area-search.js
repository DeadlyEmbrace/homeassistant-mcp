/**
 * Test script for complete area search results
 * Tests CRITICAL ISSUE #2 fix from the improvement document
 */

const testCompleteAreaSearch = async () => {
  console.log('=== Testing Complete Area Search Results ===\n');

  const HASS_HOST = process.env.HASS_HOST || 'http://localhost:8123';
  const HASS_TOKEN = process.env.HASS_TOKEN;

  if (!HASS_TOKEN) {
    console.error('ERROR: HASS_TOKEN environment variable not set');
    process.exit(1);
  }

  // Test Case 1: Complete office area search
  console.log('Test 1: Complete office area search');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_area`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas: ['office'],
        include_area_summary: true,
        group_by: 'area',
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Total devices found: ${result.total_devices_found}`);
    console.log(`✓ Total available: ${result.total_available || result.total_devices_found}`);
    console.log(`✓ Truncated: ${result.truncated ? 'YES' : 'NO'}`);
    console.log(`✓ Search method: ${result.search_method}`);

    // Check area statistics
    if (result.area_statistics) {
      console.log('\nArea statistics:');
      Object.entries(result.area_statistics).forEach(([areaId, stats]) => {
        console.log(`  ${stats.area_info.name}:`);
        console.log(`    Total devices: ${stats.total_devices}`);
        console.log(`    Domains: ${stats.domains.join(', ')}`);
        console.log(`    States: ${stats.states.join(', ')}`);
      });
    }

    // List specific known entities that were previously missing
    const knownMissingEntities = [
      'sensor.hue_office_temperature_2',
      'sensor.hue_office_illuminance_2',
      'sensor.airthings_tern_co2_014764_temperature',
      'sensor.airthings_tern_co2_014764_humidity',
      'sensor.airthings_tern_co2_014764_carbon_dioxide',
      'sensor.presence_sensor_fp2_9f5a_light_sensor_light_level',
      'binary_sensor.presence_sensor_fp2_9f5a_presence_sensor_1',
    ];

    console.log('\nVerifying previously missing entities:');
    const allDevices = result.devices_by_area?.office || result.devices || [];
    knownMissingEntities.forEach(entityId => {
      const found = allDevices.some(d => d.entity_id === entityId);
      console.log(`  ${found ? '✓' : '✗'} ${entityId}: ${found ? 'FOUND' : 'STILL MISSING'}`);
    });

    // Count by device type
    const devicesByDomain = {};
    allDevices.forEach(device => {
      const domain = device.domain;
      devicesByDomain[domain] = (devicesByDomain[domain] || 0) + 1;
    });

    console.log('\nDevices by domain:');
    Object.entries(devicesByDomain)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, count]) => {
        console.log(`  ${domain}: ${count} devices`);
      });

  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 2: Search with high limit (ensure no artificial truncation)
  console.log('Test 2: High limit search (verify no truncation)');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_area`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas: ['office'],
        limit: 5000, // Very high limit
        group_by: 'none',
      }),
    });

    const result = await response.json();
    console.log(`✓ Total devices found: ${result.total_devices_found}`);
    console.log(`✓ Total available: ${result.total_available || result.total_devices_found}`);
    console.log(`✓ Truncated: ${result.truncated ? 'YES (unexpected!)' : 'NO (expected)'}`);

    if (result.truncated) {
      console.log('  ⚠ WARNING: Results are truncated even with high limit!');
    }

  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 3: Compare area search vs query search
  console.log('Test 3: Compare area search vs query search (consistency check)');
  try {
    // Method 1: Area search
    const areaResponse = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_area`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas: ['office'],
        group_by: 'none',
      }),
    });
    const areaResult = await areaResponse.json();

    // Method 2: Query search with area filter
    const queryResponse = await fetch(`http://localhost:4000/mcp/tools/search_devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        area: 'office',
        limit: 500,
      }),
    });
    const queryResult = await queryResponse.json();

    console.log(`Area search found: ${areaResult.total_devices_found || 0} devices`);
    console.log(`Query search found: ${queryResult.total_found || 0} devices`);

    const difference = Math.abs(
      (areaResult.total_devices_found || 0) - (queryResult.total_found || 0)
    );
    console.log(`Difference: ${difference} devices`);

    if (difference > 10) {
      console.log('  ⚠ WARNING: Significant difference between methods!');
    } else {
      console.log('  ✓ Results are reasonably consistent');
    }

    // Check for specific entities in both
    const testEntity = 'sensor.hue_office_temperature_2';
    const inAreaSearch = (areaResult.devices || []).some(d => d.entity_id === testEntity);
    const inQuerySearch = (queryResult.devices || []).some(d => d.entity_id === testEntity);

    console.log(`\nTest entity "${testEntity}":`);
    console.log(`  In area search: ${inAreaSearch ? 'YES' : 'NO'}`);
    console.log(`  In query search: ${inQuerySearch ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 4: Multiple areas at once
  console.log('Test 4: Multiple areas search');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_area`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas: ['office', 'living room', 'bedroom'],
        include_area_summary: true,
        group_by: 'area',
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);
    console.log(`✓ Areas searched: ${result.total_areas_searched}`);
    console.log(`✓ Total devices: ${result.total_devices_found}`);

    if (result.devices_by_area) {
      console.log('\nDevices per area:');
      Object.entries(result.devices_by_area).forEach(([areaId, devices]) => {
        const areaName = result.area_statistics?.[areaId]?.area_info?.name || areaId;
        console.log(`  ${areaName}: ${devices.length} devices`);
      });
    }

  } catch (error) {
    console.error('✗ Test 4 failed:', error.message);
  }

  console.log('\n---\n');

  // Test Case 5: Group by domain
  console.log('Test 5: Group by domain (organizational view)');
  try {
    const response = await fetch(`http://localhost:4000/mcp/tools/search_devices_by_area`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areas: ['office'],
        group_by: 'domain',
      }),
    });

    const result = await response.json();
    console.log(`✓ Success: ${result.success}`);

    if (result.devices_by_domain) {
      console.log('\nDevices grouped by domain:');
      Object.entries(result.devices_by_domain)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([domain, devices]) => {
          console.log(`  ${domain}: ${devices.length} devices`);
        });
    }

  } catch (error) {
    console.error('✗ Test 5 failed:', error.message);
  }

  console.log('\n=== Tests Complete ===\n');
};

// Run tests
testCompleteAreaSearch().catch(console.error);
