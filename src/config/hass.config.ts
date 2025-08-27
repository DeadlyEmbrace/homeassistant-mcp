import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const HASS_CONFIG = {
    BASE_URL: process.env.HASS_HOST || 'http://192.168.3.148:8123',
    TOKEN: process.env.HASS_TOKEN || '',
    SOCKET_URL: process.env.HASS_SOCKET_URL || 'ws://192.168.3.148:8123/api/websocket',
    SOCKET_TOKEN: process.env.HASS_TOKEN || '',
}; 