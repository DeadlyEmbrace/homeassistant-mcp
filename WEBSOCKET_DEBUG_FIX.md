# WebSocket Client Debugging Fix

## Issue
Users are experiencing `"wsClient.isConnected is not a function"` error when trying to update automations.

## Root Cause Analysis
The error occurs in the `updateAutomationWithDebug` function when it tries to call `wsClient.isConnected()`. This suggests that:

1. `wsClient` is not null/undefined (otherwise we'd get a different error)
2. `wsClient` exists but doesn't have the `isConnected()` method
3. The object being passed as `wsClient` is not an instance of `HassWebSocketClient`

## Fixes Applied

### 1. Added `isConnected()` Method to WebSocket Client
```typescript
// In src/websocket/client.ts
public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.authenticated;
}
```

### 2. Enhanced Error Handling in Automation Helpers
```typescript
// In src/utils/automation-helpers.ts
try {
  if (wsClient) {
    // Add debug info about wsClient object
    const wsClientType = typeof wsClient;
    const wsClientConstructor = wsClient.constructor?.name;
    const hasIsConnected = typeof wsClient.isConnected === 'function';
    
    if (hasIsConnected) {
      result.debug_info.websocket_connection = wsClient.isConnected();
    } else {
      result.debug_info.websocket_connection = false;
      result.debug_info.websocket_debug = {
        type: wsClientType,
        constructor: wsClientConstructor,
        hasIsConnected,
        availableMethods: Object.getOwnPropertyNames(wsClient).filter(prop => typeof wsClient[prop] === 'function')
      };
    }
  } else {
    result.debug_info.websocket_connection = false;
  }
} catch (connectionError) {
  // Graceful fallback
}
```

### 3. Defensive Type Checking
The code now:
- Checks if `wsClient` exists
- Checks if `wsClient.isConnected` is a function before calling it
- Provides detailed debug information about the `wsClient` object
- Falls back gracefully if any errors occur

## Next Steps

When you try the automation update again, you should now get detailed debug information including:
- `websocket_debug.type`: The JavaScript type of the wsClient object
- `websocket_debug.constructor`: The constructor name of the wsClient
- `websocket_debug.hasIsConnected`: Whether the isConnected method exists
- `websocket_debug.availableMethods`: List of all available methods on the object

This will help identify exactly what type of object is being passed as `wsClient` and why it doesn't have the expected methods.

## Expected Result
The automation updates should now work without throwing the `isConnected` error, and provide detailed debugging information if there are any WebSocket-related issues.