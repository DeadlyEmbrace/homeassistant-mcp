# Home Assistant Automation Retrieval

This document describes the enhanced automation retrieval capabilities added to the Home Assistant MCP Server.

## Overview

The server now provides comprehensive automation retrieval functionality through both MCP tools and HTTP endpoints, allowing you to:

1. **List all automations** with basic information
2. **Get detailed configuration** for specific automations
3. **Access automation data** via RESTful HTTP endpoints

## MCP Tools

### 1. Enhanced `automation` Tool

The existing `automation` tool has been enhanced with a new `get_config` action:

#### Actions Available:
- `list` - Get all automations with basic info
- `toggle` - Enable/disable an automation
- `trigger` - Manually trigger an automation  
- `get_config` - **NEW**: Get detailed configuration for a specific automation

#### Examples:

**List All Automations:**
```json
{
  "tool": "automation",
  "action": "list"
}
```

**Response:**
```json
{
  "success": true,
  "automations": [
    {
      "entity_id": "automation.morning_routine",
      "name": "Morning Routine", 
      "state": "on",
      "last_triggered": "2024-01-01T07:00:00Z",
      "description": "Turn on lights at sunrise",
      "mode": "single"
    }
  ]
}
```

**Get Automation Configuration:**
```json
{
  "tool": "automation",
  "action": "get_config",
  "automation_id": "automation.morning_routine"
}
```

**Response:**
```json
{
  "success": true,
  "automation_config": {
    "entity_id": "automation.morning_routine",
    "alias": "Morning Routine",
    "description": "Turn on lights at sunrise",
    "mode": "single",
    "trigger": [
      {
        "platform": "sun",
        "event": "sunrise"
      }
    ],
    "condition": [
      {
        "condition": "time", 
        "after": "06:00:00"
      }
    ],
    "action": [
      {
        "service": "light.turn_on",
        "target": {
          "entity_id": "light.living_room"
        }
      }
    ]
  }
}
```

## HTTP REST Endpoints

### 1. List All Automations

**Endpoint:** `GET /automations`

**Headers:**
```
Authorization: Bearer YOUR_HASS_TOKEN
```

**Response:**
```json
{
  "success": true,
  "automations": [
    {
      "entity_id": "automation.morning_routine",
      "name": "Morning Routine",
      "state": "on", 
      "last_triggered": "2024-01-01T07:00:00Z",
      "description": "Turn on lights at sunrise",
      "mode": "single"
    }
  ]
}
```

### 2. Get Automation Configuration

**Endpoint:** `GET /automations/:automation_id/config`

**Headers:**
```
Authorization: Bearer YOUR_HASS_TOKEN
```

**Example:** `GET /automations/automation.morning_routine/config`

**Response:**
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

### 3. Execute Automation Actions

**Endpoint:** `POST /automations`

**Headers:**
```
Authorization: Bearer YOUR_HASS_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "toggle",
  "automation_id": "automation.morning_routine"
}
```

## Data Structure

### Automation List Item
```typescript
{
  entity_id: string;           // e.g., "automation.morning_routine"
  name: string;                // Friendly name or derived from entity_id
  state: "on" | "off";         // Current state
  last_triggered: string;      // ISO timestamp or null
  description: string | null;  // Automation description 
  mode: string | null;         // Execution mode (single, parallel, etc.)
}
```

### Automation Configuration
```typescript
{
  entity_id: string;           // Automation entity ID
  alias: string;               // Automation friendly name
  description: string | null;  // Automation description
  mode: string;                // Execution mode (defaults to "single")
  trigger: any[];              // Array of trigger definitions
  condition: any[];            // Array of condition definitions  
  action: any[];               // Array of action definitions
}
```

## Authentication

All endpoints require authentication using your Home Assistant Long-Lived Access Token:

```
Authorization: Bearer YOUR_LONG_LIVED_ACCESS_TOKEN
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error scenarios:
- **401 Unauthorized**: Missing or invalid token
- **404 Not Found**: Automation not found  
- **500 Internal Server Error**: Home Assistant connection issues

## Usage Tips

1. **List First**: Use the `/automations` endpoint to get all automation IDs
2. **Get Details**: Use the specific automation config endpoint for detailed information
3. **Batch Operations**: The list endpoint is more efficient for getting basic info about multiple automations
4. **Real-time Data**: All data is fetched in real-time from Home Assistant

## Integration Examples

### Curl Examples

**List automations:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4001/automations
```

**Get automation config:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4001/automations/automation.morning_routine/config
```

**Toggle automation:**
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action":"toggle","automation_id":"automation.morning_routine"}' \
     http://localhost:4001/automations
```

This enhanced automation retrieval system provides flexible access to Home Assistant automation data for monitoring, analysis, and management purposes.
