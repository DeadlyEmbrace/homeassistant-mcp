# WebSocket API Integration for Home Assistant Automation YAML

## 🚀 **What's New: WebSocket API Support**

Following your suggestion to explore the WebSocket API for automation YAML retrieval, I've implemented a comprehensive WebSocket integration that provides **direct access to automation configurations** - similar to how ComfyUI exposes workflow details.

## 🔧 **Technical Implementation**

### **Enhanced WebSocket Client**
The WebSocket client (`src/websocket/client.ts`) now includes:

```typescript
// New WebSocket methods for automation access
public async callWS(message: any): Promise<any>
public async getAutomationConfig(entityId: string): Promise<any>
public async getConfig(): Promise<any>
public async getStates(): Promise<any>
```

### **Multi-Layer Retrieval Strategy**
The automation tool now uses a **4-tier approach** for maximum compatibility:

1. **🔌 WebSocket API** (NEW - Highest Priority)
   - Direct `automation/config` command
   - Bypasses REST API limitations
   - Best for UI-created automations

2. **🌐 Individual Config API**
   - `GET /api/config/automation/config/{id}`
   - Works for file-based automations

3. **📋 All Config API**
   - `GET /api/config/automation/config`
   - Searches through all configurations

4. **🔄 Template API + State Fallback**
   - Template engine inspection
   - Basic state information fallback

## 🎯 **Key Benefits**

### **🔓 Access Previously Inaccessible Automations**
The WebSocket API can retrieve configurations for automations that were:
- Created through the Home Assistant UI
- Not accessible via REST Config API
- Missing from traditional API endpoints

### **📊 Source Attribution**
Every response now includes source tracking:
```json
{
  "success": true,
  "automation_yaml": "...",
  "raw_config": {...},
  "source": "websocket_api"  // or "config_api", "template_api", etc.
}
```

### **🎨 Enhanced YAML Output**
YAML now includes source information:
```yaml
# Automation: Morning Routine
# Description: Turn on lights at sunrise
# Retrieved via WebSocket API

automation:
  alias: Morning Routine
  # ... full configuration
```

## 📋 **Usage Examples**

### **MCP Tool Usage:**
```json
{
  "tool": "automation",
  "action": "get_yaml", 
  "automation_id": "automation.morning_routine"
}
```

### **HTTP API Usage:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4003/automations/automation.morning_routine/yaml
```

## 🔄 **Connection Flow**

### **Server Startup:**
1. Establish REST API connection to Home Assistant
2. Initialize WebSocket connection (`ws://your-ha-instance/api/websocket`)
3. Authenticate via WebSocket
4. Set up auto-reconnection for resilience
5. Graceful fallback if WebSocket unavailable

### **Automation Retrieval:**
1. **WebSocket First**: Try `automation/config` command via WebSocket
2. **REST Fallback**: Use existing multi-API approach if WebSocket fails
3. **Source Tracking**: Record which method successfully retrieved data
4. **YAML Generation**: Format with source attribution

## 🎪 **ComfyUI-Like Experience**

Just like ComfyUI provides comprehensive workflow export, you now get:

### **📄 Complete Configuration Export**
```yaml
# Automation: Smart Security System
# Description: Activate security when away
# Retrieved via WebSocket API

automation:
  alias: Smart Security System
  description: Activate security when away
  mode: single
  
  trigger:
    - {
        "platform": "state",
        "entity_id": "device_tracker.phone",
        "to": "not_home",
        "for": "00:05:00"
      }

  condition:
    - {
        "condition": "time", 
        "after": "22:00:00"
      }

  action:
    - {
        "service": "alarm_control_panel.alarm_arm_away",
        "target": {
          "entity_id": "alarm_control_panel.house"
        }
      }
```

### **🔍 Detailed Inspection**
- **Triggers**: Complete trigger configurations with timing
- **Conditions**: All conditional logic with parameters
- **Actions**: Full action sequences with service calls
- **Mode**: Execution mode (single, restart, queued, parallel)
- **Variables**: Automation-specific variables and data

## 🚦 **Error Handling & Resilience**

### **WebSocket Connection Issues**
- Automatic reconnection with exponential backoff
- Graceful degradation to REST APIs
- Clear logging of connection status
- No service interruption if WebSocket unavailable

### **API Accessibility**
```json
// WebSocket success
{
  "success": true,
  "source": "websocket_api",
  "automation_yaml": "# Full configuration..."
}

// WebSocket fallback
{
  "success": true, 
  "source": "config_api",
  "automation_yaml": "# Retrieved via fallback..."
}

// Complete fallback
{
  "success": true,
  "source": "state_based_fallback",
  "automation_yaml": "# Limited information...",
  "note": "Full configuration not accessible"
}
```

## 🧪 **Testing Results**

The implementation has been tested with:
- ✅ WebSocket API successful automation retrieval
- ✅ Graceful fallback when WebSocket unavailable
- ✅ Source attribution tracking
- ✅ YAML generation with multiple data sources
- ✅ Error handling for various failure scenarios

## 🎁 **Additional WebSocket Capabilities**

The WebSocket client also provides access to:
- **`get_config`**: Home Assistant configuration
- **`get_states`**: All entity states
- **Event subscriptions**: Real-time updates
- **Service calls**: Execute Home Assistant services

## 🎉 **Results**

You now have **ComfyUI-level automation export capabilities** with:

1. **🔌 Direct WebSocket Access**: Bypasses REST API limitations
2. **📋 Complete Configuration Export**: Full trigger/condition/action details
3. **🔄 Multi-Layer Fallback**: Maximum compatibility across automation types
4. **📊 Source Transparency**: Clear indication of data retrieval method
5. **🎨 Enhanced YAML**: Human-readable with source attribution

The WebSocket API integration provides the **deepest possible access to automation configurations**, just like you wanted - similar to ComfyUI's comprehensive workflow export capabilities!

**Try it now** with any Home Assistant automation to see the enhanced YAML export in action! 🚀
