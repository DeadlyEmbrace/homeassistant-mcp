# Model Context Protocol Server for Home Assistant

The server uses the MCP protocol to share access to a local Home Assistant instance with an LLM application.

A powerful bridge between your Home Assistant instance and Language Learning Models (LLMs), enabling natural language control and monitoring of your smart home devices through the Model Context Protocol (MCP). This server provides a comprehensive API for managing your entire Home Assistant ecosystem, from device control to system administration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D20.10.0-green.svg)
![Docker Compose](https://img.shields.io/badge/docker-compose-%3E%3D1.27.0-blue.svg)
![NPM](https://img.shields.io/badge/npm-%3E%3D7.0.0-orange.svg)
![TypeScript](https://img.shields.io/badge/typescript-%5E5.0.0-blue.svg)
![Test Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)

## Features

- 🎮 **Device Control**: Control any Home Assistant device through natural language
- 🔄 **Real-time Updates**: Get instant updates through Server-Sent Events (SSE)
- 🤖 **Automation Management**: Create, update, and manage automations
- 📊 **State Monitoring**: Track and query device states
- 🔐 **Secure**: Token-based authentication and rate limiting
- 📱 **Mobile Ready**: Works with any HTTP-capable client
- 📝 **Error Logging**: Comprehensive error logging to files with automatic rotation

## Real-time Updates with SSE

The server includes a powerful Server-Sent Events (SSE) system that provides real-time updates from your Home Assistant instance. This allows you to:

- 🔄 Get instant state changes for any device
- 📡 Monitor automation triggers and executions
- 🎯 Subscribe to specific domains or entities
- 📊 Track service calls and script executions

### Quick SSE Example

```javascript
const eventSource = new EventSource(
  'http://localhost:3000/subscribe_events?token=YOUR_TOKEN&domain=light'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update received:', data);
};
```

See [SSE_API.md](docs/SSE_API.md) for complete documentation of the SSE system.

## Table of Contents

- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Basic Setup](#basic-setup)
  - [Docker Setup (Recommended)](#docker-setup-recommended)
- [Configuration](#configuration)
- [MCP Integration](#mcp-integration)
  - [Claude Desktop](#claude-desktop)
  - [n8n Workflows](#n8n-workflows)
- [Development](#development)
- [API Reference](#api-reference)
  - [Device Control](#device-control)
  - [Add-on Management](#add-on-management)
  - [Package Management](#package-management)
  - [Automation Management](#automation-management)
- [Natural Language Integration](#natural-language-integration)
- [Troubleshooting](#troubleshooting)
- [Project Status](#project-status)
- [Contributing](#contributing)
- [Resources](#resources)
- [License](#license)

## Key Features

### Core Functionality 🎮
- **Smart Device Control**
  - 💡 **Lights**: Brightness, color temperature, RGB color
  - 🌡️ **Climate**: Temperature, HVAC modes, fan modes, humidity
  - 🚪 **Covers**: Position and tilt control
  - 🔌 **Switches**: On/off control
  - 🚨 **Sensors & Contacts**: State monitoring
  - 🎵 **Media Players**: Playback control, volume, source selection
  - 🌪️ **Fans**: Speed, oscillation, direction
  - 🔒 **Locks**: Lock/unlock control
  - 🧹 **Vacuums**: Start, stop, return to base
  - 📹 **Cameras**: Motion detection, snapshots

### System Management 🛠️
- **Add-on Management**
  - Browse available add-ons
  - Install/uninstall add-ons
  - Start/stop/restart add-ons
  - Version management
  - Configuration access

- **Package Management (HACS)**
  - Integration with Home Assistant Community Store
  - Multiple package types support:
    - Custom integrations
    - Frontend themes
    - Python scripts
    - AppDaemon apps
    - NetDaemon apps
  - Version control and updates
  - Repository management

- **Automation Management**
  - Create and edit automations
  - Advanced configuration options:
    - Multiple trigger types
    - Complex conditions
    - Action sequences
    - Execution modes
  - Duplicate and modify existing automations
  - Enable/disable automation rules
  - Trigger automation manually

### Architecture Features 🏗️
- **Intelligent Organization**
  - Area and floor-based device grouping
  - State monitoring and querying
  - Smart context awareness
  - Historical data access

- **Robust Architecture**
  - Comprehensive error handling
  - State validation
  - Secure API integration
  - TypeScript type safety
  - Extensive test coverage

## Prerequisites

- **Node.js** 20.10.0 or higher
- **NPM** package manager
- **Docker Compose** for containerization
- Running **Home Assistant** instance
- Home Assistant long-lived access token ([How to get token](https://community.home-assistant.io/t/how-to-get-long-lived-access-token/162159))
- **HACS** installed for package management features
- **Supervisor** access for add-on management

## Installation

### Basic Setup

```bash
# Clone the repository
git clone https://github.com/jango-blockchained/homeassistant-mcp.git
cd homeassistant-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Docker Setup (Recommended)

The project includes Docker support for easy deployment and consistent environments across different platforms.

#### ⚠️ IMPORTANT: Environment Variable Requirements

**The `HASS_HOST` environment variable is REQUIRED and must be set to your actual Home Assistant instance URL.**  
The application will NOT start without this variable properly configured.

1. **Clone the repository:**
    ```bash
    git clone https://github.com/jango-blockchained/homeassistant-mcp.git
    cd homeassistant-mcp
    ```

2. **Configure environment:**
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file with your Home Assistant configuration:
    ```env
    # REQUIRED - Replace with your actual Home Assistant URL
    HASS_HOST=http://192.168.1.100:8123  # DO NOT use homeassistant.local
    
    # REQUIRED - Your Home Assistant long-lived access token
    HASS_TOKEN=your_home_assistant_token
    
    # Optional - WebSocket URL (auto-generated from HASS_HOST if not provided)
    # HASS_SOCKET_URL=ws://192.168.1.100:8123/api/websocket
    
    # Server Configuration
    PORT=4000
    NODE_ENV=production
    LOG_LEVEL=info
    ```
    
    **Note:** Always use IP addresses or fully qualified domain names. Avoid using `.local` domains as they may not resolve properly in Docker containers.

3. **Build and run with Docker Compose:**
    ```bash
    # For standard Docker Compose
    docker compose up -d --build
    
    # For Portainer deployment
    docker compose -f docker-compose.portainer.yml up -d --build

    # View logs
    docker compose logs -f

    # Stop the service
    docker compose down
    ```

4. **Verify the installation:**
    The server should now be running at `http://localhost:4000`. You can check the health endpoint at `http://localhost:4000/health`.

5. **Update the application:**
    ```bash
    # Pull the latest changes
    git pull

    # Rebuild and restart the containers
    docker compose up -d --build
    ```

#### Docker Configuration

The Docker setup includes:
- Multi-stage build for optimal image size
- Health checks for container monitoring
- Environment variable validation (fails fast if HASS_HOST is not set)
- Automatic container restart on failure
- Exposed port 4000 for API access (configurable via PORT env var)

#### Docker Compose Environment Variables

The following environment variables must be configured:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `HASS_HOST` | **Yes** | Your Home Assistant instance URL | `http://192.168.1.100:8123` |
| `HASS_TOKEN` | **Yes** | Long-lived access token for Home Assistant | `eyJ0eXAiOi...` |
| `HASS_SOCKET_URL` | No | WebSocket URL (auto-generated if not set) | `ws://192.168.1.100:8123/api/websocket` |
| `PORT` | No | Server port (default: 4000) | `4000` |
| `NODE_ENV` | No | Environment (default: production) | `production` |
| `LOG_LEVEL` | No | Log verbosity (default: info) | `debug`, `info`, `warn`, `error` |

#### Portainer Stack Deployment

For Portainer users, use the provided `docker-compose.portainer.yml` file:

1. In Portainer, go to **Stacks** → **Add stack**
2. Name your stack (e.g., `homeassistant-mcp`)
3. **Build method**: Upload or paste the `docker-compose.portainer.yml` content
4. **Environment variables**: Add the required variables in the Portainer UI:
   ```
   HASS_HOST=http://192.168.1.100:8123
   HASS_TOKEN=your_token_here
   PORT=4000
   ```
5. **Deploy the stack**

⚠️ **Common Docker Issues:**
- If you see `ENOTFOUND homeassistant.local`, ensure `HASS_HOST` is set to an IP address
- If the container fails to start, check that `HASS_HOST` and `HASS_TOKEN` are properly set
- Use `docker logs <container_name>` to view detailed error messages

## Configuration

### Environment Variables

```env
# REQUIRED Configuration
HASS_HOST=http://192.168.1.100:8123        # Your Home Assistant instance URL (use IP address)
HASS_TOKEN=your_home_assistant_token       # Long-lived access token

# Optional Configuration
HASS_SOCKET_URL=ws://192.168.1.100:8123/api/websocket  # WebSocket URL (auto-generated if not set)
PORT=4000                # Server port (default: 4000)
NODE_ENV=production     # Environment (production/development)
LOG_LEVEL=info         # Log verbosity (debug/info/warn/error)

# Test Configuration
TEST_HASS_HOST=http://localhost:8123  # Test instance URL
TEST_HASS_TOKEN=test_token           # Test token
```

**Important Notes:**
- Always use IP addresses instead of `.local` domains in Docker environments
- `HASS_HOST` is required - the application will not start without it
- `HASS_SOCKET_URL` is automatically derived from `HASS_HOST` if not provided

### Configuration Files

1. **Development**: Copy `.env.example` to `.env.development`
2. **Production**: Copy `.env.example` to `.env.production`
3. **Testing**: Copy `.env.example` to `.env.test`

## MCP Integration

This server supports multiple MCP client integrations:

### Claude Desktop

To use with Claude Desktop, add the following to your configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "node",
      "args": ["/path/to/homeassistant-mcp/dist/src/index.js"],
      "env": {
        "NODE_ENV": "production",
        "HASS_HOST": "http://192.168.1.100:8123",
        "HASS_TOKEN": "your_home_assistant_token",
        "PORT": "4000",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### n8n Workflows

This server includes HTTP-based MCP transport for integration with n8n workflows.

**MCP Endpoint**: `http://192.168.3.148:4000/mcp`

Key features for n8n:
- ✅ **Authentication**: Bearer token authentication
- ✅ **Tool Discovery**: List all available MCP tools via `tools/list` method
- ✅ **Tool Execution**: Execute any MCP tool via `tools/call` method
- ✅ **JSON-RPC 2.0**: Standard protocol for easy integration

Quick example for n8n HTTP Request node:
```json
{
  "url": "http://192.168.3.148:4000/mcp",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer YOUR_HASS_TOKEN",
    "Content-Type": "application/json"
  },
  "body": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }
}
```

**Documentation:**
- 📖 [HTTP Transport Documentation](docs/MCP_HTTP_TRANSPORT.md) - Complete protocol reference
- 🔧 [n8n Setup Guide](docs/N8N_SETUP_GUIDE.md) - Step-by-step integration instructions
- 🚀 [n8n Examples](docs/N8N_MCP_INTEGRATION.md) - Advanced workflow examples



## API Reference

### Device Control

#### Common Entity Controls
```json
{
  "tool": "control",
  "command": "turn_on",  // or "turn_off", "toggle"
  "entity_id": "light.living_room"
}
```

#### Light Control
```json
{
  "tool": "control",
  "command": "turn_on",
  "entity_id": "light.living_room",
  "brightness": 128,
  "color_temp": 4000,
  "rgb_color": [255, 0, 0]
}
```

### Add-on Management

#### List Available Add-ons
```json
{
  "tool": "addon",
  "action": "list"
}
```

#### Install Add-on
```json
{
  "tool": "addon",
  "action": "install",
  "slug": "core_configurator",
  "version": "5.6.0"
}
```

#### Manage Add-on State
```json
{
  "tool": "addon",
  "action": "start",  // or "stop", "restart"
  "slug": "core_configurator"
}
```

### Package Management

#### List HACS Packages
```json
{
  "tool": "package",
  "action": "list",
  "category": "integration"  // or "plugin", "theme", "python_script", "appdaemon", "netdaemon"
}
```

#### Install Package
```json
{
  "tool": "package",
  "action": "install",
  "category": "integration",
  "repository": "hacs/integration",
  "version": "1.32.0"
}
```

### Automation Management

#### Create Automation
```json
{
  "tool": "automation_config",
  "action": "create",
  "config": {
    "alias": "Motion Light",
    "description": "Turn on light when motion detected",
    "mode": "single",
    "trigger": [
      {
        "platform": "state",
        "entity_id": "binary_sensor.motion",
        "to": "on"
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

#### Duplicate Automation
```json
{
  "tool": "automation_config",
  "action": "duplicate",
  "automation_id": "automation.motion_light"
}
```

### Core Functions

#### State Management
```http
GET /api/state
POST /api/state
```

Manages the current state of the system.

**Example Request:**
```json
POST /api/state
{
  "context": "living_room",
  "state": {
    "lights": "on",
    "temperature": 22
  }
}
```

#### Context Updates
```http
POST /api/context
```

Updates the current context with new information.

**Example Request:**
```json
POST /api/context
{
  "user": "john",
  "location": "kitchen",
  "time": "morning",
  "activity": "cooking"
}
```

### Action Endpoints

#### Execute Action
```http
POST /api/action
```

Executes a specified action with given parameters.

**Example Request:**
```json
POST /api/action
{
  "action": "turn_on_lights",
  "parameters": {
    "room": "living_room",
    "brightness": 80
  }
}
```

#### Batch Actions
```http
POST /api/actions/batch
```

Executes multiple actions in sequence.

**Example Request:**
```json
POST /api/actions/batch
{
  "actions": [
    {
      "action": "turn_on_lights",
      "parameters": {
        "room": "living_room"
      }
    },
    {
      "action": "set_temperature",
      "parameters": {
        "temperature": 22
      }
    }
  ]
}
```

### Query Functions

#### Get Available Actions
```http
GET /api/actions
```

Returns a list of all available actions.

**Example Response:**
```json
{
  "actions": [
    {
      "name": "turn_on_lights",
      "parameters": ["room", "brightness"],
      "description": "Turns on lights in specified room"
    },
    {
      "name": "set_temperature",
      "parameters": ["temperature"],
      "description": "Sets temperature in current context"
    }
  ]
}
```

#### Context Query
```http
GET /api/context?type=current
```

Retrieves context information.

**Example Response:**
```json
{
  "current_context": {
    "user": "john",
    "location": "kitchen",
    "time": "morning",
    "activity": "cooking"
  }
}
```

### WebSocket Events

The server supports real-time updates via WebSocket connections.

```javascript
// Client-side connection example
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received update:', data);
};
```

#### Supported Events

- `state_change`: Emitted when system state changes
- `context_update`: Emitted when context is updated
- `action_executed`: Emitted when an action is completed
- `error`: Emitted when an error occurs

**Example Event Data:**
```json
{
  "event": "state_change",
  "data": {
    "previous_state": {
      "lights": "off"
    },
    "current_state": {
      "lights": "on"
    },
    "timestamp": "2024-03-20T10:30:00Z"
  }
}
```

### Error Handling

All endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Missing required parameter: room",
    "details": {
      "missing_fields": ["room"]
    }
  }
}
```

### Rate Limiting

The API implements rate limiting to prevent abuse:

- 100 requests per minute per IP for regular endpoints
- 1000 requests per minute per IP for WebSocket connections

When rate limit is exceeded, the server returns:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "reset_time": "2024-03-20T10:31:00Z"
  }
}
```

### Example Usage

#### Using curl
```bash
# Get current state
curl -X GET \
  http://localhost:3000/api/state \
  -H 'Authorization: ApiKey your_api_key_here'

# Execute action
curl -X POST \
  http://localhost:3000/api/action \
  -H 'Authorization: ApiKey your_api_key_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "turn_on_lights",
    "parameters": {
      "room": "living_room",
      "brightness": 80
    }
  }'
```

#### Using JavaScript
```javascript
// Execute action
async function executeAction() {
  const response = await fetch('http://localhost:3000/api/action', {
    method: 'POST',
    headers: {
      'Authorization': 'ApiKey your_api_key_here',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'turn_on_lights',
      parameters: {
        room: 'living_room',
        brightness: 80
      }
    })
  });
  
  const data = await response.json();
  console.log('Action result:', data);
}
```

## Development

```bash
# Development mode with hot reload
npm run dev

# Build project
npm run build

# Production mode
npm run start

# Run tests
npx jest --config=jest.config.cjs

# Run tests with coverage
npx jest --coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Common Issues

1. **Node.js Version (`toSorted is not a function`)**
   - **Solution:** Update to Node.js 20.10.0+
   ```bash
   nvm install 20.10.0
   nvm use 20.10.0
   ```

2. **Connection Issues**
   - Verify Home Assistant is running
   - Check `HASS_HOST` accessibility
   - Validate token permissions
   - Ensure WebSocket connection for real-time updates

3. **Docker-Specific Issues**

   **Error: `ENOTFOUND homeassistant.local`**
   - **Cause:** Docker containers cannot resolve `.local` domains
   - **Solution:** Use IP address instead of `homeassistant.local`
   ```env
   # Wrong
   HASS_HOST=http://homeassistant.local:8123
   
   # Correct
   HASS_HOST=http://192.168.1.100:8123
   ```

   **Error: `HASS_HOST environment variable is required`**
   - **Cause:** Missing required environment variable
   - **Solution:** Ensure `HASS_HOST` is set in your `.env` file or docker-compose environment

   **Container fails with exit code 2**
   - **Cause:** npm install failure during build
   - **Solution:** 
     - Ensure package.json doesn't specify conflicting package managers
     - Clear Docker build cache: `docker compose build --no-cache`
     - Check Docker logs: `docker logs <container_name>`

   **Cannot connect to Home Assistant from container**
   - **Cause:** Network isolation or incorrect URL
   - **Solution:**
     - Use host IP address, not `localhost` or `127.0.0.1`
     - Ensure container and Home Assistant are on same network
     - Check firewall rules

4. **Add-on Management Issues**
   - Verify Supervisor access
   - Check add-on compatibility
   - Validate system resources

5. **HACS Integration Issues**
   - Verify HACS installation
   - Check HACS integration status
   - Validate repository access

6. **Automation Issues**
   - Verify entity availability
   - Check trigger conditions
   - Validate service calls
   - Monitor execution logs

## Project Status

✅ **Complete**
- Entity, Floor, and Area access
- Device control (Lights, Climate, Covers, Switches, Contacts)
- Add-on management system
- Package management through HACS
- Advanced automation configuration
- Basic state management
- Error handling and validation
- Docker containerization
- Jest testing setup
- TypeScript integration
- Environment variable management
- Home Assistant API integration
- Project documentation

🚧 **In Progress**
- WebSocket implementation for real-time updates
- Enhanced security features
- Tool organization optimization
- Performance optimization
- Resource context integration
- API documentation generation
- Multi-platform desktop integration
- Advanced error recovery
- Custom prompt testing
- Enhanced macOS integration
- Type safety improvements
- Testing coverage expansion

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/introduction)
- [Home Assistant Docs](https://www.home-assistant.io)
- [HA REST API](https://developers.home-assistant.io/docs/api/rest)
- [HACS Documentation](https://hacs.xyz)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## License

MIT License - See [LICENSE](LICENSE) file
