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
      console.log(`Could not load ${envFile}: ${result.error.message}`);
    } else {
      console.log(`Loaded environment from ${envFile}`);
    }
  } catch (error) {
    console.log(`Error loading ${envFile}:`, error);
  }

  // Ensure critical environment variables have valid values
  // If HASS_HOST is not set or is the default homeassistant.local, override it
  if (!process.env.HASS_HOST || process.env.HASS_HOST.includes('homeassistant.local')) {
    const defaultHost = 'http://192.168.3.148:8123';
    console.log(`HASS_HOST not set or invalid, using default: ${defaultHost}`);
    process.env.HASS_HOST = defaultHost;
  }

  // Set WebSocket URL based on HASS_HOST if not already set
  if (!process.env.HASS_SOCKET_URL) {
    const host = process.env.HASS_HOST || 'http://192.168.3.148:8123';
    const wsUrl = host.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/websocket';
    console.log(`HASS_SOCKET_URL not set, deriving from HASS_HOST: ${wsUrl}`);
    process.env.HASS_SOCKET_URL = wsUrl;
  }

  // Log the configuration being used (without the token)
  console.log('Home Assistant Configuration:');
  console.log(`  HASS_HOST: ${process.env.HASS_HOST}`);
  console.log(`  HASS_SOCKET_URL: ${process.env.HASS_SOCKET_URL}`);
  console.log(`  HASS_TOKEN: ${process.env.HASS_TOKEN ? '[SET]' : '[NOT SET]'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  PORT: ${process.env.PORT || 4000}`);
}

// Load environment variables immediately when this module is imported
loadEnvironmentVariables();