// Test script to check Home Assistant API availability and permissions
const testHomeAssistantAPI = async () => {
  const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
  const HASS_TOKEN = process.env.HASS_TOKEN;

  if (!HASS_TOKEN) {
    console.log('❌ No HASS_TOKEN environment variable found');
    return;
  }

  console.log('🔍 Testing Home Assistant API Endpoints\n');
  console.log(`Host: ${HASS_HOST}`);
  console.log(`Token: ${HASS_TOKEN.substring(0, 20)}...`);

  // Test basic API access
  console.log('\n1. Testing basic API access...');
  try {
    const response = await fetch(`${HASS_HOST}/api/`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Message: ${data.message}`);
    } else {
      console.log(`   Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test config API endpoint
  console.log('\n2. Testing config API endpoint...');
  try {
    const response = await fetch(`${HASS_HOST}/api/config`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Version: ${data.version}`);
      console.log(`   Config Dir: ${data.config_dir}`);
    } else {
      console.log(`   Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test automation config endpoint discovery
  console.log('\n3. Testing automation config endpoint...');
  try {
    const response = await fetch(`${HASS_HOST}/api/config/automation`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      console.log(`   Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test automation config/config endpoint
  console.log('\n4. Testing automation config/config endpoint...');
  try {
    const response = await fetch(`${HASS_HOST}/api/config/automation/config`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      console.log(`   Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test getting automations via states API
  console.log('\n5. Testing automation entities...');
  try {
    const response = await fetch(`${HASS_HOST}/api/states`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const states = await response.json();
      const automations = states.filter(state => state.entity_id.startsWith('automation.'));
      console.log(`   Found ${automations.length} automation entities`);
      if (automations.length > 0) {
        console.log(`   First automation: ${automations[0].entity_id}`);
        console.log(`   Attributes: ${JSON.stringify(automations[0].attributes, null, 2)}`);
      }
    } else {
      console.log(`   Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test supervisor API (if available)
  console.log('\n6. Testing supervisor API...');
  try {
    const response = await fetch(`${HASS_HOST}/api/supervisor/info`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Supervisor available: ${data.result ? 'Yes' : 'No'}`);
    } else {
      console.log(`   Supervisor: Not available or accessible`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n📋 Summary:');
  console.log('- If basic API works but config API fails → Config component not enabled');
  console.log('- If all APIs fail → Authentication or network issue');
  console.log('- If 404 on config endpoints → Home Assistant version/setup issue');
  console.log('- Check Home Assistant logs for more details');
};

// Run the test
testHomeAssistantAPI().catch(console.error);
