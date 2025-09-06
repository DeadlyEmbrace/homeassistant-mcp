# Testing Error Logging

This guide will help you verify that error logging is working correctly in your Home Assistant MCP Server.

## Quick Test

1. **Test basic logging functionality:**
   ```bash
   node scripts/test-logger-simple.js
   ```
   This will create a log entry and you should see `logs/homeassistant-mcp.log` created.

2. **Test application startup logging:**
   ```bash
   node scripts/test-app-startup.js
   ```
   This starts the app briefly and checks if startup logs are written.

## Testing with Real Application

1. **Start the application:**
   ```bash
   npm start
   ```

2. **In a separate terminal, trigger some errors:**
   ```bash
   node scripts/test-error-logging.js
   ```

3. **Check the logs:**
   ```bash
   # View the log file
   Get-Content logs/homeassistant-mcp.log

   # Monitor logs in real-time
   Get-Content logs/homeassistant-mcp.log -Wait

   # Filter for errors only
   Get-Content logs/homeassistant-mcp.log | Select-String "ERROR"
   ```

## What You Should See

### Startup Logs
When the application starts successfully, you should see:
```
2025-09-06T03:19:40.042Z [INFO] Home Assistant MCP Server starting up
2025-09-06T03:19:45.123Z [INFO] MCP Protocol Server initialized  
2025-09-06T03:19:45.456Z [INFO] Home Assistant MCP Server started successfully
```

### Error Logs
When errors occur, you should see detailed entries like:
```
2025-09-06T03:20:15.789Z [ERROR] Error in /list_devices endpoint
Error: Unauthorized - Invalid token
Stack: Error: Unauthorized...
Metadata: {
  "endpoint": "/list_devices",
  "method": "GET",
  "hasToken": true,
  "timestamp": "2025-09-06T03:20:15.789Z"
}
```

## Troubleshooting

### No logs appearing
1. **Check if logs directory exists:**
   ```bash
   ls logs/
   ```

2. **Check permissions:**
   - Ensure the application has write permissions to the current directory
   - Try running with elevated permissions if needed

3. **Check environment variables:**
   ```bash
   echo $LOG_DIR
   echo $LOG_FILE
   ```

### Application not starting
1. **Check for missing dependencies:**
   ```bash
   npm install
   ```

2. **Check environment variables:**
   - Ensure `HASS_HOST` and `HASS_TOKEN` are set correctly
   - Use `http://localhost:8123` and a test token for testing

3. **Check if port is in use:**
   - Try changing the `PORT` environment variable

### Empty log files
1. **Check if the application is hitting error conditions:**
   - Use the error testing script to trigger errors intentionally
   - Try making requests with invalid tokens

2. **Check console suppression:**
   - The application suppresses console output for MCP compatibility
   - This is normal - errors should still be logged to files

## Log File Rotation

When log files get large (>10MB by default), they will be rotated:
- `homeassistant-mcp.log` (current)
- `homeassistant-mcp.1.log` (previous)
- `homeassistant-mcp.2.log` (older)
- etc.

## Configuration

You can customize logging behavior with environment variables:
```bash
# In .env file
LOG_DIR=logs
LOG_FILE=homeassistant-mcp.log  
LOG_MAX_FILE_SIZE=10485760  # 10MB
LOG_MAX_FILES=5
```
