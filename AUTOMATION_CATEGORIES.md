# Automation Category Assignment

## Overview

Added comprehensive automation category assignment functionality to help organize and categorize Home Assistant automations. This includes tools to assign, manage, and list automations by categories.

## New Tools Added

### 1. `assign_automation_category`

Assigns or updates the category for a Home Assistant automation.

**Parameters:**
- `automation_id` (string): The automation entity ID (e.g., `automation.my_automation`)
- `category` (enum): The category to assign (see available categories below)
- `verify_automation_exists` (boolean, optional): Verify automation exists before assignment (default: true)

**Example Usage:**
```javascript
{
  "automation_id": "automation.sleep_lights_enhanced_motion_bedside_only",
  "category": "light",
  "verify_automation_exists": true
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Successfully assigned category 'light' to automation 'automation.sleep_lights_enhanced_motion_bedside_only'",
  "automation_id": "automation.sleep_lights_enhanced_motion_bedside_only",
  "category": "light",
  "previous_category": null,
  "updated_entity": { /* registry update result */ }
}
```

### 2. `manage_automation_categories`

Comprehensive category management for automations.

**Actions:**

#### `list_categories`
Lists all available automation categories.

```javascript
{
  "action": "list_categories"
}
```

#### `get_category`
Gets the current category of a specific automation.

```javascript
{
  "action": "get_category",
  "automation_id": "automation.my_automation"
}
```

#### `remove_category`
Removes the category from a specific automation.

```javascript
{
  "action": "remove_category",
  "automation_id": "automation.my_automation"
}
```

#### `list_by_category`
Lists automations grouped by categories or filtered by specific category.

```javascript
// List all automations grouped by categories
{
  "action": "list_by_category"
}

// List automations in specific category
{
  "action": "list_by_category",
  "category": "light"
}
```

## Available Categories

The following categories are supported (matching Home Assistant's standard categories):

### Device Categories
- `light` - Light-related automations
- `switch` - Switch control automations
- `fan` - Fan control automations
- `cover` - Cover/blind/garage door automations
- `climate` - Climate/HVAC automations
- `lock` - Lock control automations
- `camera` - Camera-related automations
- `media_player` - Media control automations
- `sensor` - Sensor-based automations
- `vacuum` - Vacuum control automations
- `water_heater` - Water heater automations
- `lawn_mower` - Lawn mower automations
- `humidifier` - Humidifier control automations

### System Categories
- `security` - Security system automations
- `alarm_control_panel` - Alarm system automations
- `notify` - Notification automations
- `scene` - Scene activation automations
- `script` - Script execution automations
- `automation` - Meta-automation automations
- `device_tracker` - Device tracking automations
- `person` - Person-based automations
- `zone` - Zone-based automations

### Utility Categories
- `weather` - Weather-based automations
- `calendar` - Calendar event automations
- `schedule` - Time-based/scheduled automations
- `energy` - Energy management automations
- `update` - Update-related automations

### Input Categories
- `button` - Button press automations
- `number` - Number input automations
- `select` - Selection input automations
- `text` - Text input automations
- `datetime` - Date/time input automations
- `time` - Time input automations
- `date` - Date input automations

### General
- `other` - Miscellaneous automations

## Use Cases

### 1. Organize Automations by Function
```javascript
// Assign lighting automations
{
  "automation_id": "automation.morning_lights",
  "category": "light"
}

// Assign security automations
{
  "automation_id": "automation.door_lock_check",
  "category": "security"
}
```

### 2. List Automations by Category
```javascript
// Get all light-related automations
{
  "action": "list_by_category",
  "category": "light"
}
```

### 3. Category Management
```javascript
// Check what category an automation has
{
  "action": "get_category",
  "automation_id": "automation.my_automation"
}

// Remove category if wrongly assigned
{
  "action": "remove_category",
  "automation_id": "automation.my_automation"
}
```

### 4. Organization Overview
```javascript
// Get complete categorization overview
{
  "action": "list_by_category"
}
```

**Sample Response:**
```javascript
{
  "success": true,
  "automations_by_category": {
    "light": [
      {
        "entity_id": "automation.morning_lights",
        "name": "Morning Lights",
        "state": "on",
        "category": "light"
      }
    ],
    "security": [
      {
        "entity_id": "automation.door_lock_check", 
        "name": "Door Lock Check",
        "state": "on",
        "category": "security"
      }
    ]
  },
  "uncategorized_automations": [
    {
      "entity_id": "automation.uncategorized_automation",
      "name": "Uncategorized Automation",
      "state": "on",
      "category": null
    }
  ],
  "total_categories": 2,
  "total_categorized": 2,
  "total_uncategorized": 1,
  "total_automations": 3
}
```

## Implementation Details

### WebSocket API Usage
The tools use Home Assistant's WebSocket API for registry operations:

```javascript
// List entity registry
wsClient.callWS({ type: 'config/entity_registry/list' })

// Update entity categories
wsClient.callWS({
  type: 'config/entity_registry/update',
  entity_id: 'automation.my_automation',
  categories: {
    automation: 'light'
  }
})
```

### Category Storage
Categories are stored in the entity registry under the `categories` field:
```javascript
{
  "entity_id": "automation.my_automation",
  "categories": {
    "automation": "light"  // Domain: category mapping
  }
}
```

### Error Handling
- Validates automation existence before assignment
- Checks for duplicate category assignments
- Handles missing automations gracefully
- Provides detailed error messages

## Benefits

1. **Organization**: Group related automations together
2. **Discovery**: Easily find automations by function
3. **Management**: Better automation lifecycle management
4. **UI Enhancement**: Categories appear in Home Assistant UI
5. **Filtering**: Filter automations by category in interfaces
6. **Documentation**: Self-documenting automation purposes

## Integration

### With Area Assignment
Categories complement area assignments:
- **Area**: Physical location (bedroom, kitchen, etc.)
- **Category**: Functional purpose (light, security, etc.)

Example automation with both:
```javascript
{
  "entity_id": "automation.bedroom_lights",
  "area_id": "bedroom",        // WHERE it operates
  "category": "light"          // WHAT it controls
}
```

### With Home Assistant UI
Categories appear in:
- Automation list views
- Category filters
- Organization dashboards
- Search and filtering interfaces

## Future Enhancements

Potential future additions:
- Bulk category assignment
- Category-based automation templates
- Category statistics and analytics
- Custom category definitions
- Category-based automation groups