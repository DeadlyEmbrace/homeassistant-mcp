// Test script for automation creation with correct parameters
const testAutomationCreation = () => {
  console.log('🧪 Testing Automation Creation Parameter Format\n');

  // Example of correct parameter structure
  const correctParams = {
    action: 'create',
    alias: 'Test Motion Light',
    description: 'Turn on lights when motion detected',
    mode: 'single',
    
    // CORRECT: triggers as array (even for single trigger)
    triggers: [
      {
        trigger: 'state',
        entity_id: 'binary_sensor.motion_sensor',
        to: 'on'
      }
    ],
    
    // Optional condition
    condition: [
      {
        condition: 'state',
        entity_id: 'sun.sun',
        state: 'below_horizon'
      }
    ],
    
    // Action configuration
    action_config: [
      {
        service: 'light.turn_on',
        target: {
          entity_id: 'light.living_room'
        }
      }
    ]
  };

  console.log('✅ Correct Automation Parameters Structure:');
  console.log(JSON.stringify(correctParams, null, 2));

  console.log('\n📋 Key Points:');
  console.log('1. Use "triggers" (plural) not "trigger"');
  console.log('2. Triggers must be an array, even for single trigger');
  console.log('3. Each trigger needs a "trigger" field specifying type');
  console.log('4. Common trigger types: state, time, event, numeric_state');

  console.log('\n🔧 Example API Endpoint:');
  console.log('POST /api/config/automation/config/test_motion_light');
  
  console.log('\n📝 Expected Home Assistant Config Format:');
  const haConfig = {
    id: 'test_motion_light',
    alias: 'Test Motion Light',
    mode: 'single',
    triggers: [
      {
        trigger: 'state',
        entity_id: 'binary_sensor.motion_sensor',
        to: 'on'
      }
    ],
    action: [
      {
        service: 'light.turn_on',
        target: {
          entity_id: 'light.living_room'
        }
      }
    ]
  };
  
  console.log(JSON.stringify(haConfig, null, 2));
  
  console.log('\n🎯 This should resolve the "malformed triggers" error!');
};

testAutomationCreation();
