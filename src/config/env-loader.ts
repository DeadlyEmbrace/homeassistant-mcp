import dotenv from 'dotenv';
import { resolve } from 'path';

// Function to ensure environment variables are loaded
export function loadEnvironmentVariables(): void {
  // First, try to load from .env file if it exists
  const envFile = process.env.NODE_ENV === 'production'
    ? '.env'
    : process.env.NODE_ENV === 'test'
      ? '.env.test'
      : '.env.development';

  try {
    const result = dotenv.config({ path: resolve(process.cwd(), envFile) });
    if (result.error) {
  // ...existing code...
    } else {
  // ...existing code...
    }
  } catch (error) {
  // ...existing code...
  }

  // Ensure critical environment variables have valid values
  // Validate HASS_HOST is set
  if (!process.env.HASS_HOST) {
  // ...existing code...
  // ...existing code...
    throw new Error('HASS_HOST environment variable is required');
  }

  // Set WebSocket URL based on HASS_HOST if not already set
  if (!process.env.HASS_SOCKET_URL && process.env.HASS_HOST) {
    const wsUrl = process.env.HASS_HOST.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/websocket';
  // ...existing code...
    process.env.HASS_SOCKET_URL = wsUrl;
  }

  // Log the configuration being used (without the token)
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
}

// Load environment variables immediately when this module is imported
loadEnvironmentVariables();