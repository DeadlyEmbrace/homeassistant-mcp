import './polyfills.js';
import './config/env-loader.js';  // Load environment variables first

// Completely suppress all console output to ensure only JSON is sent to stdout
const noop = () => {};
console.log = noop;
console.info = noop;
console.warn = noop;
console.error = noop;
console.debug = noop;
console.trace = noop;

import { v4 as uuidv4 } from 'uuid';
import { sseManager } from './sse/index.js';
import { ILogger } from "@digital-alchemy/core";
import express from 'express';
import { rateLimiter, securityHeaders, corsMiddleware, validateRequest, sanitizeInput, errorHandler } from './security/index.js';
import { logger } from './utils/logger.js';
import { HassWebSocketClient } from './websocket/client.js';

import { get_hass } from './hass/index.js';
import { LiteMCP } from 'litemcp';
import { z } from 'zod';
import { DomainSchema } from './schemas.js';
import { MCPHTTPTransport } from './mcp-http-transport.js';

// Configuration (environment variables already loaded by env-loader)
const HASS_HOST = process.env.HASS_HOST;
const HASS_TOKEN = process.env.HASS_TOKEN;
const PORT = process.env.PORT || 4000;
// ...existing code...

// Initialize Express app
const app = express();

// Apply security middleware
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(rateLimiter);
app.use(express.json());
// Remove global validateRequest - endpoints handle their own auth
// app.use(validateRequest);
app.use(sanitizeInput);

// Initialize LiteMCP
const server = new LiteMCP('home-assistant', '0.1.0');

// Initialize HTTP MCP Transport (will be properly set up in main())
let mcpHttpTransport: MCPHTTPTransport;

// Initialize it immediately with empty token, will be reset in main()
mcpHttpTransport = new MCPHTTPTransport('');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// Define Tool interface
interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  execute: (params: any) => Promise<any>;
}

// Array to track tools
const tools: Tool[] = [];

// Helper function to register tool with both transports
function registerTool(tool: Tool) {
  // Add to LiteMCP server
  server.addTool(tool);
  
  // Track in our tools array
  tools.push(tool);
  
  // Register with HTTP transport
  mcpHttpTransport.registerTool(
    tool.name,
    tool.description,
    tool.execute,
    tool.parameters
  );
}

// List devices endpoint
app.get('/list_devices', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'list_devices');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({ token });
    res.json(result);
  } catch (error) {
    logger.error('Error in /list_devices endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/list_devices',
      method: 'GET',
      hasToken: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.post('/control', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'control');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({
      ...req.body,
      token
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in /control endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/control',
      method: 'POST',
      hasToken: !!req.headers.authorization,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Automation endpoints
app.get('/automations', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'automation');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({ action: 'list' });
    res.json(result);
  } catch (error) {
    logger.error('Error in /automations endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/automations',
      method: 'GET',
      hasToken: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.get('/automations/:automation_id/config', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'automation');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({ 
      action: 'get_config', 
      automation_id: req.params.automation_id 
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in /automations/:automation_id/config endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/automations/:automation_id/config',
      method: 'GET',
      hasToken: !!req.headers.authorization,
      automationId: req.params.automation_id,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.get('/automations/:automation_id/yaml', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'automation');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({ 
      action: 'get_yaml', 
      automation_id: req.params.automation_id 
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in /automations/:automation_id/yaml endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/automations/:automation_id/yaml',
      method: 'GET',
      hasToken: !!req.headers.authorization,
      automationId: req.params.automation_id,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.post('/automations', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'automation');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({
      ...req.body,
      token
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in /automations endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/automations',
      method: 'POST',
      hasToken: !!req.headers.authorization,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// SSE endpoints
app.get('/subscribe_events', (req, res) => {
  try {
    // Get token from query parameter
    const token = req.query.token?.toString();

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'subscribe_events');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    tool.execute({
      token,
      events: req.query.events?.toString().split(','),
      entity_id: req.query.entity_id?.toString(),
      domain: req.query.domain?.toString(),
      response: res
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.get('/get_sse_stats', async (req, res) => {
  try {
    // Get token from query parameter
    const token = req.query.token?.toString();

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'get_sse_stats');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({ token });
    res.json(result);
  } catch (error) {
    logger.error('Error in /sse_stats endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/sse_stats',
      method: 'GET',
      hasToken: !!req.query.token,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Firmware Update endpoints
app.get('/firmware_updates', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'firmware_update');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const result = await tool.execute({ action: 'list' });
    res.json(result);
  } catch (error) {
    logger.error('Error in /firmware_updates endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/firmware_updates',
      method: 'GET',
      hasToken: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.post('/firmware_updates/install', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'firmware_update');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const { entity_id, version, backup } = req.body;
    const result = await tool.execute({ 
      action: 'install', 
      entity_id, 
      version, 
      backup 
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in /firmware_updates/install endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/firmware_updates/install',
      method: 'POST',
      hasToken: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.post('/firmware_updates/skip', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'firmware_update');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const { entity_id } = req.body;
    const result = await tool.execute({ 
      action: 'skip', 
      entity_id 
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in /firmware_updates/skip endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/firmware_updates/skip',
      method: 'POST',
      hasToken: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

app.post('/firmware_updates/clear_skipped', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }

    const tool = tools.find(t => t.name === 'firmware_update');
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const { entity_id } = req.body;
    const result = await tool.execute({ 
      action: 'clear_skipped', 
      entity_id 
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in /firmware_updates/clear_skipped endpoint', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/firmware_updates/clear_skipped',
      method: 'POST',
      hasToken: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Error handling middleware
app.use(errorHandler);

interface CommandParams {
  command: string;
  entity_id: string;
  // Common parameters
  state?: string;
  // Light parameters
  brightness?: number;
  color_temp?: number;
  rgb_color?: [number, number, number];
  // Cover parameters
  position?: number;
  tilt_position?: number;
  // Climate parameters
  temperature?: number;
  target_temp_high?: number;
  target_temp_low?: number;
  hvac_mode?: string;
  fan_mode?: string;
  humidity?: number;
}

const commonCommands = ['turn_on', 'turn_off', 'toggle'] as const;
const coverCommands = [...commonCommands, 'open', 'close', 'stop', 'set_position', 'set_tilt_position'] as const;
const climateCommands = [...commonCommands, 'set_temperature', 'set_hvac_mode', 'set_fan_mode', 'set_humidity'] as const;

interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

interface HassState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    description?: string;
    [key: string]: any;
  };
}

interface HassAddon {
  name: string;
  slug: string;
  description: string;
  version: string;
  installed: boolean;
  available: boolean;
  state: string;
}

interface HassAddonResponse {
  data: {
    addons: HassAddon[];
  };
}

interface HassAddonInfoResponse {
  data: {
    name: string;
    slug: string;
    description: string;
    version: string;
    state: string;
    status: string;
    options: Record<string, any>;
    [key: string]: any;
  };
}

interface HacsRepository {
  name: string;
  description: string;
  category: string;
  installed: boolean;
  version_installed: string;
  available_version: string;
  authors: string[];
  domain: string;
}

interface HacsResponse {
  repositories: HacsRepository[];
}

interface AutomationConfig {
  alias: string;
  description?: string;
  mode?: 'single' | 'parallel' | 'queued' | 'restart';
  trigger: any[];
  condition?: any[];
  action: any[];
}

interface AutomationResponse {
  automation_id: string;
}

interface SSEHeaders {
  onAbort?: () => void;
}

interface SSEParams {
  token: string;
  events?: string[];
  entity_id?: string;
  domain?: string;
}

interface HistoryParams {
  entity_id: string;
  start_time?: string;
  end_time?: string;
  minimal_response?: boolean;
  significant_changes_only?: boolean;
}

interface SceneParams {
  action: 'list' | 'activate';
  scene_id?: string;
}

interface NotifyParams {
  message: string;
  title?: string;
  target?: string;
  data?: Record<string, any>;
}

interface AutomationParams {
  action: 'list' | 'toggle' | 'trigger' | 'get_config' | 'get_yaml' | 'create' | 'validate';
  automation_id?: string;
  // Fields for automation creation
  alias?: string;
  description?: string;
  mode?: 'single' | 'restart' | 'queued' | 'parallel';
  triggers?: any;
  condition?: any;
  action_config?: any;
  // Validation-only fields
  validate_trigger?: any;
  validate_condition?: any;
  validate_action?: any;
}

interface AddonParams {
  action: 'list' | 'info' | 'install' | 'uninstall' | 'start' | 'stop' | 'restart';
  slug?: string;
  version?: string;
}

interface PackageParams {
  action: 'list' | 'install' | 'uninstall' | 'update';
  category: 'integration' | 'plugin' | 'theme' | 'python_script' | 'appdaemon' | 'netdaemon';
  repository?: string;
  version?: string;
}

interface AutomationConfigParams {
  action: 'create' | 'update' | 'delete' | 'duplicate';
  automation_id?: string;
  config?: {
    alias: string;
    description?: string;
    mode?: 'single' | 'parallel' | 'queued' | 'restart';
    trigger: any[];
    condition?: any[];
    action: any[];
  };
}

interface FirmwareUpdateParams {
  action: 'list' | 'install' | 'skip' | 'clear_skipped';
  entity_id?: string;
  version?: string;
  backup?: boolean;
}

async function main() {
  // Validate required environment variables first
  if (!HASS_TOKEN) {
    await logger.error('Application startup failed: Missing HASS_TOKEN', new Error('HASS_TOKEN environment variable is required'), {
      hassHost: HASS_HOST,
      port: PORT,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }

  // Log application startup
  await logger.info('Home Assistant MCP Server starting up', {
    version: '0.1.0',
    nodeVersion: process.version,
    platform: process.platform,
    hassHost: HASS_HOST,
    port: PORT,
    timestamp: new Date().toISOString()
  });

  // Reinitialize MCP transport with valid token
  mcpHttpTransport = new MCPHTTPTransport(HASS_TOKEN);

  let hass;
  let wsClient: HassWebSocketClient | null = null;
  
  try {
    hass = await get_hass();
    await logger.info('Home Assistant connection established', {
      hassHost: HASS_HOST,
      timestamp: new Date().toISOString()
    });

    // Initialize WebSocket client
    try {
      const wsUrl = HASS_HOST?.replace(/^http/, 'ws') + '/api/websocket';
      wsClient = new HassWebSocketClient(wsUrl, HASS_TOKEN!, {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000
      });
      
      await wsClient.connect();
      await logger.info('WebSocket connection established', {
        wsUrl,
        timestamp: new Date().toISOString()
      });
    } catch (wsError) {
      await logger.warn('WebSocket connection failed, continuing with REST API only', {
        error: wsError instanceof Error ? wsError.message : String(wsError),
        timestamp: new Date().toISOString()
      });
      wsClient = null;
    }
  } catch (error) {
    await logger.error('Failed to connect to Home Assistant', error instanceof Error ? error : new Error(String(error)), {
      hassHost: HASS_HOST,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
  // ...existing code...

  // Add the list devices tool
  const listDevicesTool = {
    name: 'list_devices',
    description: 'List all available Home Assistant devices',
    parameters: z.object({}).describe('No parameters required'),
    execute: async () => {
      try {
        const response = await fetch(`${HASS_HOST}/api/states`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.statusText}`);
        }

        const states = await response.json() as HassState[];
        const devices: Record<string, HassState[]> = {};

        // Group devices by domain
        states.forEach(state => {
          const [domain] = state.entity_id.split('.');
          if (!devices[domain]) {
            devices[domain] = [];
          }
          devices[domain].push(state);
        });

        return {
          success: true,
          devices
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  registerTool(listDevicesTool);

  // Add the Home Assistant control tool
  const controlTool = {
    name: 'control',
    description: 'Control Home Assistant devices and services',
    parameters: z.object({
      command: z.enum([...commonCommands, ...coverCommands, ...climateCommands])
        .describe('The command to execute'),
      entity_id: z.string().describe('The entity ID to control'),
      // Common parameters
      state: z.string().optional().describe('The desired state for the entity'),
      // Light parameters
      brightness: z.number().min(0).max(255).optional()
        .describe('Brightness level for lights (0-255)'),
      color_temp: z.number().optional()
        .describe('Color temperature for lights'),
      rgb_color: z.tuple([z.number(), z.number(), z.number()]).optional()
        .describe('RGB color values'),
      // Cover parameters
      position: z.number().min(0).max(100).optional()
        .describe('Position for covers (0-100)'),
      tilt_position: z.number().min(0).max(100).optional()
        .describe('Tilt position for covers (0-100)'),
      // Climate parameters
      temperature: z.number().optional()
        .describe('Target temperature for climate devices'),
      target_temp_high: z.number().optional()
        .describe('Target high temperature for climate devices'),
      target_temp_low: z.number().optional()
        .describe('Target low temperature for climate devices'),
      hvac_mode: z.enum(['off', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only']).optional()
        .describe('HVAC mode for climate devices'),
      fan_mode: z.enum(['auto', 'low', 'medium', 'high']).optional()
        .describe('Fan mode for climate devices'),
      humidity: z.number().min(0).max(100).optional()
        .describe('Target humidity for climate devices')
    }),
    execute: async (params: CommandParams) => {
      try {
        const domain = params.entity_id.split('.')[0] as keyof typeof DomainSchema.Values;

        if (!Object.values(DomainSchema.Values).includes(domain)) {
          throw new Error(`Unsupported domain: ${domain}`);
        }

        const service = params.command;
        const serviceData: Record<string, any> = {
          entity_id: params.entity_id
        };

        // Handle domain-specific parameters
        switch (domain) {
          case 'light':
            if (params.brightness !== undefined) {
              serviceData.brightness = params.brightness;
            }
            if (params.color_temp !== undefined) {
              serviceData.color_temp = params.color_temp;
            }
            if (params.rgb_color !== undefined) {
              serviceData.rgb_color = params.rgb_color;
            }
            break;

          case 'cover':
            if (service === 'set_position' && params.position !== undefined) {
              serviceData.position = params.position;
            }
            if (service === 'set_tilt_position' && params.tilt_position !== undefined) {
              serviceData.tilt_position = params.tilt_position;
            }
            break;

          case 'climate':
            if (service === 'set_temperature') {
              if (params.temperature !== undefined) {
                serviceData.temperature = params.temperature;
              }
              if (params.target_temp_high !== undefined) {
                serviceData.target_temp_high = params.target_temp_high;
              }
              if (params.target_temp_low !== undefined) {
                serviceData.target_temp_low = params.target_temp_low;
              }
            }
            if (service === 'set_hvac_mode' && params.hvac_mode !== undefined) {
              serviceData.hvac_mode = params.hvac_mode;
            }
            if (service === 'set_fan_mode' && params.fan_mode !== undefined) {
              serviceData.fan_mode = params.fan_mode;
            }
            if (service === 'set_humidity' && params.humidity !== undefined) {
              serviceData.humidity = params.humidity;
            }
            break;

          case 'switch':
          case 'contact':
            // These domains only support basic operations (turn_on, turn_off, toggle)
            break;

          default:
            throw new Error(`Unsupported operation for domain: ${domain}`);
        }

        // Call Home Assistant service
        try {
          const response = await fetch(`${HASS_HOST}/api/services/${domain}/${service}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData),
          });

          if (!response.ok) {
            throw new Error(`Failed to execute ${service} for ${params.entity_id}: ${response.statusText}`);
          }

          return {
            success: true,
            message: `Successfully executed ${service} for ${params.entity_id}`
          };
        } catch (error) {
          throw new Error(`Failed to execute ${service} for ${params.entity_id}: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  registerTool(controlTool);
  tools.push(controlTool);

  // Add the history tool
  const historyTool = {
    name: 'get_history',
    description: 'Get state history for Home Assistant entities',
    parameters: z.object({
      entity_id: z.string().describe('The entity ID to get history for'),
      start_time: z.string().optional().describe('Start time in ISO format. Defaults to 24 hours ago'),
      end_time: z.string().optional().describe('End time in ISO format. Defaults to now'),
      minimal_response: z.boolean().optional().describe('Return minimal response to reduce data size'),
      significant_changes_only: z.boolean().optional().describe('Only return significant state changes'),
    }),
    execute: async (params: HistoryParams) => {
      try {
        const now = new Date();
        const startTime = params.start_time ? new Date(params.start_time) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const endTime = params.end_time ? new Date(params.end_time) : now;

        // Build query parameters
        const queryParams = new URLSearchParams({
          filter_entity_id: params.entity_id,
          minimal_response: String(!!params.minimal_response),
          significant_changes_only: String(!!params.significant_changes_only),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        });

        const response = await fetch(`${HASS_HOST}/api/history/period/${startTime.toISOString()}?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const history = await response.json();
        return {
          success: true,
          history,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(historyTool);
  tools.push(historyTool);

  // Add the scenes tool
  const sceneTool = {
    name: 'scene',
    description: 'Manage and activate Home Assistant scenes',
    parameters: z.object({
      action: z.enum(['list', 'activate']).describe('Action to perform with scenes'),
      scene_id: z.string().optional().describe('Scene ID to activate (required for activate action)'),
    }),
    execute: async (params: SceneParams) => {
      try {
        if (params.action === 'list') {
          const response = await fetch(`${HASS_HOST}/api/states`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch scenes: ${response.statusText}`);
          }

          const states = (await response.json()) as HassState[];
          const scenes = states.filter((state) => state.entity_id.startsWith('scene.'));

          return {
            success: true,
            scenes: scenes.map((scene) => ({
              entity_id: scene.entity_id,
              name: scene.attributes.friendly_name || scene.entity_id.split('.')[1],
              description: scene.attributes.description,
            })),
          };
        } else if (params.action === 'activate') {
          if (!params.scene_id) {
            throw new Error('Scene ID is required for activate action');
          }

          const response = await fetch(`${HASS_HOST}/api/services/scene/turn_on`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entity_id: params.scene_id,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to activate scene: ${response.statusText}`);
          }

          return {
            success: true,
            message: `Successfully activated scene ${params.scene_id}`,
          };
        }

        throw new Error('Invalid action specified');
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(sceneTool);
  tools.push(sceneTool);

  // Add the notification tool
  const notifyTool = {
    name: 'notify',
    description: 'Send notifications through Home Assistant',
    parameters: z.object({
      message: z.string().describe('The notification message'),
      title: z.string().optional().describe('The notification title'),
      target: z.string().optional().describe('Specific notification target (e.g., mobile_app_phone)'),
      data: z.record(z.any()).optional().describe('Additional notification data'),
    }),
    execute: async (params: NotifyParams) => {
      try {
        const service = params.target ? `notify.${params.target}` : 'notify.notify';
        const [domain, service_name] = service.split('.');

        const response = await fetch(`${HASS_HOST}/api/services/${domain}/${service_name}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: params.message,
            title: params.title,
            data: params.data,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send notification: ${response.statusText}`);
        }

        return {
          success: true,
          message: 'Notification sent successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(notifyTool);
  tools.push(notifyTool);

  // Add the automation tool
  const automationTool = {
    name: 'automation',
    description: 'Manage Home Assistant automations',
    parameters: z.object({
      action: z.enum(['list', 'toggle', 'trigger', 'get_config', 'get_yaml', 'create', 'validate']).describe('Action to perform with automation'),
      automation_id: z.string().optional().describe('Automation ID (required for toggle, trigger, get_config, and get_yaml actions)'),
      // Fields for automation creation
      alias: z.string().optional().describe('Automation name/alias (required for create action)'),
      description: z.string().optional().describe('Automation description'),
      mode: z.enum(['single', 'restart', 'queued', 'parallel']).optional().describe('Automation execution mode'),
      triggers: z.any().optional().describe('Automation triggers array (required for create action)'),
      condition: z.any().optional().describe('Automation condition configuration'),
      action_config: z.any().optional().describe('Automation action configuration (required for create action)'),
      // Validation-only fields
      validate_trigger: z.any().optional().describe('Trigger configuration to validate'),
      validate_condition: z.any().optional().describe('Condition configuration to validate'),
      validate_action: z.any().optional().describe('Action configuration to validate'),
    }),
    execute: async (params: AutomationParams) => {
      try {
        if (params.action === 'list') {
          const response = await fetch(`${HASS_HOST}/api/states`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch automations: ${response.statusText}`);
          }

          const states = (await response.json()) as HassState[];
          const automations = states.filter((state) => state.entity_id.startsWith('automation.'));

          return {
            success: true,
            automations: automations.map((automation) => ({
              entity_id: automation.entity_id,
              name: automation.attributes.friendly_name || automation.entity_id.split('.')[1],
              state: automation.state,
              last_triggered: automation.attributes.last_triggered,
              description: automation.attributes.description || null,
              mode: automation.attributes.mode || null,
            })),
          };
        } else if (params.action === 'get_config') {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for get_config action');
          }

          // First, try WebSocket API for automation config
          if (wsClient) {
            try {
              const wsConfig = await wsClient.getAutomationConfig(params.automation_id);
              if (wsConfig && wsConfig.config) {
                return {
                  success: true,
                  automation_config: {
                    entity_id: params.automation_id,
                    alias: wsConfig.config.alias,
                    description: wsConfig.config.description || null,
                    mode: wsConfig.config.mode || 'single',
                    trigger: wsConfig.config.trigger,
                    condition: wsConfig.config.condition || [],
                    action: wsConfig.config.action,
                  },
                  source: 'websocket_api'
                };
              }
            } catch (wsError) {
              // WebSocket API failed, continue with other methods
            }
          }

          // Get the automation state with attributes which might contain more details
          const stateResponse = await fetch(`${HASS_HOST}/api/states/${params.automation_id}`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!stateResponse.ok) {
            throw new Error(`Failed to get automation state: ${stateResponse.status} ${stateResponse.statusText}`);
          }

          const stateData = await stateResponse.json() as HassState;

          // Try to get detailed configuration from the config API
          // Extract automation ID - if it starts with 'automation.', remove that prefix
          const automationId = params.automation_id.startsWith('automation.') 
            ? params.automation_id.substring('automation.'.length)
            : params.automation_id;

          try {
            // Try the config API
            const configResponse = await fetch(`${HASS_HOST}/api/config/automation/config/${automationId}`, {
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });

            if (configResponse.ok) {
              const config = await configResponse.json() as AutomationConfig;
              return {
                success: true,
                automation_config: {
                  entity_id: params.automation_id,
                  alias: config.alias,
                  description: config.description || null,
                  mode: config.mode || 'single',
                  trigger: config.trigger,
                  condition: config.condition || [],
                  action: config.action,
                },
                source: 'config_api'
              };
            }
          } catch (configError) {
            // Config API failed, continue with state-based response
          }

          // If config API fails, return what we can from the state
          return {
            success: true,
            automation_config: {
              entity_id: params.automation_id,
              alias: stateData.attributes.friendly_name || params.automation_id,
              description: stateData.attributes.description || null,
              mode: stateData.attributes.mode || 'single',
              trigger: [], // Not available from state API
              condition: [], // Not available from state API  
              action: [], // Not available from state API
              note: 'Limited information available - full configuration not accessible via API for this automation'
            },
          };
        } else if (params.action === 'get_yaml') {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for get_yaml action');
          }

          // Get automation state first
          const stateResponse = await fetch(`${HASS_HOST}/api/states/${params.automation_id}`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!stateResponse.ok) {
            throw new Error(`Failed to get automation state: ${stateResponse.status} ${stateResponse.statusText}`);
          }

          const stateData = await stateResponse.json() as HassState;

          // Extract automation ID for config API
          const automationId = params.automation_id.startsWith('automation.') 
            ? params.automation_id.substring('automation.'.length)
            : params.automation_id;

          // Try multiple approaches to get detailed config
          let yamlContent = null;
          let configData = null;
          let dataSource = 'unknown';

          // Approach 1: Try WebSocket API (most direct access to automation config)
          if (wsClient) {
            try {
              const wsConfig = await wsClient.getAutomationConfig(params.automation_id);
              if (wsConfig && wsConfig.config) {
                configData = wsConfig.config;
                dataSource = 'websocket_api';
              }
            } catch (wsError) {
              // WebSocket API failed, continue with other methods
            }
          }

          // Approach 2: Try the automation config API
          if (!configData) {
            try {
              const configResponse = await fetch(`${HASS_HOST}/api/config/automation/config/${automationId}`, {
                headers: {
                  Authorization: `Bearer ${HASS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              });

              if (configResponse.ok) {
                configData = await configResponse.json() as AutomationConfig;
                dataSource = 'config_api';
              }
            } catch (error) {
              // Config API failed, continue with other methods
            }
          }

          // Approach 3: Try to get automation list from config API to find our automation
          if (!configData) {
            try {
              const allConfigResponse = await fetch(`${HASS_HOST}/api/config/automation/config`, {
                headers: {
                  Authorization: `Bearer ${HASS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              });

              if (allConfigResponse.ok) {
                const allConfigs = await allConfigResponse.json() as AutomationConfig[];
                // Find our automation by alias or ID
                configData = allConfigs.find(config => 
                  config.alias === stateData.attributes.friendly_name ||
                  config.alias === automationId
                );
                if (configData) {
                  dataSource = 'all_config_api';
                }
              }
            } catch (error) {
              // All config API also failed
            }
          }

          // Approach 4: Try the template API for automation inspection
          if (!configData) {
            try {
              const templateResponse = await fetch(`${HASS_HOST}/api/template`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${HASS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  template: `{{ state_attr('${params.automation_id}', 'configuration') }}`
                }),
              });

              if (templateResponse.ok) {
                const templateResult = await templateResponse.text();
                if (templateResult && templateResult !== 'None' && templateResult !== 'null') {
                  try {
                    configData = JSON.parse(templateResult);
                    dataSource = 'template_api';
                  } catch (parseError) {
                    // Template didn't return valid JSON
                  }
                }
              }
            } catch (error) {
              // Template API failed
            }
          }

          // If we have config data, format it as YAML-like structure
          if (configData) {
            const sourceDescription = dataSource === 'websocket_api' ? 'via WebSocket API' : 
                                    dataSource === 'config_api' ? 'via Config API' :
                                    dataSource === 'all_config_api' ? 'via All Config API' :
                                    dataSource === 'template_api' ? 'via Template API' : 'unknown source';
            
            yamlContent = `# Automation: ${configData.alias || params.automation_id}
${configData.description ? `# Description: ${configData.description}\n` : ''}# Retrieved ${sourceDescription}

automation:
  alias: ${configData.alias || 'Unknown'}
  description: ${configData.description || 'No description'}
  mode: ${configData.mode || 'single'}
  
  trigger:
${configData.trigger ? configData.trigger.map((t: any) => `    - ${JSON.stringify(t, null, 6).replace(/\n/g, '\n      ')}`).join('\n') : '    # No triggers available'}

  condition:
${configData.condition && configData.condition.length > 0 
  ? configData.condition.map((c: any) => `    - ${JSON.stringify(c, null, 6).replace(/\n/g, '\n      ')}`).join('\n')
  : '    # No conditions'}

  action:
${configData.action ? configData.action.map((a: any) => `    - ${JSON.stringify(a, null, 6).replace(/\n/g, '\n      ')}`).join('\n') : '    # No actions available'}`;

            return {
              success: true,
              automation_yaml: yamlContent,
              raw_config: configData,
              source: dataSource
            };
          }

          // Fallback: Create YAML from state information
          yamlContent = `# Automation: ${stateData.attributes.friendly_name || params.automation_id}
# Note: Limited information - full configuration not available via API
${stateData.attributes.description ? `# Description: ${stateData.attributes.description}\n` : ''}
automation:
  alias: ${stateData.attributes.friendly_name || automationId}
  description: ${stateData.attributes.description || 'No description available'}
  mode: ${stateData.attributes.mode || 'single'}
  
  # Configuration details not accessible via API
  # This automation was likely created through the UI
  # and full configuration is not exposed through REST API
  
  # Current state: ${stateData.state}
  # Last triggered: ${stateData.attributes.last_triggered || 'Never'}
  
  trigger:
    # Trigger configuration not available
    
  condition:
    # Condition configuration not available
    
  action:
    # Action configuration not available`;

          return {
            success: true,
            automation_yaml: yamlContent,
            raw_config: null,
            source: 'state_based_fallback',
            note: 'Limited YAML generated from state information - full configuration not accessible'
          };
        } else if (params.action === 'create') {
          if (!params.alias) {
            throw new Error('Alias is required for create action');
          }
          if (!params.triggers) {
            throw new Error('Trigger configuration is required for create action');
          }
          if (!params.action_config) {
            throw new Error('Action configuration is required for create action');
          }

          // Build automation configuration
          const automationId = params.alias.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const automationConfig: any = {
            id: automationId,
            alias: params.alias,
            mode: params.mode || 'single',
            triggers: params.triggers,
            action: params.action_config
          };

          if (params.description) {
            automationConfig.description = params.description;
          }
          if (params.condition) {
            automationConfig.condition = params.condition;
          }

          // First, validate the configuration via WebSocket if available
          if (wsClient) {
            try {
              const validation = await wsClient.validateConfig(
                automationConfig.triggers,
                automationConfig.condition,
                automationConfig.action
              );

              if (!validation.trigger?.valid) {
                throw new Error(`Invalid trigger configuration: ${validation.trigger?.error}`);
              }
              if (automationConfig.condition && !validation.condition?.valid) {
                throw new Error(`Invalid condition configuration: ${validation.condition?.error}`);
              }
              if (!validation.action?.valid) {
                throw new Error(`Invalid action configuration: ${validation.action?.error}`);
              }
            } catch (validationError) {
              if (validationError instanceof Error && validationError.message.includes('Invalid')) {
                throw validationError;
              }
              // If validation fails for other reasons, continue with creation attempt
            }
          }

          // Try to create automation via WebSocket service call first
          if (wsClient) {
            try {
              // Use the correct Home Assistant Config API endpoint
              const response = await fetch(`${HASS_HOST}/api/config/automation/config/${automationId}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${HASS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(automationConfig),
              });

              if (response.ok) {
                const createdAutomation = await response.json();
                
                // Reload automations to make it active
                await wsClient.callService('automation', 'reload');
                
                return {
                  success: true,
                  message: `Successfully created automation: ${params.alias}`,
                  automation_config: createdAutomation,
                  automation_id: automationId,
                  entity_id: `automation.${automationId}`,
                  source: 'websocket_creation'
                };
              } else {
                const errorText = await response.text();
                throw new Error(`Config API failed: ${response.status} ${response.statusText} - ${errorText}`);
              }
            } catch (wsError) {
              // WebSocket creation failed, try fallback methods
              console.warn('WebSocket creation failed:', wsError);
            }
          }

          // Fallback to REST API only
          const response = await fetch(`${HASS_HOST}/api/config/automation/config/${automationId}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(automationConfig),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create automation: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const createdAutomation = await response.json();
          
          // Reload automations to make it active
          try {
            await fetch(`${HASS_HOST}/api/services/automation/reload`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });
          } catch (reloadError) {
            // Reload failed, but automation was created
          }

          return {
            success: true,
            message: `Successfully created automation: ${params.alias}`,
            automation_config: createdAutomation,
            automation_id: automationId,
            entity_id: `automation.${automationId}`,
            source: 'rest_api_creation'
          };
        } else if (params.action === 'validate') {
          if (!params.validate_trigger && !params.validate_condition && !params.validate_action) {
            throw new Error('At least one of validate_trigger, validate_condition, or validate_action is required for validate action');
          }

          // Use WebSocket validation if available
          if (wsClient) {
            try {
              const validation = await wsClient.validateConfig(
                params.validate_trigger,
                params.validate_condition,
                params.validate_action
              );

              return {
                success: true,
                validation_results: validation,
                source: 'websocket_validation'
              };
            } catch (wsError) {
              return {
                success: false,
                message: `WebSocket validation failed: ${wsError instanceof Error ? wsError.message : String(wsError)}`,
                source: 'websocket_validation'
              };
            }
          }

          // Fallback to REST API validation (limited)
          return {
            success: false,
            message: 'WebSocket not available for validation. Full validation requires WebSocket connection.',
            source: 'rest_fallback'
          };
        } else {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for toggle, trigger, get_config, and get_yaml actions');
          }

          const service = params.action === 'toggle' ? 'toggle' : 'trigger';
          const response = await fetch(`${HASS_HOST}/api/services/automation/${service}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entity_id: params.automation_id,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${service} automation: ${response.statusText}`);
          }

          const responseData = await response.json() as AutomationResponse;
          return {
            success: true,
            message: `Successfully ${service}d automation ${params.automation_id}`,
            automation_id: responseData.automation_id,
          };
        }

        // This should never be reached due to z.enum validation, but included for safety
        throw new Error(`Invalid action: ${params.action}. Must be one of: list, toggle, trigger, get_config, get_yaml, create, validate`);
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(automationTool);
  tools.push(automationTool);

  // Add the addon tool
  const addonTool = {
    name: 'addon',
    description: 'Manage Home Assistant add-ons',
    parameters: z.object({
      action: z.enum(['list', 'info', 'install', 'uninstall', 'start', 'stop', 'restart']).describe('Action to perform with add-on'),
      slug: z.string().optional().describe('Add-on slug (required for all actions except list)'),
      version: z.string().optional().describe('Version to install (only for install action)'),
    }),
    execute: async (params: AddonParams) => {
      try {
        if (params.action === 'list') {
          const response = await fetch(`${HASS_HOST}/api/hassio/store`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch add-ons: ${response.statusText}`);
          }

          const data = await response.json() as HassAddonResponse;
          return {
            success: true,
            addons: data.data.addons.map((addon) => ({
              name: addon.name,
              slug: addon.slug,
              description: addon.description,
              version: addon.version,
              installed: addon.installed,
              available: addon.available,
              state: addon.state,
            })),
          };
        } else {
          if (!params.slug) {
            throw new Error('Add-on slug is required for this action');
          }

          let endpoint = '';
          let method = 'GET';
          const body: Record<string, any> = {};

          switch (params.action) {
            case 'info':
              endpoint = `/api/hassio/addons/${params.slug}/info`;
              break;
            case 'install':
              endpoint = `/api/hassio/addons/${params.slug}/install`;
              method = 'POST';
              if (params.version) {
                body.version = params.version;
              }
              break;
            case 'uninstall':
              endpoint = `/api/hassio/addons/${params.slug}/uninstall`;
              method = 'POST';
              break;
            case 'start':
              endpoint = `/api/hassio/addons/${params.slug}/start`;
              method = 'POST';
              break;
            case 'stop':
              endpoint = `/api/hassio/addons/${params.slug}/stop`;
              method = 'POST';
              break;
            case 'restart':
              endpoint = `/api/hassio/addons/${params.slug}/restart`;
              method = 'POST';
              break;
          }

          const response = await fetch(`${HASS_HOST}${endpoint}`, {
            method,
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            ...(Object.keys(body).length > 0 && { body: JSON.stringify(body) }),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${params.action} add-on: ${response.statusText}`);
          }

          const data = await response.json() as HassAddonInfoResponse;
          return {
            success: true,
            message: `Successfully ${params.action}ed add-on ${params.slug}`,
            data: data.data,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(addonTool);
  tools.push(addonTool);

  // Add the package tool
  const packageTool = {
    name: 'package',
    description: 'Manage HACS packages and custom components',
    parameters: z.object({
      action: z.enum(['list', 'install', 'uninstall', 'update']).describe('Action to perform with package'),
      category: z.enum(['integration', 'plugin', 'theme', 'python_script', 'appdaemon', 'netdaemon'])
        .describe('Package category'),
      repository: z.string().optional().describe('Repository URL or name (required for install)'),
      version: z.string().optional().describe('Version to install'),
    }),
    execute: async (params: PackageParams) => {
      try {
        const hacsBase = `${HASS_HOST}/api/hacs`;

        if (params.action === 'list') {
          const response = await fetch(`${hacsBase}/repositories?category=${params.category}`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch packages: ${response.statusText}`);
          }

          const data = await response.json() as HacsResponse;
          return {
            success: true,
            packages: data.repositories,
          };
        } else {
          if (!params.repository) {
            throw new Error('Repository is required for this action');
          }

          let endpoint = '';
          const body: Record<string, any> = {
            category: params.category,
            repository: params.repository,
          };

          switch (params.action) {
            case 'install':
              endpoint = '/repository/install';
              if (params.version) {
                body.version = params.version;
              }
              break;
            case 'uninstall':
              endpoint = '/repository/uninstall';
              break;
            case 'update':
              endpoint = '/repository/update';
              break;
          }

          const response = await fetch(`${hacsBase}${endpoint}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${params.action} package: ${response.statusText}`);
          }

          return {
            success: true,
            message: `Successfully ${params.action}ed package ${params.repository}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(packageTool);
  tools.push(packageTool);

  // Extend the automation tool with more functionality
  const automationConfigTool = {
    name: 'automation_config',
    description: 'Advanced automation configuration and management',
    parameters: z.object({
      action: z.enum(['create', 'update', 'delete', 'duplicate']).describe('Action to perform with automation config'),
      automation_id: z.string().optional().describe('Automation ID (required for update, delete, and duplicate)'),
      config: z.object({
        alias: z.string().describe('Friendly name for the automation'),
        description: z.string().optional().describe('Description of what the automation does'),
        mode: z.enum(['single', 'parallel', 'queued', 'restart']).optional().describe('How multiple triggerings are handled'),
        trigger: z.array(z.any()).describe('List of triggers'),
        condition: z.array(z.any()).optional().describe('List of conditions'),
        action: z.array(z.any()).describe('List of actions'),
      }).optional().describe('Automation configuration (required for create and update)'),
    }),
    execute: async (params: AutomationConfigParams) => {
      try {
        switch (params.action) {
          case 'create': {
            if (!params.config) {
              throw new Error('Configuration is required for creating automation');
            }

            const response = await fetch(`${HASS_HOST}/api/config/automation/config`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(params.config),
            });

            if (!response.ok) {
              throw new Error(`Failed to create automation: ${response.statusText}`);
            }

            const responseData = await response.json() as { automation_id: string };
            return {
              success: true,
              message: 'Successfully created automation',
              automation_id: responseData.automation_id,
            };
          }

          case 'update': {
            if (!params.automation_id || !params.config) {
              throw new Error('Automation ID and configuration are required for updating automation');
            }

            const response = await fetch(`${HASS_HOST}/api/config/automation/config/${params.automation_id}`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(params.config),
            });

            if (!response.ok) {
              throw new Error(`Failed to update automation: ${response.statusText}`);
            }

            const responseData = await response.json() as { automation_id: string };
            return {
              success: true,
              automation_id: responseData.automation_id,
              message: 'Automation updated successfully'
            };
          }

          case 'delete': {
            if (!params.automation_id) {
              throw new Error('Automation ID is required for deleting automation');
            }

            const response = await fetch(`${HASS_HOST}/api/config/automation/config/${params.automation_id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to delete automation: ${response.statusText}`);
            }

            return {
              success: true,
              message: `Successfully deleted automation ${params.automation_id}`,
            };
          }

          case 'duplicate': {
            if (!params.automation_id) {
              throw new Error('Automation ID is required for duplicating automation');
            }

            // First, get the existing automation config
            const getResponse = await fetch(`${HASS_HOST}/api/config/automation/config/${params.automation_id}`, {
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });

            if (!getResponse.ok) {
              throw new Error(`Failed to get automation config: ${getResponse.statusText}`);
            }

            const config = await getResponse.json() as AutomationConfig;
            config.alias = `${config.alias} (Copy)`;

            // Create new automation with modified config
            const createResponse = await fetch(`${HASS_HOST}/api/config/automation/config`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(config),
            });

            if (!createResponse.ok) {
              throw new Error(`Failed to create duplicate automation: ${createResponse.statusText}`);
            }

            const newAutomation = await createResponse.json() as AutomationResponse;
            return {
              success: true,
              message: `Successfully duplicated automation ${params.automation_id}`,
              new_automation_id: newAutomation.automation_id,
            };
          }
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(automationConfigTool);
  tools.push(automationConfigTool);

  // Add SSE endpoint
  const subscribeEventsTool = {
    name: 'subscribe_events',
    description: 'Subscribe to Home Assistant events via Server-Sent Events (SSE)',
    parameters: z.object({
      token: z.string().describe('Authentication token (required)'),
      events: z.array(z.string()).optional().describe('List of event types to subscribe to'),
      entity_id: z.string().optional().describe('Specific entity ID to monitor for state changes'),
      domain: z.string().optional().describe('Domain to monitor (e.g., "light", "switch", etc.)'),
    }),
    execute: async (params: SSEParams) => {
      const clientId = uuidv4();

      // Set up SSE headers
      const responseHeaders = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      // Create SSE client
      const client = {
        id: clientId,
        send: (data: string) => {
          return {
            headers: responseHeaders,
            body: `data: ${data}\n\n`,
            keepAlive: true
          };
        }
      };

      // Add client to SSE manager with authentication
      const sseClient = sseManager.addClient(client, params.token);

      if (!sseClient || !sseClient.authenticated) {
        return {
          success: false,
          message: sseClient ? 'Authentication failed' : 'Maximum client limit reached'
        };
      }

      // Subscribe to specific events if provided
      if (params.events?.length) {
  // ...existing code...
        for (const eventType of params.events) {
          sseManager.subscribeToEvent(clientId, eventType);
        }
      }

      // Subscribe to specific entity if provided
      if (params.entity_id) {
  // ...existing code...
        sseManager.subscribeToEntity(clientId, params.entity_id);
      }

      // Subscribe to domain if provided
      if (params.domain) {
  // ...existing code...
        sseManager.subscribeToDomain(clientId, params.domain);
      }

      return {
        headers: responseHeaders,
        body: `data: ${JSON.stringify({
          type: 'connection',
          status: 'connected',
          id: clientId,
          authenticated: true,
          subscriptions: {
            events: params.events || [],
            entities: params.entity_id ? [params.entity_id] : [],
            domains: params.domain ? [params.domain] : []
          },
          timestamp: new Date().toISOString()
        })}\n\n`,
        keepAlive: true
      };
    }
  };
  registerTool(subscribeEventsTool);
  tools.push(subscribeEventsTool);

  // Add statistics endpoint
  const getSSEStatsTool = {
    name: 'get_sse_stats',
    description: 'Get SSE connection statistics',
    parameters: z.object({
      token: z.string().describe('Authentication token (required)')
    }),
    execute: async (params: { token: string }) => {
      if (params.token !== HASS_TOKEN) {
        return {
          success: false,
          message: 'Authentication failed'
        };
      }

      return {
        success: true,
        statistics: sseManager.getStatistics()
      };
    }
  };
  registerTool(getSSEStatsTool);
  tools.push(getSSEStatsTool);

  // Add the firmware update tool
  const firmwareUpdateTool = {
    name: 'firmware_update',
    description: 'Manage firmware updates for devices and services',
    parameters: z.object({
      action: z.enum(['list', 'install', 'skip', 'clear_skipped']).describe('Action to perform'),
      entity_id: z.string().optional().describe('Update entity ID (required for install, skip, and clear_skipped actions)'),
      version: z.string().optional().describe('Specific version to install (optional, defaults to latest)'),
      backup: z.boolean().optional().describe('Create backup before installing update'),
    }),
    execute: async (params: FirmwareUpdateParams) => {
      try {
        if (params.action === 'list') {
          // List all available update entities
          const response = await fetch(`${HASS_HOST}/api/states`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch update entities: ${response.statusText}`);
          }

          const states = await response.json() as HassState[];
          const updateEntities = states.filter(state => state.entity_id.startsWith('update.'));

          return {
            success: true,
            updates: updateEntities.map(entity => ({
              entity_id: entity.entity_id,
              state: entity.state,
              title: entity.attributes.title || entity.attributes.friendly_name,
              installed_version: entity.attributes.installed_version,
              latest_version: entity.attributes.latest_version,
              skipped_version: entity.attributes.skipped_version,
              release_summary: entity.attributes.release_summary,
              release_url: entity.attributes.release_url,
              auto_update: entity.attributes.auto_update,
              device_class: entity.attributes.device_class,
              in_progress: entity.attributes.in_progress,
              update_percentage: entity.attributes.update_percentage,
              supported_features: entity.attributes.supported_features,
            })),
          };
        } else {
          if (!params.entity_id) {
            throw new Error('Entity ID is required for install, skip, and clear_skipped actions');
          }

          let service = '';
          const serviceData: Record<string, any> = {
            entity_id: params.entity_id,
          };

          switch (params.action) {
            case 'install':
              service = 'update.install';
              if (params.version) {
                serviceData.version = params.version;
              }
              if (params.backup !== undefined) {
                serviceData.backup = params.backup;
              }
              break;
            case 'skip':
              service = 'update.skip';
              break;
            case 'clear_skipped':
              service = 'update.clear_skipped';
              break;
          }

          const response = await fetch(`${HASS_HOST}/api/services/${service.replace('.', '/')}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${params.action} update: ${response.statusText}`);
          }

          const responseData = await response.json();
          return {
            success: true,
            message: `Successfully executed ${params.action} for ${params.entity_id}`,
            data: responseData,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  registerTool(firmwareUpdateTool);
  tools.push(firmwareUpdateTool);

  // ...existing code...

  // Setup HTTP MCP transport routes
  try {
    mcpHttpTransport.setupRoutes(app);
    await logger.info('MCP HTTP transport routes configured', {
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logger.error('Failed to setup MCP HTTP transport routes', error instanceof Error ? error : new Error(String(error)), {
      timestamp: new Date().toISOString()
    });
    throw error;
  }

  // Start the server
  try {
    await server.start();
    
    // Log MCP server startup
    await logger.info('MCP Protocol Server initialized', {
      tools_registered: tools.length,
      tool_names: tools.map(t => t.name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logger.error('Failed to start MCP Protocol Server', error instanceof Error ? error : new Error(String(error)), {
      tools_registered: tools.length,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
  // ...existing code...
  // ...existing code...
  // ...existing code...

  // Log available endpoints using our tracked tools array
  // ...existing code...
  // ...existing code...

  // Log SSE endpoints
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  
  // Log MCP HTTP endpoints
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...

  // Log successful initialization
  // ...existing code...

  // Start the Express server with error handling
  try {
    await logger.info('Starting Express HTTP server', {
      port: PORT,
      timestamp: new Date().toISOString()
    });

    const httpServer = app.listen(PORT, async () => {
      // Server started successfully - log to file instead of console to avoid breaking MCP protocol
      await logger.info('Home Assistant MCP Server started successfully', {
        port: PORT,
        host: HASS_HOST,
        mcp_version: '0.1.0',
        endpoints: [
          '/health',
          '/list_devices', 
          '/control',
          '/automations',
          '/automations/:automation_id/config',
          '/automations/:automation_id/yaml',
          '/subscribe_events',
          '/sse_stats',
          '/mcp/initialize',
          '/mcp/ping',
          '/mcp/tools/list',
          '/mcp/tools/call'
        ],
        timestamp: new Date().toISOString()
      });
    });

  // Handle server errors (like port already in use)
  httpServer.on('error', (err: any) => {
    logger.error('HTTP Server error', err, {
      port: PORT,
      timestamp: new Date().toISOString()
    });

    if (err.code === 'EADDRINUSE') {
      // Port is busy - try to find an available port
      const altPort = parseInt(PORT.toString()) + Math.floor(Math.random() * 1000) + 1;
      logger.info('Port in use, trying alternative port', {
        originalPort: PORT,
        alternativePort: altPort,
        timestamp: new Date().toISOString()
      });
      
      app.listen(altPort, () => {
        // Alternative port used - no output to avoid breaking MCP protocol
      });
    } else {
      // Other errors - exit gracefully
      process.exit(1);
    }
  });
  } catch (error) {
    await logger.error('Failed to start Express HTTP server', error instanceof Error ? error : new Error(String(error)), {
      port: PORT,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Fatal error in main function', error, {
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error, {
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});