# n8n MCP Integration Guide

This guide explains how to integrate the Home Assistant MCP server with n8n workflows using the HTTP-based MCP transport.

## Overview

The Home Assistant MCP server now includes an HTTP-based MCP transport layer that allows n8n to:
- Authenticate using bearer tokens
- List all available MCP tools
- Execute MCP tools via HTTP requests
- Use standard JSON-RPC 2.0 protocol

## Endpoints

### Main MCP Endpoint
- **URL**: `http://192.168.3.148:4000/mcp`
- **Method**: POST
- **Authentication**: Bearer token in Authorization header
- **Content-Type**: application/json

### Tool Listing Endpoint
- **URL**: `http://192.168.3.148:4000/mcp/tools`
- **Method**: GET
- **Authentication**: Bearer token in Authorization header

### Health Check
- **URL**: `http://192.168.3.148:4000/mcp/health`
- **Method**: GET
- **Authentication**: None required

## Authentication

All MCP requests require authentication using your Home Assistant long-lived access token:

```
Authorization: Bearer YOUR_HASS_TOKEN
```

## MCP Protocol Messages

The MCP endpoint accepts JSON-RPC 2.0 formatted requests.

### 1. Initialize Session

```json
POST /mcp
Authorization: Bearer YOUR_HASS_TOKEN

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

Response:
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

### 2. List Available Tools

```json
POST /mcp
Authorization: Bearer YOUR_HASS_TOKEN

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

Response:
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
            },
            "brightness": {
              "type": "number",
              "description": "Brightness level for lights (0-255)"
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

### 3. Execute a Tool

```json
POST /mcp
Authorization: Bearer YOUR_HASS_TOKEN

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "control",
    "arguments": {
      "command": "turn_on",
      "entity_id": "light.living_room",
      "brightness": 128
    }
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"message\": \"Successfully turned on light.living_room\"}"
      }
    ]
  }
}
```

## n8n Workflow Configuration

### Using HTTP Request Node

1. **Add HTTP Request Node** to your n8n workflow

2. **Configure the node**:
   - **Method**: POST
   - **URL**: `http://192.168.3.148:4000/mcp`
   - **Authentication**: Generic Credential Type → Header Auth
     - Name: `Authorization`
     - Value: `Bearer YOUR_HASS_TOKEN`
   - **Headers**:
     - Content-Type: `application/json`
   - **Body Content Type**: JSON
   - **Body**:
     ```json
     {
       "jsonrpc": "2.0",
       "id": "{{$json.id}}",
       "method": "tools/call",
       "params": {
         "name": "control",
         "arguments": {
           "command": "turn_on",
           "entity_id": "light.living_room"
         }
       }
     }
     ```

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "http://192.168.3.148:4000/mcp",
        "method": "POST",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyContentType": "json",
        "body": "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"method\": \"tools/list\",\n  \"params\": {}\n}"
      },
      "name": "List MCP Tools",
      "type": "n8n-nodes-base.httpRequest",
      "position": [250, 300]
    }
  ]
}
```

## Available MCP Tools

The following tools are available via the MCP HTTP transport:

1. **list_devices** - List all Home Assistant devices
2. **control** - Control devices (turn on/off, set brightness, etc.)
3. **get_history** - Get device state history
4. **activate_scene** - Activate Home Assistant scenes
5. **send_notification** - Send notifications
6. **trigger_automation** - Trigger automations
7. **manage_addons** - Manage Home Assistant add-ons
8. **manage_packages** - Manage HACS packages
9. **configure_automation** - Create/modify automations
10. **subscribe_events** - Subscribe to real-time events
11. **get_sse_stats** - Get SSE connection statistics

## Error Handling

The MCP endpoint returns standard JSON-RPC 2.0 error responses:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found: invalid_method"
  }
}
```

Common error codes:
- `-32001`: Unauthorized - Invalid or missing token
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

## Testing with curl

You can test the MCP endpoint using curl:

```bash
# List tools
curl -X POST http://192.168.3.148:4000/mcp \
  -H "Authorization: Bearer YOUR_HASS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Execute a tool
curl -X POST http://192.168.3.148:4000/mcp \
  -H "Authorization: Bearer YOUR_HASS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_devices",
      "arguments": {}
    }
  }'

# Simple tool list (non-MCP format)
curl -X GET http://192.168.3.148:4000/mcp/tools \
  -H "Authorization: Bearer YOUR_HASS_TOKEN"
```

## Security Notes

- Always use HTTPS in production environments
- Keep your Home Assistant token secure
- Consider implementing rate limiting for production use
- Monitor access logs for unauthorized attempts

## Troubleshooting

1. **Authentication Errors**: Ensure your token is correct and includes "Bearer " prefix
2. **Connection Refused**: Check that the MCP server is running on port 4000
3. **Method Not Found**: Verify you're using the correct method name (e.g., "tools/list")
4. **Invalid Parameters**: Check that tool arguments match the expected schema

## Support

For issues or questions about the MCP HTTP transport, please check:
- The main [README.md](../README.md)
- The [API documentation](./API.md)
- GitHub issues at the project repository