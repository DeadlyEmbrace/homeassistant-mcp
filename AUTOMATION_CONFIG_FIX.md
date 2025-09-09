# Fix for Automation Configuration Retrieval Issue

## Problem Identified

The `get_config` action for retrieving specific automation configurations was failing because:

1. **API Endpoint Format**: The Home Assistant `/api/config/automation/config/{id}` endpoint expects automation IDs without the `automation.` prefix
2. **Limited API Access**: Some automations (especially UI-created ones) may not be accessible via the config API
3. **Error Handling**: The original implementation didn't provide fallback mechanisms

## Solution Implemented

### 1. ID Format Handling

**Before:**
```javascript
const response = await fetch(`${HASS_HOST}/api/config/automation/config/${params.automation_id}`);
```

**After:**
```javascript
// Extract automation ID - if it starts with 'automation.', remove that prefix
const automationId = params.automation_id.startsWith('automation.') 
  ? params.automation_id.substring('automation.'.length)
  : params.automation_id;

const response = await fetch(`${HASS_HOST}/api/config/automation/config/${automationId}`);
```

### 2. Robust Fallback Strategy

The new implementation uses a multi-step approach:

1. **State API First**: Get basic automation information from `/api/states/{entity_id}`
2. **Config API Attempt**: Try to get detailed configuration from `/api/config/automation/config/{id}`
3. **Graceful Fallback**: If config API fails, return state-based information with a note

### 3. Enhanced Error Handling

**Before:**
- Simple error if config API failed
- No alternative data source

**After:**
- Always attempts to get basic information from state API
- Provides detailed config when available
- Returns partial information when full config is inaccessible
- Clear error messages indicating what went wrong

## Implementation Details

### New Logic Flow:

```javascript
// 1. Get state information (always works for existing automations)
const stateResponse = await fetch(`${HASS_HOST}/api/states/${params.automation_id}`);

// 2. Try to get detailed configuration
const automationId = params.automation_id.startsWith('automation.') 
  ? params.automation_id.substring('automation.'.length)
  : params.automation_id;

const configResponse = await fetch(`${HASS_HOST}/api/config/automation/config/${automationId}`);

// 3. Return detailed config if available, otherwise return state-based info
```

### Response Formats:

**Full Configuration Available:**
```json
{
  "success": true,
  "automation_config": {
    "entity_id": "automation.morning_routine",
    "alias": "Morning Routine",
    "description": "Turn on lights at sunrise",
    "mode": "single",
    "trigger": [...],
    "condition": [...],
    "action": [...]
  }
}
```

**Limited Information (Fallback):**
```json
{
  "success": true,
  "automation_config": {
    "entity_id": "automation.morning_routine",
    "alias": "Morning Routine", 
    "description": "Turn on lights at sunrise",
    "mode": "single",
    "trigger": [],
    "condition": [],
    "action": [],
    "note": "Limited information available - full configuration not accessible via API for this automation"
  }
}
```

## Benefits of the Fix

1. **Reliability**: Works with both entity ID formats (`automation.xxx` and `xxx`)
2. **Robustness**: Always returns some information, even if full config is unavailable
3. **Transparency**: Clearly indicates when only limited information is available
4. **Compatibility**: Works with all types of automations (YAML and UI-created)
5. **User Experience**: Provides useful information even in failure scenarios

## Testing Verified

✅ **ID Extraction**: Handles both `automation.xxx` and `xxx` formats correctly
✅ **Fallback Logic**: Returns state-based information when config API fails  
✅ **Success Path**: Returns full configuration when config API succeeds
✅ **Error Handling**: Provides meaningful error messages
✅ **HTTP Endpoints**: Both MCP tools and REST endpoints use the same logic

## Usage Examples

### MCP Tool Usage:
```json
{
  "tool": "automation",
  "action": "get_config",
  "automation_id": "automation.morning_routine"
}
```

### HTTP API Usage:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4002/automations/automation.morning_routine/config
```

Both will now work reliably and provide the best available information about the automation.

## Resolution Status

✅ **FIXED**: The automation configuration retrieval now works correctly with improved error handling and fallback mechanisms. Users will always get some information about their automations, with full configuration details when available through the Home Assistant API.
