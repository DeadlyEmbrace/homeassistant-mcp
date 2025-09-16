import { config } from 'dotenv';
config();

import { HassWebSocketClient } from './dist/src/websocket/client.js';

const HASS_HOST = process.env.HASS_HOST;
const HASS_TOKEN = process.env.HASS_TOKEN;

console.log('🏷️ Investigating Label Management API...');

async function investigateLabels() {
  const wsUrl = HASS_HOST.replace('http', 'ws') + '/api/websocket';
  const client = new HassWebSocketClient(wsUrl, HASS_TOKEN);

  try {
    await client.connect();
    console.log('✅ WebSocket connected');

    // Test different label-related commands
    const commands = [
      { type: 'config/label_registry/list' },
      { type: 'config/label_registry/create', name: 'test_label' },
      { type: 'config/label_registry/update' },
      { type: 'config/label_registry/delete' },
    ];

    for (const command of commands) {
      try {
        console.log(`\nTesting: ${command.type}`);
        
        if (command.type === 'config/label_registry/create') {
          // Try to create a test label to see the API structure
          const result = await client.callWS(command);
          console.log(`✅ Success! Created label:`, JSON.stringify(result, null, 2));
          
          // Delete it immediately
          if (result.label_id) {
            await client.callWS({
              type: 'config/label_registry/delete',
              label_id: result.label_id
            });
            console.log(`🗑️ Deleted test label`);
          }
        } else if (command.type === 'config/label_registry/list') {
          const result = await client.callWS(command);
          console.log(`✅ Success! Found ${result.length} labels`);
          if (result.length > 0) {
            console.log('Sample label:', JSON.stringify(result[0], null, 2));
          }
        }
        
      } catch (error) {
        console.log(`❌ ${command.type}: ${error.message}`);
      }
    }

    // Check if entities and devices have label information
    console.log('\n🔍 Checking entity and device label support...');
    
    const [entities, devices] = await Promise.all([
      client.callWS({ type: 'config/entity_registry/list' }),
      client.callWS({ type: 'config/device_registry/list' })
    ]);

    // Look for entities with labels
    const entitiesWithLabels = entities.filter(entity => entity.labels && entity.labels.length > 0);
    console.log(`📋 Entities with labels: ${entitiesWithLabels.length}`);
    if (entitiesWithLabels.length > 0) {
      console.log('Sample entity with labels:', {
        entity_id: entitiesWithLabels[0].entity_id,
        labels: entitiesWithLabels[0].labels
      });
    }

    // Look for devices with labels
    const devicesWithLabels = devices.filter(device => device.labels && device.labels.length > 0);
    console.log(`🔧 Devices with labels: ${devicesWithLabels.length}`);
    if (devicesWithLabels.length > 0) {
      console.log('Sample device with labels:', {
        name: devicesWithLabels[0].name,
        labels: devicesWithLabels[0].labels
      });
    }

    // Check entity structure for label support
    const sampleEntity = entities[0];
    console.log('\n📝 Sample entity structure:');
    console.log(Object.keys(sampleEntity));

    const sampleDevice = devices[0];
    console.log('\n🔧 Sample device structure:');
    console.log(Object.keys(sampleDevice));

    client.disconnect();

  } catch (error) {
    console.error('❌ Investigation error:', error.message);
  }
}

investigateLabels();