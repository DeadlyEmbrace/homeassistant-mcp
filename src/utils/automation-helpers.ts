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
 */
export async function updateAutomationWithVerification(
  automationId: string,
  config: AutomationConfig,
  hassHost: string,
  hassToken: string
): Promise<AutomationUpdateResult> {
  const resolved = resolveAutomationId(automationId);
  
  try {
    // Get current config for comparison
    const oldConfig = await getCurrentAutomationConfig(automationId, hassHost, hassToken);
    
    // Validate new config
    const validation = validateAutomationConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        message: `Configuration validation failed: ${validation.errors.join(', ')}`,
        debug_info: {
          resolved_ids: resolved,
          config_validation: validation
        }
      };
    }

    // Prepare config with ID
    const configWithId = {
      id: resolved.numeric_id,
      ...config
    };

    // Attempt update
    const response = await fetch(`${hassHost}/api/config/automation/config/${resolved.numeric_id}`, {
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
        attempted_ids: [resolved.numeric_id],
        debug_info: {
          resolved_ids: resolved,
          config_validation: validation
        }
      };
    }

    // Wait for propagation
    await waitForConfigPropagation();

    // Verify the update actually applied
    if (oldConfig) {
      const newConfig = await getCurrentAutomationConfig(automationId, hassHost, hassToken);
      
      if (newConfig && configsAreEqual(newConfig, oldConfig)) {
        return {
          success: false,
          message: 'Update reported success but configuration unchanged',
          verified: false,
          automation_id: resolved.numeric_id,
          entity_id: resolved.entity_id,
          debug_info: {
            resolved_ids: resolved,
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
      automation_id: responseData.automation_id || resolved.numeric_id,
      entity_id: resolved.entity_id
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      attempted_ids: [resolved.numeric_id],
      debug_info: {
        resolved_ids: resolved,
        config_validation: validateAutomationConfig(config)
      }
    };
  }
}

/**
 * Try multiple approaches to update automation with retry logic
 */
export async function updateAutomationRobust(
  automationId: string,
  config: AutomationConfig,
  hassHost: string,
  hassToken: string
): Promise<AutomationUpdateResult> {
  const resolved = resolveAutomationId(automationId);
  const attemptedIds: string[] = [];
  
  // Try both ID formats
  for (const idVariant of resolved.both_formats) {
    attemptedIds.push(idVariant);
    
    try {
      const result = await updateAutomationWithVerification(idVariant, config, hassHost, hassToken);
      
      if (result.success) {
        result.attempted_ids = attemptedIds;
        return result;
      }
      
      // If this wasn't the last attempt, continue to next format
      if (idVariant !== resolved.both_formats[resolved.both_formats.length - 1]) {
        logger.info(`Update attempt with ID '${idVariant}' failed, trying next format`);
        continue;
      }
      
      // Last attempt failed, return the result with debug info
      result.attempted_ids = attemptedIds;
      return result;
      
    } catch (error) {
      if (idVariant === resolved.both_formats[resolved.both_formats.length - 1]) {
        // Last attempt failed
        return {
          success: false,
          message: `All update attempts failed. Last error: ${error instanceof Error ? error.message : String(error)}`,
          attempted_ids: attemptedIds,
          debug_info: {
            resolved_ids: resolved,
            config_validation: validateAutomationConfig(config)
          }
        };
      }
      // Continue to next attempt
      continue;
    }
  }

  // This should never be reached, but just in case
  return {
    success: false,
    message: 'No update attempts were made',
    attempted_ids: attemptedIds,
    debug_info: {
      resolved_ids: resolved,
      config_validation: validateAutomationConfig(config)
    }
  };
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