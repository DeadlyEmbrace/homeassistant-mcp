import 'dotenv/config';
import { HassWebSocketClient } from './dist/src/websocket/client.js';

async function testWebSocketConnection() {
  console.log('🔍 Testing WebSocket Connection...\n');
  
  try {
    const client = new HassWebSocketClient(
      process.env.HASS_SOCKET_URL || 'ws://homeassistant.local:8123/api/websocket',
      process.env.HASS_TOKEN || ''
    );
    
    console.log('Connecting to Home Assistant...');
    console.log('WebSocket URL:', process.env.HASS_SOCKET_URL);
    console.log('Token present:', !!process.env.HASS_TOKEN);
    
    try {
      const connected = await client.connect();
      
      if (connected) {
        console.log('✅ Connected successfully!');
        
        // Test label registry
        console.log('\nTesting label registry...');
        const labels = await client.callWS({ type: 'config/label_registry/list' });
        console.log(`Found ${labels.length} labels`);
        
        // Test entity registry
        console.log('\nTesting entity registry...');
        const entities = await client.callWS({ type: 'config/entity_registry/list' });
        console.log(`Found ${entities.length} entities`);
        
        // Test device registry  
        console.log('\nTesting device registry...');
        const devices = await client.callWS({ type: 'config/device_registry/list' });
        console.log(`Found ${devices.length} devices`);
        
        // Count entities and devices with labels
        const entitiesWithLabels = entities.filter(e => e.labels && e.labels.length > 0);
        const devicesWithLabels = devices.filter(d => d.labels && d.labels.length > 0);
        
        console.log(`\nEntities with labels: ${entitiesWithLabels.length}`);
        console.log(`Devices with labels: ${devicesWithLabels.length}`);
        
        console.log('\n🎉 WebSocket connection test completed successfully!');
        
      } else {
        console.error('❌ Failed to connect to Home Assistant - connection returned false');
      }
    } catch (connectError) {
      console.error('❌ Connection error:', connectError.message);
      console.error('Full error:', connectError);
    }
    
    await client.disconnect();
    
  } catch (error) {
    console.error('❌ Error testing WebSocket connection:', error.message);
    console.error('Full error:', error);
  }
}

testWebSocketConnection();