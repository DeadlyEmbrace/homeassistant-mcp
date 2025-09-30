# Error Trace Functionality Documentation

## Overview

The Home Assistant MCP server now includes comprehensive error trace functionality to help users identify, analyze, and debug automation failures. This feature addresses the common need to find traces that had errors and provides filtered access to automation execution history.

## Features

### 1. Error-Specific Trace Retrieval
- **Function**: `getAutomationErrorTraces()`
- **Purpose**: Retrieve only traces that encountered errors
- **Benefits**: Quick identification of problematic executions

### 2. Advanced Trace Filtering
- **Function**: `getFilteredAutomationTraces()`
- **Purpose**: Filter traces by execution status, error presence, timestamps, and more
- **Benefits**: Precise debugging and pattern analysis

### 3. MCP Actions
- **`get_error_traces`**: Direct access to error traces via MCP
- **`get_filtered_traces`**: Advanced filtering via MCP

## API Reference

### getAutomationErrorTraces()

```typescript
async function getAutomationErrorTraces(
  automationId: string,
  hassHost: string,
  hassToken: string,
  wsClient?: HassWebSocketClient
): Promise<{
  success: boolean;
  message: string;
  error_traces?: AutomationTrace[];
  total_traces?: number;
  error_count?: number;
}>
```

**Parameters:**
- `automationId`: Entity ID of the automation (e.g., "automation.morning_routine")
- `hassHost`: Home Assistant URL
- `hassToken`: Long-lived access token
- `wsClient`: Optional WebSocket client for faster access

**Returns:**
- `success`: Whether the operation completed successfully
- `message`: Descriptive message about the result
- `error_traces`: Array of traces that had errors
- `total_traces`: Total number of traces checked
- `error_count`: Number of error traces found

### getFilteredAutomationTraces()

```typescript
async function getFilteredAutomationTraces(
  automationId: string,
  filter: AutomationTraceFilter,
  hassHost: string,
  hassToken: string,
  wsClient?: HassWebSocketClient
): Promise<{
  success: boolean;
  message: string;
  traces?: AutomationTrace[];
  total_filtered?: number;
}>
```

**Filter Options (AutomationTraceFilter):**
```typescript
interface AutomationTraceFilter {
  has_error?: boolean;           // Filter by error presence
  script_execution?: string;     // "finished" | "failed" | "timeout" | "cancelled"
  state?: string;               // "running" | "stopped" | "debugged"
  since?: string;               // ISO timestamp for time filtering
  limit?: number;               // Maximum number of results
}
```

## MCP Usage

### Get Error Traces

```json
{
  "tool": "automation",
  "action": "get_error_traces",
  "automation_id": "automation.morning_routine"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Found 2 error traces out of 15 total traces",
  "error_traces": [
    {
      "run_id": "abc123",
      "timestamp": "2024-01-15T08:00:00Z",
      "state": "stopped",
      "script_execution": "failed",
      "error": "Service call failed: light.turn_on"
    }
  ],
  "total_traces": 15,
  "error_count": 2
}
```

### Get Filtered Traces

```json
{
  "tool": "automation",
  "action": "get_filtered_traces",
  "automation_id": "automation.morning_routine",
  "filter_has_error": true,
  "filter_script_execution": "failed",
  "filter_limit": 10,
  "filter_since": "2024-01-01T00:00:00Z"
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Found 3 filtered traces",
  "traces": [
    {
      "run_id": "def456",
      "timestamp": "2024-01-15T08:00:00Z",
      "state": "stopped", 
      "script_execution": "failed",
      "error": "Template error: entity not found"
    }
  ],
  "total_filtered": 3
}
```

## Use Cases

### 1. 🚨 Finding Failed Automations

**Scenario**: You notice an automation isn't working correctly and want to see what went wrong.

**Solution**: Use `get_error_traces` to quickly identify all executions that encountered errors.

```json
{
  "tool": "automation",
  "action": "get_error_traces", 
  "automation_id": "automation.lights_schedule"
}
```

### 2. 🔍 Debugging Specific Failure Types

**Scenario**: You want to focus on automations that failed during execution vs. those that timed out.

**Solution**: Use filtered traces with specific execution status.

```json
{
  "tool": "automation",
  "action": "get_filtered_traces",
  "automation_id": "automation.security_system",
  "filter_script_execution": "failed"
}
```

### 3. 📊 Error Pattern Analysis

**Scenario**: You need to understand how frequently an automation fails and identify patterns.

**Solution**: Get error history with a reasonable limit for analysis.

```json
{
  "tool": "automation", 
  "action": "get_filtered_traces",
  "automation_id": "automation.weather_updates",
  "filter_has_error": true,
  "filter_limit": 50
}
```

### 4. ⏰ Time-Based Error Investigation

**Scenario**: You made changes to an automation and want to see if errors occurred after the change.

**Solution**: Filter errors since a specific timestamp.

```json
{
  "tool": "automation",
  "action": "get_filtered_traces", 
  "automation_id": "automation.morning_routine",
  "filter_has_error": true,
  "filter_since": "2024-01-15T00:00:00Z"
}
```

### 5. 🎯 Timeout and Performance Analysis

**Scenario**: Automations seem slow or are timing out, and you need to identify performance issues.

**Solution**: Filter for timeout and cancellation events.

```json
{
  "tool": "automation",
  "action": "get_filtered_traces",
  "automation_id": "automation.complex_scene",
  "filter_script_execution": "timeout"
}
```

## Error Types Detected

### Script Execution Errors
- **`failed`**: Action execution failed
- **`timeout`**: Execution exceeded time limit
- **`cancelled`**: Execution was cancelled

### Explicit Errors
- Template rendering errors
- Service call failures
- Entity not found errors
- Permission denied errors
- Network connectivity issues

### State-Based Errors
- Automations stuck in "running" state
- Unexpected "stopped" states
- Debug mode issues

## Implementation Details

### WebSocket-First Approach
The error trace functionality uses a WebSocket-first approach for optimal performance:

1. **Primary**: WebSocket API for real-time trace data
2. **Fallback**: Logbook API for historical trace information
3. **Graceful Degradation**: Informative messages when trace data is unavailable

### Error Detection Logic
```typescript
// An automation trace has errors if:
const hasError = trace.error || 
                trace.script_execution === 'failed' ||
                trace.script_execution === 'timeout' ||
                trace.script_execution === 'cancelled';
```

### Performance Considerations
- Traces are filtered on the server side when possible
- Results are limited by default to prevent overwhelming responses
- WebSocket connections are reused for efficiency
- Graceful handling of API limitations

## Error Handling

### Common Error Scenarios

1. **Automation Not Found**
   ```json
   {
     "success": false,
     "message": "Automation 'automation.invalid_id' not found"
   }
   ```

2. **No Trace Data Available**
   ```json
   {
     "success": true,
     "message": "No trace data available for this automation",
     "error_traces": [],
     "total_traces": 0,
     "error_count": 0
   }
   ```

3. **API Connection Issues**
   ```json
   {
     "success": false,
     "message": "Unable to connect to Home Assistant WebSocket API. Using logbook fallback."
   }
   ```

### Best Practices

1. **Always check the `success` field** before processing trace data
2. **Use appropriate limits** to avoid overwhelming responses
3. **Implement retry logic** for network-related failures
4. **Combine multiple approaches** (error traces + filtered traces) for comprehensive debugging
5. **Monitor trace patterns** to identify systemic issues

## Integration Examples

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "node",
      "args": ["/path/to/homeassistant-mcp/dist/index.js"],
      "env": {
        "HASS_HOST": "http://homeassistant.local:8123",
        "HASS_TOKEN": "your_long_lived_access_token"
      }
    }
  }
}
```

### Command Line Testing

```bash
# Set environment variables
export HASS_HOST="http://homeassistant.local:8123"
export HASS_TOKEN="your_token_here"

# Run error trace test
node test-error-traces.js
```

## Troubleshooting

### Common Issues

1. **404 Errors**: The old REST API endpoints don't exist. This implementation uses WebSocket API instead.

2. **Empty Results**: Some automations may not have trace data if they haven't run recently or trace logging is disabled.

3. **Permission Errors**: Ensure your access token has sufficient permissions to read automation traces.

4. **WebSocket Connection Failed**: The system will automatically fall back to logbook API.

### Debug Steps

1. Verify Home Assistant connection and token
2. Check that the automation exists and has run recently
3. Enable trace logging in Home Assistant if needed
4. Test with a simple automation first
5. Check Home Assistant logs for WebSocket connection issues

## Future Enhancements

- **Real-time error monitoring**: WebSocket subscriptions for live error detection
- **Error categorization**: Group errors by type and severity
- **Performance metrics**: Execution time analysis and optimization suggestions
- **Historical trending**: Long-term error pattern analysis
- **Alert integration**: Notification when error patterns are detected

## Contributing

When contributing to the error trace functionality:

1. Maintain backwards compatibility with existing trace interfaces
2. Add comprehensive error handling for new scenarios
3. Include test cases for error conditions
4. Update documentation with new filter options
5. Follow the WebSocket-first, fallback pattern for new APIs

---

*This error trace functionality significantly enhances the debugging capabilities of the Home Assistant MCP server, providing users with powerful tools to identify, analyze, and resolve automation issues.*