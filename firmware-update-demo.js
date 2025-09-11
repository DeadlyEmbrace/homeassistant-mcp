#!/usr/bin/env node

/**
 * Firmware Update API Demo
 * 
 * This script demonstrates the firmware update capabilities of the Home Assistant MCP server.
 * It shows how to list, install, skip, and manage firmware updates for devices.
 */

const HASS_HOST = process.env.HASS_HOST || 'http://localhost:8123';
const HASS_TOKEN = process.env.HASS_TOKEN || 'your_token_here';

console.log('🔧 Home Assistant MCP - Firmware Update Demo\n');

// Example firmware update entities that might be available
const exampleUpdates = [
  {
    entity_id: 'update.router_firmware',
    state: 'on',
    title: 'Router Firmware',
    installed_version: '1.2.3',
    latest_version: '1.3.0',
    release_summary: 'Security fixes and performance improvements',
    device_class: 'firmware'
  },
  {
    entity_id: 'update.smart_bulb_firmware',
    state: 'off', 
    title: 'Smart Bulb Firmware',
    installed_version: '2.1.0',
    latest_version: '2.1.0',
    device_class: 'firmware'
  },
  {
    entity_id: 'update.thermostat_firmware',
    state: 'on',
    title: 'Thermostat Firmware', 
    installed_version: '3.4.1',
    latest_version: '3.5.0',
    release_summary: 'New energy saving features',
    device_class: 'firmware'
  }
];

console.log('📋 Example firmware update scenarios:\n');

// List available updates
console.log('1. 📋 List Available Updates');
console.log('   GET /firmware_updates');
console.log('   Tool: { "tool": "firmware_update", "action": "list" }');
console.log('   Response: Returns all update entities with current status\n');

// Install update examples
console.log('2. ⬇️ Install Firmware Update');
console.log('   POST /firmware_updates/install');
console.log('   Body: {');
console.log('     "entity_id": "update.router_firmware",');
console.log('     "version": "1.3.0",');
console.log('     "backup": true');
console.log('   }');
console.log('   Tool: {');
console.log('     "tool": "firmware_update",');
console.log('     "action": "install",');
console.log('     "entity_id": "update.router_firmware",');
console.log('     "version": "1.3.0",');
console.log('     "backup": true');
console.log('   }\n');

// Skip update example
console.log('3. ⏭️ Skip Firmware Update');
console.log('   POST /firmware_updates/skip');
console.log('   Body: { "entity_id": "update.thermostat_firmware" }');
console.log('   Tool: {');
console.log('     "tool": "firmware_update",');
console.log('     "action": "skip",');
console.log('     "entity_id": "update.thermostat_firmware"');
console.log('   }\n');

// Clear skipped example
console.log('4. 🔄 Clear Skipped Update');
console.log('   POST /firmware_updates/clear_skipped');
console.log('   Body: { "entity_id": "update.thermostat_firmware" }');
console.log('   Tool: {');
console.log('     "tool": "firmware_update",');
console.log('     "action": "clear_skipped",');
console.log('     "entity_id": "update.thermostat_firmware"');
console.log('   }\n');

console.log('📊 Available update states:');
exampleUpdates.forEach(update => {
  const status = update.state === 'on' ? '🟡 Update Available' : '✅ Up to Date';
  console.log(`   ${update.entity_id}: ${status}`);
  console.log(`      Current: ${update.installed_version} → Latest: ${update.latest_version}`);
  if (update.release_summary) {
    console.log(`      Summary: ${update.release_summary}`);
  }
  console.log('');
});

console.log('🛡️ Security features:');
console.log('   • Optional backup before installation');
console.log('   • Version-specific installation support');
console.log('   • Progress tracking during updates');
console.log('   • Skip unwanted updates');
console.log('   • Clear skipped updates when ready');
console.log('   • Automatic detection of firmware entities');

console.log('\n🔧 Supported features by device:');
console.log('   • Feature flags indicate device capabilities');
console.log('   • INSTALL (1): Can install updates');
console.log('   • BACKUP (2): Supports pre-update backups');
console.log('   • PROGRESS (4): Provides installation progress');
console.log('   • SPECIFIC_VERSION (8): Can install specific versions');
console.log('   • RELEASE_NOTES (16): Provides detailed release notes');

console.log('\n📚 Integration examples:');
console.log('   • Automated update notifications');
console.log('   • Scheduled maintenance windows');
console.log('   • Critical security update automation');
console.log('   • Rollback capabilities with backups');
console.log('   • Update progress monitoring');

console.log('\n🚀 To use this functionality:');
console.log('   1. Ensure your Home Assistant has update entities');
console.log('   2. Start the MCP server with proper HASS_TOKEN');
console.log('   3. Call the firmware_update tool or REST endpoints');
console.log('   4. Monitor update progress and status');

if (HASS_TOKEN === 'your_token_here') {
  console.log('\n⚠️  Warning: Please set HASS_TOKEN environment variable for actual testing');
}

console.log('\n✨ Demo completed! Check the API documentation for full details.');
