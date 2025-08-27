import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// MCP Protocol message types
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

// Store registered tools and their handlers
export class MCPHTTPTransport {
  private tools: Map<string, {
    tool: MCPTool;
    handler: (params: any) => Promise<any>;
    schema?: z.ZodType<any>;
  }> = new Map();

  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  // Register a tool with the HTTP transport
  registerTool(
    name: string,
    description: string,
    handler: (params: any) => Promise<any>,
    schema?: z.ZodType<any>
  ) {
    // Convert Zod schema to JSON Schema for MCP
    let inputSchema;
    if (schema) {
      try {
        // Basic conversion - this could be expanded
        const zodShape = (schema as any)._def?.shape?.();
        if (zodShape) {
          const properties: Record<string, any> = {};
          const required: string[] = [];
          
          for (const [key, value] of Object.entries(zodShape)) {
            const isOptional = (value as any)._def?.typeName === 'ZodOptional';
            if (!isOptional) {
              required.push(key);
            }
            
            // Basic type mapping
            const baseType = isOptional ? (value as any)._def.innerType : value;
            const typeName = (baseType as any)._def?.typeName;
            
            let type = 'string';
            if (typeName === 'ZodNumber') type = 'number';
            else if (typeName === 'ZodBoolean') type = 'boolean';
            else if (typeName === 'ZodArray') type = 'array';
            else if (typeName === 'ZodObject') type = 'object';
            
            properties[key] = { type };
            
            // Add description if available
            const description = (baseType as any)._def?.description;
            if (description) {
              properties[key].description = description;
            }
          }
          
          inputSchema = {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined
          };
        }
      } catch (error) {
        console.warn(`Could not convert schema for tool ${name}:`, error);
      }
    }

    const tool: MCPTool = {
      name,
      description,
      inputSchema
    };

    this.tools.set(name, { tool, handler, schema });
  }

  // Middleware to validate authentication
  authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Debug logging
    console.log('[MCP-HTTP] Auth Debug:', {
      hasAuthHeader: !!authHeader,
      receivedTokenLength: token?.length || 0,
      expectedTokenLength: this.token?.length || 0,
      tokensMatch: token === this.token,
      timestamp: new Date().toISOString()
    });

    if (!token || token !== this.token) {
      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: {
          code: -32001,
          message: 'Unauthorized - Invalid or missing token'
        }
      };
      return res.status(401).json(response);
    }

    next();
  };

  // Handle MCP requests
  handleRequest = async (req: Request, res: Response) => {
    const request = req.body as MCPRequest;

    // Validate JSON-RPC request
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request?.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request - Not a valid JSON-RPC 2.0 request'
        }
      });
    }

    try {
      let result: any;

      switch (request.method) {
        case 'initialize':
          result = await this.handleInitialize(request.params);
          break;

        case 'tools/list':
          result = await this.handleToolsList();
          break;

        case 'tools/call':
          result = await this.handleToolCall(request.params);
          break;

        case 'completion/complete':
          result = await this.handleCompletion(request.params);
          break;

        default:
          return res.json({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          });
      }

      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result
      };

      res.json(response);
    } catch (error) {
      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      res.status(500).json(response);
    }
  };

  // Handle initialize request
  private async handleInitialize(params?: any) {
    return {
      protocolVersion: '0.1.0',
      capabilities: {
        tools: {},
        completion: {}
      },
      serverInfo: {
        name: 'home-assistant-mcp',
        version: '0.1.0'
      }
    };
  }

  // Handle tools/list request
  private async handleToolsList() {
    const tools = Array.from(this.tools.values()).map(({ tool }) => tool);
    return { tools };
  }

  // Handle tools/call request
  private async handleToolCall(params: any) {
    const { name, arguments: args } = params;

    const toolEntry = this.tools.get(name);
    if (!toolEntry) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate parameters if schema exists
    if (toolEntry.schema) {
      try {
        toolEntry.schema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
      }
    }

    // Execute the tool handler
    const result = await toolEntry.handler(args);
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  // Handle completion request (for autocomplete)
  private async handleCompletion(params: any) {
    const { ref } = params;
    
    // If asking for tool names
    if (ref?.type === 'ref/tool') {
      const toolNames = Array.from(this.tools.keys());
      return {
        completion: {
          values: toolNames.map(name => ({ value: name }))
        }
      };
    }

    return { completion: { values: [] } };
  }

  // Setup Express routes
  setupRoutes(app: express.Application) {
    // MCP endpoint - handles all MCP protocol messages
    app.post('/mcp', this.authenticate, this.handleRequest);

    // Convenience endpoint to list tools (non-MCP format)
    app.get('/mcp/tools', this.authenticate, (req, res) => {
      const tools = Array.from(this.tools.values()).map(({ tool }) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }));
      res.json({ tools });
    });

    // Health check for MCP endpoint
    app.get('/mcp/health', (req, res) => {
      res.json({
        status: 'ok',
        transport: 'http',
        protocol: 'mcp',
        version: '0.1.0',
        toolCount: this.tools.size
      });
    });
  }
}