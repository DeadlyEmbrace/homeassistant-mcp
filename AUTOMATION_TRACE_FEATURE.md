# Home Assistant Automation Trace Retrieval

This document describes the new automation trace functionality added to the Home Assistant MCP server. Automation traces provide detailed execution information for debugging and monitoring automation runs.

## Overview

Home Assistant automatically records traces of automation executions. By default, the last 5 traces are stored for each automation. These traces contain step-by-step execution details, timing information, variable changes, and error information.

## Features Added

### 1. TypeScript Interfaces

New interfaces added to `automation-helpers.ts`:

- `AutomationTraceStep`: Individual step execution details
- `AutomationTrace`: Complete trace data for one automation run  
- `AutomationTraceListItem`: Summary information for trace listings
- `AutomationTraceListResult`: Result type for trace list operations
- `AutomationTraceDetailResult`: Result type for detailed trace operations

### 2. Core Functions

#### `getAutomationTraces(automationId, hassHost, hassToken)`
Retrieves a list of recent traces for an automation.

**Parameters:**
- `automationId`: Automation identifier (supports multiple formats)
- `hassHost`: Home Assistant host URL
- `hassToken`: Long-lived access token

**Returns:** `AutomationTraceListResult`
```typescript
{
  success: boolean;
  traces?: AutomationTraceListItem[];
  message?: string;
  automation_id?: string;
  entity_id?: string;
}
```

#### `getAutomationTraceDetail(automationId, runId, hassHost, hassToken)`
Retrieves detailed trace information for a specific automation run.

**Parameters:**
- `automationId`: Automation identifier
- `runId`: Specific trace run ID
- `hassHost`: Home Assistant host URL  
- `hassToken`: Long-lived access token

**Returns:** `AutomationTraceDetailResult`
```typescript
{
  success: boolean;
  trace?: AutomationTrace;
  message?: string;
  automation_id?: string;
  entity_id?: string;
}
```

#### `getAutomationLatestTrace(automationId, hassHost, hassToken)`
Convenience function to get the most recent trace for an automation.

**Parameters:**
- `automationId`: Automation identifier
- `hassHost`: Home Assistant host URL
- `hassToken`: Long-lived access token

**Returns:** `AutomationTraceDetailResult`

### 3. MCP Tool Actions

New actions added to the `automation` tool:

#### `get_traces`
Lists recent traces for an automation.

**Request:**
```json
{
  "tool": "automation",
  "action": "get_traces",
  "automation_id": "automation.morning_routine"
}
```

**Response:**
```json
{
  "success": true,
  "traces": [
    {
      "run_id": "01HQXXX...",
      "timestamp": "2024-01-15T07:00:00Z",
      "state": "stopped",
      "script_execution": "finished",
      "last_step": "action/0",
      "error": null
    }
  ],
  "automation_id": "morning_routine",
  "entity_id": "automation.morning_routine",
  "message": "Retrieved 1 trace(s) for automation automation.morning_routine"
}
```

#### `get_trace_detail`
Gets detailed execution information for a specific trace.

**Request:**
```json
{
  "tool": "automation",
  "action": "get_trace_detail", 
  "automation_id": "automation.morning_routine",
  "run_id": "01HQXXX..."
}
```

**Response:**
```json
{
  "success": true,
  "trace": {
    "run_id": "01HQXXX...",
    "automation_id": "morning_routine",
    "timestamp": "2024-01-15T07:00:00Z",
    "trigger": {
      "platform": "time",
      "at": "07:00:00"
    },
    "variables": {
      "trigger": {
        "platform": "time",
        "now": "2024-01-15T07:00:00Z"
      }
    },
    "config": {
      "alias": "Morning Routine",
      "mode": "single"
    },
    "context": {
      "id": "context-123",
      "user_id": null
    },
    "state": "stopped",
    "script_execution": "finished",
    "trace": {
      "trigger/0": [
        {
          "path": "trigger/0",
          "timestamp": "2024-01-15T07:00:00.000Z",
          "changed_variables": {
            "trigger": {
              "platform": "time",
              "now": "2024-01-15T07:00:00Z"
            }
          }
        }
      ],
      "action/0": [
        {
          "path": "action/0", 
          "timestamp": "2024-01-15T07:00:01.000Z",
          "result": {
            "service": "light.turn_on",
            "entity_id": "light.living_room"
          }
        }
      ]
    },
    "last_step": "action/0",
    "error": null
  }
}
```

#### `get_latest_trace`
Convenience action to get the most recent trace.

**Request:**
```json
{
  "tool": "automation",
  "action": "get_latest_trace",
  "automation_id": "automation.morning_routine"
}
```

**Response:** Same format as `get_trace_detail`

## API Endpoints

The trace functionality is accessible through the existing automation endpoints using POST requests.

### Example Usage

**Get Recent Traces:**
```bash
curl -X POST http://localhost:4000/automations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_traces",
    "automation_id": "automation.morning_routine"
  }'
```

**Get Trace Detail:**
```bash
curl -X POST http://localhost:4000/automations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_trace_detail",
    "automation_id": "automation.morning_routine", 
    "run_id": "01HQXXX..."
  }'
```

## Use Cases

### 1. Debugging Failed Automations
- Get recent traces to see which executions failed
- Examine detailed trace steps to identify where failures occurred
- Check error messages and variable states at failure points

### 2. Performance Analysis  
- Review execution timing between steps
- Identify slow-running actions or conditions
- Optimize automation logic based on timing data

### 3. Monitoring Automation Health
- Track automation execution frequency and success rates
- Monitor for recurring errors or patterns
- Validate that automations are triggering as expected

### 4. Development and Testing
- Verify new automation logic works correctly
- Compare execution paths for different trigger conditions
- Debug complex conditional logic and variable handling

## Trace Data Structure

### Execution Flow
Traces capture the complete execution flow:
1. **Trigger**: What caused the automation to run
2. **Variables**: Initial and changed variable states
3. **Conditions**: Evaluation results for each condition
4. **Actions**: Each action executed and its result
5. **Context**: User and system context information

### Timing Information
Each step includes precise timestamp information allowing for:
- Execution duration analysis
- Identification of performance bottlenecks
- Timing correlation with external events

### Error Information
When failures occur, traces include:
- Error messages and codes
- The exact step where failure occurred
- Variable states at time of failure
- Context information for debugging

## Configuration

### Trace Storage
By default, Home Assistant stores 5 traces per automation. This can be customized in the automation configuration:

```yaml
automation:
  - alias: "My Automation"
    trace:
      stored_traces: 10  # Store up to 10 traces
    trigger:
      - platform: time
        at: "07:00:00"
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
```

### Requirements
- Automation must have an `id` field for traces to be stored
- YAML-based automations without IDs won't have trace data
- WebSocket or REST API access to Home Assistant required

## Testing

A comprehensive test suite is available in `test-automation-traces.js` that includes:

- Mock data testing for development
- Live Home Assistant API testing
- Multiple automation ID format testing
- Error handling validation
- Trace data structure verification

Run tests with:
```bash
# Test with mock data only
node test-automation-traces.js

# Test with live Home Assistant (requires HASS_HOST and HASS_TOKEN)
HASS_HOST=http://your-ha:8123 HASS_TOKEN=your-token node test-automation-traces.js
```

## Error Handling

The trace functions include comprehensive error handling with graceful fallbacks:

### Primary Error Scenarios
- **Authentication Errors**: Invalid or missing tokens
- **Automation Not Found**: Non-existent automation IDs  
- **WebSocket Unavailable**: Falls back to logbook API
- **Trace Not Available**: Returns informative message about limitations
- **API Connectivity**: Network or Home Assistant API issues

### Fallback Behavior
- **WebSocket Failure**: Automatically attempts logbook-based trace information
- **Logbook Failure**: Returns empty traces with explanatory message
- **ID Resolution Issues**: Uses existing automation ID resolution logic
- **Version Compatibility**: Handles older Home Assistant versions gracefully

### Response Format
All functions return consistent response objects with:
- `success`: Boolean indicating operation success
- `message`: Descriptive message explaining result or error
- `traces`/`trace`: Data when available
- `automation_id` and `entity_id`: Resolved automation identifiers

## Security Considerations

- Traces may contain sensitive information (entity states, variables)
- Access requires valid Home Assistant authentication
- Trace data respects Home Assistant's user permission model
- No additional security risks beyond standard API access

## Implementation Details

### API Access Strategy

The trace functionality uses a multi-tier approach for maximum compatibility:

1. **Primary: WebSocket API** - Attempts to use Home Assistant's WebSocket API for native trace access
2. **Fallback: Logbook API** - Uses logbook entries to provide trace-like information when native traces aren't available
3. **Graceful degradation** - Returns informative messages when trace data is completely unavailable

### WebSocket Commands Used

When WebSocket access is available, the following commands are used:
- `trace/list` - List traces for an automation
- `trace/get` - Get detailed trace information
- Domain: `automation`, Item ID: automation's internal ID

### Fallback Strategy

When WebSocket traces aren't available:
- Uses `/api/logbook/{timestamp}?entity={entity_id}` to get execution history
- Converts logbook entries to trace-like format
- Provides basic execution information and timing

## Limitations

- **Trace Availability**: Native trace data may only be available through WebSocket API or Home Assistant UI
- **Version Requirements**: Full trace functionality requires Home Assistant 2021.4+
- **Trace History**: Limited to recent executions (default 5 traces per automation)
- **Data Completeness**: Fallback methods provide basic information but not full execution details
- **API Evolution**: Trace API endpoints may change between Home Assistant versions
- **Automation Requirements**: Automations must have IDs for traces to be stored

## Future Enhancements

Potential future improvements:
- Trace filtering and search capabilities
- Trace export functionality
- Performance metrics and analytics
- Real-time trace streaming
- Trace comparison tools
- Integration with Home Assistant's logbook

## Conclusion

The automation trace functionality provides powerful debugging and monitoring capabilities for Home Assistant automations. By offering detailed execution information through both programmatic APIs and MCP tools, it enables better automation development, troubleshooting, and maintenance workflows.