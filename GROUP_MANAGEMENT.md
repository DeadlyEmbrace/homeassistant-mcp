# Group Management via MCP

Complete guide for creating and managing Home Assistant groups using the MCP.

## Overview

There are **two methods** to create groups in Home Assistant via MCP:

1. **✅ RECOMMENDED: Group Helper** (`manage_helpers` tool) - Creates UI-manageable groups with proper registry entries
2. **⚠️ Legacy: Group Service** (`call_service` tool) - Creates legacy groups without UI management

## ✅ Recommended Method: Group Helper

### Why Use Group Helpers?

- **UI Integration**: Appears in Home Assistant UI with full management capabilities
- **Registry Entry**: Proper entity registry entry with unique ID
- **Editable**: Can be edited through Settings → Devices & Services → Helpers
- **Modern**: Uses the official Group integration introduced in recent HA versions
- **Persistent**: Survives restarts and configuration reloads

### Creating a Group Helper

Use the `manage_helpers` tool with `helper_type: "group"`:

```json
{
  "action": "create",
  "helper_type": "group",
  "name": "Office Environmental Sensors",
  "icon": "mdi:home-analytics",
  "entities": [
    "sensor.airthings_tern_co2_014764_illuminance",
    "sensor.hue_office_illuminance_2",
    "sensor.presence_sensor_fp2_9f5a_light_sensor_light_level",
    "sensor.airthings_tern_co2_014764_temperature",
    "sensor.hue_office_temperature_2"
  ]
}
```

This creates `group.office_environmental_sensors` that:
- ✅ Appears in UI under Settings → Devices & Services → Helpers
- ✅ Can be edited/deleted from the UI
- ✅ Has a proper entity registry entry
- ✅ Shows entity count and state aggregation

### Group Helper Parameters

**Required:**
- `action`: "create"
- `helper_type`: "group"  
- `name`: Display name
- `entities`: Array of entity IDs (minimum 1)

**Optional:**
- `icon`: MDI icon (e.g., "mdi:group", "mdi:home-analytics")
- `all`: Boolean (default: false)
  - `false`: Group is "on" if **any** member is "on" (OR logic)
  - `true`: Group is "on" only if **all** members are "on" (AND logic)

### Examples

#### 1. Temperature Sensor Group
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "All Temperature Sensors",
  "icon": "mdi:thermometer",
  "entities": [
    "sensor.living_room_temperature",
    "sensor.bedroom_temperature",
    "sensor.kitchen_temperature",
    "sensor.office_temperature"
  ]
}
```

#### 2. Motion Sensor Group (Any Motion)
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "All Motion Sensors",
  "icon": "mdi:motion-sensor",
  "entities": [
    "binary_sensor.living_room_motion",
    "binary_sensor.hallway_motion",
    "binary_sensor.office_motion"
  ],
  "all": false
}
```

**Result**: Group is "on" if ANY motion sensor detects motion

#### 3. Security Sensors Group (All Must Be On)
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "All Doors Closed",
  "icon": "mdi:door-closed-lock",
  "entities": [
    "binary_sensor.front_door",
    "binary_sensor.back_door",
    "binary_sensor.garage_door"
  ],
  "all": true
}
```

**Result**: Group is "on" only if ALL doors are closed (on state)

### Updating Group Helpers

```json
{
  "action": "update",
  "entity_id": "group.office_environmental_sensors",
  "name": "Office Sensors (Updated)",
  "entities": [
    "sensor.airthings_tern_co2_014764_illuminance",
    "sensor.hue_office_illuminance_2",
    "sensor.presence_sensor_fp2_9f5a_light_sensor_light_level",
    "sensor.airthings_tern_co2_014764_temperature",
    "sensor.hue_office_temperature_2",
    "sensor.office_humidity"
  ],
  "all": false
}
```

### Listing Group Helpers

```json
{
  "action": "list",
  "helper_type": "group"
}
```

### Deleting Group Helpers

```json
{
  "action": "delete",
  "entity_id": "group.office_environmental_sensors"
}
```

## ⚠️ Legacy Method: Group Service (Not Recommended)

The `call_service` tool with `group.set` creates legacy groups that **do not appear properly in the UI**:

```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "office_sensors",
    "name": "Office Sensors",
    "entities": ["sensor.1", "sensor.2"]
  }
}
```

**Limitations:**
- ❌ No UI management - invisible in Settings → Helpers
- ❌ No entity registry entry - no unique ID
- ❌ Can't be edited through UI
- ❌ May disappear on restart
- ❌ Legacy method, being phased out

**Only use this if:**
- You need temporary, programmatic groups
- You're maintaining old automations
- You specifically need legacy group behavior

## Comparison Table

| Feature | Group Helper | Legacy Group Service |
|---------|--------------|---------------------|
| **UI Visible** | ✅ Yes | ❌ No |
| **Editable in UI** | ✅ Yes | ❌ No |
| **Registry Entry** | ✅ Yes | ❌ No |
| **Unique ID** | ✅ Yes | ❌ No |
| **Persistent** | ✅ Yes | ⚠️ Sometimes |
| **Modern** | ✅ Yes | ❌ Legacy |
| **Tool** | `manage_helpers` | `call_service` |
| **Recommended** | ✅ Yes | ❌ No |

## Group State Logic

### OR Logic (default: `all: false`)
Group state is "on" if **any** member entity is "on":
- **Use for**: Motion sensors, door sensors, lights
- **Example**: Any motion detected, any door open, any light on

### AND Logic (`all: true`)
Group state is "on" only if **all** member entities are "on":
- **Use for**: Security checks, complete states
- **Example**: All doors closed, all lights on, all sensors active

## Common Use Cases

### 1. Environmental Monitoring
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "Living Room Environment",
  "icon": "mdi:home-analytics",
  "entities": [
    "sensor.living_room_temperature",
    "sensor.living_room_humidity",
    "sensor.living_room_co2",
    "sensor.living_room_illuminance"
  ]
}
```

### 2. Security System
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "Security Sensors",
  "icon": "mdi:shield-home",
  "entities": [
    "binary_sensor.front_door",
    "binary_sensor.back_door",
    "binary_sensor.window_sensor_1",
    "binary_sensor.window_sensor_2",
    "binary_sensor.garage_door"
  ],
  "all": false
}
```

### 3. Climate Control
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "All Thermostats",
  "icon": "mdi:thermostat",
  "entities": [
    "climate.living_room",
    "climate.bedroom",
    "climate.office"
  ]
}
```

### 4. Lighting Zones
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "Downstairs Lights",
  "icon": "mdi:lightbulb-group",
  "entities": [
    "light.living_room",
    "light.kitchen",
    "light.dining_room",
    "light.hallway"
  ]
}
```

## Using Groups in Automations

Once created, group helpers work like any other entity:

```yaml
trigger:
  - platform: state
    entity_id: group.all_motion_sensors
    to: "on"
action:
  - service: light.turn_on
    target:
      entity_id: light.hallway
```

## Troubleshooting

### Group Not Appearing in UI

**Problem**: Created group doesn't show in Settings → Helpers

**Solution**: Make sure you're using `manage_helpers` tool with `helper_type: "group"`, not `call_service` with `group.set`

### Group State Not Updating

**Problem**: Group state doesn't change when member entities change

**Solution**: 
1. Check all member entities exist and are functioning
2. Verify entity IDs are correct (no typos)
3. Wait a few seconds for state propagation
4. Try recreating the group if issue persists

### Can't Find Group in States

**Problem**: `group.my_group` not found in entity states

**Solution**: Ensure group was created successfully. Check response for entity_id. Use `list` action to verify creation.

### Entity ID Conflict

**Problem**: Error about entity ID already existing

**Solution**: Entity names must be unique. Either:
1. Delete the existing group first
2. Choose a different name
3. Use `update` action to modify existing group

## Best Practices

1. **Use Descriptive Names**: Clear names help in UI and automations
   - Good: "Office Environmental Sensors"
   - Bad: "group1"

2. **Choose Appropriate Icons**: Visual identification in UI
   - Browse: https://pictogrammers.com/library/mdi/
   - Common: `mdi:group`, `mdi:home-analytics`, `mdi:lightbulb-group`

3. **Organize by Function**: Group related entities
   - By room: "Living Room Sensors"
   - By type: "All Motion Sensors"
   - By purpose: "Security System"

4. **Use Correct Logic**:
   - OR (`all: false`): Detection, monitoring (any sensor triggers)
   - AND (`all: true`): Validation, security (all must match)

5. **Test After Creation**: Verify group state updates when member entities change

## Migration from Legacy Groups

If you have legacy groups created with `group.set`:

1. **List Current Groups**: Use states API to find legacy groups
2. **Note Entity Lists**: Record which entities are in each group
3. **Create Group Helpers**: Use `manage_helpers` to recreate as helpers
4. **Update Automations**: Point to new group entity IDs (if changed)
5. **Remove Legacy Groups**: Use `group.remove` service

## Summary

- ✅ **Always use `manage_helpers` with `helper_type: "group"`** for new groups
- ✅ Groups appear in UI and can be managed through Settings → Helpers  
- ✅ Supports both OR and AND logic via `all` parameter
- ✅ Works with any entity types (sensors, binary_sensors, lights, etc.)
- ✅ Persistent across restarts with proper registry entries
- ❌ Avoid legacy `group.set` service unless specifically needed

For your office sensors, use:
```json
{
  "action": "create",
  "helper_type": "group",
  "name": "Office Environmental Sensors",
  "icon": "mdi:home-analytics",
  "entities": [
    "sensor.airthings_tern_co2_014764_illuminance",
    "sensor.hue_office_illuminance_2",
    "sensor.presence_sensor_fp2_9f5a_light_sensor_light_level",
    "sensor.airthings_tern_co2_014764_temperature",
    "sensor.hue_office_temperature_2"
  ]
}
```

This creates a properly managed group that will appear in your Home Assistant UI!
