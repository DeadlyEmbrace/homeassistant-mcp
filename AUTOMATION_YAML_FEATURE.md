# Home Assistant Automation YAML Retrieval

## Overview

Following your suggestion inspired by ComfyUI's YAML export functionality, I've implemented comprehensive automation YAML retrieval for the Home Assistant MCP Server. This feature provides multiple approaches to extract automation configurations in YAML format, similar to how ComfyUI exposes workflow configurations.

## New Functionality: `get_yaml` Action

### ✨ **What's New**

The automation tool now includes a `get_yaml` action that attempts to retrieve automation configurations in YAML format using multiple fallback strategies.

### 🔄 **Multi-Approach Strategy**

The implementation uses a tiered approach to maximize success:

1. **Individual Config API**: `GET /api/config/automation/config/{id}`
2. **All Configs API**: `GET /api/config/automation/config` (then filter)
3. **Template API**: `POST /api/template` (for state inspection)
4. **State Fallback**: Generate YAML from state information

### 📝 **Usage Examples**

#### MCP Tool Usage:
```json
{
  "tool": "automation",
  "action": "get_yaml",
  "automation_id": "automation.morning_routine"
}
```

#### HTTP API Usage:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4003/automations/automation.morning_routine/yaml
```

### 📊 **Response Formats**

#### Full Configuration Available:
```json
{
  "success": true,
  "automation_yaml": "# Automation: Morning Routine\n# Description: Turn on lights at sunrise\nautomation:\n  alias: Morning Routine\n  description: Turn on lights at sunrise\n  mode: single\n  \n  trigger:\n    - {\n        \"platform\": \"sun\",\n        \"event\": \"sunrise\",\n        \"offset\": \"+00:30:00\"\n      }\n\n  condition:\n    - {\n        \"condition\": \"time\",\n        \"after\": \"06:00:00\"\n      }\n\n  action:\n    - {\n        \"service\": \"light.turn_on\",\n        \"target\": {\n          \"entity_id\": \"light.living_room\"\n        },\n        \"data\": {\n          \"brightness_pct\": 70\n        }\n      }",
  "raw_config": {
    "alias": "Morning Routine",
    "description": "Turn on lights at sunrise",
    "mode": "single",
    "trigger": [...],
    "condition": [...],
    "action": [...]
  },
  "source": "config_api"
}
```

#### Limited Information (Fallback):
```json
{
  "success": true,
  "automation_yaml": "# Automation: Morning Routine\n# Note: Limited information - full configuration not available via API\n# Description: Turn on lights at sunrise\nautomation:\n  alias: Morning Routine\n  description: Turn on lights at sunrise\n  mode: single\n  \n  # Configuration details not accessible via API\n  # This automation was likely created through the UI\n  # and full configuration is not exposed through REST API\n  \n  # Current state: on\n  # Last triggered: 2024-01-01T07:00:00Z\n  \n  trigger:\n    # Trigger configuration not available\n    \n  condition:\n    # Condition configuration not available\n    \n  action:\n    # Action configuration not available",
  "raw_config": null,
  "source": "state_based_fallback",
  "note": "Limited YAML generated from state information - full configuration not accessible"
}
```

## 🔧 **Implementation Details**

### Multiple API Approaches

1. **Individual Config API**:
   ```javascript
   GET /api/config/automation/config/{automation_id}
   ```
   - Direct retrieval of automation configuration
   - Works for file-based automations

2. **All Configs API**:
   ```javascript
   GET /api/config/automation/config
   ```
   - Retrieves all automation configs, then filters by alias/ID
   - Backup approach when individual API fails

3. **Template API**:
   ```javascript
   POST /api/template
   Body: { "template": "{{ state_attr('automation.xxx', 'configuration') }}" }
   ```
   - Uses Home Assistant's template engine to inspect automation attributes
   - May expose configuration data not available via other APIs

4. **State Fallback**:
   ```javascript
   GET /api/states/{entity_id}
   ```
   - Always works for existing automations
   - Provides basic information when full config is unavailable

### YAML Generation

The system generates structured YAML with:
- **Headers**: Automation name and description
- **Metadata**: Source information and limitations
- **Structure**: Standard Home Assistant automation format
- **Comments**: Helpful annotations and status information

### Smart ID Handling

Automatically handles both ID formats:
- `automation.morning_routine` → strips to `morning_routine` for config API
- `morning_routine` → uses as-is

## 🌟 **Benefits**

### 1. **Maximum Compatibility**
- Works with UI-created automations
- Works with YAML-defined automations  
- Graceful fallback when APIs are unavailable

### 2. **Rich Information**
- Full configuration when available
- Basic information always provided
- Clear indication of data limitations

### 3. **ComfyUI-Like Experience**
- Similar to ComfyUI's workflow export
- Structured, readable YAML output
- Raw configuration data included

### 4. **Multiple Access Methods**
- MCP tool integration
- HTTP REST endpoint
- Consistent authentication

## 📋 **API Reference**

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/automations/:automation_id/yaml` | Get automation YAML |

### Updated Tool Actions

| Tool | Action | Description |
|------|--------|-------------|
| `automation` | `get_yaml` | Retrieve automation in YAML format |

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `automation_yaml` | string | YAML-formatted automation configuration |
| `raw_config` | object\|null | Raw JSON configuration data |
| `source` | string | Data source used (`config_api`, `state_based_fallback`, etc.) |
| `note` | string | Additional information about limitations |

## 🚀 **Examples in Action**

### Complete Automation with Full Config:
```yaml
# Automation: Motion Light
# Description: Turn on light when motion detected
automation:
  alias: Motion Light
  description: Turn on light when motion detected
  mode: single
  
  trigger:
    - {
        "platform": "state",
        "entity_id": "binary_sensor.motion",
        "to": "on"
      }

  condition:
    # No conditions

  action:
    - {
        "service": "light.turn_on",
        "target": {
          "entity_id": "light.living_room"
        }
      }
```

### Limited Information Fallback:
```yaml
# Automation: Complex UI Automation
# Note: Limited information - full configuration not available via API
# Description: Created through Home Assistant UI
automation:
  alias: Complex UI Automation
  description: Created through Home Assistant UI
  mode: single
  
  # Configuration details not accessible via API
  # This automation was likely created through the UI
  # and full configuration is not exposed through REST API
  
  # Current state: on
  # Last triggered: 2024-01-01T12:00:00Z
  
  trigger:
    # Trigger configuration not available
    
  condition:
    # Condition configuration not available
    
  action:
    # Action configuration not available
```

## 🔐 **Security & Authentication**

- Same authentication as other endpoints
- Requires valid Home Assistant Long-Lived Access Token
- Respects Home Assistant's API permissions

## 🎯 **Use Cases**

1. **Automation Backup**: Export automations for backup/migration
2. **Documentation**: Generate human-readable automation documentation  
3. **Debugging**: Inspect automation configurations for troubleshooting
4. **Analysis**: Understand automation logic and structure
5. **Migration**: Copy automations between Home Assistant instances

## ✅ **Status**

**✅ IMPLEMENTED**: The automation YAML retrieval functionality is now available and provides ComfyUI-like YAML export capabilities with multiple fallback strategies for maximum compatibility.

**Try it now!** Use the `get_yaml` action or the `/automations/:automation_id/yaml` endpoint to retrieve your automation configurations in YAML format!
