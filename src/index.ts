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
import { 
  updateAutomationWithDebug, 
  validateAutomationConfig, 
  getAutomationInfo,
  resolveAutomationId,
  getActualAutomationId,
  getAutomationTraces,
  getAutomationTraceDetail,
  getAutomationLatestTrace,
  getAutomationErrorTraces,
  getFilteredAutomationTraces,
  type AutomationConfig as AutomationConfigType,
  type AutomationUpdateResult,
  type AutomationTraceFilter 
} from './utils/automation-helpers.js';

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
  action: 'list' | 'toggle' | 'trigger' | 'get_yaml' | 'create' | 'validate' | 'update' | 'get_traces' | 'get_trace_detail' | 'get_latest_trace' | 'get_error_traces' | 'get_filtered_traces';
  automation_id?: string;
  // Fields for automation creation
  alias?: string;
  description?: string;
  mode?: 'single' | 'restart' | 'queued' | 'parallel';
  triggers?: any;
  condition?: any;
  action_config?: any;
  // Config object for update action
  config?: {
    alias?: string;
    description?: string;
    mode?: 'single' | 'restart' | 'queued' | 'parallel';
    trigger?: any[];
    condition?: any[];
    action?: any[];
  };
  // Validation-only fields
  validate_trigger?: any;
  validate_condition?: any;
  validate_action?: any;
  // Trace-specific fields
  run_id?: string;
  // Trace filtering fields
  filter_has_error?: boolean;
  filter_script_execution?: 'finished' | 'cancelled' | 'timeout' | 'failed';
  filter_state?: 'running' | 'stopped' | 'debugged';
  filter_since?: string;
  filter_limit?: number;
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

// Enhanced Entity Validator
interface EntityValidationResult {
  valid: boolean;
  exists: boolean;
  currentState?: string;
  supportedFeatures?: number;
  error?: string;
  attributes?: Record<string, any>;
}

class EntityValidator {
  private hassHost: string;
  private hassToken: string;
  private entityCache: Map<string, { state: any; timestamp: number; }> = new Map();
  private cacheExpiry = 5000; // 5 seconds

  constructor(hassHost: string, hassToken: string) {
    this.hassHost = hassHost;
    this.hassToken = hassToken;
  }

  async validateEntityExists(entityId: string): Promise<EntityValidationResult> {
    try {
      const response = await fetch(`${this.hassHost}/api/states/${entityId}`, {
        headers: {
          Authorization: `Bearer ${this.hassToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            valid: false,
            exists: false,
            error: `Entity '${entityId}' not found`
          };
        }
        return {
          valid: false,
          exists: false,
          error: `Failed to check entity: ${response.statusText}`
        };
      }

      const state = await response.json() as HassState;
      return {
        valid: true,
        exists: true,
        currentState: state.state,
        supportedFeatures: state.attributes.supported_features,
        attributes: state.attributes
      };
    } catch (error) {
      return {
        valid: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateEntityOperation(entityId: string, operation: string, parameters?: Record<string, any>): Promise<EntityValidationResult> {
    const existsResult = await this.validateEntityExists(entityId);
    if (!existsResult.valid) {
      return existsResult;
    }

    const [domain] = entityId.split('.');
    const validationErrors: string[] = [];

    // Domain-specific validation
    switch (domain) {
      case 'light':
        if (operation === 'turn_on' && parameters?.brightness !== undefined) {
          if (parameters.brightness < 0 || parameters.brightness > 255) {
            validationErrors.push('Brightness must be between 0 and 255');
          }
        }
        if (parameters?.rgb_color && !Array.isArray(parameters.rgb_color)) {
          validationErrors.push('RGB color must be an array of three numbers');
        }
        break;

      case 'cover':
        if ((operation === 'set_position' || operation === 'set_tilt_position') && parameters?.position !== undefined) {
          if (parameters.position < 0 || parameters.position > 100) {
            validationErrors.push('Position must be between 0 and 100');
          }
        }
        break;

      case 'climate':
        if (operation === 'set_temperature' && parameters?.temperature !== undefined) {
          // Basic temperature range validation
          if (parameters.temperature < -50 || parameters.temperature > 50) {
            validationErrors.push('Temperature must be between -50 and 50 degrees');
          }
        }
        break;

      case 'switch':
      case 'fan':
      case 'lock':
      case 'vacuum':
        // Basic operations only
        if (!['turn_on', 'turn_off', 'toggle'].includes(operation)) {
          validationErrors.push(`Operation '${operation}' not supported for ${domain} entities`);
        }
        break;
    }

    return {
      valid: validationErrors.length === 0,
      exists: true,
      currentState: existsResult.currentState,
      supportedFeatures: existsResult.supportedFeatures,
      attributes: existsResult.attributes,
      error: validationErrors.length > 0 ? validationErrors.join('; ') : undefined
    };
  }

  async validateStateChange(entityId: string, expectedState?: string, timeoutMs: number = 3000): Promise<EntityValidationResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.validateEntityExists(entityId);
      
      if (!result.valid) {
        return result;
      }

      if (!expectedState || result.currentState === expectedState) {
        return {
          valid: true,
          exists: true,
          currentState: result.currentState,
          supportedFeatures: result.supportedFeatures,
          attributes: result.attributes
        };
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      valid: false,
      exists: true,
      error: `Entity did not reach expected state '${expectedState}' within ${timeoutMs}ms`
    };
  }

  clearCache(): void {
    this.entityCache.clear();
  }
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

  // Initialize entity validator
  const entityValidator = new EntityValidator(HASS_HOST!, HASS_TOKEN!);

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
    description: 'List all Home Assistant devices grouped by domain with optional filtering',
    parameters: z.object({
      domain: z.string().optional().describe('Filter by specific domain (e.g., "light", "switch", "sensor")'),
      state: z.string().optional().describe('Filter by current state (e.g., "on", "off", "unavailable")'),
      sort_by: z.enum(['entity_id', 'domain', 'state', 'friendly_name']).default('domain').optional()
        .describe('Sort devices by specified field'),
      include_unavailable: z.boolean().default(true).optional()
        .describe('Include devices that are unavailable'),
    }),
    execute: async (params: {
      domain?: string;
      state?: string;
      sort_by?: 'entity_id' | 'domain' | 'state' | 'friendly_name';
      include_unavailable?: boolean;
    } = {}) => {
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

        let states = await response.json() as HassState[];

        // Apply filters
        if (params.domain) {
          states = states.filter(state => state.entity_id.startsWith(`${params.domain}.`));
        }

        if (params.state) {
          states = states.filter(state => state.state.toLowerCase() === params.state!.toLowerCase());
        }

        if (!params.include_unavailable) {
          states = states.filter(state => state.state !== 'unavailable');
        }

        // Sort devices
        const sortBy = params.sort_by || 'domain';
        states.sort((a, b) => {
          let aValue: string, bValue: string;
          
          switch (sortBy) {
            case 'entity_id':
              aValue = a.entity_id;
              bValue = b.entity_id;
              break;
            case 'domain':
              aValue = a.entity_id.split('.')[0];
              bValue = b.entity_id.split('.')[0];
              break;
            case 'state':
              aValue = a.state;
              bValue = b.state;
              break;
            case 'friendly_name':
              aValue = a.attributes?.friendly_name || a.entity_id;
              bValue = b.attributes?.friendly_name || b.entity_id;
              break;
            default:
              aValue = a.entity_id;
              bValue = b.entity_id;
          }
          
          return aValue.localeCompare(bValue);
        });

        const devices: Record<string, HassState[]> = {};
        const deviceCounts: Record<string, number> = {};

        // Group devices by domain
        states.forEach(state => {
          const [domain] = state.entity_id.split('.');
          if (!devices[domain]) {
            devices[domain] = [];
            deviceCounts[domain] = 0;
          }
          devices[domain].push(state);
          deviceCounts[domain]++;
        });

        return {
          success: true,
          total_devices: states.length,
          domain_counts: deviceCounts,
          filters_applied: {
            domain: params.domain,
            state: params.state,
            sort_by: sortBy,
            include_unavailable: params.include_unavailable ?? true,
          },
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

  // Add the enhanced device search tool with area support
  const searchDevicesTool = {
    name: 'search_devices',
    description: 'Search for Home Assistant devices by name, domain, entity ID pattern, state, area, labels, or attributes. Supports combined filtering.',
    parameters: z.object({
      query: z.string().optional().describe('Search query - matches against entity ID, friendly name, or domain'),
      domain: z.string().optional().describe('Filter by specific domain (e.g., "light", "switch", "sensor")'),
      state: z.string().optional().describe('Filter by current state (e.g., "on", "off", "unavailable")'),
      area: z.string().optional().describe('Filter by area name or area_id (e.g., "Living Room", "living_room")'),
      labels: z.array(z.string()).optional().describe('Filter by labels - device must have at least one of these labels'),
      device_class: z.string().optional().describe('Filter by device class (e.g., "motion", "temperature", "humidity")'),
      limit: z.number().min(1).max(500).default(50).optional().describe('Maximum number of results to return'),
      offset: z.number().min(0).default(0).optional().describe('Number of results to skip (for pagination)'),
      include_attributes: z.boolean().default(false).optional().describe('Include full attributes in response'),
      include_area_info: z.boolean().default(true).optional().describe('Include area information for each device'),
      include_label_info: z.boolean().default(true).optional().describe('Include label information for each device'),
    }),
    execute: async (params: {
      query?: string;
      domain?: string;
      state?: string;
      area?: string;
      labels?: string[];
      device_class?: string;
      limit?: number;
      offset?: number;
      include_attributes?: boolean;
      include_area_info?: boolean;
      include_label_info?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        // Get all necessary data via WebSocket
        const promises: Promise<any>[] = [
          wsClient.callWS({ type: 'get_states' }),
          wsClient.callWS({ type: 'config/entity_registry/list' }),
          wsClient.callWS({ type: 'config/device_registry/list' }),
          wsClient.callWS({ type: 'config/area_registry/list' })
        ];

        // Add labels if needed
        if (params.labels && params.labels.length > 0) {
          promises.push(wsClient.callWS({ type: 'config/label_registry/list' }));
        }

        const results = await Promise.all(promises);
        const [states, entities, devices, areas, allLabels] = results;

        if (!Array.isArray(states) || !Array.isArray(entities) || !Array.isArray(devices) || !Array.isArray(areas)) {
          throw new Error('Invalid response from Home Assistant WebSocket API');
        }

        // Create area lookup maps
        const areaMap = new Map(areas.map((area: any) => [area.area_id, area]));
        const entityAreaMap = new Map();
        const deviceMap = new Map(devices.map((device: any) => [device.id, device]));
        
        // Create label maps if labels filter is used
        let labelMap = new Map();
        let labelNameToIdMap = new Map();
        let entityLabelsMap = new Map();
        
        if (params.labels && params.labels.length > 0 && allLabels) {
          labelMap = new Map(allLabels.map((label: any) => [label.label_id, label]));
          labelNameToIdMap = new Map(allLabels.map((label: any) => [label.name.toLowerCase(), label.label_id]));
        } else if (params.include_label_info !== false) {
          // Get labels for display even if not filtering
          const labelsData = await wsClient.callWS({ type: 'config/label_registry/list' });
          if (Array.isArray(labelsData)) {
            labelMap = new Map(labelsData.map((label: any) => [label.label_id, label]));
          }
        }
        
        // Map entities to their areas (direct and via devices)
        entities.forEach((entity: any) => {
          if (entity.area_id) {
            entityAreaMap.set(entity.entity_id, entity.area_id);
          } else if (entity.device_id) {
            // Find device and get its area
            const device = deviceMap.get(entity.device_id);
            if (device?.area_id) {
              entityAreaMap.set(entity.entity_id, device.area_id);
            }
          }

          // Map labels (from entity or device)
          if (params.labels || params.include_label_info !== false) {
            const entityLabelSet = new Set<string>();
            if (entity.labels && Array.isArray(entity.labels)) {
              entity.labels.forEach((lbl: string) => entityLabelSet.add(lbl));
            }
            if (entity.device_id) {
              const device = deviceMap.get(entity.device_id);
              if (device?.labels && Array.isArray(device.labels)) {
                device.labels.forEach((lbl: string) => entityLabelSet.add(lbl));
              }
            }
            entityLabelsMap.set(entity.entity_id, Array.from(entityLabelSet));
          }
        });

        let filteredDevices = states;

        // Apply domain filter
        if (params.domain) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.entity_id.startsWith(`${params.domain}.`)
          );
        }

        // Apply state filter
        if (params.state) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.state.toLowerCase() === params.state!.toLowerCase()
          );
        }

        // Apply device class filter
        if (params.device_class) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.attributes?.device_class === params.device_class
          );
        }

        // Apply labels filter (OR logic - device must have at least one of the labels)
        if (params.labels && params.labels.length > 0) {
          const targetLabelIds = params.labels.map(label => {
            const labelLower = label.toLowerCase();
            if (labelMap.has(label)) return label;
            if (labelNameToIdMap.has(labelLower)) return labelNameToIdMap.get(labelLower);
            for (const [name, id] of labelNameToIdMap.entries()) {
              if (name.includes(labelLower) || labelLower.includes(name)) {
                return id;
              }
            }
            return label;
          }).filter(id => labelMap.has(id!));

          filteredDevices = filteredDevices.filter((device: any) => {
            const deviceLabels = entityLabelsMap.get(device.entity_id) || [];
            return targetLabelIds.some(labelId => deviceLabels.includes(labelId));
          });
        }

        // Apply area filter (enhanced with WebSocket data)
        if (params.area) {
          const areaQuery = params.area.toLowerCase();
          filteredDevices = filteredDevices.filter((device: any) => {
            const entityAreaId = entityAreaMap.get(device.entity_id);
            if (!entityAreaId) return false;
            
            const area = areaMap.get(entityAreaId);
            if (!area) return false;
            
            // Match area_id, name, or aliases
            return area.area_id.toLowerCase().includes(areaQuery) ||
                   area.name.toLowerCase().includes(areaQuery) ||
                   (area.aliases && area.aliases.some((alias: string) => 
                     alias.toLowerCase().includes(areaQuery)
                   ));
          });
        }

        // Apply text search query
        if (params.query) {
          const queryLower = params.query.toLowerCase();
          filteredDevices = filteredDevices.filter((device: any) => {
            const entityId = device.entity_id.toLowerCase();
            const friendlyName = device.attributes?.friendly_name?.toLowerCase() || '';
            const domain = device.entity_id.split('.')[0];
            
            // Also search in area information
            const entityAreaId = entityAreaMap.get(device.entity_id);
            const area = entityAreaId ? areaMap.get(entityAreaId) : null;
            const areaName = area?.name?.toLowerCase() || '';
            
            return entityId.includes(queryLower) ||
                   friendlyName.includes(queryLower) ||
                   domain.includes(queryLower) ||
                   areaName.includes(queryLower);
          });
        }

        // Calculate total before pagination
        const totalFound = filteredDevices.length;

        // Apply pagination
        const offset = params.offset || 0;
        const limit = params.limit || 50;
        const paginatedDevices = filteredDevices.slice(offset, offset + limit);

        // Format response
        const deviceResults = paginatedDevices.map((device: any) => {
          const entityAreaId = entityAreaMap.get(device.entity_id);
          const area = entityAreaId ? areaMap.get(entityAreaId) : null;
          const deviceLabels = entityLabelsMap.get(device.entity_id) || [];
          
          const baseInfo: any = {
            entity_id: device.entity_id,
            state: device.state,
            friendly_name: device.attributes?.friendly_name || device.entity_id,
            domain: device.entity_id.split('.')[0],
            device_class: device.attributes?.device_class,
            last_changed: device.last_changed,
            last_updated: device.last_updated,
          };

          // Add area information if requested
          if (params.include_area_info !== false && area) {
            baseInfo.area = {
              area_id: area.area_id,
              name: area.name,
              floor_id: area.floor_id,
              icon: area.icon,
            };
          }

          // Add label information if requested
          if (params.include_label_info !== false && labelMap.size > 0) {
            baseInfo.labels = deviceLabels;
            baseInfo.label_names = deviceLabels.map((lbl: string) => labelMap.get(lbl)?.name).filter(Boolean);
          }

          if (params.include_attributes) {
            baseInfo.attributes = device.attributes;
          }

          return baseInfo;
        });

        // Group results by area for better organization
        const resultsByArea: Record<string, any[]> = {};
        const noAreaResults: any[] = [];
        
        deviceResults.forEach((result: any) => {
          if (result.area) {
            const areaName = result.area.name;
            if (!resultsByArea[areaName]) {
              resultsByArea[areaName] = [];
            }
            resultsByArea[areaName].push(result);
          } else {
            noAreaResults.push(result);
          }
        });

        return {
          success: true,
          total_found: totalFound,
          returned: deviceResults.length,
          offset: offset,
          limit: limit,
          has_more: totalFound > (offset + limit),
          devices: deviceResults,
          devices_by_area: Object.keys(resultsByArea).length > 0 ? resultsByArea : undefined,
          devices_without_area: noAreaResults.length > 0 ? noAreaResults : undefined,
          filters_applied: {
            query: params.query,
            domain: params.domain,
            state: params.state,
            area: params.area,
            labels: params.labels,
            device_class: params.device_class,
            limit: limit,
            offset: offset,
            include_area_info: params.include_area_info ?? true,
            include_label_info: params.include_label_info ?? true,
          },
          search_method: 'websocket_with_area_registry',
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  registerTool(searchDevicesTool);

  // Add comprehensive area-based device discovery tool  
  const searchDevicesByAreaTool = {
    name: 'search_devices_by_area',
    description: 'Advanced search for devices across multiple areas with comprehensive filtering and organization. Returns ALL devices in matched areas (no artificial limits).',
    parameters: z.object({
      areas: z.array(z.string()).optional().describe('Array of area names or IDs to search in (if empty, searches all areas)'),
      query: z.string().optional().describe('Text search query for device names, entity IDs, or attributes'),
      domains: z.array(z.string()).optional().describe('Filter by device domains (e.g., ["light", "switch", "sensor"])'),
      states: z.array(z.string()).optional().describe('Filter by device states (e.g., ["on", "off"])'),
      device_classes: z.array(z.string()).optional().describe('Filter by device classes (e.g., ["motion", "temperature"])'),
      include_unavailable: z.boolean().default(false).optional().describe('Include devices with unavailable state'),
      group_by: z.enum(['area', 'domain', 'floor', 'none']).default('area').optional().describe('How to group the results'),
      sort_by: z.enum(['name', 'area', 'domain', 'state', 'last_changed']).default('area').optional().describe('Sort results by field'),
      limit: z.number().min(1).max(10000).default(10000).optional().describe('Maximum total devices to return (default 10000, effectively no limit)'),
      include_area_summary: z.boolean().default(true).optional().describe('Include area summary statistics'),
    }),
    execute: async (params: {
      areas?: string[];
      query?: string;
      domains?: string[];
      states?: string[];
      device_classes?: string[];
      include_unavailable?: boolean;
      group_by?: 'area' | 'domain' | 'floor' | 'none';
      sort_by?: 'name' | 'area' | 'domain' | 'state' | 'last_changed';
      limit?: number;
      include_area_summary?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        // Get all necessary data
        const [states, entities, devices, areas] = await Promise.all([
          wsClient.callWS({ type: 'get_states' }),
          wsClient.callWS({ type: 'config/entity_registry/list' }),
          wsClient.callWS({ type: 'config/device_registry/list' }),
          wsClient.callWS({ type: 'config/area_registry/list' })
        ]);

        if (!Array.isArray(states) || !Array.isArray(entities) || !Array.isArray(devices) || !Array.isArray(areas)) {
          throw new Error('Invalid response from Home Assistant WebSocket API');
        }

        // Create lookup maps
        const areaMap = new Map(areas.map((area: any) => [area.area_id, area]));
        const entityAreaMap = new Map();
        const deviceMap = new Map(devices.map((device: any) => [device.id, device]));
        
        // Map entities to their areas
        entities.forEach((entity: any) => {
          if (entity.area_id) {
            entityAreaMap.set(entity.entity_id, entity.area_id);
          } else if (entity.device_id) {
            const device = deviceMap.get(entity.device_id);
            if (device?.area_id) {
              entityAreaMap.set(entity.entity_id, device.area_id);
            }
          }
        });

        // Filter areas if specified
        let targetAreas = areas;
        if (params.areas && params.areas.length > 0) {
          targetAreas = areas.filter((area: any) => {
            return params.areas!.some(searchArea => 
              area.area_id.toLowerCase().includes(searchArea.toLowerCase()) ||
              area.name.toLowerCase().includes(searchArea.toLowerCase()) ||
              (area.aliases && area.aliases.some((alias: string) => 
                alias.toLowerCase().includes(searchArea.toLowerCase())
              ))
            );
          });
        }

        let filteredDevices = states;

        // Filter by availability
        if (!params.include_unavailable) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.state !== 'unavailable' && device.state !== 'unknown'
          );
        }

        // Filter by domains
        if (params.domains && params.domains.length > 0) {
          filteredDevices = filteredDevices.filter((device: any) => 
            params.domains!.includes(device.entity_id.split('.')[0])
          );
        }

        // Filter by states
        if (params.states && params.states.length > 0) {
          filteredDevices = filteredDevices.filter((device: any) => 
            params.states!.includes(device.state)
          );
        }

        // Filter by device classes
        if (params.device_classes && params.device_classes.length > 0) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.attributes?.device_class && 
            params.device_classes!.includes(device.attributes.device_class)
          );
        }

        // Filter by text query
        if (params.query) {
          const queryLower = params.query.toLowerCase();
          filteredDevices = filteredDevices.filter((device: any) => {
            const entityId = device.entity_id.toLowerCase();
            const friendlyName = device.attributes?.friendly_name?.toLowerCase() || '';
            const domain = device.entity_id.split('.')[0];
            
            return entityId.includes(queryLower) ||
                   friendlyName.includes(queryLower) ||
                   domain.includes(queryLower);
          });
        }

        // Filter by target areas and organize results
        const devicesByArea: Record<string, any[]> = {};
        const devicesWithoutArea: any[] = [];
        const areaStats: Record<string, any> = {};

        targetAreas.forEach((area: any) => {
          devicesByArea[area.area_id] = [];
          areaStats[area.area_id] = {
            area_info: area,
            total_devices: 0,
            domains: new Set(),
            states: new Set(),
          };
        });

        filteredDevices.forEach((device: any) => {
          const entityAreaId = entityAreaMap.get(device.entity_id);
          const area = entityAreaId ? areaMap.get(entityAreaId) : null;
          
          const deviceInfo = {
            entity_id: device.entity_id,
            state: device.state,
            friendly_name: device.attributes?.friendly_name || device.entity_id,
            domain: device.entity_id.split('.')[0],
            device_class: device.attributes?.device_class,
            last_changed: device.last_changed,
            last_updated: device.last_updated,
            area: area ? {
              area_id: area.area_id,
              name: area.name,
              floor_id: area.floor_id,
              icon: area.icon,
            } : null,
          };

          if (area && devicesByArea[area.area_id] !== undefined) {
            // Add all devices (no per-area limit by default - limit applies to total)
            devicesByArea[area.area_id].push(deviceInfo);
            
            // Update stats
            areaStats[area.area_id].total_devices++;
            areaStats[area.area_id].domains.add(deviceInfo.domain);
            areaStats[area.area_id].states.add(deviceInfo.state);
          } else if (!area) {
            devicesWithoutArea.push(deviceInfo);
          }
        });

        // Convert sets to arrays for JSON serialization
        Object.values(areaStats).forEach((stats: any) => {
          stats.domains = Array.from(stats.domains);
          stats.states = Array.from(stats.states);
        });

        // Sort devices within each area
        const sortField = params.sort_by || 'area';
        Object.values(devicesByArea).forEach((devices: any[]) => {
          devices.sort((a, b) => {
            switch (sortField) {
              case 'name':
                return a.friendly_name.localeCompare(b.friendly_name);
              case 'domain':
                return a.domain.localeCompare(b.domain);
              case 'state':
                return a.state.localeCompare(b.state);
              case 'last_changed':
                return new Date(b.last_changed).getTime() - new Date(a.last_changed).getTime();
              default:
                return a.friendly_name.localeCompare(b.friendly_name);
            }
          });
        });

        // Organize results based on grouping preference
        let organizedResults: any;
        let allDevices = Object.values(devicesByArea).flat().concat(devicesWithoutArea);
        
        // Apply global limit
        const limit = params.limit || 10000;
        const totalBeforeLimit = allDevices.length;
        allDevices = allDevices.slice(0, limit);
        
        switch (params.group_by) {
          case 'domain':
            const byDomain: Record<string, any[]> = {};
            allDevices.forEach(device => {
              if (!byDomain[device.domain]) byDomain[device.domain] = [];
              byDomain[device.domain].push(device);
            });
            organizedResults = { devices_by_domain: byDomain };
            break;
            
          case 'floor':
            const byFloor: Record<string, any[]> = {};
            allDevices.forEach(device => {
              const floorId = device.area?.floor_id || 'no_floor';
              if (!byFloor[floorId]) byFloor[floorId] = [];
              byFloor[floorId].push(device);
            });
            organizedResults = { devices_by_floor: byFloor };
            break;
            
          case 'none':
            organizedResults = { devices: allDevices };
            break;
            
          default: // 'area'
            organizedResults = { 
              devices_by_area: devicesByArea,
              devices_without_area: devicesWithoutArea.length > 0 ? devicesWithoutArea : undefined
            };
        }

        return {
          success: true,
          total_areas_searched: targetAreas.length,
          total_devices_found: allDevices.length,
          total_available: totalBeforeLimit,
          truncated: totalBeforeLimit > allDevices.length,
          ...organizedResults,
          area_statistics: params.include_area_summary ? areaStats : undefined,
          filters_applied: {
            areas: params.areas,
            query: params.query,
            domains: params.domains,
            states: params.states,
            device_classes: params.device_classes,
            include_unavailable: params.include_unavailable ?? false,
            group_by: params.group_by || 'area',
            sort_by: params.sort_by || 'area',
            limit: limit,
          },
          search_method: 'comprehensive_area_websocket',
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  registerTool(searchDevicesByAreaTool);

  // Add comprehensive label management tools
  const getAvailableLabelsTool = {
    name: 'get_available_labels',
    description: 'Get all available labels in Home Assistant with their properties and usage statistics',
    parameters: z.object({
      include_usage_stats: z.boolean().default(true).optional()
        .describe('Include statistics about how many devices/entities use each label'),
      sort_by: z.enum(['name', 'usage', 'created', 'color']).default('name').optional()
        .describe('Sort labels by name, usage count, creation date, or color'),
      filter_by_color: z.string().optional()
        .describe('Filter labels by color (e.g., "accent", "primary", "red")'),
    }),
    execute: async (params: {
      include_usage_stats?: boolean;
      sort_by?: 'name' | 'usage' | 'created' | 'color';
      filter_by_color?: string;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        // Get labels and registries for usage stats
        const labelsPromise = wsClient.callWS({ type: 'config/label_registry/list' });
        let entitiesPromise, devicesPromise;
        
        if (params.include_usage_stats !== false) {
          entitiesPromise = wsClient.callWS({ type: 'config/entity_registry/list' });
          devicesPromise = wsClient.callWS({ type: 'config/device_registry/list' });
        }

        const [labels, entities, devices] = await Promise.all([
          labelsPromise,
          entitiesPromise || Promise.resolve([]),
          devicesPromise || Promise.resolve([])
        ]);

        if (!Array.isArray(labels)) {
          throw new Error('Invalid response from label registry');
        }

        let processedLabels = labels.map((label: any) => ({
          label_id: label.label_id,
          name: label.name,
          description: label.description,
          color: label.color,
          icon: label.icon,
          created_at: label.created_at,
          modified_at: label.modified_at,
          entity_count: 0,
          device_count: 0,
          total_usage: 0,
        }));

        // Filter by color if specified
        if (params.filter_by_color) {
          processedLabels = processedLabels.filter((label: any) => 
            label.color === params.filter_by_color
          );
        }

        // Calculate usage statistics if requested
        if (params.include_usage_stats !== false && Array.isArray(entities) && Array.isArray(devices)) {
          const labelUsage: Record<string, { entities: number; devices: number }> = {};
          
          // Count entity usage
          entities.forEach((entity: any) => {
            if (entity.labels && Array.isArray(entity.labels)) {
              entity.labels.forEach((labelId: string) => {
                if (!labelUsage[labelId]) labelUsage[labelId] = { entities: 0, devices: 0 };
                labelUsage[labelId].entities++;
              });
            }
          });

          // Count device usage
          devices.forEach((device: any) => {
            if (device.labels && Array.isArray(device.labels)) {
              device.labels.forEach((labelId: string) => {
                if (!labelUsage[labelId]) labelUsage[labelId] = { entities: 0, devices: 0 };
                labelUsage[labelId].devices++;
              });
            }
          });

          // Update processed labels with usage stats
          processedLabels = processedLabels.map((label: any) => {
            const usage = labelUsage[label.label_id] || { entities: 0, devices: 0 };
            return {
              ...label,
              entity_count: usage.entities,
              device_count: usage.devices,
              total_usage: usage.entities + usage.devices,
            };
          });
        }

        // Sort labels
        const sortBy = params.sort_by || 'name';
        processedLabels.sort((a: any, b: any) => {
          switch (sortBy) {
            case 'usage':
              return b.total_usage - a.total_usage;
            case 'created':
              return b.created_at - a.created_at;
            case 'color':
              return (a.color || '').localeCompare(b.color || '');
            default: // 'name'
              return a.name.localeCompare(b.name);
          }
        });

        // Calculate summary statistics
        const totalLabels = processedLabels.length;
        const labelsWithUsage = processedLabels.filter((label: any) => label.total_usage > 0).length;
        const colorDistribution: Record<string, number> = {};
        
        processedLabels.forEach((label: any) => {
          const color = label.color || 'no_color';
          colorDistribution[color] = (colorDistribution[color] || 0) + 1;
        });

        return {
          success: true,
          total_labels: totalLabels,
          labels_in_use: labelsWithUsage,
          labels_unused: totalLabels - labelsWithUsage,
          labels: processedLabels,
          color_distribution: colorDistribution,
          filters_applied: {
            sort_by: sortBy,
            filter_by_color: params.filter_by_color,
            include_usage_stats: params.include_usage_stats ?? true,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  };
  registerTool(getAvailableLabelsTool);

  const getDeviceLabelsTool = {
    name: 'get_device_labels',
    description: 'Get labels assigned to specific devices or entities, with detailed label information',
    parameters: z.object({
      entity_ids: z.array(z.string()).optional()
        .describe('Array of entity IDs to get labels for'),
      device_ids: z.array(z.string()).optional()
        .describe('Array of device IDs to get labels for'),
      device_names: z.array(z.string()).optional()
        .describe('Array of device names to search for and get labels'),
      include_label_details: z.boolean().default(true).optional()
        .describe('Include full label information (name, color, icon, etc.)'),
      show_unlabeled: z.boolean().default(false).optional()
        .describe('Include devices/entities without any labels'),
    }),
    execute: async (params: {
      entity_ids?: string[];
      device_ids?: string[];
      device_names?: string[];
      include_label_details?: boolean;
      show_unlabeled?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        if (!params.entity_ids && !params.device_ids && !params.device_names) {
          throw new Error('Must provide at least one of: entity_ids, device_ids, or device_names');
        }

        // Get all necessary data
        const [entities, devices, labels] = await Promise.all([
          wsClient.callWS({ type: 'config/entity_registry/list' }),
          wsClient.callWS({ type: 'config/device_registry/list' }),
          params.include_label_details !== false 
            ? wsClient.callWS({ type: 'config/label_registry/list' })
            : Promise.resolve([])
        ]);

        if (!Array.isArray(entities) || !Array.isArray(devices)) {
          throw new Error('Invalid response from Home Assistant registries');
        }

        // Create label lookup map
        const labelMap = new Map(labels.map((label: any) => [label.label_id, label]));

        const results: any = {
          entities: [],
          devices: [],
        };

        // Process entity IDs
        if (params.entity_ids && params.entity_ids.length > 0) {
          params.entity_ids.forEach(entityId => {
            const entity = entities.find((e: any) => e.entity_id === entityId);
            if (entity) {
              const entityLabels = entity.labels || [];
              
              if (entityLabels.length > 0 || params.show_unlabeled) {
                const labelDetails = params.include_label_details !== false
                  ? entityLabels.map((labelId: string) => labelMap.get(labelId)).filter(Boolean)
                  : entityLabels;

                results.entities.push({
                  entity_id: entity.entity_id,
                  name: entity.name,
                  area_id: entity.area_id,
                  device_id: entity.device_id,
                  labels: entityLabels,
                  label_details: params.include_label_details !== false ? labelDetails : undefined,
                });
              }
            }
          });
        }

        // Process device IDs  
        if (params.device_ids && params.device_ids.length > 0) {
          params.device_ids.forEach(deviceId => {
            const device = devices.find((d: any) => d.id === deviceId);
            if (device) {
              const deviceLabels = device.labels || [];
              
              if (deviceLabels.length > 0 || params.show_unlabeled) {
                const labelDetails = params.include_label_details !== false
                  ? deviceLabels.map((labelId: string) => labelMap.get(labelId)).filter(Boolean)
                  : deviceLabels;

                results.devices.push({
                  device_id: device.id,
                  name: device.name,
                  name_by_user: device.name_by_user,
                  manufacturer: device.manufacturer,
                  model: device.model,
                  area_id: device.area_id,
                  labels: deviceLabels,
                  label_details: params.include_label_details !== false ? labelDetails : undefined,
                });
              }
            }
          });
        }

        // Process device names
        if (params.device_names && params.device_names.length > 0) {
          params.device_names.forEach(deviceName => {
            const device = devices.find((d: any) => 
              d.name?.toLowerCase().includes(deviceName.toLowerCase()) ||
              d.name_by_user?.toLowerCase().includes(deviceName.toLowerCase())
            );
            
            if (device) {
              const deviceLabels = device.labels || [];
              
              if (deviceLabels.length > 0 || params.show_unlabeled) {
                const labelDetails = params.include_label_details !== false
                  ? deviceLabels.map((labelId: string) => labelMap.get(labelId)).filter(Boolean)
                  : deviceLabels;

                results.devices.push({
                  device_id: device.id,
                  name: device.name,
                  name_by_user: device.name_by_user,
                  manufacturer: device.manufacturer,
                  model: device.model,
                  area_id: device.area_id,
                  labels: deviceLabels,
                  label_details: params.include_label_details !== false ? labelDetails : undefined,
                  matched_name: deviceName,
                });
              }
            }
          });
        }

        // Remove duplicates from devices array
        const uniqueDevices: any[] = [];
        const seenDeviceIds = new Set();
        results.devices.forEach((device: any) => {
          if (!seenDeviceIds.has(device.device_id)) {
            uniqueDevices.push(device);
            seenDeviceIds.add(device.device_id);
          }
        });
        results.devices = uniqueDevices;

        return {
          success: true,
          total_entities: results.entities.length,
          total_devices: results.devices.length,
          ...results,
          search_criteria: {
            entity_ids: params.entity_ids,
            device_ids: params.device_ids,
            device_names: params.device_names,
            include_label_details: params.include_label_details ?? true,
            show_unlabeled: params.show_unlabeled ?? false,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  };
  registerTool(getDeviceLabelsTool);

  const setDeviceLabelsTool = {
    name: 'set_device_labels',
    description: 'Add or set labels for devices and entities. Can create new labels automatically.',
    parameters: z.object({
      entity_ids: z.array(z.string()).optional()
        .describe('Array of entity IDs to set labels for'),
      device_ids: z.array(z.string()).optional()
        .describe('Array of device IDs to set labels for'),
      device_names: z.array(z.string()).optional()
        .describe('Array of device names to search for and set labels'),
      labels: z.array(z.string())
        .describe('Array of label names to assign'),
      label_color: z.string().optional()
        .describe('Color for new labels (e.g., "accent", "primary", "red"). Only used when creating new labels.'),
      replace_existing: z.boolean().default(false).optional()
        .describe('If true, replace all existing labels. If false, add to existing labels.'),
      create_missing_labels: z.boolean().default(true).optional()
        .describe('Automatically create labels that don\'t exist'),
    }),
    execute: async (params: {
      entity_ids?: string[];
      device_ids?: string[];
      device_names?: string[];
      labels: string[];
      label_color?: string;
      replace_existing?: boolean;
      create_missing_labels?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        if (!params.entity_ids && !params.device_ids && !params.device_names) {
          throw new Error('Must provide at least one of: entity_ids, device_ids, or device_names');
        }

        if (!params.labels || params.labels.length === 0) {
          throw new Error('Must provide at least one label to set');
        }

        // Get current registries
        const [entities, devices, existingLabels] = await Promise.all([
          wsClient.callWS({ type: 'config/entity_registry/list' }),
          wsClient.callWS({ type: 'config/device_registry/list' }),
          wsClient.callWS({ type: 'config/label_registry/list' })
        ]);

        if (!Array.isArray(entities) || !Array.isArray(devices) || !Array.isArray(existingLabels)) {
          throw new Error('Invalid response from Home Assistant registries');
        }

        // Create label name to ID mapping
        const labelNameToId = new Map(existingLabels.map((label: any) => [label.name.toLowerCase(), label.label_id]));
        
        // Determine which labels need to be created
        const labelsToCreate: string[] = [];
        const finalLabelIds: string[] = [];

        for (const labelName of params.labels) {
          const existingLabelId = labelNameToId.get(labelName.toLowerCase());
          if (existingLabelId) {
            finalLabelIds.push(existingLabelId);
          } else {
            if (params.create_missing_labels !== false) {
              labelsToCreate.push(labelName);
            } else {
              throw new Error(`Label "${labelName}" does not exist and create_missing_labels is false`);
            }
          }
        }

        // Create missing labels
        for (const labelName of labelsToCreate) {
          try {
            const createResult = await wsClient.callWS({
              type: 'config/label_registry/create',
              name: labelName,
              color: params.label_color || null,
              icon: null,
              description: null,
            });
            
            if (createResult && createResult.label_id) {
              finalLabelIds.push(createResult.label_id);
            }
          } catch (error) {
            console.warn(`Failed to create label "${labelName}":`, error);
          }
        }

        const results: any = {
          entities_updated: [],
          devices_updated: [],
          labels_created: labelsToCreate,
          errors: [],
        };

        // Helper function to update labels
        const updateLabels = (current: string[], new_labels: string[], replace: boolean) => {
          if (replace) {
            return new_labels;
          } else {
            const combined = [...(current || []), ...new_labels];
            return [...new Set(combined)]; // Remove duplicates
          }
        };

        // Process entities
        if (params.entity_ids && params.entity_ids.length > 0) {
          for (const entityId of params.entity_ids) {
            const entity = entities.find((e: any) => e.entity_id === entityId);
            if (entity) {
              try {
                const updatedLabels = updateLabels(entity.labels || [], finalLabelIds, params.replace_existing || false);
                
                await wsClient.callWS({
                  type: 'config/entity_registry/update',
                  entity_id: entityId,
                  labels: updatedLabels,
                });

                results.entities_updated.push({
                  entity_id: entityId,
                  name: entity.name,
                  previous_labels: entity.labels || [],
                  new_labels: updatedLabels,
                });
              } catch (error) {
                results.errors.push({
                  type: 'entity',
                  id: entityId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            } else {
              results.errors.push({
                type: 'entity',
                id: entityId,
                error: 'Entity not found',
              });
            }
          }
        }

        // Process devices
        if (params.device_ids && params.device_ids.length > 0) {
          for (const deviceId of params.device_ids) {
            const device = devices.find((d: any) => d.id === deviceId);
            if (device) {
              try {
                const updatedLabels = updateLabels(device.labels || [], finalLabelIds, params.replace_existing || false);
                
                await wsClient.callWS({
                  type: 'config/device_registry/update',
                  device_id: deviceId,
                  labels: updatedLabels,
                });

                results.devices_updated.push({
                  device_id: deviceId,
                  name: device.name,
                  previous_labels: device.labels || [],
                  new_labels: updatedLabels,
                });
              } catch (error) {
                results.errors.push({
                  type: 'device',
                  id: deviceId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            } else {
              results.errors.push({
                type: 'device',
                id: deviceId,
                error: 'Device not found',
              });
            }
          }
        }

        // Process device names
        if (params.device_names && params.device_names.length > 0) {
          for (const deviceName of params.device_names) {
            const device = devices.find((d: any) => 
              d.name?.toLowerCase().includes(deviceName.toLowerCase()) ||
              d.name_by_user?.toLowerCase().includes(deviceName.toLowerCase())
            );
            
            if (device) {
              try {
                const updatedLabels = updateLabels(device.labels || [], finalLabelIds, params.replace_existing || false);
                
                await wsClient.callWS({
                  type: 'config/device_registry/update',
                  device_id: device.id,
                  labels: updatedLabels,
                });

                results.devices_updated.push({
                  device_id: device.id,
                  name: device.name,
                  matched_name: deviceName,
                  previous_labels: device.labels || [],
                  new_labels: updatedLabels,
                });
              } catch (error) {
                results.errors.push({
                  type: 'device',
                  name: deviceName,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            } else {
              results.errors.push({
                type: 'device',
                name: deviceName,
                error: 'Device not found',
              });
            }
          }
        }

        return {
          success: results.errors.length === 0 || (results.entities_updated.length > 0 || results.devices_updated.length > 0),
          total_entities_updated: results.entities_updated.length,
          total_devices_updated: results.devices_updated.length,
          total_labels_created: results.labels_created.length,
          total_errors: results.errors.length,
          ...results,
          operation_details: {
            labels_requested: params.labels,
            final_label_ids: finalLabelIds,
            replace_existing: params.replace_existing || false,
            create_missing_labels: params.create_missing_labels ?? true,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  };
  registerTool(setDeviceLabelsTool);

  const removeDeviceLabelsTool = {
    name: 'remove_device_labels', 
    description: 'Remove specific labels from devices and entities, or remove all labels',
    parameters: z.object({
      entity_ids: z.array(z.string()).optional()
        .describe('Array of entity IDs to remove labels from'),
      device_ids: z.array(z.string()).optional()
        .describe('Array of device IDs to remove labels from'),
      device_names: z.array(z.string()).optional()
        .describe('Array of device names to search for and remove labels from'),
      labels: z.array(z.string()).optional()
        .describe('Array of label names to remove. If not provided, removes all labels.'),
      remove_all_labels: z.boolean().default(false).optional()
        .describe('If true, remove all labels regardless of the labels parameter'),
    }),
    execute: async (params: {
      entity_ids?: string[];
      device_ids?: string[];
      device_names?: string[];
      labels?: string[];
      remove_all_labels?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        if (!params.entity_ids && !params.device_ids && !params.device_names) {
          throw new Error('Must provide at least one of: entity_ids, device_ids, or device_names');
        }

        if (!params.remove_all_labels && (!params.labels || params.labels.length === 0)) {
          throw new Error('Must provide labels to remove or set remove_all_labels to true');
        }

        // Get current registries
        const [entities, devices, existingLabels] = await Promise.all([
          wsClient.callWS({ type: 'config/entity_registry/list' }),
          wsClient.callWS({ type: 'config/device_registry/list' }),
          wsClient.callWS({ type: 'config/label_registry/list' })
        ]);

        if (!Array.isArray(entities) || !Array.isArray(devices) || !Array.isArray(existingLabels)) {
          throw new Error('Invalid response from Home Assistant registries');
        }

        // Create label name to ID mapping for specific label removal
        let labelIdsToRemove: string[] = [];
        if (!params.remove_all_labels && params.labels) {
          const labelNameToId = new Map(existingLabels.map((label: any) => [label.name.toLowerCase(), label.label_id]));
          
          for (const labelName of params.labels) {
            const labelId = labelNameToId.get(labelName.toLowerCase());
            if (labelId) {
              labelIdsToRemove.push(labelId);
            }
          }
        }

        const results: any = {
          entities_updated: [],
          devices_updated: [],
          errors: [],
        };

        // Helper function to remove labels
        const removeLabels = (current: string[], labelsToRemove: string[], removeAll: boolean) => {
          if (removeAll) {
            return [];
          } else {
            return (current || []).filter(labelId => !labelsToRemove.includes(labelId));
          }
        };

        // Process entities
        if (params.entity_ids && params.entity_ids.length > 0) {
          for (const entityId of params.entity_ids) {
            const entity = entities.find((e: any) => e.entity_id === entityId);
            if (entity) {
              try {
                const currentLabels = entity.labels || [];
                const updatedLabels = removeLabels(currentLabels, labelIdsToRemove, params.remove_all_labels || false);
                
                // Only update if there's a change
                if (JSON.stringify(currentLabels) !== JSON.stringify(updatedLabels)) {
                  await wsClient.callWS({
                    type: 'config/entity_registry/update',
                    entity_id: entityId,
                    labels: updatedLabels,
                  });

                  results.entities_updated.push({
                    entity_id: entityId,
                    name: entity.name,
                    previous_labels: currentLabels,
                    new_labels: updatedLabels,
                    labels_removed: currentLabels.filter((id: string) => !updatedLabels.includes(id)),
                  });
                }
              } catch (error) {
                results.errors.push({
                  type: 'entity',
                  id: entityId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            } else {
              results.errors.push({
                type: 'entity',
                id: entityId,
                error: 'Entity not found',
              });
            }
          }
        }

        // Process devices
        if (params.device_ids && params.device_ids.length > 0) {
          for (const deviceId of params.device_ids) {
            const device = devices.find((d: any) => d.id === deviceId);
            if (device) {
              try {
                const currentLabels = device.labels || [];
                const updatedLabels = removeLabels(currentLabels, labelIdsToRemove, params.remove_all_labels || false);
                
                // Only update if there's a change
                if (JSON.stringify(currentLabels) !== JSON.stringify(updatedLabels)) {
                  await wsClient.callWS({
                    type: 'config/device_registry/update',
                    device_id: deviceId,
                    labels: updatedLabels,
                  });

                  results.devices_updated.push({
                    device_id: deviceId,
                    name: device.name,
                    previous_labels: currentLabels,
                    new_labels: updatedLabels,
                    labels_removed: currentLabels.filter((id: string) => !updatedLabels.includes(id)),
                  });
                }
              } catch (error) {
                results.errors.push({
                  type: 'device',
                  id: deviceId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            } else {
              results.errors.push({
                type: 'device',
                id: deviceId,
                error: 'Device not found',
              });
            }
          }
        }

        // Process device names
        if (params.device_names && params.device_names.length > 0) {
          for (const deviceName of params.device_names) {
            const device = devices.find((d: any) => 
              d.name?.toLowerCase().includes(deviceName.toLowerCase()) ||
              d.name_by_user?.toLowerCase().includes(deviceName.toLowerCase())
            );
            
            if (device) {
              try {
                const currentLabels = device.labels || [];
                const updatedLabels = removeLabels(currentLabels, labelIdsToRemove, params.remove_all_labels || false);
                
                // Only update if there's a change
                if (JSON.stringify(currentLabels) !== JSON.stringify(updatedLabels)) {
                  await wsClient.callWS({
                    type: 'config/device_registry/update',
                    device_id: device.id,
                    labels: updatedLabels,
                  });

                  results.devices_updated.push({
                    device_id: device.id,
                    name: device.name,
                    matched_name: deviceName,
                    previous_labels: currentLabels,
                    new_labels: updatedLabels,
                    labels_removed: currentLabels.filter((id: string) => !updatedLabels.includes(id)),
                  });
                }
              } catch (error) {
                results.errors.push({
                  type: 'device',
                  name: deviceName,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            } else {
              results.errors.push({
                type: 'device',
                name: deviceName,
                error: 'Device not found',
              });
            }
          }
        }

        return {
          success: results.errors.length === 0 || (results.entities_updated.length > 0 || results.devices_updated.length > 0),
          total_entities_updated: results.entities_updated.length,
          total_devices_updated: results.devices_updated.length,
          total_errors: results.errors.length,
          ...results,
          operation_details: {
            labels_to_remove: params.labels,
            label_ids_to_remove: labelIdsToRemove,
            remove_all_labels: params.remove_all_labels || false,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  };
  registerTool(removeDeviceLabelsTool);

  // CRITICAL ISSUE #1 FIX: Search devices by label functionality
  const searchDevicesByLabelTool = {
    name: 'search_devices_by_label',
    description: 'Search and filter devices by labels (organizational tags). Replicates the Home Assistant UI label filter functionality.',
    parameters: z.object({
      labels: z.array(z.string()).describe('Array of label names or IDs to filter by (AND/OR logic controlled by match_all parameter)'),
      match_all: z.boolean().default(false).optional()
        .describe('If true, device must have ALL labels (AND logic). If false, device can have ANY label (OR logic)'),
      include_unlabeled: z.boolean().default(false).optional()
        .describe('Include devices without any labels'),
      domain: z.string().optional()
        .describe('Filter by domain (e.g., "light", "sensor", "switch")'),
      device_class: z.string().optional()
        .describe('Filter by device class (e.g., "temperature", "motion", "humidity")'),
      area: z.string().optional()
        .describe('Filter by area name or area_id (combines label and area filtering)'),
      state: z.string().optional()
        .describe('Filter by current state (e.g., "on", "off", "unavailable")'),
      include_area_info: z.boolean().default(true).optional()
        .describe('Include area information for each device'),
      include_attributes: z.boolean().default(false).optional()
        .describe('Include full attributes in response'),
      limit: z.number().min(1).max(500).default(100).optional()
        .describe('Maximum number of results to return'),
      offset: z.number().min(0).default(0).optional()
        .describe('Number of results to skip (for pagination)'),
    }),
    execute: async (params: {
      labels: string[];
      match_all?: boolean;
      include_unlabeled?: boolean;
      domain?: string;
      device_class?: string;
      area?: string;
      state?: string;
      include_area_info?: boolean;
      include_attributes?: boolean;
      limit?: number;
      offset?: number;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        if (!params.labels || params.labels.length === 0) {
          throw new Error('At least one label must be provided');
        }

        // Get all necessary data via WebSocket
        const [states, entities, devices, areas, allLabels] = await Promise.all([
          wsClient.callWS({ type: 'get_states' }),
          wsClient.callWS({ type: 'config/entity_registry/list' }),
          wsClient.callWS({ type: 'config/device_registry/list' }),
          wsClient.callWS({ type: 'config/area_registry/list' }),
          wsClient.callWS({ type: 'config/label_registry/list' })
        ]);

        if (!Array.isArray(states) || !Array.isArray(entities) || 
            !Array.isArray(devices) || !Array.isArray(areas) || !Array.isArray(allLabels)) {
          throw new Error('Invalid response from Home Assistant WebSocket API');
        }

        // Create lookup maps
        const areaMap = new Map(areas.map((area: any) => [area.area_id, area]));
        const labelMap = new Map(allLabels.map((label: any) => [label.label_id, label]));
        const labelNameToIdMap = new Map(allLabels.map((label: any) => [label.name.toLowerCase(), label.label_id]));
        const entityAreaMap = new Map();
        const entityLabelsMap = new Map();
        const deviceMap = new Map(devices.map((device: any) => [device.id, device]));

        // Resolve label names to IDs
        const targetLabelIds = params.labels.map(label => {
          const labelLower = label.toLowerCase();
          // Check if it's already a label_id
          if (labelMap.has(label)) return label;
          // Try to match by name
          if (labelNameToIdMap.has(labelLower)) return labelNameToIdMap.get(labelLower);
          // Try partial match
          for (const [name, id] of labelNameToIdMap.entries()) {
            if (name.includes(labelLower) || labelLower.includes(name)) {
              return id;
            }
          }
          return label; // Return as-is if not found (will filter out later)
        }).filter(id => labelMap.has(id!));

        if (targetLabelIds.length === 0) {
          return {
            success: false,
            message: `No matching labels found for: ${params.labels.join(', ')}. Available labels: ${Array.from(labelMap.values()).map((l: any) => l.name).join(', ')}`,
          };
        }

        // Get label info for response
        const labelInfo = targetLabelIds.map(id => {
          const label = labelMap.get(id);
          return {
            label_id: id,
            name: label?.name,
            color: label?.color,
            icon: label?.icon,
          };
        });

        // Map entities to their areas and labels
        entities.forEach((entity: any) => {
          // Map area
          if (entity.area_id) {
            entityAreaMap.set(entity.entity_id, entity.area_id);
          } else if (entity.device_id) {
            const device = deviceMap.get(entity.device_id);
            if (device?.area_id) {
              entityAreaMap.set(entity.entity_id, device.area_id);
            }
          }

          // Map labels (from entity or device)
          const entityLabelSet = new Set<string>();
          if (entity.labels && Array.isArray(entity.labels)) {
            entity.labels.forEach((lbl: string) => entityLabelSet.add(lbl));
          }
          if (entity.device_id) {
            const device = deviceMap.get(entity.device_id);
            if (device?.labels && Array.isArray(device.labels)) {
              device.labels.forEach((lbl: string) => entityLabelSet.add(lbl));
            }
          }
          entityLabelsMap.set(entity.entity_id, Array.from(entityLabelSet));
        });

        // Filter devices by labels
        let filteredDevices = states.filter((device: any) => {
          const deviceLabels = entityLabelsMap.get(device.entity_id) || [];
          
          if (params.include_unlabeled && deviceLabels.length === 0) {
            return true;
          }

          if (params.match_all) {
            // AND logic: device must have ALL target labels
            return targetLabelIds.every(labelId => deviceLabels.includes(labelId));
          } else {
            // OR logic: device must have ANY target label
            return targetLabelIds.some(labelId => deviceLabels.includes(labelId));
          }
        });

        // Apply additional filters
        if (params.domain) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.entity_id.startsWith(`${params.domain}.`)
          );
        }

        if (params.device_class) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.attributes?.device_class === params.device_class
          );
        }

        if (params.state) {
          filteredDevices = filteredDevices.filter((device: any) => 
            device.state.toLowerCase() === params.state!.toLowerCase()
          );
        }

        if (params.area) {
          const areaQuery = params.area.toLowerCase();
          filteredDevices = filteredDevices.filter((device: any) => {
            const entityAreaId = entityAreaMap.get(device.entity_id);
            if (!entityAreaId) return false;
            
            const area = areaMap.get(entityAreaId);
            if (!area) return false;
            
            return area.area_id.toLowerCase().includes(areaQuery) ||
                   area.name.toLowerCase().includes(areaQuery) ||
                   (area.aliases && area.aliases.some((alias: string) => 
                     alias.toLowerCase().includes(areaQuery)
                   ));
          });
        }

        // Calculate total before pagination
        const totalFound = filteredDevices.length;
        
        // Apply pagination
        const offset = params.offset || 0;
        const limit = params.limit || 100;
        const paginatedDevices = filteredDevices.slice(offset, offset + limit);

        // Format response
        const results = paginatedDevices.map((device: any) => {
          const entityAreaId = entityAreaMap.get(device.entity_id);
          const area = entityAreaId ? areaMap.get(entityAreaId) : null;
          const deviceLabels = entityLabelsMap.get(device.entity_id) || [];
          
          const baseInfo: any = {
            entity_id: device.entity_id,
            state: device.state,
            friendly_name: device.attributes?.friendly_name || device.entity_id,
            domain: device.entity_id.split('.')[0],
            device_class: device.attributes?.device_class,
            last_changed: device.last_changed,
            last_updated: device.last_updated,
            labels: deviceLabels,
            label_names: deviceLabels.map((lbl: string) => labelMap.get(lbl)?.name).filter(Boolean),
          };

          if (params.include_area_info !== false && area) {
            baseInfo.area = {
              area_id: area.area_id,
              name: area.name,
              floor_id: area.floor_id,
              icon: area.icon,
            };
          }

          if (params.include_attributes) {
            baseInfo.attributes = device.attributes;
          }

          return baseInfo;
        });

        return {
          success: true,
          total_found: totalFound,
          returned: results.length,
          offset: offset,
          limit: limit,
          has_more: totalFound > (offset + limit),
          label_info: labelInfo,
          devices: results,
          filters_applied: {
            labels: params.labels,
            match_all: params.match_all ?? false,
            include_unlabeled: params.include_unlabeled ?? false,
            domain: params.domain,
            device_class: params.device_class,
            area: params.area,
            state: params.state,
            include_area_info: params.include_area_info ?? true,
          },
          metadata: {
            resolved_label_ids: targetLabelIds,
            total_labels_searched: targetLabelIds.length,
          },
          search_method: 'websocket_label_filter',
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  registerTool(searchDevicesByLabelTool);

  // Add comprehensive template sensor management tool
  const templateSensorTool = {
    name: 'template_sensor',
    description: 'Create, manage, and validate template sensors in Home Assistant',
    parameters: z.object({
      action: z.enum(['create', 'list', 'update', 'delete', 'validate_template'])
        .describe('Action to perform with template sensors'),
      
      // Template sensor identification
      sensor_name: z.string().optional()
        .describe('Sensor name/ID (required for update, delete)'),
      entity_id: z.string().optional()
        .describe('Full entity ID (e.g., sensor.my_template_sensor)'),
      
      // Template sensor configuration
      friendly_name: z.string().optional()
        .describe('Human-readable name for the sensor'),
      value_template: z.string().optional()
        .describe('Jinja2 template for sensor value (required for create)'),
      unit_of_measurement: z.string().optional()
        .describe('Unit of measurement (e.g., °C, %, W, kWh)'),
      device_class: z.string().optional()
        .describe('Device class (e.g., temperature, humidity, power, energy)'),
      state_class: z.string().optional()
        .describe('State class (measurement, total, total_increasing)'),
      icon: z.string().optional()
        .describe('MDI icon (e.g., mdi:thermometer, mdi:lightbulb)'),
      
      // Advanced template configuration
      attributes: z.record(z.string()).optional()
        .describe('Additional attributes with template values'),
      availability_template: z.string().optional()
        .describe('Template to determine if sensor is available'),
      unique_id: z.string().optional()
        .describe('Unique identifier for the sensor'),
      
      // Validation and testing
      test_template: z.string().optional()
        .describe('Template to validate (for validate_template action)'),
      
      // Configuration management
      config_source: z.enum(['configuration.yaml', 'ui', 'packages']).optional()
        .describe('Where to store the template sensor configuration'),
    }),
    execute: async (params: {
      action: 'create' | 'list' | 'update' | 'delete' | 'validate_template';
      sensor_name?: string;
      entity_id?: string;
      friendly_name?: string;
      value_template?: string;
      unit_of_measurement?: string;
      device_class?: string;
      state_class?: string;
      icon?: string;
      attributes?: Record<string, string>;
      availability_template?: string;
      unique_id?: string;
      test_template?: string;
      config_source?: 'configuration.yaml' | 'ui' | 'packages';
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        switch (params.action) {
          case 'list': {
            // Get all template sensors
            const [entities, templateConfig] = await Promise.all([
              wsClient.callWS({ type: 'config/entity_registry/list' }),
              wsClient.callWS({ type: 'config/template/list' }).catch(() => [])
            ]);

            if (!Array.isArray(entities)) {
              throw new Error('Invalid response from entity registry');
            }

            // Filter for template sensors
            const templateSensors = entities.filter((entity: any) => 
              entity.platform === 'template' && entity.entity_id.startsWith('sensor.')
            );

            // Get current states for template sensors
            const sensorStates = await Promise.all(
              templateSensors.map(async (sensor: any) => {
                try {
                  const response = await fetch(`${HASS_HOST}/api/states/${sensor.entity_id}`, {
                    headers: {
                      Authorization: `Bearer ${HASS_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (response.ok) {
                    const state = await response.json() as any;
                    return {
                      entity_id: sensor.entity_id,
                      name: sensor.name || sensor.original_name,
                      unique_id: sensor.unique_id,
                      platform: sensor.platform,
                      device_id: sensor.device_id,
                      area_id: sensor.area_id,
                      current_state: state.state,
                      attributes: state.attributes,
                      last_changed: state.last_changed,
                      last_updated: state.last_updated,
                    };
                  }
                  return null;
                } catch (error) {
                  return null;
                }
              })
            );

            const validSensorStates = sensorStates.filter(Boolean);

            return {
              success: true,
              total_template_sensors: validSensorStates.length,
              template_sensors: validSensorStates,
              template_config_available: Array.isArray(templateConfig),
            };
          }

          case 'validate_template': {
            if (!params.test_template) {
              throw new Error('test_template parameter is required for validation');
            }

            try {
              // Use Home Assistant's template renderer to validate
              const response = await fetch(`${HASS_HOST}/api/template`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${HASS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  template: params.test_template
                }),
              });

              if (response.ok) {
                const result = await response.text();
                return {
                  success: true,
                  template_valid: true,
                  rendered_value: result,
                  template: params.test_template,
                };
              } else {
                const error = await response.text();
                return {
                  success: false,
                  template_valid: false,
                  error_message: error,
                  template: params.test_template,
                };
              }
            } catch (error) {
              return {
                success: false,
                template_valid: false,
                error_message: error instanceof Error ? error.message : 'Template validation failed',
                template: params.test_template,
              };
            }
          }

          case 'create': {
            if (!params.sensor_name) {
              throw new Error('sensor_name is required for creating template sensor');
            }
            if (!params.value_template) {
              throw new Error('value_template is required for creating template sensor');
            }

            // First validate the template
            try {
              const templateResponse = await fetch(`${HASS_HOST}/api/template`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${HASS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  template: params.value_template
                }),
              });

              if (!templateResponse.ok) {
                const error = await templateResponse.text();
                throw new Error(`Invalid template: ${error}`);
              }
              
              const result = await templateResponse.text();
              console.log(`Template validation successful. Rendered value: ${result}`);
            } catch (error) {
              throw new Error(`Template validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Build template sensor configuration
            const sensorConfig: any = {
              name: params.friendly_name || params.sensor_name,
              state: params.value_template,
            };

            if (params.unit_of_measurement) {
              sensorConfig.unit_of_measurement = params.unit_of_measurement;
            }
            if (params.device_class) {
              sensorConfig.device_class = params.device_class;
            }
            if (params.state_class) {
              sensorConfig.state_class = params.state_class;
            }
            if (params.icon) {
              sensorConfig.icon = params.icon;
            }
            if (params.availability_template) {
              sensorConfig.availability = params.availability_template;
            }
            if (params.unique_id) {
              sensorConfig.unique_id = params.unique_id;
            }
            if (params.attributes) {
              sensorConfig.attributes = params.attributes;
            }

            // REALITY CHECK: Template sensors cannot be created via API
            // Home Assistant's template integration only loads from YAML configuration
            
            // Generate comprehensive YAML configuration
            const yamlConfig = generateTemplateSensorYAML(params.sensor_name, sensorConfig);
            
            // Generate alternative approaches that DO work via API
            const alternatives = {
              input_text_helper: generateInputTextHelperConfig(params.sensor_name, params.value_template),
              automation_update: generateAutomationConfig(params.sensor_name, params.value_template),
              rest_sensor: generateRestSensorConfig(params.sensor_name, params.value_template, sensorConfig)
            };

            return {
              success: true,
              message: `Template sensor configuration generated for ${params.sensor_name}`,
              sensor_name: params.sensor_name,
              entity_id: `sensor.${params.sensor_name}`,
              configuration: sensorConfig,
              
              // Primary approach: YAML configuration
              yaml_configuration: yamlConfig,
              creation_method: 'yaml_configuration',
              
              // Alternative approaches that work via API
              api_alternatives: {
                input_text_helper: {
                  description: 'Create input_text helper + automation (API creatable)',
                  helper_config: alternatives.input_text_helper,
                  automation_config: alternatives.automation_update,
                  entity_id: `input_text.template_${params.sensor_name}`,
                  note: 'This creates a helper that updates via automation - not a true template sensor'
                },
                rest_sensor: {
                  description: 'REST sensor that calls template API (auto-updating)',
                  yaml_config: alternatives.rest_sensor,
                  entity_id: `sensor.${params.sensor_name}_rest`,
                  note: 'This creates a REST sensor that evaluates templates automatically'
                }
              },
              
              // Instructions
              instructions: {
                primary: 'Add the yaml_configuration to your configuration.yaml under template: section and restart Home Assistant',
                alternative_1: 'Use the input_text_helper approach to create via API (helper + automation)',
                alternative_2: 'Use the rest_sensor YAML for auto-updating template evaluation',
                reality_check: 'True template sensors can only be created via YAML configuration in Home Assistant'
              },
              
              // Honest assessment
              limitations: {
                api_creation: 'Home Assistant does not support creating template sensors via API',
                workarounds: 'Input helpers + automations or REST sensors can provide similar functionality',
                yaml_required: 'True template sensors require YAML configuration and restart'
              }
            };
          }



          case 'delete': {
            const entityId = params.entity_id || (params.sensor_name ? `sensor.${params.sensor_name}` : undefined);
            
            if (!entityId) {
              throw new Error('entity_id or sensor_name is required for deletion');
            }

            // Get entity registry info
            const entities = await wsClient.callWS({ type: 'config/entity_registry/list' });
            if (!Array.isArray(entities)) {
              throw new Error('Invalid response from entity registry');
            }

            const entity = entities.find((e: any) => e.entity_id === entityId);
            if (!entity || entity.platform !== 'template') {
              throw new Error(`Template sensor ${entityId} not found`);
            }

            try {
              // Try to remove from entity registry
              await wsClient.callWS({
                type: 'config/entity_registry/remove',
                entity_id: entityId,
              });

              return {
                success: true,
                message: `Template sensor ${entityId} removed from entity registry`,
                entity_id: entityId,
                note: 'Sensor removed from registry - you may also need to remove it from configuration.yaml'
              };
            } catch (error) {
              return {
                success: false,
                message: `Failed to delete template sensor: ${error instanceof Error ? error.message : 'Unknown error'}`,
                entity_id: entityId,
                note: 'Template sensors configured in YAML cannot be deleted via API - remove from configuration.yaml manually'
              };
            }
          }

          default:
            throw new Error(`Invalid action: ${params.action}`);
        }

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  };

  // Helper function to generate input text helper configuration
  function generateInputTextHelperConfig(sensorName: string, template: string): any {
    return {
      name: `Template Helper: ${sensorName}`,
      min: 0,
      max: 255,
      initial: '',
      mode: 'text',
      entity_id: `input_text.template_${sensorName}`
    };
  }

  // Helper function to generate automation configuration
  function generateAutomationConfig(sensorName: string, template: string): any {
    return {
      alias: `Update Template Helper: ${sensorName}`,
      description: `Updates template helper for ${sensorName}`,
      mode: 'single',
      trigger: [
        {
          platform: 'time_pattern',
          minutes: '/1'
        },
        {
          platform: 'homeassistant',
          event: 'start'
        }
      ],
      action: [
        {
          service: 'input_text.set_value',
          target: {
            entity_id: `input_text.template_${sensorName}`
          },
          data: {
            value: template
          }
        }
      ]
    };
  }

  // Helper function to generate REST sensor configuration
  function generateRestSensorConfig(sensorName: string, template: string, config: any): string {
    const restConfig = {
      platform: 'rest',
      name: config.name || sensorName,
      resource: `${HASS_HOST}/api/template`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer YOUR_HASS_TOKEN`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        template: template
      }),
      value_template: '{{ value }}',
      scan_interval: 60,
      unit_of_measurement: config.unit_of_measurement,
      device_class: config.device_class,
      icon: config.icon
    };

    return generateRestSensorYAML(sensorName, restConfig);
  }

  // Helper function to generate REST sensor YAML configuration
  function generateRestSensorYAML(sensorName: string, config: any): string {
    const yamlLines = [
      '# Add this to your configuration.yaml under sensor:',
      'sensor:',
      '  - platform: rest',
      `    name: "${config.name}"`,
      `    resource: "${config.resource}"`,
      `    method: ${config.method}`,
      '    headers:',
      `      Authorization: "${config.headers.Authorization}"`,
      `      Content-Type: "${config.headers['Content-Type']}"`,
      `    payload: '${config.payload}'`,
      `    value_template: "${config.value_template}"`,
      `    scan_interval: ${config.scan_interval}`,
    ];

    if (config.unit_of_measurement) {
      yamlLines.push(`    unit_of_measurement: "${config.unit_of_measurement}"`);
    }
    if (config.device_class) {
      yamlLines.push(`    device_class: "${config.device_class}"`);
    }
    if (config.icon) {
      yamlLines.push(`    icon: "${config.icon}"`);
    }

    yamlLines.push('');
    yamlLines.push('# This approach creates a REST sensor that calls the template API automatically');
    yamlLines.push('# The sensor will update based on the scan_interval (60 seconds by default)');

    return yamlLines.join('\n');
  }

  // Helper function to generate YAML configuration
  function generateTemplateSensorYAML(sensorName: string, config: any): string {
    let yaml = `template:\n  - sensor:\n      - name: "${config.name || sensorName}"\n        state: "${config.state}"`;
    
    if (config.unit_of_measurement) {
      yaml += `\n        unit_of_measurement: "${config.unit_of_measurement}"`;
    }
    if (config.device_class) {
      yaml += `\n        device_class: "${config.device_class}"`;
    }
    if (config.state_class) {
      yaml += `\n        state_class: "${config.state_class}"`;
    }
    if (config.icon) {
      yaml += `\n        icon: "${config.icon}"`;
    }
    if (config.unique_id) {
      yaml += `\n        unique_id: "${config.unique_id}"`;
    }
    if (config.availability) {
      yaml += `\n        availability: "${config.availability}"`;
    }
    if (config.attributes) {
      yaml += `\n        attributes:`;
      Object.entries(config.attributes).forEach(([key, value]) => {
        yaml += `\n          ${key}: "${value}"`;
      });
    }
    
    return yaml;
  }

  registerTool(templateSensorTool);

  // Add comprehensive helper management tool
  const manageHelpersTool = {
    name: 'manage_helpers',
    description: 'Create, update, delete, and list Home Assistant helpers (input_boolean, input_number, input_text, input_select, input_datetime, counter, timer, group)',
    parameters: z.object({
      action: z.enum(['create', 'update', 'delete', 'list', 'get'])
        .describe('Action to perform: create new helper, update existing, delete, list all, or get specific helper'),
      helper_type: z.enum(['input_boolean', 'input_number', 'input_text', 'input_select', 'input_datetime', 'counter', 'timer', 'group']).optional()
        .describe('Type of helper (required for create, optional filter for list)'),
      
      // Common fields
      name: z.string().optional()
        .describe('Display name for the helper (required for create)'),
      entity_id: z.string().optional()
        .describe('Entity ID (required for update/delete/get, auto-generated for create from name)'),
      icon: z.string().optional()
        .describe('MDI icon (e.g., mdi:toggle-switch, mdi:numeric)'),
      
      // input_boolean specific
      initial: z.boolean().optional()
        .describe('Initial state for input_boolean (true/false)'),
      
      // input_number specific
      min: z.number().optional()
        .describe('Minimum value for input_number'),
      max: z.number().optional()
        .describe('Maximum value for input_number'),
      step: z.number().optional()
        .describe('Step increment for input_number (default: 1)'),
      mode: z.enum(['box', 'slider']).optional()
        .describe('Display mode for input_number'),
      unit_of_measurement: z.string().optional()
        .describe('Unit for input_number (e.g., °C, %, minutes)'),
      
      // input_text specific
      min_length: z.number().optional()
        .describe('Minimum length for input_text (default: 0)'),
      max_length: z.number().optional()
        .describe('Maximum length for input_text (default: 100)'),
      pattern: z.string().optional()
        .describe('Regex pattern for input_text validation'),
      text_mode: z.enum(['text', 'password']).optional()
        .describe('Display mode for input_text'),
      
      // input_select specific
      options: z.array(z.string()).optional()
        .describe('List of options for input_select (required for input_select)'),
      
      // input_datetime specific
      has_date: z.boolean().optional()
        .describe('Include date picker for input_datetime'),
      has_time: z.boolean().optional()
        .describe('Include time picker for input_datetime'),
      
      // counter specific
      counter_initial: z.number().optional()
        .describe('Initial value for counter (default: 0)'),
      counter_step: z.number().optional()
        .describe('Step increment for counter (default: 1)'),
      counter_minimum: z.number().optional()
        .describe('Minimum value for counter'),
      counter_maximum: z.number().optional()
        .describe('Maximum value for counter'),
      counter_restore: z.boolean().optional()
        .describe('Restore counter value after restart'),
      
      // timer specific
      duration: z.string().optional()
        .describe('Duration for timer in HH:MM:SS format (required for timer)'),
      timer_restore: z.boolean().optional()
        .describe('Restore timer state after restart'),
      
      // group specific
      entities: z.array(z.string()).optional()
        .describe('List of entity IDs to include in the group (required for group)'),
      all: z.boolean().optional()
        .describe('Whether all entities must be on for group to be on (default: false)'),
    }),
    execute: async (params: {
      action: 'create' | 'update' | 'delete' | 'list' | 'get';
      helper_type?: 'input_boolean' | 'input_number' | 'input_text' | 'input_select' | 'input_datetime' | 'counter' | 'timer' | 'group';
      name?: string;
      entity_id?: string;
      icon?: string;
      initial?: boolean;
      min?: number;
      max?: number;
      step?: number;
      mode?: 'box' | 'slider';
      unit_of_measurement?: string;
      min_length?: number;
      max_length?: number;
      pattern?: string;
      text_mode?: 'text' | 'password';
      options?: string[];
      has_date?: boolean;
      has_time?: boolean;
      counter_initial?: number;
      counter_step?: number;
      counter_minimum?: number;
      counter_maximum?: number;
      counter_restore?: boolean;
      duration?: string;
      timer_restore?: boolean;
      entities?: string[];
      all?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        switch (params.action) {
          case 'list': {
            // Get all helpers
            const allStates = await wsClient.callWS({ type: 'get_states' });
            
            if (!Array.isArray(allStates)) {
              throw new Error('Invalid response from get_states');
            }

            // Filter for helper entities
            const helperDomains = ['input_boolean', 'input_number', 'input_text', 'input_select', 'input_datetime', 'counter', 'timer', 'group'];
            let helpers = allStates.filter((entity: any) => {
              const domain = entity.entity_id.split('.')[0];
              return helperDomains.includes(domain);
            });

            // Filter by type if specified
            if (params.helper_type) {
              helpers = helpers.filter((entity: any) => 
                entity.entity_id.startsWith(`${params.helper_type}.`)
              );
            }

            // Format helper information
            const helperList = helpers.map((entity: any) => ({
              entity_id: entity.entity_id,
              name: entity.attributes?.friendly_name || entity.entity_id,
              type: entity.entity_id.split('.')[0],
              state: entity.state,
              icon: entity.attributes?.icon,
              ...( entity.attributes?.min !== undefined && { min: entity.attributes.min }),
              ...( entity.attributes?.max !== undefined && { max: entity.attributes.max }),
              ...( entity.attributes?.step !== undefined && { step: entity.attributes.step }),
              ...( entity.attributes?.mode !== undefined && { mode: entity.attributes.mode }),
              ...( entity.attributes?.unit_of_measurement !== undefined && { unit_of_measurement: entity.attributes.unit_of_measurement }),
              ...( entity.attributes?.options !== undefined && { options: entity.attributes.options }),
              ...( entity.attributes?.has_date !== undefined && { has_date: entity.attributes.has_date }),
              ...( entity.attributes?.has_time !== undefined && { has_time: entity.attributes.has_time }),
              last_changed: entity.last_changed,
            }));

            // Group by type
            const helpersByType: Record<string, any[]> = {};
            helperList.forEach(helper => {
              if (!helpersByType[helper.type]) {
                helpersByType[helper.type] = [];
              }
              helpersByType[helper.type].push(helper);
            });

            return {
              success: true,
              total_helpers: helperList.length,
              helpers: helperList,
              helpers_by_type: helpersByType,
              filter_applied: params.helper_type || 'all',
            };
          }

          case 'get': {
            if (!params.entity_id) {
              throw new Error('entity_id is required for get action');
            }

            const state = await wsClient.callWS({
              type: 'call_service',
              domain: 'homeassistant',
              service: 'update_entity',
              service_data: {
                entity_id: params.entity_id
              }
            }).catch(async () => {
              // Fallback to get_states
              const allStates = await wsClient.callWS({ type: 'get_states' });
              return allStates.find((s: any) => s.entity_id === params.entity_id);
            });

            if (!state) {
              return {
                success: false,
                message: `Helper '${params.entity_id}' not found`,
                entity_id: params.entity_id,
              };
            }

            return {
              success: true,
              helper: {
                entity_id: params.entity_id,
                type: params.entity_id.split('.')[0],
                name: state.attributes?.friendly_name || params.entity_id,
                state: state.state,
                attributes: state.attributes,
                last_changed: state.last_changed,
                last_updated: state.last_updated,
              },
            };
          }

          case 'create': {
            if (!params.helper_type) {
              throw new Error('helper_type is required for create action');
            }
            if (!params.name) {
              throw new Error('name is required for create action');
            }

            let serviceData: any = {
              name: params.name,
            };

            if (params.icon) {
              serviceData.icon = params.icon;
            }

            // Type-specific configurations
            switch (params.helper_type) {
              case 'input_boolean':
                if (params.initial !== undefined) {
                  serviceData.initial = params.initial;
                }
                break;

              case 'input_number':
                if (params.min !== undefined) serviceData.min = params.min;
                if (params.max !== undefined) serviceData.max = params.max;
                if (params.step !== undefined) serviceData.step = params.step;
                if (params.mode) serviceData.mode = params.mode;
                if (params.unit_of_measurement) serviceData.unit_of_measurement = params.unit_of_measurement;
                if (params.initial !== undefined) serviceData.initial = params.min || 0;
                break;

              case 'input_text':
                if (params.min_length !== undefined) serviceData.min = params.min_length;
                if (params.max_length !== undefined) serviceData.max = params.max_length;
                if (params.pattern) serviceData.pattern = params.pattern;
                if (params.text_mode) serviceData.mode = params.text_mode;
                serviceData.initial = '';
                break;

              case 'input_select':
                if (!params.options || params.options.length === 0) {
                  throw new Error('options are required for input_select');
                }
                serviceData.options = params.options;
                serviceData.initial = params.options[0];
                break;

              case 'input_datetime':
                serviceData.has_date = params.has_date !== false;
                serviceData.has_time = params.has_time !== false;
                break;

              case 'counter':
                if (params.counter_initial !== undefined) serviceData.initial = params.counter_initial;
                if (params.counter_step !== undefined) serviceData.step = params.counter_step;
                if (params.counter_minimum !== undefined) serviceData.minimum = params.counter_minimum;
                if (params.counter_maximum !== undefined) serviceData.maximum = params.counter_maximum;
                if (params.counter_restore !== undefined) serviceData.restore = params.counter_restore;
                break;

              case 'timer':
                if (!params.duration) {
                  throw new Error('duration is required for timer (format: HH:MM:SS)');
                }
                serviceData.duration = params.duration;
                if (params.timer_restore !== undefined) serviceData.restore = params.timer_restore;
                break;

              case 'group':
                if (!params.entities || params.entities.length === 0) {
                  throw new Error('entities array is required for group and must contain at least one entity');
                }
                serviceData.entities = params.entities;
                if (params.all !== undefined) serviceData.all = params.all;
                break;
            }

            // Call the appropriate service to create the helper
            const result = await wsClient.callWS({
              type: 'call_service',
              domain: params.helper_type,
              service: 'create',
              service_data: serviceData,
              return_response: true
            });

            // Generate entity_id from name if not provided in result
            const generatedEntityId = `${params.helper_type}.${params.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

            return {
              success: true,
              message: `Successfully created ${params.helper_type} helper`,
              helper_type: params.helper_type,
              entity_id: result?.entity_id || generatedEntityId,
              name: params.name,
              configuration: serviceData,
            };
          }

          case 'update': {
            if (!params.entity_id) {
              throw new Error('entity_id is required for update action');
            }

            const helperType = params.entity_id.split('.')[0];
            
            let serviceData: any = {
              entity_id: params.entity_id,
            };

            // Add updateable fields
            if (params.name) serviceData.name = params.name;
            if (params.icon) serviceData.icon = params.icon;

            // Type-specific updates
            switch (helperType) {
              case 'input_number':
                if (params.min !== undefined) serviceData.min = params.min;
                if (params.max !== undefined) serviceData.max = params.max;
                if (params.step !== undefined) serviceData.step = params.step;
                if (params.mode) serviceData.mode = params.mode;
                if (params.unit_of_measurement) serviceData.unit_of_measurement = params.unit_of_measurement;
                break;

              case 'input_text':
                if (params.min_length !== undefined) serviceData.min = params.min_length;
                if (params.max_length !== undefined) serviceData.max = params.max_length;
                if (params.pattern) serviceData.pattern = params.pattern;
                if (params.text_mode) serviceData.mode = params.text_mode;
                break;

              case 'input_select':
                if (params.options) serviceData.options = params.options;
                break;

              case 'input_datetime':
                if (params.has_date !== undefined) serviceData.has_date = params.has_date;
                if (params.has_time !== undefined) serviceData.has_time = params.has_time;
                break;

              case 'counter':
                if (params.counter_step !== undefined) serviceData.step = params.counter_step;
                if (params.counter_minimum !== undefined) serviceData.minimum = params.counter_minimum;
                if (params.counter_maximum !== undefined) serviceData.maximum = params.counter_maximum;
                if (params.counter_restore !== undefined) serviceData.restore = params.counter_restore;
                break;

              case 'timer':
                if (params.duration) serviceData.duration = params.duration;
                if (params.timer_restore !== undefined) serviceData.restore = params.timer_restore;
                break;

              case 'group':
                if (params.entities) serviceData.entities = params.entities;
                if (params.all !== undefined) serviceData.all = params.all;
                break;
            }

            // Call update service
            await wsClient.callWS({
              type: 'call_service',
              domain: helperType,
              service: 'update',
              service_data: serviceData
            });

            return {
              success: true,
              message: `Successfully updated ${helperType} helper`,
              entity_id: params.entity_id,
              updated_fields: Object.keys(serviceData).filter(k => k !== 'entity_id'),
            };
          }

          case 'delete': {
            if (!params.entity_id) {
              throw new Error('entity_id is required for delete action');
            }

            const helperType = params.entity_id.split('.')[0];
            const helperDomains = ['input_boolean', 'input_number', 'input_text', 'input_select', 'input_datetime', 'counter', 'timer', 'group'];
            
            if (!helperDomains.includes(helperType)) {
              throw new Error(`Entity '${params.entity_id}' is not a helper. Only helpers can be deleted via this tool.`);
            }

            // Call delete/remove service
            await wsClient.callWS({
              type: 'call_service',
              domain: helperType,
              service: 'remove',
              service_data: {
                entity_id: params.entity_id
              }
            });

            return {
              success: true,
              message: `Successfully deleted ${helperType} helper`,
              entity_id: params.entity_id,
            };
          }

          default:
            throw new Error(`Unknown action: ${params.action}`);
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          action: params.action,
          helper_type: params.helper_type,
          entity_id: params.entity_id,
        };
      }
    }
  };
  registerTool(manageHelpersTool);

  // Add the device details tool
  const deviceDetailsTool = {
    name: 'get_device_details',
    description: 'Get detailed information about a specific Home Assistant device',
    parameters: z.object({
      entity_id: z.string().describe('The entity ID to get details for'),
      include_history: z.boolean().default(false).optional()
        .describe('Include recent state history (last 24 hours)'),
      include_related: z.boolean().default(false).optional()
        .describe('Include related entities from the same device'),
    }),
    execute: async (params: {
      entity_id: string;
      include_history?: boolean;
      include_related?: boolean;
    }) => {
      try {
        // Get current state
        const stateResponse = await fetch(`${HASS_HOST}/api/states/${params.entity_id}`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!stateResponse.ok) {
          if (stateResponse.status === 404) {
            return {
              success: false,
              message: `Entity '${params.entity_id}' not found`,
              entity_id: params.entity_id,
            };
          }
          throw new Error(`Failed to fetch device details: ${stateResponse.statusText}`);
        }

        const state = await stateResponse.json() as HassState;
        const domain = params.entity_id.split('.')[0];

        // Base device information
        const deviceInfo = {
          entity_id: state.entity_id,
          domain: domain,
          state: state.state,
          friendly_name: state.attributes?.friendly_name || state.entity_id,
          attributes: state.attributes,
          last_changed: (state as any).last_changed,
          last_updated: (state as any).last_updated,
          context: (state as any).context,
        };

        const result: any = {
          success: true,
          device: deviceInfo,
        };

        // Get state history if requested
        if (params.include_history) {
          try {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const historyResponse = await fetch(
              `${HASS_HOST}/api/history/period/${yesterday.toISOString()}?filter_entity_id=${params.entity_id}`,
              {
                headers: {
                  Authorization: `Bearer ${HASS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (historyResponse.ok) {
              const history = await historyResponse.json() as any[];
              result.history = {
                period: '24_hours',
                entries: history[0] || [],
                total_changes: (history[0] as any[])?.length || 0,
              };
            }
          } catch (error) {
            result.history_error = 'Failed to fetch history data';
          }
        }

        // Get related entities if requested
        if (params.include_related) {
          try {
            const allStatesResponse = await fetch(`${HASS_HOST}/api/states`, {
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });

            if (allStatesResponse.ok) {
              const allStates = await allStatesResponse.json() as HassState[];
              const deviceId = state.attributes?.device_id;
              const areaId = state.attributes?.area_id;
              
              // Find related entities by device_id or area_id
              const relatedEntities = allStates.filter(relatedState => {
                if (relatedState.entity_id === params.entity_id) return false;
                
                return (deviceId && relatedState.attributes?.device_id === deviceId) ||
                       (areaId && relatedState.attributes?.area_id === areaId);
              }).map(relatedState => ({
                entity_id: relatedState.entity_id,
                domain: relatedState.entity_id.split('.')[0],
                state: relatedState.state,
                friendly_name: relatedState.attributes?.friendly_name || relatedState.entity_id,
                relationship: deviceId && relatedState.attributes?.device_id === deviceId ? 'same_device' : 'same_area',
              }));

              result.related_entities = {
                count: relatedEntities.length,
                entities: relatedEntities,
              };
            }
          } catch (error) {
            result.related_entities_error = 'Failed to fetch related entities';
          }
        }

        // Add domain-specific information
        switch (domain) {
          case 'light':
            result.capabilities = {
              supports_brightness: 'brightness' in (state.attributes || {}),
              supports_color: 'rgb_color' in (state.attributes || {}),
              supports_color_temp: 'color_temp' in (state.attributes || {}),
              supported_features: state.attributes?.supported_features,
            };
            break;
          case 'climate':
            result.capabilities = {
              hvac_modes: state.attributes?.hvac_modes,
              fan_modes: state.attributes?.fan_modes,
              swing_modes: state.attributes?.swing_modes,
              preset_modes: state.attributes?.preset_modes,
              supported_features: state.attributes?.supported_features,
            };
            break;
          case 'cover':
            result.capabilities = {
              supports_position: 'current_position' in (state.attributes || {}),
              supports_tilt: 'current_tilt_position' in (state.attributes || {}),
              device_class: state.attributes?.device_class,
              supported_features: state.attributes?.supported_features,
            };
            break;
          case 'media_player':
            result.capabilities = {
              supported_features: state.attributes?.supported_features,
              source_list: state.attributes?.source_list,
              sound_mode_list: state.attributes?.sound_mode_list,
            };
            break;
          default:
            if (state.attributes?.supported_features) {
              result.capabilities = {
                supported_features: state.attributes.supported_features,
              };
            }
        }

        return result;

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          entity_id: params.entity_id,
        };
      }
    }
  };
  registerTool(deviceDetailsTool);

  // Add the device discovery helper tool
  const deviceDiscoveryTool = {
    name: 'discover_devices',
    description: 'Discover devices using common patterns like "all lights that are on", "available updates", etc.',
    parameters: z.object({
      pattern: z.enum([
        'lights_on',
        'lights_off', 
        'all_lights',
        'switches_on',
        'switches_off',
        'all_switches',
        'doors_open',
        'windows_open',
        'motion_detected',
        'low_battery',
        'unavailable_devices',
        'available_updates',
        'climate_heating',
        'climate_cooling',
        'media_playing',
        'covers_open',
        'covers_closed',
        'sensors_by_class',
        'recently_changed'
      ]).describe('Common device discovery pattern'),
      device_class: z.string().optional().describe('For sensors_by_class pattern, specify device class (e.g., "temperature", "humidity", "motion")'),
      hours: z.number().min(1).max(168).default(1).optional().describe('For recently_changed pattern, how many hours back to look'),
    }),
    execute: async (params: {
      pattern: string;
      device_class?: string;
      hours?: number;
    }) => {
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
        let filteredDevices: HassState[] = [];
        let description = '';

        switch (params.pattern) {
          case 'lights_on':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('light.') && state.state === 'on'
            );
            description = 'All lights that are currently on';
            break;

          case 'lights_off':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('light.') && state.state === 'off'
            );
            description = 'All lights that are currently off';
            break;

          case 'all_lights':
            filteredDevices = states.filter(state => state.entity_id.startsWith('light.'));
            description = 'All light entities';
            break;

          case 'switches_on':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('switch.') && state.state === 'on'
            );
            description = 'All switches that are currently on';
            break;

          case 'switches_off':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('switch.') && state.state === 'off'
            );
            description = 'All switches that are currently off';
            break;

          case 'all_switches':
            filteredDevices = states.filter(state => state.entity_id.startsWith('switch.'));
            description = 'All switch entities';
            break;

          case 'doors_open':
            filteredDevices = states.filter(state => 
              (state.entity_id.startsWith('binary_sensor.') && 
               state.attributes?.device_class === 'door' && 
               state.state === 'on') ||
              (state.entity_id.startsWith('cover.') && 
               state.attributes?.device_class === 'door' && 
               state.state === 'open')
            );
            description = 'All doors that are currently open';
            break;

          case 'windows_open':
            filteredDevices = states.filter(state => 
              (state.entity_id.startsWith('binary_sensor.') && 
               state.attributes?.device_class === 'window' && 
               state.state === 'on') ||
              (state.entity_id.startsWith('cover.') && 
               state.attributes?.device_class === 'window' && 
               state.state === 'open')
            );
            description = 'All windows that are currently open';
            break;

          case 'motion_detected':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('binary_sensor.') && 
              state.attributes?.device_class === 'motion' && 
              state.state === 'on'
            );
            description = 'All motion sensors detecting motion';
            break;

          case 'low_battery':
            filteredDevices = states.filter(state => {
              const battery = state.attributes?.battery_level;
              return battery !== undefined && battery < 20;
            });
            description = 'All devices with low battery (< 20%)';
            break;

          case 'unavailable_devices':
            filteredDevices = states.filter(state => state.state === 'unavailable');
            description = 'All devices that are currently unavailable';
            break;

          case 'available_updates':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('update.') && state.state === 'on'
            );
            description = 'All entities with available updates';
            break;

          case 'climate_heating':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('climate.') && 
              (state.state === 'heat' || state.attributes?.hvac_action === 'heating')
            );
            description = 'All climate entities currently heating';
            break;

          case 'climate_cooling':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('climate.') && 
              (state.state === 'cool' || state.attributes?.hvac_action === 'cooling')
            );
            description = 'All climate entities currently cooling';
            break;

          case 'media_playing':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('media_player.') && state.state === 'playing'
            );
            description = 'All media players currently playing';
            break;

          case 'covers_open':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('cover.') && state.state === 'open'
            );
            description = 'All covers that are currently open';
            break;

          case 'covers_closed':
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('cover.') && state.state === 'closed'
            );
            description = 'All covers that are currently closed';
            break;

          case 'sensors_by_class':
            if (!params.device_class) {
              return {
                success: false,
                message: 'device_class parameter is required for sensors_by_class pattern'
              };
            }
            filteredDevices = states.filter(state => 
              state.entity_id.startsWith('sensor.') && 
              state.attributes?.device_class === params.device_class
            );
            description = `All ${params.device_class} sensors`;
            break;

          case 'recently_changed':
            const hours = params.hours || 1;
            const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
            filteredDevices = states.filter(state => {
              const lastChanged = (state as any).last_changed;
              if (!lastChanged) return false;
              return new Date(lastChanged) > cutoffTime;
            });
            description = `All devices that changed state in the last ${hours} hour(s)`;
            break;

          default:
            return {
              success: false,
              message: `Unknown pattern: ${params.pattern}`
            };
        }

        // Format the results
        const results = filteredDevices.map(device => ({
          entity_id: device.entity_id,
          state: device.state,
          friendly_name: device.attributes?.friendly_name || device.entity_id,
          domain: device.entity_id.split('.')[0],
          device_class: device.attributes?.device_class,
          area_id: device.attributes?.area_id,
          battery_level: device.attributes?.battery_level,
          last_changed: (device as any).last_changed,
        }));

        return {
          success: true,
          pattern: params.pattern,
          description: description,
          total_found: results.length,
          devices: results,
          parameters: {
            device_class: params.device_class,
            hours: params.hours,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  registerTool(deviceDiscoveryTool);

  // Add the device relationships tool
  const deviceRelationshipsTool = {
    name: 'get_device_relationships',
    description: 'Get device relationships, areas, floors, and organizational structure',
    parameters: z.object({
      view: z.enum(['areas', 'floors', 'device_registry', 'by_area', 'by_floor'])
        .describe('Type of relationship view to retrieve'),
      area_id: z.string().optional().describe('For by_area view, specify area ID'),
      floor_id: z.string().optional().describe('For by_floor view, specify floor ID'),
      include_empty: z.boolean().default(false).optional()
        .describe('Include areas/floors with no devices'),
    }),
    execute: async (params: {
      view: 'areas' | 'floors' | 'device_registry' | 'by_area' | 'by_floor';
      area_id?: string;
      floor_id?: string;
      include_empty?: boolean;
    }) => {
      try {
        // Get all entity states
        const statesResponse = await fetch(`${HASS_HOST}/api/states`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!statesResponse.ok) {
          throw new Error(`Failed to fetch states: ${statesResponse.statusText}`);
        }

        const states = await statesResponse.json() as HassState[];

        switch (params.view) {
          case 'areas': {
            // Group devices by area
            const areaGroups: Record<string, HassState[]> = {};
            const unknownArea: HassState[] = [];

            states.forEach(state => {
              const areaId = state.attributes?.area_id;
              if (areaId) {
                if (!areaGroups[areaId]) {
                  areaGroups[areaId] = [];
                }
                areaGroups[areaId].push(state);
              } else {
                unknownArea.push(state);
              }
            });

            const areas = Object.entries(areaGroups).map(([areaId, devices]) => ({
              area_id: areaId,
              device_count: devices.length,
              domains: [...new Set(devices.map(d => d.entity_id.split('.')[0]))],
              devices: devices.map(device => ({
                entity_id: device.entity_id,
                domain: device.entity_id.split('.')[0],
                state: device.state,
                friendly_name: device.attributes?.friendly_name || device.entity_id,
              })),
            }));

            const result: any = {
              success: true,
              view: 'areas',
              total_areas: areas.length,
              areas: areas,
            };

            if (unknownArea.length > 0 || params.include_empty) {
              result.unassigned_devices = {
                count: unknownArea.length,
                devices: unknownArea.map(device => ({
                  entity_id: device.entity_id,
                  domain: device.entity_id.split('.')[0],
                  state: device.state,
                  friendly_name: device.attributes?.friendly_name || device.entity_id,
                })),
              };
            }

            return result;
          }

          case 'by_area': {
            if (!params.area_id) {
              return {
                success: false,
                message: 'area_id parameter is required for by_area view'
              };
            }

            const areaDevices = states.filter(state => 
              state.attributes?.area_id === params.area_id
            );

            if (areaDevices.length === 0) {
              return {
                success: false,
                message: `No devices found in area '${params.area_id}'`
              };
            }

            // Group by domain
            const domainGroups: Record<string, HassState[]> = {};
            areaDevices.forEach(device => {
              const domain = device.entity_id.split('.')[0];
              if (!domainGroups[domain]) {
                domainGroups[domain] = [];
              }
              domainGroups[domain].push(device);
            });

            return {
              success: true,
              view: 'by_area',
              area_id: params.area_id,
              total_devices: areaDevices.length,
              domains: Object.keys(domainGroups),
              devices_by_domain: Object.entries(domainGroups).map(([domain, devices]) => ({
                domain: domain,
                count: devices.length,
                devices: devices.map(device => ({
                  entity_id: device.entity_id,
                  state: device.state,
                  friendly_name: device.attributes?.friendly_name || device.entity_id,
                  device_class: device.attributes?.device_class,
                })),
              })),
              all_devices: areaDevices.map(device => ({
                entity_id: device.entity_id,
                domain: device.entity_id.split('.')[0],
                state: device.state,
                friendly_name: device.attributes?.friendly_name || device.entity_id,
                device_class: device.attributes?.device_class,
              })),
            };
          }

          case 'device_registry': {
            // Get devices grouped by device_id
            const deviceGroups: Record<string, HassState[]> = {};
            const standaloneEntities: HassState[] = [];

            states.forEach(state => {
              const deviceId = state.attributes?.device_id;
              if (deviceId) {
                if (!deviceGroups[deviceId]) {
                  deviceGroups[deviceId] = [];
                }
                deviceGroups[deviceId].push(state);
              } else {
                standaloneEntities.push(state);
              }
            });

            const devices = Object.entries(deviceGroups).map(([deviceId, entities]) => {
              const firstEntity = entities[0];
              return {
                device_id: deviceId,
                entity_count: entities.length,
                area_id: firstEntity.attributes?.area_id,
                device_name: firstEntity.attributes?.device_name || 
                           firstEntity.attributes?.friendly_name?.split(' ')[0] || 
                           deviceId,
                domains: [...new Set(entities.map(e => e.entity_id.split('.')[0]))],
                entities: entities.map(entity => ({
                  entity_id: entity.entity_id,
                  domain: entity.entity_id.split('.')[0],
                  state: entity.state,
                  friendly_name: entity.attributes?.friendly_name || entity.entity_id,
                })),
              };
            });

            return {
              success: true,
              view: 'device_registry',
              total_devices: devices.length,
              total_standalone_entities: standaloneEntities.length,
              devices: devices,
              standalone_entities: standaloneEntities.map(entity => ({
                entity_id: entity.entity_id,
                domain: entity.entity_id.split('.')[0],
                state: entity.state,
                friendly_name: entity.attributes?.friendly_name || entity.entity_id,
                area_id: entity.attributes?.area_id,
              })),
            };
          }

          case 'floors': {
            // Group devices by floor (using floor_id attribute if available)
            const floorGroups: Record<string, HassState[]> = {};
            const noFloorDevices: HassState[] = [];

            states.forEach(state => {
              const floorId = state.attributes?.floor_id;
              if (floorId) {
                if (!floorGroups[floorId]) {
                  floorGroups[floorId] = [];
                }
                floorGroups[floorId].push(state);
              } else {
                noFloorDevices.push(state);
              }
            });

            const floors = Object.entries(floorGroups).map(([floorId, devices]) => ({
              floor_id: floorId,
              device_count: devices.length,
              areas: [...new Set(devices.map(d => d.attributes?.area_id).filter(Boolean))],
              domains: [...new Set(devices.map(d => d.entity_id.split('.')[0]))],
            }));

            return {
              success: true,
              view: 'floors',
              total_floors: floors.length,
              floors: floors,
              unassigned_devices_count: noFloorDevices.length,
            };
          }

          case 'by_floor': {
            if (!params.floor_id) {
              return {
                success: false,
                message: 'floor_id parameter is required for by_floor view'
              };
            }

            const floorDevices = states.filter(state => 
              state.attributes?.floor_id === params.floor_id
            );

            if (floorDevices.length === 0) {
              return {
                success: false,
                message: `No devices found on floor '${params.floor_id}'`
              };
            }

            // Group by area within the floor
            const areaGroups: Record<string, HassState[]> = {};
            floorDevices.forEach(device => {
              const areaId = device.attributes?.area_id || 'no_area';
              if (!areaGroups[areaId]) {
                areaGroups[areaId] = [];
              }
              areaGroups[areaId].push(device);
            });

            return {
              success: true,
              view: 'by_floor',
              floor_id: params.floor_id,
              total_devices: floorDevices.length,
              areas_on_floor: Object.keys(areaGroups).filter(a => a !== 'no_area'),
              devices_by_area: Object.entries(areaGroups).map(([areaId, devices]) => ({
                area_id: areaId === 'no_area' ? null : areaId,
                device_count: devices.length,
                devices: devices.map(device => ({
                  entity_id: device.entity_id,
                  domain: device.entity_id.split('.')[0],
                  state: device.state,
                  friendly_name: device.attributes?.friendly_name || device.entity_id,
                })),
              })),
            };
          }

          default:
            return {
              success: false,
              message: `Unknown view type: ${params.view}`
            };
        }

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  registerTool(deviceRelationshipsTool);

  // Add area-based device management tools
  const getDevicesByAreaTool = {
    name: 'get_devices_by_area',
    description: 'Find all devices in a specific area by area_id',
    parameters: z.object({
      area_id: z.string().describe('The area ID to search for devices in'),
      include_details: z.boolean().default(false).optional()
        .describe('Include full device details and attributes'),
      domain_filter: z.string().optional()
        .describe('Filter by specific domain (e.g., "light", "switch", "sensor")'),
      state_filter: z.string().optional()
        .describe('Filter by current state (e.g., "on", "off", "unavailable")'),
    }),
    execute: async (params: {
      area_id: string;
      include_details?: boolean;
      domain_filter?: string;
      state_filter?: string;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        // Get entities and devices for the area using WebSocket
        const [entities, devices, states] = await Promise.all([
          wsClient.callWS({ type: 'config/entity_registry/list' }),
          wsClient.callWS({ type: 'config/device_registry/list' }),
          wsClient.callWS({ type: 'get_states' })
        ]);

        if (!Array.isArray(entities) || !Array.isArray(devices) || !Array.isArray(states)) {
          throw new Error('Invalid response from Home Assistant');
        }

        // Find entities in this area
        const areaEntities = entities.filter((entity: any) => entity.area_id === params.area_id);
        
        // Find devices in this area
        const areaDevices = devices.filter((device: any) => device.area_id === params.area_id);
        
        // Get entity IDs from devices in this area
        const deviceEntityIds = new Set();
        areaDevices.forEach((device: any) => {
          // Find entities that belong to this device
          const deviceEntities = entities.filter((entity: any) => entity.device_id === device.id);
          deviceEntities.forEach((entity: any) => deviceEntityIds.add(entity.entity_id));
        });

        // Combine direct area entities and device entities
        const allAreaEntityIds = new Set([
          ...areaEntities.map((entity: any) => entity.entity_id),
          ...deviceEntityIds
        ]);

        // Get current states for these entities
        let entityStates = states.filter((state: any) => allAreaEntityIds.has(state.entity_id));

        // Apply domain filter if specified
        if (params.domain_filter) {
          entityStates = entityStates.filter((state: any) => 
            state.entity_id.split('.')[0] === params.domain_filter
          );
        }

        // Apply state filter if specified
        if (params.state_filter) {
          entityStates = entityStates.filter((state: any) => 
            state.state === params.state_filter
          );
        }

        // Group by domain for better organization
        const devicesByDomain: Record<string, any[]> = {};
        entityStates.forEach((state: any) => {
          const domain = state.entity_id.split('.')[0];
          if (!devicesByDomain[domain]) {
            devicesByDomain[domain] = [];
          }
          
          const deviceInfo = {
            entity_id: state.entity_id,
            state: state.state,
            friendly_name: state.attributes?.friendly_name || state.entity_id,
            device_class: state.attributes?.device_class,
            last_changed: state.last_changed,
            last_updated: state.last_updated,
          };

          if (params.include_details) {
            (deviceInfo as any).attributes = state.attributes;
          }

          devicesByDomain[domain].push(deviceInfo);
        });

        return {
          success: true,
          area_id: params.area_id,
          total_devices: entityStates.length,
          total_entities_in_area: areaEntities.length,
          total_devices_in_area: areaDevices.length,
          domains: Object.keys(devicesByDomain),
          devices_by_domain: devicesByDomain,
          source: 'websocket_registries',
          filters_applied: {
            domain: params.domain_filter,
            state: params.state_filter,
            include_details: params.include_details ?? false,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          area_id: params.area_id,
        };
      }
    }
  };
  registerTool(getDevicesByAreaTool);

  const getUnassignedDevicesTool = {
    name: 'get_unassigned_devices',
    description: 'Find all devices that do not have an area_id assigned',
    parameters: z.object({
      domain_filter: z.string().optional()
        .describe('Filter by specific domain (e.g., "light", "switch", "sensor")'),
      state_filter: z.string().optional()
        .describe('Filter by current state (e.g., "on", "off", "unavailable")'),
      include_details: z.boolean().default(false).optional()
        .describe('Include full device details and attributes'),
      limit: z.number().min(1).max(500).default(100).optional()
        .describe('Maximum number of results to return'),
    }),
    execute: async (params: {
      domain_filter?: string;
      state_filter?: string;
      include_details?: boolean;
      limit?: number;
    }) => {
      try {
        // Get all entity states
        const statesResponse = await fetch(`${HASS_HOST}/api/states`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!statesResponse.ok) {
          throw new Error(`Failed to fetch states: ${statesResponse.statusText}`);
        }

        const states = await statesResponse.json() as HassState[];

        // Filter devices without area_id
        let unassignedDevices = states.filter(state => 
          !state.attributes?.area_id
        );

        // Apply domain filter if specified
        if (params.domain_filter) {
          unassignedDevices = unassignedDevices.filter(device => 
            device.entity_id.split('.')[0] === params.domain_filter
          );
        }

        // Apply state filter if specified
        if (params.state_filter) {
          unassignedDevices = unassignedDevices.filter(device => 
            device.state === params.state_filter
          );
        }

        // Apply limit
        const limit = params.limit || 100;
        const limitedDevices = unassignedDevices.slice(0, limit);

        // Group by domain for better organization
        const devicesByDomain: Record<string, any[]> = {};
        limitedDevices.forEach(device => {
          const domain = device.entity_id.split('.')[0];
          if (!devicesByDomain[domain]) {
            devicesByDomain[domain] = [];
          }
          
          const deviceInfo = {
            entity_id: device.entity_id,
            state: device.state,
            friendly_name: device.attributes?.friendly_name || device.entity_id,
            device_class: device.attributes?.device_class,
            device_id: device.attributes?.device_id,
            last_changed: (device as any).last_changed,
            last_updated: (device as any).last_updated,
          };

          if (params.include_details) {
            (deviceInfo as any).attributes = device.attributes;
          }

          devicesByDomain[domain].push(deviceInfo);
        });

        return {
          success: true,
          total_unassigned: unassignedDevices.length,
          returned: limitedDevices.length,
          domains: Object.keys(devicesByDomain),
          devices_by_domain: devicesByDomain,
          filters_applied: {
            domain: params.domain_filter,
            state: params.state_filter,
            limit: limit,
            include_details: params.include_details ?? false,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  };
  registerTool(getUnassignedDevicesTool);

  const assignDeviceAreaTool = {
    name: 'assign_device_area',
    description: 'Assign an area_id to devices that do not have one. This updates the device registry.',
    parameters: z.object({
      entity_id: z.string().describe('The entity ID to assign an area to'),
      area_id: z.string().describe('The area ID to assign to the device'),
      verify_area_exists: z.boolean().default(true).optional()
        .describe('Verify that the area exists before assignment'),
    }),
    execute: async (params: {
      entity_id: string;
      area_id: string;
      verify_area_exists?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not connected');
        }

        // First, verify the entity exists
        const stateResponse = await fetch(`${HASS_HOST}/api/states/${params.entity_id}`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!stateResponse.ok) {
          if (stateResponse.status === 404) {
            return {
              success: false,
              message: `Entity '${params.entity_id}' not found`,
              entity_id: params.entity_id,
            };
          }
          throw new Error(`Failed to fetch entity state: ${stateResponse.statusText}`);
        }

        const entityState = await stateResponse.json() as HassState;

        // Verify area exists if requested using WebSocket
        if (params.verify_area_exists) {
          const areas = await wsClient.callWS({ type: 'config/area_registry/list' }) as Array<{area_id: string; [key: string]: any}>;
          const areaExists = areas.some((area: any) => area.area_id === params.area_id);
          if (!areaExists) {
            return {
              success: false,
              message: `Area '${params.area_id}' does not exist`,
              entity_id: params.entity_id,
              area_id: params.area_id,
            };
          }
        }

        // Get entity registry using WebSocket
        const entityRegistry = await wsClient.callWS({ type: 'config/entity_registry/list' }) as Array<{entity_id: string; device_id: string; area_id?: string; [key: string]: any}>;
        const entityRegistryEntry = entityRegistry.find((entry: any) => entry.entity_id === params.entity_id);

        if (!entityRegistryEntry) {
          return {
            success: false,
            message: `Entity '${params.entity_id}' not found in entity registry`,
            entity_id: params.entity_id,
          };
        }

        // Check if entity already has an area assigned (check registry, not state)
        if (entityRegistryEntry.area_id) {
          return {
            success: false,
            message: `Entity '${params.entity_id}' already has area '${entityRegistryEntry.area_id}' assigned`,
            entity_id: params.entity_id,
            current_area_id: entityRegistryEntry.area_id,
          };
        }

        const deviceId = entityRegistryEntry.device_id;
        
        // For automations and other entities without devices, update entity area directly
        if (!deviceId) {
          try {
            // Update entity area using WebSocket
            const updateResult = await wsClient.callWS({
              type: 'config/entity_registry/update',
              entity_id: params.entity_id,
              area_id: params.area_id,
            });

            return {
              success: true,
              message: `Successfully assigned area '${params.area_id}' to entity '${params.entity_id}'`,
              entity_id: params.entity_id,
              area_id: params.area_id,
              entity_type: 'standalone_entity',
              updated_entity: updateResult,
            };
          } catch (updateError) {
            return {
              success: false,
              message: `Failed to update entity area: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
              entity_id: params.entity_id,
              area_id: params.area_id,
            };
          }
        }

        // For device-based entities, update device area using WebSocket
        try {
          const updateResult = await wsClient.callWS({
            type: 'config/device_registry/update',
            device_id: deviceId,
            area_id: params.area_id,
          });

          return {
            success: true,
            message: `Successfully assigned area '${params.area_id}' to device containing entity '${params.entity_id}'`,
            entity_id: params.entity_id,
            device_id: deviceId,
            area_id: params.area_id,
            entity_type: 'device_entity',
            updated_device: updateResult,
          };
        } catch (updateError) {
          return {
            success: false,
            message: `Failed to update device area: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
            entity_id: params.entity_id,
            device_id: deviceId,
            area_id: params.area_id,
          };
        }

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          entity_id: params.entity_id,
          area_id: params.area_id,
        };
      }
    }
  };
  registerTool(assignDeviceAreaTool);

  const getAvailableAreasTool = {
    name: 'get_available_areas',
    description: 'Get all available areas (rooms/zones) defined in Home Assistant',
    parameters: z.object({
      include_device_counts: z.boolean().default(false).optional()
        .describe('Include count of devices in each area'),
      sort_by: z.enum(['name', 'area_id']).default('name').optional()
        .describe('Sort areas by name or area_id'),
      include_empty: z.boolean().default(true).optional()
        .describe('Include areas with no devices assigned'),
    }),
    execute: async (params: {
      include_device_counts?: boolean;
      sort_by?: 'name' | 'area_id';
      include_empty?: boolean;
    }) => {
      try {
        // Use WebSocket API to get areas (REST API not available for area registry)
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        const areas = await wsClient.callWS({
          type: 'config/area_registry/list'
        });

        if (!Array.isArray(areas)) {
          throw new Error('Invalid response from area registry');
        }

        let processedAreas = areas.map((area: any) => ({
          area_id: area.area_id,
          name: area.name,
          aliases: area.aliases || [],
          picture: area.picture || null,
          icon: area.icon || null,
          floor_id: area.floor_id || null,
          device_count: 0, // Will be populated if requested
        }));

        // Get device counts if requested
        if (params.include_device_counts) {
          try {
            // Get entity registry to find entities with area assignments
            const entities = await wsClient.callWS({
              type: 'config/entity_registry/list'
            });

            // Get device registry to find devices with area assignments  
            const devices = await wsClient.callWS({
              type: 'config/device_registry/list'
            });

            // Count entities per area
            const entityCounts: Record<string, number> = {};
            if (Array.isArray(entities)) {
              entities.forEach((entity: any) => {
                if (entity.area_id) {
                  entityCounts[entity.area_id] = (entityCounts[entity.area_id] || 0) + 1;
                }
              });
            }

            // Count devices per area
            const deviceCounts: Record<string, number> = {};
            if (Array.isArray(devices)) {
              devices.forEach((device: any) => {
                if (device.area_id) {
                  deviceCounts[device.area_id] = (deviceCounts[device.area_id] || 0) + 1;
                }
              });
            }

            // Update device counts (combine entities and devices)
            processedAreas = processedAreas.map(area => ({
              ...area,
              device_count: (entityCounts[area.area_id] || 0) + (deviceCounts[area.area_id] || 0),
            }));

            // Filter out empty areas if requested
            if (!params.include_empty) {
              processedAreas = processedAreas.filter(area => area.device_count > 0);
            }
          } catch (error) {
            // If device counting fails, continue without counts
            console.warn('Failed to count devices per area:', error);
          }
        }

        // Sort areas
        const sortBy = params.sort_by || 'name';
        processedAreas.sort((a, b) => {
          if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
          } else {
            return a.area_id.localeCompare(b.area_id);
          }
        });

        return {
          success: true,
          total_areas: processedAreas.length,
          areas: processedAreas,
          source: 'websocket_area_registry',
          options: {
            include_device_counts: params.include_device_counts ?? false,
            sort_by: sortBy,
            include_empty: params.include_empty ?? true,
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  };
  registerTool(getAvailableAreasTool);

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
        // First, validate that the entity exists and operation is supported
        const validationResult = await entityValidator.validateEntityOperation(
          params.entity_id, 
          params.command,
          params
        );

        if (!validationResult.valid) {
          return {
            success: false,
            message: validationResult.error || 'Entity validation failed',
            entity_id: params.entity_id,
            exists: validationResult.exists,
            current_state: validationResult.currentState
          };
        }

        // Capture state before operation
        const stateBefore = validationResult.currentState;

        const domain = params.entity_id.split('.')[0] as keyof typeof DomainSchema.Values;

        if (!Object.values(DomainSchema.Values).includes(domain)) {
          return {
            success: false,
            message: `Unsupported domain: ${domain}`,
            entity_id: params.entity_id
          };
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
            const errorText = await response.text();
            return {
              success: false,
              message: `Failed to execute ${service} for ${params.entity_id}: ${response.status} ${response.statusText}`,
              entity_id: params.entity_id,
              error_details: errorText,
              state_before: stateBefore
            };
          }

          // Verify state change (wait a moment for state to update)
          await new Promise(resolve => setTimeout(resolve, 1000));
          const stateAfterValidation = await entityValidator.validateEntityExists(params.entity_id);
          const stateAfter = stateAfterValidation.currentState;

          return {
            success: true,
            message: `Successfully executed ${service} for ${params.entity_id}`,
            entity_id: params.entity_id,
            state_before: stateBefore,
            state_after: stateAfter,
            state_changed: stateBefore !== stateAfter,
            operation: service,
            attributes: stateAfterValidation.attributes
          };
        } catch (error) {
          return {
            success: false,
            message: `Failed to execute ${service} for ${params.entity_id}: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            entity_id: params.entity_id,
            state_before: stateBefore,
            error_type: 'network_error'
          };
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

  // Add generic service call tool for arbitrary Home Assistant services
  const callServiceTool = {
    name: 'call_service',
    description: 'Call any Home Assistant service with custom parameters. Use for advanced operations like creating groups, executing scripts, or calling custom services.',
    parameters: z.object({
      domain: z.string().describe('Service domain (e.g., "group", "script", "notify", "automation")'),
      service: z.string().describe('Service name (e.g., "set", "turn_on", "reload")'),
      target: z.object({
        entity_id: z.union([z.string(), z.array(z.string())]).optional()
          .describe('Target entity ID(s)'),
        device_id: z.union([z.string(), z.array(z.string())]).optional()
          .describe('Target device ID(s)'),
        area_id: z.union([z.string(), z.array(z.string())]).optional()
          .describe('Target area ID(s)'),
      }).optional().describe('Target entities, devices, or areas'),
      service_data: z.record(z.any()).optional()
        .describe('Service-specific data/parameters as key-value pairs'),
      return_response: z.boolean().default(false).optional()
        .describe('Whether to return response data from the service call'),
    }),
    execute: async (params: {
      domain: string;
      service: string;
      target?: {
        entity_id?: string | string[];
        device_id?: string | string[];
        area_id?: string | string[];
      };
      service_data?: Record<string, any>;
      return_response?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not available');
        }

        // Build service call payload
        const payload: any = {
          type: 'call_service',
          domain: params.domain,
          service: params.service,
        };

        // Add target if provided
        if (params.target) {
          payload.target = params.target;
        }

        // Add service data if provided
        if (params.service_data) {
          payload.service_data = params.service_data;
        }

        // Add return_response flag
        if (params.return_response) {
          payload.return_response = true;
        }

        // Call the service via WebSocket
        const result = await wsClient.callWS(payload);

        return {
          success: true,
          message: `Successfully called ${params.domain}.${params.service}`,
          domain: params.domain,
          service: params.service,
          target: params.target,
          service_data: params.service_data,
          response: params.return_response ? result : undefined,
        };

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          domain: params.domain,
          service: params.service,
          error_details: error instanceof Error ? error.stack : undefined,
        };
      }
    }
  };
  registerTool(callServiceTool);

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
    description: 'Manage Home Assistant automations with enhanced reliability - features robust ID handling (supports both automation.entity_id and numeric ID formats), configuration validation, update verification, comprehensive error reporting, and automatic retry logic for improved success rates',
    parameters: z.object({
      action: z.enum(['list', 'toggle', 'trigger', 'get_yaml', 'create', 'validate', 'update', 'get_traces', 'get_trace_detail', 'get_latest_trace', 'get_error_traces', 'get_filtered_traces']).describe('Action to perform with automation'),
      automation_id: z.string().optional().describe('Automation ID (required for toggle, trigger, get_yaml, and update actions). Supports multiple formats: full entity ID (automation.my_automation), numeric ID (1718469913974), or entity name (my_automation). The system will automatically try all formats for maximum compatibility.'),
      // Fields for automation creation
      alias: z.string().optional().describe('Automation name/alias (required for create action)'),
      description: z.string().optional().describe('Automation description'),
      mode: z.enum(['single', 'restart', 'queued', 'parallel']).optional().describe('Automation execution mode'),
      triggers: z.any().optional().describe('Automation triggers array (required for create action)'),
      condition: z.any().optional().describe('Automation condition configuration'),
      action_config: z.any().optional().describe('Automation action configuration (required for create action)'),
      // Config object for update action
      config: z.object({
        alias: z.string().optional(),
        description: z.string().optional(),
        mode: z.enum(['single', 'restart', 'queued', 'parallel']).optional(),
        trigger: z.array(z.any()).optional(),
        condition: z.array(z.any()).optional(),
        action: z.array(z.any()).optional(),
      }).optional().describe('Complete automation configuration (required for update action). Configuration is automatically validated before sending to Home Assistant, and updates are verified to ensure they actually applied. Includes retry logic with multiple ID formats if the first attempt fails.'),
      // Validation-only fields
      validate_trigger: z.any().optional().describe('Trigger configuration to validate'),
      validate_condition: z.any().optional().describe('Condition configuration to validate'),
      validate_action: z.any().optional().describe('Action configuration to validate'),
      // Trace-specific fields
      run_id: z.string().optional().describe('Specific trace run ID (required for get_trace_detail action)'),
      // Trace filtering fields
      filter_has_error: z.boolean().optional().describe('Filter traces by error presence (for get_filtered_traces action)'),
      filter_script_execution: z.enum(['finished', 'cancelled', 'timeout', 'failed']).optional().describe('Filter traces by script execution status'),
      filter_state: z.enum(['running', 'stopped', 'debugged']).optional().describe('Filter traces by execution state'),
      filter_since: z.string().optional().describe('Filter traces since this ISO timestamp'),
      filter_limit: z.number().optional().describe('Limit number of traces returned'),
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

          // Parse triggers and action_config if they are JSON strings
          let triggers = params.triggers;
          let actionConfig = params.action_config;
          let condition = params.condition;

          if (typeof triggers === 'string') {
            try {
              triggers = JSON.parse(triggers);
            } catch (error) {
              throw new Error('Invalid JSON format in triggers parameter');
            }
          }

          if (typeof actionConfig === 'string') {
            try {
              actionConfig = JSON.parse(actionConfig);
            } catch (error) {
              throw new Error('Invalid JSON format in action_config parameter');
            }
          }

          if (typeof condition === 'string') {
            try {
              condition = JSON.parse(condition);
            } catch (error) {
              throw new Error('Invalid JSON format in condition parameter');
            }
          }

          // Build automation configuration
          const automationId = params.alias.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const automationConfig: any = {
            id: automationId,
            alias: params.alias,
            mode: params.mode || 'single',
            trigger: triggers,  // Home Assistant API expects 'trigger' not 'triggers'
            action: actionConfig  // Home Assistant API expects 'action' not 'action_config'
          };

          if (params.description) {
            automationConfig.description = params.description;
          }
          if (condition) {
            automationConfig.condition = condition;
          }

          // First, validate the configuration via WebSocket if available
          if (wsClient) {
            try {
              const validation = await wsClient.validateConfig(
                automationConfig.trigger,  // Use 'trigger' not 'triggers'
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

          // Parse JSON strings if necessary
          let parsedTrigger = params.validate_trigger;
          let parsedCondition = params.validate_condition;
          let parsedAction = params.validate_action;

          if (typeof parsedTrigger === 'string') {
            try {
              parsedTrigger = JSON.parse(parsedTrigger);
            } catch (error) {
              throw new Error('Invalid JSON format in validate_trigger parameter');
            }
          }

          if (typeof parsedCondition === 'string') {
            try {
              parsedCondition = JSON.parse(parsedCondition);
            } catch (error) {
              throw new Error('Invalid JSON format in validate_condition parameter');
            }
          }

          if (typeof parsedAction === 'string') {
            try {
              parsedAction = JSON.parse(parsedAction);
            } catch (error) {
              throw new Error('Invalid JSON format in validate_action parameter');
            }
          }

          // Use WebSocket validation if available
          if (wsClient) {
            try {
              const validation = await wsClient.validateConfig(
                parsedTrigger,
                parsedCondition,
                parsedAction
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
        } else if (params.action === 'update') {
          if (!params.automation_id || !params.config) {
            throw new Error('Automation ID and configuration are required for update action');
          }

          // Use enhanced automation update with validation and verification
          const result = await updateAutomationWithDebug(
            params.automation_id,
            params.config as AutomationConfigType,
            HASS_HOST!,
            HASS_TOKEN!,
            wsClient
          );

          // Reload automations to apply changes if update was successful
          if (result.success && wsClient) {
            try {
              await wsClient.callService('automation', 'reload');
            } catch (reloadError) {
              // Continue even if reload fails - the update worked
              logger.warn(`Automation reload failed but update succeeded: ${reloadError}`);
            }
          }

          // Return enhanced result with additional metadata
          return {
            ...result,
            source: 'enhanced_update_with_verification'
          };
        } else if (params.action === 'get_traces') {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for get_traces action');
          }

          const tracesResult = await getAutomationTraces(
            params.automation_id,
            HASS_HOST!,
            HASS_TOKEN!,
            wsClient
          );

          return {
            success: tracesResult.success,
            message: tracesResult.message,
            traces: tracesResult.traces || [],
            automation_id: tracesResult.automation_id,
            entity_id: tracesResult.entity_id,
            source: 'automation_trace_api'
          };
        } else if (params.action === 'get_trace_detail') {
          if (!params.automation_id || !params.run_id) {
            throw new Error('Automation ID and run_id are required for get_trace_detail action');
          }

          const traceDetailResult = await getAutomationTraceDetail(
            params.automation_id,
            params.run_id!,
            HASS_HOST!,
            HASS_TOKEN!,
            wsClient
          );

          return {
            success: traceDetailResult.success,
            message: traceDetailResult.message,
            trace: traceDetailResult.trace,
            automation_id: traceDetailResult.automation_id,
            entity_id: traceDetailResult.entity_id,
            source: 'automation_trace_detail_api'
          };
        } else if (params.action === 'get_latest_trace') {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for get_latest_trace action');
          }

          const latestTraceResult = await getAutomationLatestTrace(
            params.automation_id,
            HASS_HOST!,
            HASS_TOKEN!,
            wsClient
          );

          return {
            success: latestTraceResult.success,
            message: latestTraceResult.message,
            trace: latestTraceResult.trace,
            automation_id: latestTraceResult.automation_id,
            entity_id: latestTraceResult.entity_id,
            source: 'automation_latest_trace_api'
          };
        } else if (params.action === 'get_error_traces') {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for get_error_traces action');
          }

          // Build filter from parameters
          const filter: AutomationTraceFilter = {};
          if (params.filter_script_execution) filter.script_execution = params.filter_script_execution;
          if (params.filter_state) filter.state = params.filter_state;
          if (params.filter_since) filter.since = params.filter_since;
          if (params.filter_limit) filter.limit = params.filter_limit;

          const errorTracesResult = await getAutomationErrorTraces(
            params.automation_id,
            HASS_HOST!,
            HASS_TOKEN!,
            wsClient,
            filter
          );

          return {
            success: errorTracesResult.success,
            message: errorTracesResult.message,
            error_traces: errorTracesResult.error_traces || [],
            automation_id: errorTracesResult.automation_id,
            entity_id: errorTracesResult.entity_id,
            total_traces: errorTracesResult.total_traces,
            error_count: errorTracesResult.error_count,
            source: 'automation_error_traces_api'
          };
        } else if (params.action === 'get_filtered_traces') {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for get_filtered_traces action');
          }

          // Build filter from parameters
          const filter: AutomationTraceFilter = {};
          if (params.filter_has_error !== undefined) filter.has_error = params.filter_has_error;
          if (params.filter_script_execution) filter.script_execution = params.filter_script_execution;
          if (params.filter_state) filter.state = params.filter_state;
          if (params.filter_since) filter.since = params.filter_since;
          if (params.filter_limit) filter.limit = params.filter_limit;

          const filteredTracesResult = await getFilteredAutomationTraces(
            params.automation_id,
            filter,
            HASS_HOST!,
            HASS_TOKEN!,
            wsClient
          );

          return {
            success: filteredTracesResult.success,
            message: filteredTracesResult.message,
            traces: filteredTracesResult.traces || [],
            automation_id: filteredTracesResult.automation_id,
            entity_id: filteredTracesResult.entity_id,
            filter_applied: filter,
            source: 'automation_filtered_traces_api'
          };
        } else {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for toggle, trigger, get_yaml, and update actions');
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
        throw new Error(`Invalid action: ${params.action}. Must be one of: list, toggle, trigger, get_yaml, create, validate, update`);
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

  // Add the automation category assignment tool
  const automationCategoryTool = {
    name: 'assign_automation_category',
    description: 'Assign or update the category for a Home Assistant automation (supports both predefined and custom categories)',
    parameters: z.object({
      automation_id: z.string().describe('The automation entity ID (e.g., automation.my_automation)'),
      category: z.string().describe('The category to assign to the automation (predefined categories or custom text)'),
      is_custom: z.boolean().default(false).optional().describe('Set to true if using a custom category name'),
      verify_automation_exists: z.boolean().default(true).optional()
        .describe('Verify that the automation exists before assignment'),
    }),
    execute: async (params: {
      automation_id: string;
      category: string;
      is_custom?: boolean;
      verify_automation_exists?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not connected');
        }

        // Define predefined categories
        const predefinedCategories = [
          'light', 'switch', 'fan', 'cover', 'climate', 'lock', 'security', 'camera', 
          'media_player', 'sensor', 'vacuum', 'water_heater', 'lawn_mower', 'humidifier',
          'alarm_control_panel', 'notify', 'scene', 'script', 'automation', 'device_tracker',
          'person', 'zone', 'weather', 'calendar', 'schedule', 'energy', 'update',
          'button', 'number', 'select', 'text', 'datetime', 'time', 'date', 'other'
        ];

        // Validate category if not custom
        if (!params.is_custom && !predefinedCategories.includes(params.category)) {
          return {
            success: false,
            message: `Invalid predefined category '${params.category}'. Use is_custom: true for custom categories, or choose from: ${predefinedCategories.join(', ')}`,
            automation_id: params.automation_id,
            category: params.category,
            available_predefined: predefinedCategories,
            suggestion: 'Set is_custom: true to use this as a custom category'
          };
        }

        // Validate custom category format
        if (params.is_custom) {
          if (params.category.length < 1 || params.category.length > 50) {
            return {
              success: false,
              message: 'Custom category must be between 1 and 50 characters',
              automation_id: params.automation_id,
              category: params.category,
            };
          }
          
          // Basic validation for reasonable category names
          if (!/^[a-zA-Z0-9_\-\s]+$/.test(params.category)) {
            return {
              success: false,
              message: 'Custom category can only contain letters, numbers, spaces, hyphens, and underscores',
              automation_id: params.automation_id,
              category: params.category,
            };
          }
        }

        // Verify automation exists if requested
        if (params.verify_automation_exists) {
          const stateResponse = await fetch(`${HASS_HOST}/api/states/${params.automation_id}`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!stateResponse.ok) {
            if (stateResponse.status === 404) {
              return {
                success: false,
                message: `Automation '${params.automation_id}' not found`,
                automation_id: params.automation_id,
              };
            }
            throw new Error(`Failed to fetch automation state: ${stateResponse.statusText}`);
          }

          const automationState = await stateResponse.json() as HassState;
          if (!automationState.entity_id.startsWith('automation.')) {
            return {
              success: false,
              message: `Entity '${params.automation_id}' is not an automation`,
              automation_id: params.automation_id,
            };
          }
        }

        // Get entity registry to find the automation entry
        const entityRegistry = await wsClient.callWS({ type: 'config/entity_registry/list' }) as Array<{
          entity_id: string; 
          categories: { [domain: string]: string }; 
          [key: string]: any
        }>;
        
        const entityEntry = entityRegistry.find((entry: any) => entry.entity_id === params.automation_id);

        if (!entityEntry) {
          return {
            success: false,
            message: `Automation '${params.automation_id}' not found in entity registry`,
            automation_id: params.automation_id,
          };
        }

        // Check current category
        const currentCategory = entityEntry.categories?.automation;
        if (currentCategory === params.category) {
          return {
            success: false,
            message: `Automation '${params.automation_id}' already has category '${params.category}' assigned`,
            automation_id: params.automation_id,
            current_category: currentCategory,
          };
        }

        // Update automation category using WebSocket
        try {
          let categoryId = params.category;

          // If it's a custom category, we need to create it first or find existing ID
          if (params.is_custom) {
            // Get category registry to see if this custom category already exists
            try {
              const categoryRegistry = await wsClient.callWS({ 
                type: 'config/category_registry/list',
                scope: 'automation'
              }) as Array<{
                category_id: string;
                name: string;
                icon?: string;
                [key: string]: any
              }>;

              // Look for existing category with this name
              const existingCategory = categoryRegistry.find(cat => cat.name === params.category);
              
              if (existingCategory) {
                categoryId = existingCategory.category_id;
              } else {
                // Create new custom category
                try {
                  const createResult = await wsClient.callWS({
                    type: 'config/category_registry/create',
                    scope: 'automation',
                    name: params.category,
                    icon: null
                  });
                  categoryId = createResult.category_id;
                } catch (createError) {
                  return {
                    success: false,
                    message: `Failed to create custom category '${params.category}': ${createError instanceof Error ? createError.message : 'Unknown error'}`,
                    automation_id: params.automation_id,
                    category: params.category,
                  };
                }
              }
            } catch (registryError) {
              return {
                success: false,
                message: `Failed to access category registry: ${registryError instanceof Error ? registryError.message : 'Unknown error'}`,
                automation_id: params.automation_id,
                category: params.category,
              };
            }
          } else {
            // For predefined categories, we need to find the category ID
            try {
              const categoryRegistry = await wsClient.callWS({ 
                type: 'config/category_registry/list',
                scope: 'automation'
              }) as Array<{
                category_id: string;
                name: string;
                icon?: string;
                [key: string]: any
              }>;

              const existingCategory = categoryRegistry.find(cat => cat.name === params.category);
              
              if (existingCategory) {
                categoryId = existingCategory.category_id;
              } else {
                // Predefined category doesn't exist in registry, create it
                try {
                  const createResult = await wsClient.callWS({
                    type: 'config/category_registry/create',
                    scope: 'automation',
                    name: params.category,
                    icon: null
                  });
                  categoryId = createResult.category_id;
                } catch (createError) {
                  return {
                    success: false,
                    message: `Failed to create predefined category '${params.category}': ${createError instanceof Error ? createError.message : 'Unknown error'}`,
                    automation_id: params.automation_id,
                    category: params.category,
                  };
                }
              }
            } catch (registryError) {
              return {
                success: false,
                message: `Failed to access category registry: ${registryError instanceof Error ? registryError.message : 'Unknown error'}`,
                automation_id: params.automation_id,
                category: params.category,
              };
            }
          }

          // Now update the entity with the category ID
          const updateResult = await wsClient.callWS({
            type: 'config/entity_registry/update',
            entity_id: params.automation_id,
            categories: {
              ...entityEntry.categories,
              automation: categoryId
            }
          });

          return {
            success: true,
            message: `Successfully assigned ${params.is_custom ? 'custom ' : ''}category '${params.category}' to automation '${params.automation_id}'`,
            automation_id: params.automation_id,
            category: params.category,
            category_type: params.is_custom ? 'custom' : 'predefined',
            category_id: categoryId,
            previous_category: currentCategory || null,
            updated_entity: updateResult,
          };

        } catch (updateError) {
          return {
            success: false,
            message: `Failed to update automation category: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
            automation_id: params.automation_id,
            category: params.category,
          };
        }

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          automation_id: params.automation_id,
          category: params.category,
        };
      }
    }
  };
  registerTool(automationCategoryTool);

  // Add the automation category management tool
  const automationCategoryManageTool = {
    name: 'manage_automation_categories',
    description: 'List automations by category, get/remove automation categories, and discover custom categories in use',
    parameters: z.object({
      action: z.enum(['list_by_category', 'get_category', 'remove_category', 'list_predefined_categories', 'discover_custom_categories', 'list_all_categories_in_use']).describe('Action to perform'),
      automation_id: z.string().optional().describe('Automation entity ID (required for get_category and remove_category actions)'),
      category: z.string().optional().describe('Filter by specific category (optional for list_by_category action)'),
      include_custom: z.boolean().default(true).optional().describe('Include custom categories in results'),
    }),
    execute: async (params: {
      action: string;
      automation_id?: string;
      category?: string;
      include_custom?: boolean;
    }) => {
      try {
        if (!wsClient) {
          throw new Error('WebSocket client not connected');
        }

        const predefinedCategories = [
          'light', 'switch', 'fan', 'cover', 'climate', 'lock', 'security', 'camera', 
          'media_player', 'sensor', 'vacuum', 'water_heater', 'lawn_mower', 'humidifier',
          'alarm_control_panel', 'notify', 'scene', 'script', 'automation', 'device_tracker',
          'person', 'zone', 'weather', 'calendar', 'schedule', 'energy', 'update',
          'button', 'number', 'select', 'text', 'datetime', 'time', 'date', 'other'
        ];

        if (params.action === 'list_predefined_categories') {
          return {
            success: true,
            message: 'Available predefined automation categories',
            predefined_categories: predefinedCategories,
            total_predefined: predefinedCategories.length,
            note: 'You can also create custom categories by setting is_custom: true when assigning'
          };
        }

        if (params.action === 'discover_custom_categories') {
          // Get all automations, entity registry, and category registry
          const [states, entityRegistry, categoryRegistry] = await Promise.all([
            fetch(`${HASS_HOST}/api/states`, {
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }).then(res => res.json()) as Promise<HassState[]>,
            wsClient.callWS({ type: 'config/entity_registry/list' }) as Promise<Array<{
              entity_id: string; 
              categories: { [domain: string]: string }; 
              [key: string]: any
            }>>,
            wsClient.callWS({ 
              type: 'config/category_registry/list',
              scope: 'automation'
            }) as Promise<Array<{
              category_id: string;
              name: string;
              icon?: string;
              [key: string]: any
            }>>
          ]);

          // Create category ID to name mapping
          const categoryIdToName = new Map<string, string>();
          categoryRegistry.forEach((category: any) => {
            categoryIdToName.set(category.category_id, category.name);
          });

          const automations = states.filter(state => state.entity_id.startsWith('automation.'));
          const customCategories = new Set<string>();
          const customCategoryUsage: { [category: string]: string[] } = {};

          automations.forEach(automation => {
            const entityEntry = entityRegistry.find((entry: any) => entry.entity_id === automation.entity_id);
            const categoryId = entityEntry?.categories?.automation;

            if (categoryId) {
              // Resolve category ID to name
              const categoryName = categoryIdToName.get(categoryId);
              
              if (categoryName && !predefinedCategories.includes(categoryName)) {
                customCategories.add(categoryName);
                if (!customCategoryUsage[categoryName]) {
                  customCategoryUsage[categoryName] = [];
                }
                customCategoryUsage[categoryName].push(automation.entity_id);
              }
            }
          });

          return {
            success: true,
            message: 'Custom categories discovered in your automations',
            custom_categories: Array.from(customCategories).sort(),
            custom_category_usage: customCategoryUsage,
            total_custom_categories: customCategories.size,
            total_automations_with_custom_categories: Object.values(customCategoryUsage).reduce((sum, arr) => sum + arr.length, 0)
          };
        }

        if (params.action === 'list_all_categories_in_use') {
          // Get all categories currently in use (both predefined and custom)
          const [states, entityRegistry, categoryRegistry] = await Promise.all([
            fetch(`${HASS_HOST}/api/states`, {
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }).then(res => res.json()) as Promise<HassState[]>,
            wsClient.callWS({ type: 'config/entity_registry/list' }) as Promise<Array<{
              entity_id: string; 
              categories: { [domain: string]: string }; 
              [key: string]: any
            }>>,
            wsClient.callWS({ 
              type: 'config/category_registry/list',
              scope: 'automation'
            }) as Promise<Array<{
              category_id: string;
              name: string;
              icon?: string;
              [key: string]: any
            }>>
          ]);

          // Create category ID to name mapping
          const categoryIdToName = new Map<string, string>();
          categoryRegistry.forEach((category: any) => {
            categoryIdToName.set(category.category_id, category.name);
          });

          const automations = states.filter(state => state.entity_id.startsWith('automation.'));
          const categoriesInUse = new Set<string>();
          const categoryUsage: { [category: string]: { automations: string[], type: 'predefined' | 'custom' } } = {};

          automations.forEach(automation => {
            const entityEntry = entityRegistry.find((entry: any) => entry.entity_id === automation.entity_id);
            const categoryId = entityEntry?.categories?.automation;

            if (categoryId) {
              // Resolve category ID to name
              const categoryName = categoryIdToName.get(categoryId);
              
              if (categoryName) {
                categoriesInUse.add(categoryName);
                const categoryType = predefinedCategories.includes(categoryName) ? 'predefined' : 'custom';
                
                if (!categoryUsage[categoryName]) {
                  categoryUsage[categoryName] = { automations: [], type: categoryType };
                }
                categoryUsage[categoryName].automations.push(automation.entity_id);
              }
            }
          });

          const predefinedInUse = Array.from(categoriesInUse).filter(cat => predefinedCategories.includes(cat)).sort();
          const customInUse = Array.from(categoriesInUse).filter(cat => !predefinedCategories.includes(cat)).sort();

          return {
            success: true,
            message: 'All categories currently in use',
            categories_in_use: Array.from(categoriesInUse).sort(),
            predefined_in_use: predefinedInUse,
            custom_in_use: customInUse,
            category_usage: categoryUsage,
            total_categories_in_use: categoriesInUse.size,
            total_predefined_in_use: predefinedInUse.length,
            total_custom_in_use: customInUse.length
          };
        }

        if (params.action === 'get_category' || params.action === 'remove_category') {
          if (!params.automation_id) {
            throw new Error('automation_id is required for get_category and remove_category actions');
          }

          // Get entity registry and category registry
          const [entityRegistry, categoryRegistry] = await Promise.all([
            wsClient.callWS({ type: 'config/entity_registry/list' }) as Promise<Array<{
              entity_id: string; 
              categories: { [domain: string]: string }; 
              [key: string]: any
            }>>,
            wsClient.callWS({ 
              type: 'config/category_registry/list',
              scope: 'automation'
            }) as Promise<Array<{
              category_id: string;
              name: string;
              icon?: string;
              [key: string]: any
            }>>
          ]);

          // Create category ID to name mapping
          const categoryIdToName = new Map<string, string>();
          categoryRegistry.forEach((category: any) => {
            categoryIdToName.set(category.category_id, category.name);
          });
          
          const entityEntry = entityRegistry.find((entry: any) => entry.entity_id === params.automation_id);

          if (!entityEntry) {
            return {
              success: false,
              message: `Automation '${params.automation_id}' not found in entity registry`,
              automation_id: params.automation_id,
            };
          }

          const currentCategoryId = entityEntry.categories?.automation;
          const currentCategoryName = currentCategoryId ? categoryIdToName.get(currentCategoryId) : null;

          if (params.action === 'get_category') {
            const isCustom = currentCategoryName ? !predefinedCategories.includes(currentCategoryName) : false;
            
            return {
              success: true,
              message: `Current category for automation '${params.automation_id}'`,
              automation_id: params.automation_id,
              category: currentCategoryName || null,
              category_type: currentCategoryName ? (isCustom ? 'custom' : 'predefined') : null,
              has_category: !!currentCategoryName,
            };
          }

          // Remove category
          if (!currentCategoryName) {
            return {
              success: false,
              message: `Automation '${params.automation_id}' has no category assigned`,
              automation_id: params.automation_id,
            };
          }

          try {
            const updatedCategories = { ...entityEntry.categories };
            delete updatedCategories.automation;

            const updateResult = await wsClient.callWS({
              type: 'config/entity_registry/update',
              entity_id: params.automation_id,
              categories: updatedCategories
            });

            const wasCustom = currentCategoryName ? !predefinedCategories.includes(currentCategoryName) : false;

            return {
              success: true,
              message: `Successfully removed ${wasCustom ? 'custom ' : ''}category '${currentCategoryName}' from automation '${params.automation_id}'`,
              automation_id: params.automation_id,
              removed_category: currentCategoryName,
              removed_category_type: wasCustom ? 'custom' : 'predefined',
              updated_entity: updateResult,
            };

          } catch (updateError) {
            return {
              success: false,
              message: `Failed to remove automation category: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
              automation_id: params.automation_id,
            };
          }
        }

        if (params.action === 'list_by_category') {
          // Get all automations, entity registry, and category registry
          const [states, entityRegistry, categoryRegistry] = await Promise.all([
            fetch(`${HASS_HOST}/api/states`, {
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }).then(res => res.json()) as Promise<HassState[]>,
            wsClient.callWS({ type: 'config/entity_registry/list' }) as Promise<Array<{
              entity_id: string; 
              categories: { [domain: string]: string }; 
              [key: string]: any
            }>>,
            wsClient.callWS({ 
              type: 'config/category_registry/list',
              scope: 'automation'
            }) as Promise<Array<{
              category_id: string;
              name: string;
              icon?: string;
              [key: string]: any
            }>>
          ]);

          // Create category ID to name mapping
          const categoryIdToName = new Map<string, string>();
          categoryRegistry.forEach((category: any) => {
            categoryIdToName.set(category.category_id, category.name);
          });

          const automations = states.filter(state => state.entity_id.startsWith('automation.'));
          
          const automationsByCategory: { [category: string]: any[] } = {};
          const uncategorizedAutomations: any[] = [];

          automations.forEach(automation => {
            const entityEntry = entityRegistry.find((entry: any) => entry.entity_id === automation.entity_id);
            const categoryId = entityEntry?.categories?.automation;
            
            // Resolve category ID to name
            const categoryName = categoryId ? categoryIdToName.get(categoryId) : null;
            const isCustom = categoryName ? !predefinedCategories.includes(categoryName) : false;

            const automationInfo = {
              entity_id: automation.entity_id,
              name: automation.attributes.friendly_name || automation.entity_id.split('.')[1],
              state: automation.state,
              description: automation.attributes.description || null,
              category: categoryName || null,
              category_type: categoryName ? (isCustom ? 'custom' : 'predefined') : null,
            };

            // Filter by custom/predefined if requested
            if (!params.include_custom && isCustom) {
              return; // Skip custom categories if not included
            }

            if (categoryName) {
              if (!automationsByCategory[categoryName]) {
                automationsByCategory[categoryName] = [];
              }
              automationsByCategory[categoryName].push(automationInfo);
            } else {
              uncategorizedAutomations.push(automationInfo);
            }
          });

          // Filter by specific category if requested
          if (params.category) {
            const categoryAutomations = automationsByCategory[params.category] || [];
            const isRequestedCategoryCustom = !predefinedCategories.includes(params.category);
            
            return {
              success: true,
              message: `Automations in ${isRequestedCategoryCustom ? 'custom ' : ''}category '${params.category}'`,
              category: params.category,
              category_type: isRequestedCategoryCustom ? 'custom' : 'predefined',
              automations: categoryAutomations,
              total_automations: categoryAutomations.length,
            };
          }

          // Separate predefined and custom categories
          const predefinedCats: { [category: string]: any[] } = {};
          const customCats: { [category: string]: any[] } = {};

          Object.entries(automationsByCategory).forEach(([category, automationList]) => {
            if (predefinedCategories.includes(category)) {
              predefinedCats[category] = automationList;
            } else {
              customCats[category] = automationList;
            }
          });

          return {
            success: true,
            message: 'Automations grouped by category',
            predefined_categories: predefinedCats,
            custom_categories: customCats,
            uncategorized_automations: uncategorizedAutomations,
            total_predefined_categories: Object.keys(predefinedCats).length,
            total_custom_categories: Object.keys(customCats).length,
            total_categorized: Object.values(automationsByCategory).reduce((sum, arr) => sum + arr.length, 0),
            total_uncategorized: uncategorizedAutomations.length,
            total_automations: automations.length,
          };
        }

        throw new Error(`Unknown action: ${params.action}`);

      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          action: params.action,
          automation_id: params.automation_id,
          category: params.category,
        };
      }
    }
  };
  registerTool(automationCategoryManageTool);

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
    description: 'Advanced automation configuration and management with enhanced reliability features. Includes automatic configuration validation, update verification, robust ID resolution, comprehensive error reporting, and retry logic for maximum success rates.',
    parameters: z.object({
      action: z.enum(['create', 'update', 'delete', 'duplicate']).describe('Action to perform with automation config'),
      automation_id: z.string().optional().describe('Automation ID (required for update, delete, and duplicate). Supports multiple formats: full entity ID (automation.my_automation), numeric ID (1718469913974), or entity name (my_automation). Automatic format resolution ensures maximum compatibility.'),
      config: z.object({
        alias: z.string().describe('Friendly name for the automation'),
        description: z.string().optional().describe('Description of what the automation does'),
        mode: z.enum(['single', 'parallel', 'queued', 'restart']).optional().describe('How multiple triggerings are handled'),
        trigger: z.array(z.any()).describe('List of triggers'),
        condition: z.array(z.any()).optional().describe('List of conditions'),
        action: z.array(z.any()).describe('List of actions'),
      }).optional().describe('Automation configuration (required for create and update). Configuration is automatically validated for required fields, proper structure, and common errors before sending to Home Assistant. Updates are verified to ensure they actually applied, with detailed debugging information provided if issues occur.'),
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

            // Use enhanced automation update with validation and verification
            const result = await updateAutomationWithDebug(
              params.automation_id,
              params.config as AutomationConfigType,
              HASS_HOST!,
              HASS_TOKEN!,
              wsClient
            );

            // If successful, try to reload automations
            if (result.success && wsClient) {
              try {
                await wsClient.callService('automation', 'reload');
              } catch (reloadError) {
                logger.warn(`Automation reload failed but update succeeded: ${reloadError}`);
              }
            }

            return {
              ...result,
              source: 'manage_automation_config_enhanced_update'
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

            // Use enhanced automation info retrieval to get the config
            const result = await getAutomationInfo(
              params.automation_id,
              HASS_HOST!,
              HASS_TOKEN!
            );

            if (!result.success || !result.config) {
              throw new Error(`Failed to get automation config for duplication: ${result.message}`);
            }

            // Modify config for duplication
            const duplicateConfig = {
              ...result.config,
              alias: `${result.config.alias} (Copy)`,
              // Remove ID so a new one gets generated
              id: undefined
            };

            // Validate the duplicate config
            const validation = validateAutomationConfig(duplicateConfig);
            if (!validation.valid) {
              throw new Error(`Duplicate configuration validation failed: ${validation.errors.join(', ')}`);
            }

            // Create new automation with modified config
            const createResponse = await fetch(`${HASS_HOST}/api/config/automation/config`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(duplicateConfig),
            });

            if (!createResponse.ok) {
              const errorText = await createResponse.text();
              throw new Error(`Failed to create duplicate automation: ${createResponse.statusText} - ${errorText}`);
            }

            const newAutomation = await createResponse.json() as AutomationResponse;
            
            // Reload automations if possible
            if (wsClient) {
              try {
                await wsClient.callService('automation', 'reload');
              } catch (reloadError) {
                logger.warn(`Automation reload failed but duplication succeeded: ${reloadError}`);
              }
            }

            return {
              success: true,
              message: `Successfully duplicated automation ${params.automation_id}`,
              new_automation_id: newAutomation.automation_id,
              source: 'enhanced_duplication_with_validation'
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

          // Validate entity exists and is an update entity
          const validationResult = await entityValidator.validateEntityExists(params.entity_id);
          if (!validationResult.valid) {
            return {
              success: false,
              message: validationResult.error || 'Entity validation failed',
              entity_id: params.entity_id
            };
          }

          // Validate it's an update entity
          const [domain] = params.entity_id.split('.');
          if (domain !== 'update') {
            return {
              success: false,
              message: `Entity '${params.entity_id}' is not an update entity`,
              entity_id: params.entity_id,
              current_domain: domain
            };
          }

          // Check if update is available for install action
          if (params.action === 'install' && validationResult.currentState === 'off') {
            return {
              success: false,
              message: `No update available for ${params.entity_id}`,
              entity_id: params.entity_id,
              current_state: validationResult.currentState,
              installed_version: validationResult.attributes?.installed_version,
              latest_version: validationResult.attributes?.latest_version
            };
          }

          const stateBefore = validationResult.currentState;

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
            const errorText = await response.text();
            return {
              success: false,
              message: `Failed to ${params.action} update: ${response.status} ${response.statusText}`,
              entity_id: params.entity_id,
              error_details: errorText,
              state_before: stateBefore
            };
          }

          const responseData = await response.json();

          // Verify state change for certain operations
          let stateAfter = stateBefore;
          let stateChanged = false;
          
          if (params.action === 'install' || params.action === 'skip') {
            // Wait a moment and check state
            await new Promise(resolve => setTimeout(resolve, 2000));
            const stateAfterValidation = await entityValidator.validateEntityExists(params.entity_id);
            stateAfter = stateAfterValidation.currentState || stateBefore;
            stateChanged = stateBefore !== stateAfter;
          }

          return {
            success: true,
            message: `Successfully executed ${params.action} for ${params.entity_id}`,
            entity_id: params.entity_id,
            action: params.action,
            state_before: stateBefore,
            state_after: stateAfter,
            state_changed: stateChanged,
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