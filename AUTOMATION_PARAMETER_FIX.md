# Home Assistant Automation Parameter Format Fix

## 🔧 **Problem Identified**

The automation creation was failing with "Bad Request" and "malformed triggers" errors because we were using the wrong parameter format.

### ❌ **Previous Incorrect Format:**
```json
{
  "action": "create",
  "alias": "Test Automation",
  "trigger": {              // ❌ Wrong: singular "trigger"
    "platform": "state",    // ❌ Wrong: "platform" instead of "trigger"
    "entity_id": "sensor.test"
  }
}
```

### ✅ **Correct Format (Now Implemented):**
```json
{
  "action": "create",
  "alias": "Test Automation", 
  "triggers": [              // ✅ Correct: plural "triggers" as array
    {
      "trigger": "state",    // ✅ Correct: "trigger" field specifies type
      "entity_id": "sensor.test"
    }
  ]
}
```

## 🔍 **Research Findings**

From Home Assistant documentation (https://www.home-assistant.io/docs/automation/trigger/):

1. **Triggers are ALWAYS arrays**, even for single trigger
2. **Parameter name is "triggers" (plural)**, not "trigger"
3. **Each trigger object needs a "trigger" field** specifying the type
4. **Trigger types**: `state`, `time`, `event`, `numeric_state`, `template`, etc.

## 🛠️ **Implementation Changes**

### 1. **Updated Parameter Schema**
```typescript
// OLD
trigger: z.any().optional().describe('Automation trigger configuration')

// NEW  
triggers: z.any().optional().describe('Automation triggers array (required for create action)')
```

### 2. **Updated Interface**
```typescript
interface AutomationParams {
  // ... other fields
  triggers?: any;     // Changed from trigger?: any;
  // ... rest unchanged
}
```

### 3. **Updated Validation Logic**
```typescript
// OLD
if (!params.trigger) {
  throw new Error('Trigger configuration is required');
}

// NEW
if (!params.triggers) {
  throw new Error('Trigger configuration is required for create action');
}
```

### 4. **Updated Configuration Building**
```typescript
const automationConfig = {
  id: automationId,
  alias: params.alias,
  mode: params.mode || 'single',
  triggers: params.triggers,    // Changed from trigger: params.trigger
  action: params.action_config
};
```

## 📋 **Correct Usage Examples**

### **State Trigger Example:**
```json
{
  "action": "create",
  "alias": "Motion Light",
  "triggers": [
    {
      "trigger": "state",
      "entity_id": "binary_sensor.motion",
      "to": "on"
    }
  ],
  "action_config": [
    {
      "service": "light.turn_on",
      "target": {"entity_id": "light.living_room"}
    }
  ]
}
```

### **Time Trigger Example:**
```json
{
  "action": "create", 
  "alias": "Morning Routine",
  "triggers": [
    {
      "trigger": "time",
      "at": "07:00:00"
    }
  ],
  "action_config": [
    {
      "service": "scene.turn_on",
      "target": {"entity_id": "scene.morning"}
    }
  ]
}
```

### **Multiple Triggers Example:**
```json
{
  "action": "create",
  "alias": "Security Alert", 
  "triggers": [
    {
      "trigger": "state",
      "entity_id": "binary_sensor.door",
      "to": "on"
    },
    {
      "trigger": "state", 
      "entity_id": "binary_sensor.window",
      "to": "on"
    }
  ],
  "action_config": [
    {
      "service": "notify.mobile_app",
      "data": {"message": "Security breach detected!"}
    }
  ]
}
```

## 🎯 **Expected Results**

With these fixes, automation creation should now:

- ✅ **Accept proper trigger format** without "malformed triggers" errors
- ✅ **Successfully create automations** in Home Assistant
- ✅ **Support all trigger types** (state, time, event, etc.)
- ✅ **Handle multiple triggers** correctly
- ✅ **Provide clear validation errors** for missing/invalid parameters

## 🧪 **Testing the Fix**

Use this test automation to verify the fix works:

```json
{
  "action": "create",
  "alias": "Test Light Control",
  "description": "Simple test automation",
  "mode": "single",
  "triggers": [
    {
      "trigger": "state",
      "entity_id": "input_boolean.test_switch", 
      "to": "on"
    }
  ],
  "action_config": [
    {
      "service": "light.toggle",
      "target": {"entity_id": "light.living_room"}
    }
  ]
}
```

The "Bad Request" and "malformed triggers" errors should now be resolved! 🎉
