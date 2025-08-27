// Import env-loader to ensure environment variables are loaded
import './env-loader.js';

export const HASS_CONFIG = {
    BASE_URL: process.env.HASS_HOST || '',
    TOKEN: process.env.HASS_TOKEN || '',
    SOCKET_URL: process.env.HASS_SOCKET_URL || '',
    SOCKET_TOKEN: process.env.HASS_TOKEN || '',
}; 