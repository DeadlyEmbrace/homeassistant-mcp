# Error Logging Documentation

The Home Assistant MCP Server now includes comprehensive error logging to files. This helps with debugging and monitoring the server's health.

## Features

- **File-based logging**: All errors are logged to rotating log files
- **Automatic log rotation**: Prevents log files from growing too large
- **Structured logging**: Includes contextual information with errors
- **Configurable**: Customize log directory, file size limits, and retention

## Configuration

Configure logging through environment variables:

```bash
# Log directory (defaults to 'logs')
LOG_DIR=logs

# Log file name (defaults to 'homeassistant-mcp.log')  
LOG_FILE=homeassistant-mcp.log

# Maximum file size before rotation in bytes (defaults to 10MB)
LOG_MAX_FILE_SIZE=10485760

# Number of rotated files to keep (defaults to 5)
LOG_MAX_FILES=5
```

## Log File Location

By default, logs are written to:
- `./logs/homeassistant-mcp.log` (current log)
- `./logs/homeassistant-mcp.1.log` (previous log)
- `./logs/homeassistant-mcp.2.log` (older log)
- etc.

## What Gets Logged

The following errors are automatically logged:

### HTTP Endpoint Errors
- `/list_devices` endpoint failures
- `/control` endpoint failures  
- `/sse_stats` endpoint failures
- Authentication failures
- Request parsing errors

### MCP Protocol Errors
- Tool execution failures
- Method not found errors
- Invalid request format
- Transport layer errors

### AI Processing Errors
- NLP processing failures
- Intent classification errors
- Model inference errors

### System Errors
- Server startup failures
- Port binding errors
- Uncaught exceptions
- Unhandled promise rejections

## Log Entry Format

Each log entry includes:
```
2024-12-19T10:30:45.123Z [ERROR] HTTP Error occurred
Error: Connection timeout
Stack: Error: Connection timeout
    at HassApi.callService (src/hass/api.ts:45:13)
    at async POST /control (src/index.ts:156:20)
Metadata: {
  "url": "/control",
  "method": "POST",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.50",
  "timestamp": "2024-12-19T10:30:45.123Z",
  "body": {
    "entity_id": "light.living_room",
    "action": "turn_on"
  }
}
```

## File Rotation

When a log file reaches the maximum size (default 10MB):
1. Current log is renamed to `.1.log`
2. Previous `.1.log` becomes `.2.log`
3. And so on up to the maximum number of files
4. Oldest log file is deleted
5. New entries go to a fresh log file

## Monitoring

You can monitor logs in real-time using:

```bash
# Follow the current log
tail -f logs/homeassistant-mcp.log

# Search for specific errors
grep "ERROR" logs/homeassistant-mcp.log

# View recent errors
tail -100 logs/homeassistant-mcp.log | grep "ERROR"
```

## Integration with Log Management

The structured log format makes it easy to integrate with log management tools:

- **ELK Stack**: Use Filebeat to ship logs to Elasticsearch
- **Splunk**: Configure universal forwarder to index logs  
- **Fluentd**: Parse JSON metadata for structured search
- **Grafana Loki**: Use promtail to collect and query logs

Example Filebeat configuration:
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /path/to/logs/homeassistant-mcp.log
  multiline.pattern: '^\d{4}-\d{2}-\d{2}T'
  multiline.negate: true
  multiline.match: after
```

## Troubleshooting

### Log Directory Permissions
If the logger can't create the log directory, it falls back to the current directory. Ensure the process has write permissions to the specified log directory.

### Disk Space
Monitor disk space in the log directory. If the disk fills up, the application may fail to start or function properly.

### Log Level Filtering
Currently, all errors are logged regardless of the LOG_LEVEL environment variable. Future versions may add level-based filtering.
