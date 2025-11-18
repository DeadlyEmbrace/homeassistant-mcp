# Home Assistant Helper Management

Complete guide for creating and managing Home Assistant helpers using the MCP `manage_helpers` tool.

## Overview

The `manage_helpers` tool provides full CRUD operations for all Home Assistant helper types:
- `input_boolean` - Toggle switches
- `input_number` - Numeric input with sliders or text boxes
- `input_text` - Text input fields
- `input_select` - Dropdown menus
- `input_datetime` - Date and/or time pickers
- `counter` - Increment/decrement counters
- `timer` - Countdown timers

## Actions

### 1. List Helpers

**List all helpers:**
```json
{
  "action": "list"
}
```

**Filter by type:**
```json
{
  "action": "list",
  "helper_type": "input_boolean"
}
```

**Response:**
```json
{
  "success": true,
  "total_helpers": 15,
  "helpers": [...],
  "helpers_by_type": {
    "input_boolean": [...],
    "input_number": [...],
    ...
  },
  "filter_applied": "all"
}
```

### 2. Get Specific Helper

```json
{
  "action": "get",
  "entity_id": "input_boolean.alarm_armed"
}
```

**Response:**
```json
{
  "success": true,
  "helper": {
    "entity_id": "input_boolean.alarm_armed",
    "type": "input_boolean",
    "name": "Alarm Armed",
    "state": "off",
    "attributes": {...},
    "last_changed": "2024-01-15T10:30:00",
    "last_updated": "2024-01-15T10:30:00"
  }
}
```

### 3. Create Helper

#### Input Boolean
```json
{
  "action": "create",
  "helper_type": "input_boolean",
  "name": "Alarm Armed",
  "icon": "mdi:shield-home",
  "initial": false
}
```

#### Input Number
```json
{
  "action": "create",
  "helper_type": "input_number",
  "name": "Target Temperature",
  "icon": "mdi:thermometer",
  "min": 15,
  "max": 30,
  "step": 0.5,
  "mode": "slider",
  "unit_of_measurement": "°C"
}
```

**Modes:** `box` (text input) or `slider` (slider control)

#### Input Text
```json
{
  "action": "create",
  "helper_type": "input_text",
  "name": "Guest Name",
  "icon": "mdi:account",
  "min_length": 3,
  "max_length": 50,
  "text_mode": "text",
  "pattern": "[a-zA-Z ]+"
}
```

**Text Modes:** `text` (visible) or `password` (masked)

#### Input Select
```json
{
  "action": "create",
  "helper_type": "input_select",
  "name": "Home Mode",
  "icon": "mdi:home-automation",
  "options": ["Home", "Away", "Sleep", "Vacation"]
}
```

#### Input DateTime
```json
{
  "action": "create",
  "helper_type": "input_datetime",
  "name": "Alarm Time",
  "icon": "mdi:alarm",
  "has_date": true,
  "has_time": true
}
```

**Options:**
- `has_date: true, has_time: true` - Full date and time picker
- `has_date: true, has_time: false` - Date only
- `has_date: false, has_time: true` - Time only

#### Counter
```json
{
  "action": "create",
  "helper_type": "counter",
  "name": "Door Opens Today",
  "icon": "mdi:counter",
  "counter_initial": 0,
  "counter_step": 1,
  "counter_minimum": 0,
  "counter_maximum": 1000,
  "counter_restore": true
}
```

#### Timer
```json
{
  "action": "create",
  "helper_type": "timer",
  "name": "Cooking Timer",
  "icon": "mdi:timer",
  "duration": "00:15:00",
  "timer_restore": false
}
```

**Duration format:** `HH:MM:SS` (hours:minutes:seconds)

### 4. Update Helper

Update helper configuration (not the state/value):

```json
{
  "action": "update",
  "entity_id": "input_number.target_temperature",
  "name": "Living Room Temperature",
  "min": 18,
  "max": 28,
  "icon": "mdi:home-thermometer"
}
```

**Updateable fields by type:**

| Helper Type | Updateable Fields |
|------------|------------------|
| All types | `name`, `icon` |
| input_number | `min`, `max`, `step`, `mode`, `unit_of_measurement` |
| input_text | `min_length`, `max_length`, `pattern`, `text_mode` |
| input_select | `options` |
| input_datetime | `has_date`, `has_time` |
| counter | `counter_step`, `counter_minimum`, `counter_maximum`, `counter_restore` |
| timer | `duration`, `timer_restore` |

**Note:** To change the *value* or *state* of a helper, use the appropriate service call:
- `input_boolean.turn_on` / `turn_off`
- `input_number.set_value`
- `input_text.set_value`
- `input_select.select_option`
- `input_datetime.set_datetime`
- `counter.increment` / `decrement` / `reset`
- `timer.start` / `pause` / `cancel`

### 5. Delete Helper

```json
{
  "action": "delete",
  "entity_id": "input_boolean.old_switch"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted input_boolean helper",
  "entity_id": "input_boolean.old_switch"
}
```

## Common Parameters

### All Helper Types
- `name` - Display name (required for create)
- `icon` - MDI icon (e.g., `mdi:home`, `mdi:lightbulb`)
- `entity_id` - Auto-generated from name, or specify for update/delete/get

### Icon Reference
Find icons at: https://pictogrammers.com/library/mdi/

Popular icons:
- Switches: `mdi:toggle-switch`, `mdi:light-switch`
- Numbers: `mdi:numeric`, `mdi:thermometer`, `mdi:gauge`
- Text: `mdi:form-textbox`, `mdi:text-box`
- Select: `mdi:form-dropdown`, `mdi:menu`
- Time: `mdi:clock-outline`, `mdi:calendar`, `mdi:alarm`
- Counter: `mdi:counter`, `mdi:numeric`
- Timer: `mdi:timer`, `mdi:timer-sand`

## Use Cases

### 1. Smart Home Modes
```json
{
  "action": "create",
  "helper_type": "input_select",
  "name": "House Mode",
  "options": ["Normal", "Party", "Movie", "Sleep", "Away"]
}
```

### 2. Temperature Controls
```json
{
  "action": "create",
  "helper_type": "input_number",
  "name": "AC Target Temp",
  "min": 16,
  "max": 30,
  "step": 0.5,
  "mode": "slider",
  "unit_of_measurement": "°C"
}
```

### 3. Alarm System
```json
{
  "action": "create",
  "helper_type": "input_boolean",
  "name": "Security Armed",
  "icon": "mdi:shield-lock"
}
```

### 4. Presence Detection
```json
{
  "action": "create",
  "helper_type": "counter",
  "name": "Times Left Today",
  "counter_initial": 0,
  "counter_restore": false
}
```

### 5. Scheduled Events
```json
{
  "action": "create",
  "helper_type": "input_datetime",
  "name": "Vacation Start",
  "has_date": true,
  "has_time": false
}
```

## Error Handling

All actions return a `success` field:

**Success:**
```json
{
  "success": true,
  "message": "Successfully created input_boolean helper",
  ...
}
```

**Failure:**
```json
{
  "success": false,
  "message": "options are required for input_select",
  "action": "create",
  "helper_type": "input_select"
}
```

## Best Practices

1. **Naming:** Use descriptive names (auto-converted to entity IDs)
   - Good: "Living Room Temperature"
   - Bad: "temp1"

2. **Icons:** Always specify icons for better UI/UX
   - Browse: https://pictogrammers.com/library/mdi/

3. **Validation:** Set appropriate min/max/step values
   - Numbers: Define realistic ranges
   - Text: Use patterns for validation
   - Select: Provide clear option labels

4. **Restore:** Use with caution
   - Counters: Enable if tracking cumulative values
   - Timers: Usually disable to avoid unexpected restarts

5. **Entity IDs:** Auto-generated as `helper_type.name_with_underscores`
   - "Living Room Temp" → `input_number.living_room_temp`

## Integration with Automations

Helpers are designed to work with automations:

```yaml
# Example: Use input_boolean in automation
trigger:
  - platform: state
    entity_id: input_boolean.alarm_armed
    to: "on"
action:
  - service: notify.mobile_app
    data:
      message: "Security system armed"
```

## Cleanup

List and delete unused helpers:

```json
// 1. List all helpers
{"action": "list"}

// 2. Delete specific helper
{
  "action": "delete",
  "entity_id": "input_boolean.old_unused_switch"
}
```

## Summary

The `manage_helpers` tool provides complete lifecycle management for all Home Assistant helper types through a unified interface. Use it to:

- ✅ Create helpers programmatically
- ✅ List and filter helpers by type
- ✅ Get detailed helper information
- ✅ Update helper configuration
- ✅ Delete unused helpers

All operations are performed via Home Assistant's WebSocket API for real-time updates and reliable execution.
