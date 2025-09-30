import { logger } from './logger.js';

/**
 * Types for automation handling
 */
export interface AutomationIdResolution {
  entity_id: string;
  numeric_id: string;
  both_formats: string[];
  original_input: string;
}

export interface AutomationConfig {
  id?: string;
  alias: string;
  description?: string;
  mode?: 'single' | 'restart' | 'queued' | 'parallel';
  trigger: any[];
  condition?: any[];
  action: any[];
  [key: string]: any;
}

export interface AutomationValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface AutomationUpdateResult {
  success: boolean;
  message: string;
  verified?: boolean;
  attempted_ids?: string[];
  automation_id?: string;
  entity_id?: string;
  debug_info?: {
    resolved_ids: AutomationIdResolution;
    config_validation: AutomationValidationResult;
    current_ha_version?: string;
    websocket_connection?: boolean;
    [key: string]: any; // Allow additional debug properties
  };
}

/**
 * Types for automation trace data
 */
export interface AutomationTraceStep {
  path: string;
  timestamp: string;
  changed_variables?: Record<string, any>;
  result?: any;
  error?: string;
}

export interface AutomationTrace {
  run_id: string;
  automation_id: string;
  timestamp: string;
  trigger?: any;
  variables?: Record<string, any>;
  condition?: any;
  action?: any;
  config: AutomationConfig;
  context: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
  state: 'running' | 'stopped' | 'debugged';
  script_execution?: 'finished' | 'cancelled' | 'timeout' | 'failed';
  trace: Record<string, AutomationTraceStep[]>;
  last_step?: string;
  error?: string;
}

export interface AutomationTraceListItem {
  run_id: string;
  timestamp: string;
  state: 'running' | 'stopped' | 'debugged';
  script_execution?: 'finished' | 'cancelled' | 'timeout' | 'failed';
  last_step?: string;
  error?: string;
}

export interface AutomationTraceListResult {
  success: boolean;
  traces?: AutomationTraceListItem[];
  message?: string;
  automation_id?: string;
  entity_id?: string;
}

export interface AutomationTraceDetailResult {
  success: boolean;
  trace?: AutomationTrace;
  message?: string;
  automation_id?: string;
  entity_id?: string;
}

export interface AutomationTraceFilter {
  has_error?: boolean;
  script_execution?: 'finished' | 'cancelled' | 'timeout' | 'failed';
  state?: 'running' | 'stopped' | 'debugged';
  since?: string; // ISO timestamp
  limit?: number;
}

export interface AutomationErrorTraceResult {
  success: boolean;
  error_traces?: AutomationTraceListItem[];
  message?: string;
  automation_id?: string;
  entity_id?: string;
  total_traces?: number;
  error_count?: number;
}

/**
 * Resolve automation ID from various input formats
 */
export function resolveAutomationId(automationInput: string): AutomationIdResolution {
  let entity_id: string;
  let numeric_id: string;

  if (automationInput.startsWith('automation.')) {
    // Input is full entity ID
    entity_id = automationInput;
    numeric_id = automationInput.substring('automation.'.length);
  } else {
    // Input is numeric ID or entity name
    numeric_id = automationInput;
    entity_id = `automation.${automationInput}`;
  }

  return {
    entity_id,
    numeric_id,
    both_formats: [entity_id, numeric_id],
    original_input: automationInput
  };
}

/**
 * Get the actual internal automation ID by looking up the automation configuration
 * This is critical for updates to work correctly - entity IDs are not the same as internal IDs
 */
export async function getActualAutomationId(
  automationInput: string,
  hassHost: string,
  hassToken: string
): Promise<{ success: boolean; internal_id?: string; entity_id?: string; message: string }> {
  const resolved = resolveAutomationId(automationInput);
  
  try {
    // First, try to get all automation configs to find the correct internal ID
    const configListResponse = await fetch(`${hassHost}/api/config/automation/config`, {
      headers: {
        Authorization: `Bearer ${hassToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (configListResponse.ok) {
      const allConfigs = await configListResponse.json() as Array<{ id: string; alias?: string; [key: string]: any }>;
      
      // Look for automation by entity ID or alias
      for (const config of allConfigs) {
        const configEntityId = `automation.${config.id || 'unknown'}`;
        
        // Match by entity ID suffix or by alias
        if (configEntityId === resolved.entity_id || 
            config.id === resolved.numeric_id ||
            config.alias === resolved.numeric_id ||
            (config.alias && config.alias.toLowerCase().replace(/[^a-z0-9]/g, '_') === resolved.numeric_id)) {
          
          // Get the state to confirm this is the right automation
          try {
            const stateResponse = await fetch(`${hassHost}/api/states/${configEntityId}`, {
              headers: {
                Authorization: `Bearer ${hassToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (stateResponse.ok) {
              const state = await stateResponse.json();
              return {
                success: true,
                internal_id: config.id,
                entity_id: configEntityId,
                message: `Found automation with internal ID ${config.id} and entity ID ${configEntityId}`
              };
            }
          } catch (stateError) {
            // Continue searching if state check fails
          }
        }
      }
    }
    
    // If we didn't find it in the config list, try direct numeric ID lookup
    if (/^\d+$/.test(resolved.numeric_id)) {
      try {
        const directConfigResponse = await fetch(`${hassHost}/api/config/automation/config/${resolved.numeric_id}`, {
          headers: {
            Authorization: `Bearer ${hassToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (directConfigResponse.ok) {
          const config = await directConfigResponse.json() as { id?: string; [key: string]: any };
          return {
            success: true,
            internal_id: resolved.numeric_id,
            entity_id: `automation.${config.id || resolved.numeric_id}`,
            message: `Found automation with direct numeric ID lookup: ${resolved.numeric_id}`
          };
        }
      } catch (directError) {
        // Continue to final state-based lookup
      }
    }

    // Final fallback: try to verify the entity exists in states
    try {
      const stateResponse = await fetch(`${hassHost}/api/states/${resolved.entity_id}`, {
        headers: {
          Authorization: `Bearer ${hassToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (stateResponse.ok) {
        const state = await stateResponse.json();
        // We know the entity exists, but we need to find its internal ID
        // This is a limitation - we found the entity but can't determine the internal ID
        return {
          success: false,
          entity_id: resolved.entity_id,
          message: `Found automation entity ${resolved.entity_id} but could not determine internal ID needed for updates. This automation may need to be managed through the Home Assistant UI.`
        };
      }
    } catch (stateError) {
      // Continue to error case
    }

    return {
      success: false,
      message: `Automation not found with any of the attempted methods: entity ID ${resolved.entity_id}, potential internal ID ${resolved.numeric_id}`
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to lookup automation ID: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate a single Home Assistant condition
 */
function validateHomeAssistantCondition(condition: any): { valid: boolean; error?: string } {
  // Standard condition types that require a 'condition' field
  const standardConditionTypes = [
    'and', 'or', 'not',          // Logic conditions
    'state', 'numeric_state',     // State conditions  
    'time', 'sun',               // Time conditions
    'zone', 'device',            // Location/device conditions
    'template',                  // Template conditions
    'trigger'                    // Trigger conditions
  ];

  if (condition.condition && standardConditionTypes.includes(condition.condition)) {
    return { valid: true };
  }

  // Some conditions might be structured differently
  // Check for common condition properties
  if (condition.entity_id || condition.device_id || condition.zone || condition.after || condition.before) {
    return { valid: true };
  }

  // Template conditions might just have a template
  if (condition.value_template || condition.condition_template) {
    return { valid: true };
  }

  return { 
    valid: false, 
    error: "missing 'condition' field or not a recognized condition format"
  };
}

/**
 * Validate a single Home Assistant trigger
 */
function validateHomeAssistantTrigger(trigger: any): { valid: boolean; error?: string } {
  // Most triggers require a platform field
  if (trigger.platform) {
    return { valid: true };
  }

  // Some special trigger formats don't use 'platform'
  const specialTriggerTypes = [
    'trigger',         // For template triggers: {"trigger": "..."}
    'device_id',       // Device triggers: {"device_id": "...", "domain": "...", "type": "..."}
  ];

  for (const specialType of specialTriggerTypes) {
    if (trigger[specialType] !== undefined) {
      return { valid: true };
    }
  }

  // Device triggers have device_id, domain, and type instead of platform
  if (trigger.device_id && trigger.domain && trigger.type) {
    return { valid: true };
  }

  return { 
    valid: false, 
    error: "missing 'platform' field or not a recognized trigger format"
  };
}

/**
 * Validate a single Home Assistant action
 */
function validateHomeAssistantAction(action: any): { valid: boolean; error?: string } {
  // Special action types that don't require 'service' or 'action' field
  const specialActionTypes = [
    'delay',           // {"delay": "00:15:00"}
    'wait_template',   // {"wait_template": "{{ ... }}"}
    'wait_for_trigger', // {"wait_for_trigger": [...]}
    'condition',       // {"condition": "state", ...}
    'choose',          // {"choose": [...]}
    'repeat',          // {"repeat": {...}}
    'stop',            // {"stop": "message"}
    'event',           // {"event": "custom_event"}
    'scene',           // {"scene": "scene.morning"}
    'variables',       // {"variables": {...}}
    'parallel'         // {"parallel": [...]}
  ];

  // Check if it's a special action type
  for (const specialType of specialActionTypes) {
    if (action[specialType] !== undefined) {
      return { valid: true }; // Special action types are valid
    }
  }

  // Check for standard service call actions
  if (action.service || action.action) {
    return { valid: true };
  }

  // Check if it's a domain.service format in the root
  const keys = Object.keys(action);
  const domainServicePattern = /^[a-z_]+\.[a-z_]+$/;
  if (keys.some(key => domainServicePattern.test(key))) {
    return { valid: true }; // Domain.service format is valid
  }

  // If none of the above, it's invalid
  return { 
    valid: false, 
    error: "missing 'service' or 'action' field, or not a recognized special action type (delay, wait_template, condition, choose, repeat, etc.)"
  };
}

/**
 * Validate automation configuration before sending to Home Assistant
 */
export function validateAutomationConfig(config: AutomationConfig): AutomationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  const requiredFields = ['alias', 'trigger', 'action'];
  for (const field of requiredFields) {
    if (!(field in config)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Alias validation
  if (config.alias && typeof config.alias !== 'string') {
    errors.push('Alias must be a string');
  } else if (config.alias && config.alias.length === 0) {
    errors.push('Alias cannot be empty');
  }

  // Trigger validation
  if (config.trigger) {
    if (!Array.isArray(config.trigger)) {
      errors.push('Trigger must be an array');
    } else if (config.trigger.length === 0) {
      errors.push('At least one trigger is required');
    } else {
      config.trigger.forEach((trigger, index) => {
        if (!trigger || typeof trigger !== 'object') {
          errors.push(`Trigger ${index} must be an object`);
        } else {
          const isValidTrigger = validateHomeAssistantTrigger(trigger);
          if (!isValidTrigger.valid) {
            errors.push(`Trigger ${index} ${isValidTrigger.error}`);
          }
        }
      });
    }
  }

  // Action validation
  if (config.action) {
    if (!Array.isArray(config.action)) {
      errors.push('Action must be an array');
    } else if (config.action.length === 0) {
      errors.push('At least one action is required');
    } else {
      config.action.forEach((action, index) => {
        if (!action || typeof action !== 'object') {
          errors.push(`Action ${index} must be an object`);
        } else {
          // Check if it's a valid Home Assistant action
          const isValidAction = validateHomeAssistantAction(action);
          if (!isValidAction.valid) {
            errors.push(`Action ${index} ${isValidAction.error}`);
          }
        }
      });
    }
  }

  // Condition validation (optional)
  if (config.condition) {
    if (!Array.isArray(config.condition)) {
      errors.push('Condition must be an array');
    } else {
      config.condition.forEach((condition, index) => {
        if (!condition || typeof condition !== 'object') {
          errors.push(`Condition ${index} must be an object`);
        } else {
          const isValidCondition = validateHomeAssistantCondition(condition);
          if (!isValidCondition.valid) {
            errors.push(`Condition ${index} ${isValidCondition.error}`);
          }
        }
      });
    }
  }

  // Mode validation
  if (config.mode && !['single', 'restart', 'queued', 'parallel'].includes(config.mode)) {
    errors.push("Mode must be one of: 'single', 'restart', 'queued', 'parallel'");
  }

  // Description validation
  if (config.description && typeof config.description !== 'string') {
    warnings.push('Description should be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Get current automation configuration for comparison
 */
export async function getCurrentAutomationConfig(
  automationId: string,
  hassHost: string,
  hassToken: string
): Promise<AutomationConfig | null> {
  const resolved = resolveAutomationId(automationId);
  
  try {
    // Try config API first
    const configResponse = await fetch(`${hassHost}/api/config/automation/config/${resolved.numeric_id}`, {
      headers: {
        Authorization: `Bearer ${hassToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (configResponse.ok) {
      return await configResponse.json() as AutomationConfig;
    }
  } catch (error) {
    logger.warn(`Failed to get automation config via config API: ${error}`);
  }

  try {
    // Fallback to state API
    const stateResponse = await fetch(`${hassHost}/api/states/${resolved.entity_id}`, {
      headers: {
        Authorization: `Bearer ${hassToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (stateResponse.ok) {
      const state = await stateResponse.json() as any;
      // Return basic info from state if config not available
      return {
        alias: state.attributes?.friendly_name || resolved.entity_id,
        description: state.attributes?.description,
        mode: state.attributes?.mode || 'single',
        trigger: [], // Can't get from state API
        action: []   // Can't get from state API
      };
    }
  } catch (error) {
    logger.warn(`Failed to get automation state: ${error}`);
  }

  return null;
}

/**
 * Wait for automation configuration changes to propagate
 */
export async function waitForConfigPropagation(delayMs: number = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Compare two automation configs to detect changes
 */
export function configsAreEqual(config1: AutomationConfig, config2: AutomationConfig): boolean {
  // Simple comparison - in practice, you might want more sophisticated comparison
  const config1Clean = { ...config1 };
  const config2Clean = { ...config2 };
  
  // Remove fields that might change automatically
  delete config1Clean.id;
  delete config2Clean.id;
  
  return JSON.stringify(config1Clean) === JSON.stringify(config2Clean);
}

/**
 * Attempt to update automation and verify the change actually applied
 * CRITICAL FIX: This now properly resolves the actual internal automation ID to prevent creating duplicate automations
 */
export async function updateAutomationWithVerification(
  automationId: string,
  config: AutomationConfig,
  hassHost: string,
  hassToken: string
): Promise<AutomationUpdateResult> {
  const resolved = resolveAutomationId(automationId);
  
  try {
    // CRITICAL: Get the actual internal automation ID first
    // This prevents creating new automations when we should be updating existing ones
    const idLookup = await getActualAutomationId(automationId, hassHost, hassToken);
    
    if (!idLookup.success || !idLookup.internal_id) {
      return {
        success: false,
        message: `Cannot update automation: ${idLookup.message}. Unable to determine the internal automation ID needed for updates. This commonly happens when trying to update automations using entity IDs instead of their internal numeric IDs.`,
        debug_info: {
          resolved_ids: resolved,
          id_lookup_result: idLookup,
          config_validation: validateAutomationConfig(config),
          fix_suggestion: "To fix this, either: 1) Use the automation's numeric ID instead of entity ID, 2) Create a new automation, or 3) Use the Home Assistant UI to edit this automation"
        }
      };
    }

    const actualInternalId = idLookup.internal_id;
    const actualEntityId = idLookup.entity_id || resolved.entity_id;
    
    // Get current config for comparison
    const oldConfig = await getCurrentAutomationConfig(actualInternalId, hassHost, hassToken);
    
    // Validate new config
    const validation = validateAutomationConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        message: `Configuration validation failed: ${validation.errors.join(', ')}`,
        debug_info: {
          resolved_ids: resolved,
          actual_internal_id: actualInternalId,
          actual_entity_id: actualEntityId,
          config_validation: validation
        }
      };
    }

    // Prepare config with the ACTUAL internal ID (not the entity ID suffix)
    const configWithId = {
      id: actualInternalId,
      ...config
    };

    // Attempt update using the correct internal ID
    const response = await fetch(`${hassHost}/api/config/automation/config/${actualInternalId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hassToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configWithId),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Update failed: ${response.status} ${response.statusText} - ${errorText}`,
        attempted_ids: [actualInternalId],
        debug_info: {
          resolved_ids: resolved,
          actual_internal_id: actualInternalId,
          actual_entity_id: actualEntityId,
          config_validation: validation
        }
      };
    }

    // Wait for propagation
    await waitForConfigPropagation();

    // Verify the update actually applied
    if (oldConfig) {
      const newConfig = await getCurrentAutomationConfig(actualInternalId, hassHost, hassToken);
      
      if (newConfig && configsAreEqual(newConfig, oldConfig)) {
        return {
          success: false,
          message: 'Update reported success but configuration unchanged',
          verified: false,
          automation_id: actualInternalId,
          entity_id: actualEntityId,
          debug_info: {
            resolved_ids: resolved,
            actual_internal_id: actualInternalId,
            actual_entity_id: actualEntityId,
            config_validation: validation
          }
        };
      }
    }

    const responseData = await response.json() as { automation_id?: string };
    
    return {
      success: true,
      message: `Successfully updated automation: ${config.alias}`,
      verified: true,
      automation_id: responseData.automation_id || actualInternalId,
      entity_id: actualEntityId,
      debug_info: {
        resolved_ids: resolved,
        actual_internal_id: actualInternalId,
        actual_entity_id: actualEntityId,
        config_validation: validation,
        used_proper_id_resolution: true
      }
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      attempted_ids: [resolved.numeric_id],
      debug_info: {
        resolved_ids: resolved,
        config_validation: validateAutomationConfig(config),
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Try multiple approaches to update automation with retry logic
 * FIXED: Now uses proper ID resolution instead of guessing formats
 */
export async function updateAutomationRobust(
  automationId: string,
  config: AutomationConfig,
  hassHost: string,
  hassToken: string
): Promise<AutomationUpdateResult> {
  // The new updateAutomationWithVerification already handles proper ID resolution
  // No need for multiple attempts - we now correctly identify the internal ID first
  return await updateAutomationWithVerification(automationId, config, hassHost, hassToken);
}

/**
 * Enhanced automation update with comprehensive debugging
 */
export async function updateAutomationWithDebug(
  automationId: string,
  config: AutomationConfig,
  hassHost: string,
  hassToken: string,
  wsClient?: any
): Promise<AutomationUpdateResult> {
  const result = await updateAutomationRobust(automationId, config, hassHost, hassToken);
  
  if (!result.success && result.debug_info) {
    // Add additional debugging information
    try {
      // Check Home Assistant version if possible
      const versionResponse = await fetch(`${hassHost}/api/`, {
        headers: {
          Authorization: `Bearer ${hassToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (versionResponse.ok) {
        const versionData = await versionResponse.json() as any;
        result.debug_info.current_ha_version = versionData.version;
      }
    } catch (error) {
      // Ignore version check errors
    }

    // Check WebSocket connection status
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
      if (result.debug_info) {
        result.debug_info.websocket_connection = false;
        result.debug_info.websocket_error = connectionError instanceof Error ? connectionError.message : String(connectionError);
      }
    }
  }
  
  return result;
}

/**
 * Get enhanced automation information with config and state
 */
export async function getAutomationInfo(
  automationId: string,
  hassHost: string,
  hassToken: string
): Promise<{
  success: boolean;
  entity_id: string;
  config?: AutomationConfig;
  state?: any;
  message?: string;
  source: 'config_api' | 'state_api' | 'both' | 'none';
}> {
  const resolved = resolveAutomationId(automationId);
  let config: AutomationConfig | null = null;
  let state: any = null;
  let configSource = false;
  let stateSource = false;

  // Try to get config
  try {
    config = await getCurrentAutomationConfig(automationId, hassHost, hassToken);
    if (config) configSource = true;
  } catch (error) {
    logger.warn(`Failed to get automation config: ${error}`);
  }

  // Try to get state
  try {
    const stateResponse = await fetch(`${hassHost}/api/states/${resolved.entity_id}`, {
      headers: {
        Authorization: `Bearer ${hassToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (stateResponse.ok) {
      state = await stateResponse.json();
      stateSource = true;
    }
  } catch (error) {
    logger.warn(`Failed to get automation state: ${error}`);
  }

  // Determine source and success
  let source: 'config_api' | 'state_api' | 'both' | 'none';
  if (configSource && stateSource) {
    source = 'both';
  } else if (configSource) {
    source = 'config_api';
  } else if (stateSource) {
    source = 'state_api';
  } else {
    source = 'none';
  }

  const success = configSource || stateSource;
  const message = success 
    ? `Retrieved automation info from ${source.replace('_', ' ')}`
    : `Failed to retrieve automation info for ${resolved.entity_id}`;

  return {
    success,
    entity_id: resolved.entity_id,
    config: config || undefined,
    state: state || undefined,
    message,
    source
  };
}

/**
 * Get list of automation traces for a specific automation
 * Each automation stores traces of recent executions for debugging purposes
 */
export async function getAutomationTraces(
  automationId: string,
  hassHost: string,
  hassToken: string,
  wsClient?: any
): Promise<AutomationTraceListResult> {
  const resolved = resolveAutomationId(automationId);
  
  try {
    // Get the actual internal automation ID first
    const idLookup = await getActualAutomationId(automationId, hassHost, hassToken);
    
    if (!idLookup.success || !idLookup.internal_id) {
      return {
        success: false,
        message: `Cannot retrieve traces: ${idLookup.message}`,
        automation_id: resolved.numeric_id,
        entity_id: resolved.entity_id
      };
    }

    const actualInternalId = idLookup.internal_id;
    const actualEntityId = idLookup.entity_id || resolved.entity_id;

    // Try WebSocket API first if available
    if (wsClient && typeof wsClient.listAutomationTraces === 'function') {
      try {
        const wsTraceData = await wsClient.listAutomationTraces(actualInternalId);
        
        if (wsTraceData && Array.isArray(wsTraceData)) {
          const traces: AutomationTraceListItem[] = wsTraceData.map((trace: any) => ({
            run_id: trace?.run_id || 'unknown',
            timestamp: trace?.timestamp || new Date().toISOString(),
            state: trace?.state || 'stopped', 
            script_execution: trace?.script_execution,
            last_step: trace?.last_step,
            error: trace?.error
          }));

          return {
            success: true,
            traces,
            automation_id: actualInternalId,
            entity_id: actualEntityId,
            message: `Retrieved ${traces.length} trace(s) for automation ${actualEntityId} via WebSocket`
          };
        }
      } catch (wsError) {
        logger.warn(`WebSocket trace retrieval failed: ${wsError}, falling back to alternative methods`);
      }
    }

    // Fallback: Try to get trace information from logbook API
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const logbookResponse = await fetch(`${hassHost}/api/logbook/${yesterday.toISOString()}?entity=${actualEntityId}`, {
        headers: {
          Authorization: `Bearer ${hassToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (logbookResponse.ok) {
        const logbookData = await logbookResponse.json();
        
        if (Array.isArray(logbookData)) {
          // Convert logbook entries to trace-like format
          const traces: AutomationTraceListItem[] = logbookData
            .filter((entry: any) => entry.entity_id === actualEntityId && entry.domain === 'automation')
            .slice(0, 5) // Limit to last 5 like trace storage
            .map((entry: any, index: number) => ({
              run_id: `logbook-${entry.when}-${index}`,
              timestamp: entry.when,
              state: 'stopped', // Logbook entries are historical, so they're stopped
              script_execution: entry.state === 'off' ? undefined : 'finished',
              last_step: undefined,
              error: entry.message?.includes('error') ? entry.message : undefined
            }));

          return {
            success: true,
            traces,
            automation_id: actualInternalId,
            entity_id: actualEntityId,
            message: `Retrieved ${traces.length} trace(s) from logbook for automation ${actualEntityId} (WebSocket traces not available)`
          };
        }
      }
    } catch (logbookError) {
      logger.warn(`Logbook fallback failed: ${logbookError}`);
    }

    // Last resort: Return empty traces with informative message
    return {
      success: true,
      traces: [],
      automation_id: actualInternalId,
      entity_id: actualEntityId,
      message: `No traces available for automation ${actualEntityId}. Trace functionality may require Home Assistant 2021.4+ or may only be available through the UI.`
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while retrieving traces',
      automation_id: resolved.numeric_id,
      entity_id: resolved.entity_id
    };
  }
}

/**
 * Get detailed trace data for a specific automation execution
 * This provides step-by-step execution details for debugging
 */
export async function getAutomationTraceDetail(
  automationId: string,
  runId: string,
  hassHost: string,
  hassToken: string,
  wsClient?: any
): Promise<AutomationTraceDetailResult> {
  const resolved = resolveAutomationId(automationId);
  
  try {
    // Get the actual internal automation ID first
    const idLookup = await getActualAutomationId(automationId, hassHost, hassToken);
    
    if (!idLookup.success || !idLookup.internal_id) {
      return {
        success: false,
        message: `Cannot retrieve trace detail: ${idLookup.message}`,
        automation_id: resolved.numeric_id,
        entity_id: resolved.entity_id
      };
    }

    const actualInternalId = idLookup.internal_id;
    const actualEntityId = idLookup.entity_id || resolved.entity_id;

    // Try WebSocket API first if available
    if (wsClient && typeof wsClient.getAutomationTraceDetail === 'function') {
      try {
        const wsTraceDetail = await wsClient.getAutomationTraceDetail(actualInternalId, runId);
        
        if (wsTraceDetail) {
          const trace: AutomationTrace = {
            run_id: wsTraceDetail?.run_id || runId,
            automation_id: actualInternalId,
            timestamp: wsTraceDetail?.timestamp || new Date().toISOString(),
            trigger: wsTraceDetail?.trigger,
            variables: wsTraceDetail?.variables,
            condition: wsTraceDetail?.condition,
            action: wsTraceDetail?.action,
            config: wsTraceDetail?.config || {},
            context: wsTraceDetail?.context || { id: 'unknown' },
            state: wsTraceDetail?.state || 'stopped',
            script_execution: wsTraceDetail?.script_execution,
            trace: wsTraceDetail?.trace || {},
            last_step: wsTraceDetail?.last_step,
            error: wsTraceDetail?.error
          };

          return {
            success: true,
            trace,
            automation_id: actualInternalId,
            entity_id: actualEntityId,
            message: `Retrieved detailed trace for run ${runId} of automation ${actualEntityId} via WebSocket`
          };
        }
      } catch (wsError) {
        logger.warn(`WebSocket trace detail retrieval failed: ${wsError}, falling back to alternative methods`);
      }
    }

    // Fallback: If this is a logbook-based run_id, try to get more details from logbook
    if (runId.startsWith('logbook-')) {
      try {
        // Extract timestamp from logbook run_id format: logbook-timestamp-index
        const parts = runId.split('-');
        if (parts.length >= 2) {
          const timestamp = parts[1];
          
          const logbookResponse = await fetch(`${hassHost}/api/logbook/${timestamp}?entity=${actualEntityId}`, {
            headers: {
              Authorization: `Bearer ${hassToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (logbookResponse.ok) {
            const logbookData = await logbookResponse.json();
            const entry = Array.isArray(logbookData) ? logbookData[0] : logbookData;
            
            if (entry) {
              // Create a basic trace from logbook data
              const trace: AutomationTrace = {
                run_id: runId,
                automation_id: actualInternalId,
                timestamp: entry.when || timestamp,
                trigger: { platform: 'unknown', description: 'Trace data reconstructed from logbook' },
                variables: {},
                config: {
                  alias: entry.name || actualEntityId,
                  trigger: [],
                  action: []
                },
                context: { id: entry.context_id || 'unknown' },
                state: 'stopped',
                script_execution: entry.state === 'off' ? undefined : 'finished',
                trace: {
                  'logbook_entry': [{
                    path: 'logbook_entry',
                    timestamp: entry.when || timestamp,
                    result: {
                      message: entry.message,
                      state: entry.state,
                      entity_id: entry.entity_id
                    }
                  }]
                },
                last_step: 'logbook_entry',
                error: entry.message?.includes('error') ? entry.message : undefined
              };

              return {
                success: true,
                trace,
                automation_id: actualInternalId,
                entity_id: actualEntityId,
                message: `Retrieved trace detail from logbook for run ${runId} (full trace data not available)`
              };
            }
          }
        }
      } catch (logbookError) {
        logger.warn(`Logbook trace detail fallback failed: ${logbookError}`);
      }
    }

    return {
      success: false,
      message: `Trace detail not available for run ${runId}. This may be because the trace has expired, the run ID is invalid, or trace functionality is not supported by your Home Assistant version.`,
      automation_id: actualInternalId,
      entity_id: actualEntityId
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while retrieving trace detail',
      automation_id: resolved.numeric_id,
      entity_id: resolved.entity_id
    };
  }
}

/**
 * Get the most recent trace for an automation
 * Convenience function to get the latest execution trace
 */
export async function getAutomationLatestTrace(
  automationId: string,
  hassHost: string,
  hassToken: string,
  wsClient?: any
): Promise<AutomationTraceDetailResult> {
  try {
    // First get the list of traces
    const tracesList = await getAutomationTraces(automationId, hassHost, hassToken, wsClient);
    
    if (!tracesList.success || !tracesList.traces || tracesList.traces.length === 0) {
      return {
        success: false,
        message: tracesList.message || 'No traces found for this automation',
        automation_id: tracesList.automation_id,
        entity_id: tracesList.entity_id
      };
    }

    // Get the most recent trace (first in the list, assuming they're sorted by timestamp desc)
    const latestTrace = tracesList.traces[0];
    
    // Get the detailed trace data
    return await getAutomationTraceDetail(automationId, latestTrace.run_id, hassHost, hassToken, wsClient);
    
  } catch (error) {
    const resolved = resolveAutomationId(automationId);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while retrieving latest trace',
      automation_id: resolved.numeric_id,
      entity_id: resolved.entity_id
    };
  }
}

/**
 * Get automation traces that encountered errors during execution
 * Useful for debugging failed automations and identifying patterns
 */
export async function getAutomationErrorTraces(
  automationId: string,
  hassHost: string,
  hassToken: string,
  wsClient?: any,
  filter?: AutomationTraceFilter
): Promise<AutomationErrorTraceResult> {
  try {
    // Get all traces first
    const allTraces = await getAutomationTraces(automationId, hassHost, hassToken, wsClient);
    
    if (!allTraces.success || !allTraces.traces) {
      return {
        success: false,
        message: allTraces.message || 'Failed to retrieve traces',
        automation_id: allTraces.automation_id,
        entity_id: allTraces.entity_id,
        total_traces: 0,
        error_count: 0
      };
    }

    // Filter traces for errors
    const errorTraces = allTraces.traces.filter(trace => {
      // Check for explicit error field
      if (trace.error) return true;
      
      // Check for failed script execution
      if (trace.script_execution === 'failed' || 
          trace.script_execution === 'cancelled' || 
          trace.script_execution === 'timeout') {
        return true;
      }
      
      // Apply additional filters if provided
      if (filter) {
        if (filter.script_execution && trace.script_execution !== filter.script_execution) {
          return false;
        }
        if (filter.state && trace.state !== filter.state) {
          return false;
        }
        if (filter.since && new Date(trace.timestamp) < new Date(filter.since)) {
          return false;
        }
      }
      
      return false;
    });

    // Apply limit if specified
    const limitedErrorTraces = filter?.limit ? errorTraces.slice(0, filter.limit) : errorTraces;

    return {
      success: true,
      error_traces: limitedErrorTraces,
      message: `Found ${limitedErrorTraces.length} error trace(s) out of ${allTraces.traces.length} total traces for automation ${allTraces.entity_id}`,
      automation_id: allTraces.automation_id,
      entity_id: allTraces.entity_id,
      total_traces: allTraces.traces.length,
      error_count: limitedErrorTraces.length
    };

  } catch (error) {
    const resolved = resolveAutomationId(automationId);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while retrieving error traces',
      automation_id: resolved.numeric_id,
      entity_id: resolved.entity_id,
      total_traces: 0,
      error_count: 0
    };
  }
}

/**
 * Get filtered automation traces based on execution status and other criteria
 * Allows filtering by success/failure, execution state, time range, etc.
 */
export async function getFilteredAutomationTraces(
  automationId: string,
  filter: AutomationTraceFilter,
  hassHost: string,
  hassToken: string,
  wsClient?: any
): Promise<AutomationTraceListResult> {
  try {
    // Get all traces first
    const allTraces = await getAutomationTraces(automationId, hassHost, hassToken, wsClient);
    
    if (!allTraces.success || !allTraces.traces) {
      return allTraces;
    }

    // Apply filters
    let filteredTraces = allTraces.traces.filter(trace => {
      // Filter by error presence
      if (filter.has_error !== undefined) {
        const hasError = !!(trace.error || 
          trace.script_execution === 'failed' || 
          trace.script_execution === 'cancelled' || 
          trace.script_execution === 'timeout');
        
        if (filter.has_error !== hasError) {
          return false;
        }
      }
      
      // Filter by script execution status
      if (filter.script_execution && trace.script_execution !== filter.script_execution) {
        return false;
      }
      
      // Filter by state
      if (filter.state && trace.state !== filter.state) {
        return false;
      }
      
      // Filter by timestamp
      if (filter.since && new Date(trace.timestamp) < new Date(filter.since)) {
        return false;
      }
      
      return true;
    });

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      filteredTraces = filteredTraces.slice(0, filter.limit);
    }

    return {
      success: true,
      traces: filteredTraces,
      message: `Retrieved ${filteredTraces.length} filtered trace(s) out of ${allTraces.traces.length} total traces for automation ${allTraces.entity_id}`,
      automation_id: allTraces.automation_id,
      entity_id: allTraces.entity_id
    };

  } catch (error) {
    const resolved = resolveAutomationId(automationId);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while filtering traces',
      automation_id: resolved.numeric_id,
      entity_id: resolved.entity_id
    };
  }
}