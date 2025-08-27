# MCP HTTP Transport Documentation

## Overview

The Home Assistant MCP Server provides an HTTP-based transport layer for the Model Context Protocol (MCP), enabling integration with HTTP-based clients like n8n, Make.com, Zapier, and custom applications.

## Base Configuration

### Server URL
```
http://<YOUR_IP>:4000
```

### Authentication
All requests require Bearer token authentication using your Home Assistant long-lived access token.

```
Authorization: Bearer <YOUR_HASS_TOKEN>
```

## Endpoints

### 1. Main MCP Protocol Endpoint

**URL:** `/mcp`  
**Method:** `POST`  
**Content-Type:** `application/json`  
**Authentication:** Required

This endpoint handles all MCP protocol messages using JSON-RPC 2.0 format.

### 2. Tool Discovery Endpoint

**URL:** `/mcp/tools`  
**Method:** `GET`  
**Authentication:** Required

Returns a simplified list of available MCP tools (non JSON-RPC format).

### 3. Health Check Endpoint

**URL:** `/mcp/health`  
**Method:** `GET`  
**Authentication:** Not required

Returns the health status of the MCP HTTP transport.

## JSON-RPC 2.0 Protocol

All MCP protocol communication uses JSON-RPC 2.0 format.

### Request Structure

```json
{
  "jsonrpc": "2.0",
  "id": <unique_identifier>,
  "method": "<method_name>",
  "params": {
    // method-specific parameters
  }
}
```

### Response Structure

Success:
```json
{
  "jsonrpc": "2.0",
  "id": <matching_request_id>,
  "result": {
    // method-specific result
  }
}
```

Error:
```json
{
  "jsonrpc": "2.0",
  "id": <matching_request_id>,
  "error": {
    "code": <error_code>,
    "message": "<error_message>",
    "data": {
      // optional error details
    }
  }
}
```

## Available Methods

### 1. initialize

Initialize a new MCP session.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.1.0",
    "capabilities": {
      "tools": {},
      "completion": {}
    },
    "serverInfo": {
      "name": "home-assistant-mcp",
      "version": "0.1.0"
    }
  }
}
```

### 2. tools/list

List all available MCP tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "list_devices",
        "description": "List all Home Assistant devices grouped by domain",
        "inputSchema": {
          "type": "object",
          "properties": {},
          "required": []
        }
      },
      {
        "name": "control",
        "description": "Control Home Assistant devices and services",
        "inputSchema": {
          "type": "object",
          "properties": {
            "command": {
              "type": "string",
              "description": "The command to execute"
            },
            "entity_id": {
              "type": "string",
              "description": "The entity ID to control"
            }
          },
          "required": ["command", "entity_id"]
        }
      }
      // ... more tools
    ]
  }
}
```

### 3. tools/call

Execute a specific MCP tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": {
      // tool-specific arguments
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "<tool_execution_result>"
      }
    ]
  }
}
```

### 4. completion/complete

Get completion suggestions (for autocomplete).

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/tool"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "completion": {
      "values": [
        {"value": "list_devices"},
        {"value": "control"},
        {"value": "get_history"}
      ]
    }
  }
}
```

## Available MCP Tools

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `list_devices` | List all Home Assistant devices | None |
| `control` | Control devices (lights, switches, etc.) | `command`, `entity_id`, `brightness`, `color_temp` |
| `get_history` | Get entity state history | `entity_id`, `start_time`, `end_time` |
| `activate_scene` | Activate a Home Assistant scene | `scene_id` |
| `send_notification` | Send notifications | `message`, `title`, `target` |
| `trigger_automation` | Trigger an automation | `automation_id` |
| `manage_addons` | Manage Home Assistant add-ons | `action`, `addon` |
| `manage_packages` | Manage HACS packages | `action`, `repository` |
| `configure_automation` | Create/modify automations | `automation_id`, `config` |
| `subscribe_events` | Subscribe to real-time events | `event_type`, `entity_id` |
| `get_sse_stats` | Get SSE connection statistics | None |

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32001 | Unauthorized | Invalid or missing authentication token |
| -32600 | Invalid Request | Not a valid JSON-RPC 2.0 request |
| -32601 | Method not found | The requested method does not exist |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Internal server error |

## Example Tool Executions

### Turn on a Light

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "control",
    "arguments": {
      "command": "turn_on",
      "entity_id": "light.living_room",
      "brightness": 128,
      "color_temp": 4000
    }
  }
}
```

### Get Device List

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "list_devices",
    "arguments": {}
  }
}
```

### Activate a Scene

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "activate_scene",
    "arguments": {
      "scene_id": "scene.movie_night"
    }
  }
}
```

## Testing with curl

### List Available Tools
```bash
curl -X POST http://localhost:4000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Execute a Tool
```bash
curl -X POST http://localhost:4000/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "control",
      "arguments": {
        "command": "turn_off",
        "entity_id": "light.bedroom"
      }
    }
  }'
```

### Get Tool List (Simplified)
```bash
curl -X GET http://localhost:4000/mcp/tools \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rate Limiting

The MCP HTTP transport includes rate limiting:
- Default: 100 requests per minute per IP
- Applies to all MCP endpoints
- Returns 429 (Too Many Requests) when exceeded

## Security Considerations

1. **Always use HTTPS in production** - The examples use HTTP for local development
2. **Secure your token** - Never expose your Home Assistant token in client-side code
3. **Network isolation** - Consider using a VPN or private network for production
4. **Monitor access logs** - Check for unauthorized access attempts
5. **Token rotation** - Regularly rotate your Home Assistant access tokens

## WebSocket vs HTTP Transport

| Feature | WebSocket (stdio) | HTTP Transport |
|---------|------------------|----------------|
| Real-time updates | Yes | No (use SSE endpoints) |
| Stateless | No | Yes |
| Firewall friendly | No | Yes |
| Load balancing | Difficult | Easy |
| Client support | Limited | Universal |
| Best for | Desktop apps | Web services, automation |

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function callMCPTool(toolName, args) {
  const response = await axios.post('http://localhost:4000/mcp', {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  }, {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.result;
}

// Usage
callMCPTool('control', {
  command: 'turn_on',
  entity_id: 'light.kitchen'
});
```

### Python
```python
import requests
import json

def call_mcp_tool(tool_name, arguments):
    url = "http://localhost:4000/mcp"
    headers = {
        "Authorization": "Bearer YOUR_TOKEN",
        "Content-Type": "application/json"
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }
    
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# Usage
result = call_mcp_tool("control", {
    "command": "turn_on",
    "entity_id": "light.living_room"
})
```

## Next Steps

- For n8n integration, see [N8N Setup Guide](./N8N_SETUP_GUIDE.md)
- For SSE real-time events, see [SSE API Documentation](./SSE_API.md)
- For general API reference, see [API Documentation](./API.md)