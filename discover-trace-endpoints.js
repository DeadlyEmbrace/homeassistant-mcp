#!/usr/bin/env node

// Script to test and discover actual Home Assistant trace API endpoints
import fetch from 'node-fetch';

const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN;

async function discoverTraceEndpoints() {
  if (!HASS_TOKEN) {
    console.log('❌ No HASS_TOKEN environment variable found');
    return;
  }

  console.log('🔍 Discovering Home Assistant Trace API Endpoints\n');
  console.log(`Host: ${HASS_HOST}`);
  console.log(`Token: ${HASS_TOKEN.substring(0, 20)}...`);

  // First, get a list of automations to work with
  console.log('\n1. Getting automation list...');
  try {
    const response = await fetch(`${HASS_HOST}/api/states`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ Failed to get states: ${response.status} ${response.statusText}`);
      return;
    }

    const states = await response.json();
    const automations = states.filter(state => state.entity_id.startsWith('automation.'));
    
    if (automations.length === 0) {
      console.log('❌ No automations found');
      return;
    }

    console.log(`✅ Found ${automations.length} automations`);
    
    // Use the first automation for testing
    const testAutomation = automations[0];
    const entityId = testAutomation.entity_id;
    const numericId = entityId.substring('automation.'.length);
    
    console.log(`\n📋 Testing with automation: ${entityId}`);
    console.log(`   Numeric ID: ${numericId}`);
    console.log(`   Friendly Name: ${testAutomation.attributes.friendly_name || 'N/A'}`);

    // Test various trace endpoint formats
    const endpointTests = [
      // Based on Home Assistant frontend patterns
      `/api/trace/automation/${numericId}`,
      `/api/automation/trace/${numericId}`,
      `/api/config/automation/trace/${numericId}`,
      
      // Entity ID based
      `/api/trace/${entityId}`,
      `/api/automation/trace/${entityId}`,
      
      // WebSocket API equivalent REST endpoints (might not exist)
      `/api/logbook/${entityId}`,
      `/api/history/period?filter_entity_id=${entityId}`,
      
      // Try with recent timestamp
      `/api/logbook/automation/${numericId}`,
      
      // Check if there's a traces endpoint at all
      `/api/traces`,
      `/api/trace`,
      `/api/automation/traces`
    ];

    console.log('\n2. Testing potential trace endpoints...');
    
    for (const endpoint of endpointTests) {
      console.log(`\nTesting: ${endpoint}`);
      try {
        const testResponse = await fetch(`${HASS_HOST}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`);
        
        if (testResponse.ok) {
          const contentType = testResponse.headers.get('content-type');
          console.log(`   Content-Type: ${contentType}`);
          
          if (contentType && contentType.includes('application/json')) {
            const data = await testResponse.json();
            
            if (Array.isArray(data)) {
              console.log(`   ✅ SUCCESS: Got array with ${data.length} items`);
              if (data.length > 0) {
                console.log(`   Sample item keys: ${Object.keys(data[0]).join(', ')}`);
              }
            } else if (typeof data === 'object' && data !== null) {
              console.log(`   ✅ SUCCESS: Got object with keys: ${Object.keys(data).join(', ')}`);
            } else {
              console.log(`   ✅ SUCCESS: Got data: ${JSON.stringify(data).substring(0, 100)}...`);
            }
          } else {
            const text = await testResponse.text();
            console.log(`   ✅ SUCCESS: Got text (${text.length} chars): ${text.substring(0, 100)}...`);
          }
        } else if (testResponse.status === 404) {
          console.log(`   ❌ Not found`);
        } else if (testResponse.status === 403) {
          console.log(`   ❌ Forbidden - might need different permissions`);
        } else {
          const errorText = await testResponse.text();
          console.log(`   ❌ Error: ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`   ❌ Exception: ${error.message}`);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test the history API which might contain trace-like information
    console.log('\n3. Testing history API for trace-like data...');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const historyEndpoint = `/api/history/period/${yesterday.toISOString()}?filter_entity_id=${entityId}`;
    
    try {
      console.log(`Testing: ${historyEndpoint}`);
      const historyResponse = await fetch(`${HASS_HOST}${historyEndpoint}`, {
        headers: {
          'Authorization': `Bearer ${HASS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Status: ${historyResponse.status} ${historyResponse.statusText}`);
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        console.log(`   ✅ Got history data: ${JSON.stringify(historyData).substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ History API error: ${error.message}`);
    }

    // Test logbook API
    console.log('\n4. Testing logbook API...');
    const logbookEndpoint = `/api/logbook/${yesterday.toISOString()}?entity=${entityId}`;
    
    try {
      console.log(`Testing: ${logbookEndpoint}`);
      const logbookResponse = await fetch(`${HASS_HOST}${logbookEndpoint}`, {
        headers: {
          'Authorization': `Bearer ${HASS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Status: ${logbookResponse.status} ${logbookResponse.statusText}`);
      
      if (logbookResponse.ok) {
        const logbookData = await logbookResponse.json();
        console.log(`   ✅ Got logbook data: ${Array.isArray(logbookData) ? logbookData.length + ' entries' : 'object'}`);
        if (Array.isArray(logbookData) && logbookData.length > 0) {
          console.log(`   Sample entry keys: ${Object.keys(logbookData[0]).join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Logbook API error: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Error during discovery: ${error.message}`);
    console.error('Stack trace:', error.stack);
  }
}

// Also test if we can find any documentation about available endpoints
async function testEndpointDiscovery() {
  if (!HASS_TOKEN) return;

  console.log('\n5. Testing endpoint discovery...');
  
  // Test the main API endpoint to see what's available
  try {
    const response = await fetch(`${HASS_HOST}/api/`, {
      headers: {
        'Authorization': `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const apiInfo = await response.json();
      console.log(`API Info: ${JSON.stringify(apiInfo, null, 2)}`);
    }
  } catch (error) {
    console.log(`API discovery error: ${error.message}`);
  }
}

// Main execution
async function main() {
  await discoverTraceEndpoints();
  await testEndpointDiscovery();
  
  console.log('\n📝 Summary:');
  console.log('This script tested various potential trace API endpoints.');
  console.log('Look for "✅ SUCCESS" entries above to identify working endpoints.');
  console.log('The trace functionality might only be available via WebSocket API.');
  console.log('\n💡 Next steps:');
  console.log('1. If no trace endpoints work, implement WebSocket-based trace retrieval');
  console.log('2. Use logbook/history APIs as alternative for trace-like information');
  console.log('3. Check Home Assistant version - trace API might be version-specific');
}

main().catch(error => {
  console.error('Discovery failed:', error);
  process.exit(1);
});