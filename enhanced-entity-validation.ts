/**
 * Enhanced Entity State Validation Logic
 * Improvements for more robust entity state checking
 */

// Current state checking logic lacks validation
// Here's what could be improved:

interface EntityStateValidator {
  validateEntityExists(entityId: string): Promise<boolean>;
  validateEntityState(entityId: string, expectedState?: string): Promise<{ valid: boolean; currentState: string; }>;
  validateEntityDomain(entityId: string, expectedDomain: string): boolean;
  validateEntityAttributes(entityId: string, requiredAttributes: string[]): Promise<{ valid: boolean; missing: string[]; }>;
}

class EnhancedEntityStateChecker implements EntityStateValidator {
  private hassHost: string;
  private hassToken: string;
  private entityCache: Map<string, { state: any; timestamp: number; }> = new Map();
  private cacheExpiry = 5000; // 5 seconds

  constructor(hassHost: string, hassToken: string) {
    this.hassHost = hassHost;
    this.hassToken = hassToken;
  }

  async validateEntityExists(entityId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.hassHost}/api/states/${entityId}`, {
        headers: {
          Authorization: `Bearer ${this.hassToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error(`Error checking entity existence for ${entityId}:`, error);
      return false;
    }
  }

  async validateEntityState(
    entityId: string, 
    expectedState?: string
  ): Promise<{ valid: boolean; currentState: string; }> {
    try {
      // Check cache first
      const cached = this.entityCache.get(entityId);
      const now = Date.now();
      
      let state;
      if (cached && (now - cached.timestamp) < this.cacheExpiry) {
        state = cached.state;
      } else {
        const response = await fetch(`${this.hassHost}/api/states/${entityId}`, {
          headers: {
            Authorization: `Bearer ${this.hassToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          return { valid: false, currentState: 'unknown' };
        }

        state = await response.json();
        this.entityCache.set(entityId, { state, timestamp: now });
      }

      const currentState = state.state;
      const valid = expectedState ? currentState === expectedState : true;

      return { valid, currentState };
    } catch (error) {
      console.error(`Error validating entity state for ${entityId}:`, error);
      return { valid: false, currentState: 'error' };
    }
  }

  validateEntityDomain(entityId: string, expectedDomain: string): boolean {
    const [domain] = entityId.split('.');
    return domain === expectedDomain;
  }

  async validateEntityAttributes(
    entityId: string, 
    requiredAttributes: string[]
  ): Promise<{ valid: boolean; missing: string[]; }> {
    try {
      const response = await fetch(`${this.hassHost}/api/states/${entityId}`, {
        headers: {
          Authorization: `Bearer ${this.hassToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { valid: false, missing: requiredAttributes };
      }

      const state = await response.json();
      const attributes = state.attributes || {};
      const missing = requiredAttributes.filter(attr => !(attr in attributes));

      return { valid: missing.length === 0, missing };
    } catch (error) {
      console.error(`Error validating entity attributes for ${entityId}:`, error);
      return { valid: false, missing: requiredAttributes };
    }
  }

  // Bulk validation for better performance
  async validateMultipleEntities(entityIds: string[]): Promise<Map<string, any>> {
    try {
      const response = await fetch(`${this.hassHost}/api/states`, {
        headers: {
          Authorization: `Bearer ${this.hassToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch states');
      }

      const allStates = await response.json();
      const stateMap = new Map();
      
      // Create lookup map
      allStates.forEach((state: any) => {
        stateMap.set(state.entity_id, state);
      });

      // Filter for requested entities
      const result = new Map();
      entityIds.forEach(entityId => {
        const state = stateMap.get(entityId);
        result.set(entityId, state || null);
      });

      return result;
    } catch (error) {
      console.error('Error in bulk entity validation:', error);
      return new Map();
    }
  }

  // Clear cache manually if needed
  clearCache(): void {
    this.entityCache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; entries: Array<{ entityId: string; age: number; }> } {
    const now = Date.now();
    const entries = Array.from(this.entityCache.entries()).map(([entityId, data]) => ({
      entityId,
      age: now - data.timestamp
    }));

    return { size: this.entityCache.size, entries };
  }
}

// Enhanced error handling for entity operations
interface EntityOperationResult {
  success: boolean;
  entityId: string;
  operation: string;
  state?: {
    before?: string;
    after?: string;
  };
  error?: string;
  validationErrors?: string[];
}

class EntityStateManager {
  private validator: EnhancedEntityStateChecker;

  constructor(hassHost: string, hassToken: string) {
    this.validator = new EnhancedEntityStateChecker(hassHost, hassToken);
  }

  async executeWithStateValidation(
    entityId: string,
    operation: string,
    preValidation?: () => Promise<string[]>,
    postValidation?: () => Promise<string[]>
  ): Promise<EntityOperationResult> {
    const result: EntityOperationResult = {
      success: false,
      entityId,
      operation,
      state: {}
    };

    try {
      // Pre-operation validation
      if (preValidation) {
        const preErrors = await preValidation();
        if (preErrors.length > 0) {
          result.validationErrors = preErrors;
          result.error = 'Pre-operation validation failed';
          return result;
        }
      }

      // Get state before operation
      const beforeState = await this.validator.validateEntityState(entityId);
      result.state!.before = beforeState.currentState;

      // Here you would execute the actual operation
      // This is a placeholder for the actual service call

      // Get state after operation (with a small delay)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const afterState = await this.validator.validateEntityState(entityId);
      result.state!.after = afterState.currentState;

      // Post-operation validation
      if (postValidation) {
        const postErrors = await postValidation();
        if (postErrors.length > 0) {
          result.validationErrors = postErrors;
          result.error = 'Post-operation validation failed';
          return result;
        }
      }

      result.success = true;
      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }
}

export { EnhancedEntityStateChecker, EntityStateManager, EntityOperationResult };
