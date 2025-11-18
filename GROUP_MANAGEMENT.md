# Group Management via MCP

Complete guide for creating and managing Home Assistant groups using the new `call_service` tool.

## Overview

The `call_service` tool provides access to any Home Assistant service, including group management. This allows you to:
- Create groups of entities dynamically
- Update existing groups
- Remove groups
- Call any other Home Assistant service

## Creating Groups

### 1. Generic Entity Group

Create a group containing any mix of entity types:

```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "office_environmental_sensors",
    "name": "Office Environmental Sensors",
    "entities": [
      "sensor.airthings_tern_co2_014764_illuminance",
      "sensor.hue_office_illuminance_2",
      "sensor.presence_sensor_fp2_9f5a_light_sensor_light_level",
      "sensor.airthings_tern_co2_014764_temperature",
      "sensor.hue_office_temperature_2"
    ]
  }
}
```

This creates `group.office_environmental_sensors` containing all specified sensors.

### 2. Light Group

Create a group specifically for lights (supports combined control):

```json
{
  "domain": "light",
  "service": "group",
  "service_data": {
    "name": "All Downstairs Lights",
    "entities": [
      "light.living_room",
      "light.kitchen",
      "light.dining_room",
      "light.hallway"
    ]
  }
}
```

Light groups can be controlled as a single entity (brightness, color, etc.).

### 3. Switch Group

Group switches for simultaneous control:

```json
{
  "domain": "switch",
  "service": "group",
  "service_data": {
    "name": "All Fans",
    "entities": [
      "switch.ceiling_fan_living_room",
      "switch.ceiling_fan_bedroom",
      "switch.tower_fan_office"
    ]
  }
}
```

### 4. Cover Group

Group covers/blinds for synchronized operation:

```json
{
  "domain": "cover",
  "service": "group",
  "service_data": {
    "name": "All Window Blinds",
    "entities": [
      "cover.living_room_blind",
      "cover.bedroom_blind",
      "cover.office_blind"
    ]
  }
}
```

## Updating Groups

To update an existing group, simply call `group.set` again with the same `object_id`:

```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "office_environmental_sensors",
    "name": "Office Environmental Sensors (Updated)",
    "entities": [
      "sensor.airthings_tern_co2_014764_illuminance",
      "sensor.hue_office_illuminance_2",
      "sensor.presence_sensor_fp2_9f5a_light_sensor_light_level",
      "sensor.airthings_tern_co2_014764_temperature",
      "sensor.hue_office_temperature_2",
      "sensor.office_humidity"
    ]
  }
}
```

## Removing Groups

To remove a group, use the `group.remove` service:

```json
{
  "domain": "group",
  "service": "remove",
  "service_data": {
    "object_id": "office_environmental_sensors"
  }
}
```

## Group Types & Features

### Generic Groups (`group.set`)
- **Entities:** Any entity types
- **State:** Shows count of "on" entities
- **Control:** Limited to viewing
- **Use Case:** Organizing related entities

### Domain-Specific Groups
- **Light Groups:** Full brightness, color control
- **Switch Groups:** On/off for all switches
- **Cover Groups:** Position control for all covers
- **Fan Groups:** Speed control for all fans

## Advanced Usage

### Using Targets

You can use the `target` field to specify entities, devices, or areas:

```json
{
  "domain": "light",
  "service": "turn_on",
  "target": {
    "area_id": "living_room"
  },
  "service_data": {
    "brightness": 128
  }
}
```

### Getting Service Response

Set `return_response: true` to get data back from the service:

```json
{
  "domain": "homeassistant",
  "service": "get_config",
  "return_response": true
}
```

## Common Group Patterns

### 1. Temperature Sensors by Area
```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "all_temperature_sensors",
    "name": "All Temperature Sensors",
    "entities": [
      "sensor.living_room_temperature",
      "sensor.bedroom_temperature",
      "sensor.kitchen_temperature",
      "sensor.office_temperature"
    ]
  }
}
```

### 2. Motion Sensors
```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "all_motion_sensors",
    "name": "All Motion Sensors",
    "entities": [
      "binary_sensor.living_room_motion",
      "binary_sensor.hallway_motion",
      "binary_sensor.office_motion"
    ]
  }
}
```

### 3. Door Sensors
```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "all_door_sensors",
    "name": "All Doors",
    "entities": [
      "binary_sensor.front_door",
      "binary_sensor.back_door",
      "binary_sensor.garage_door"
    ]
  }
}
```

## Using Groups in Automations

Once created, groups can be used in automations:

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

## Checking Group State

Groups automatically aggregate member states:
- **Numeric sensors:** Average value
- **Binary sensors:** "on" if any member is "on"
- **Switches/Lights:** "on" if any member is "on"

## Error Handling

The `call_service` tool returns detailed error information:

```json
{
  "success": false,
  "message": "Service not found: group.invalid_service",
  "domain": "group",
  "service": "invalid_service",
  "error_details": "..."
}
```

## Best Practices

1. **Naming:** Use descriptive `object_id` values (snake_case)
   - Good: `office_environmental_sensors`
   - Bad: `group1`

2. **Organization:** Group by function, not just entity type
   - Good: `security_sensors`, `climate_controls`
   - Bad: `all_sensors`, `all_switches`

3. **Maintenance:** Update groups when adding/removing devices
   - Re-run `group.set` with updated entity list

4. **Documentation:** Use clear `name` values for UI display
   - The `name` appears in Home Assistant UI
   - The `object_id` becomes the entity ID

## Other Useful Services

The `call_service` tool can call ANY Home Assistant service:

### Reload Automations
```json
{
  "domain": "automation",
  "service": "reload"
}
```

### Execute Script
```json
{
  "domain": "script",
  "service": "turn_on",
  "target": {
    "entity_id": "script.good_morning"
  }
}
```

### Send Notification
```json
{
  "domain": "notify",
  "service": "mobile_app_iphone",
  "service_data": {
    "message": "Motion detected!",
    "title": "Security Alert"
  }
}
```

### Update Entity
```json
{
  "domain": "homeassistant",
  "service": "update_entity",
  "target": {
    "entity_id": "sensor.my_sensor"
  }
}
```

## Troubleshooting

### Group Not Created
- Check entity IDs are correct and exist
- Verify `object_id` follows naming rules (lowercase, underscores)
- Ensure Home Assistant has write permissions

### Group State Not Updating
- Groups update automatically when member states change
- If stuck, try removing and recreating the group
- Check member entities are functioning correctly

### Can't Control Group
- For domain-specific control, use domain-specific groups
- Generic groups (`group.set`) are view-only
- Use `light.group`, `switch.group`, etc. for controllable groups

## Summary

The `call_service` tool provides:
- ✅ Full access to Home Assistant service API
- ✅ Dynamic group creation and management
- ✅ No configuration file editing required
- ✅ Immediate effect (no restart needed)
- ✅ Works with all entity types
- ✅ Supports advanced targeting (areas, devices)

For your specific use case, use:
```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "office_environmental_sensors",
    "name": "Office Environmental Sensors",
    "entities": ["sensor.1", "sensor.2", "..."]
  }
}
```

This will create `group.office_environmental_sensors` containing all your specified sensors!
