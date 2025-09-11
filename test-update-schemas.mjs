#!/usr/bin/env node

/**
 * Quick validation test for the new firmware update schemas
 */

import { UpdateSchema, ListUpdatesResponseSchema } from '../src/schemas.js';

console.log('🧪 Testing firmware update schemas...\n');

// Test update entity schema
const testUpdate = {
  entity_id: 'update.device_firmware',
  state: 'on',
  state_attributes: {
    title: 'Device Firmware',
    installed_version: '1.0.0',
    latest_version: '1.1.0',
    skipped_version: null,
    release_summary: 'Bug fixes and improvements',
    release_url: 'https://example.com/release',
    auto_update: false,
    device_class: 'firmware',
    in_progress: false,
    update_percentage: null,
    supported_features: 15
  }
};

try {
  const validatedUpdate = UpdateSchema.parse(testUpdate);
  console.log('✅ Update schema validation passed');
  console.log('   Entity ID:', validatedUpdate.entity_id);
  console.log('   State:', validatedUpdate.state);
  console.log('   Title:', validatedUpdate.state_attributes.title);
  console.log('   Version:', validatedUpdate.state_attributes.installed_version, '→', validatedUpdate.state_attributes.latest_version);
} catch (error) {
  console.error('❌ Update schema validation failed:', error.message);
}

// Test list response schema
const testListResponse = {
  updates: [testUpdate]
};

try {
  const validatedList = ListUpdatesResponseSchema.parse(testListResponse);
  console.log('\n✅ List updates response schema validation passed');
  console.log('   Number of updates:', validatedList.updates.length);
} catch (error) {
  console.error('\n❌ List updates response schema validation failed:', error.message);
}

console.log('\n🎉 Schema validation completed!');
