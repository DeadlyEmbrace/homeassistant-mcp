# Group Management via MCP

Complete guide for creating and managing Home Assistant groups using the MCP.

## Overview

Home Assistant supports groups through two methods:

1. **Legacy Groups** (`call_service` with `group.set`) - Programmatically creatable, limited UI visibility
2. **Group Helpers** (Manual UI creation) - Full UI integration, but NO API for programmatic creation

## ⚠️ Reality Check: Group Helpers Not API-Creatable

**Important:** Despite what you might expect, Home Assistant's Group integration (the modern helper-style groups) **does NOT provide an API** for programmatic creation. 

The Group integration uses `config_entries` but doesn't expose a `config_entries/flow/create` endpoint for groups like other integrations. The only way to create Group helpers is through the UI:
- Settings → Devices & Services → Helpers → Create Helper → Group

This means **via MCP, you can ONLY create legacy groups using `group.set`**.

## Creating Legacy Groups (Only Programmatic Option)

Use the `call_service` tool with `group.set`:

```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "office_temperature_sensors",
    "name": "Office Temperature Sensors",
    "icon": "mdi:thermometer",
    "entities": [
      "sensor.airthings_tern_co2_014764_temperature",
      "sensor.hue_office_temperature_2"
    ]
  }
}
```

### Legacy Group Characteristics

**What You Get:**
- ✅ Programmatically creatable via API
- ✅ Works in automations
- ✅ State reflects member entity states
- ✅ Can be updated and deleted via API
- ✅ Appears in entity states list

**Limitations:**
- ❌ No entity registry entry (no unique ID)
- ❌ Not listed in Settings → Helpers UI
- ❌ Can't be edited through UI
- ❌ May not persist across restarts consistently
- ❌ No advanced features

This creates `group.office_temperature_sensors` that will work in automations and show aggregate state.

## Summary

**Via MCP:**
```json
{
  "domain": "group",
  "service": "set",
  "service_data": {
    "object_id": "office_temperature_sensors",
    "name": "Office Temperature Sensors",
    "icon": "mdi:thermometer",
    "entities": [
      "sensor.airthings_tern_co2_014764_temperature",
      "sensor.hue_office_temperature_2"
    ]
  }
}
```

**For UI Management:** Create manually in Settings → Helpers → Group

**For Persistence:** Add to `configuration.yaml`
