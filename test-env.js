import 'dotenv/config';

console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('HASS_HOST:', process.env.HASS_HOST);
console.log('HASS_TOKEN present:', !!process.env.HASS_TOKEN);
console.log('HASS_TOKEN length:', process.env.HASS_TOKEN?.length);
console.log('HASS_SOCKET_URL:', process.env.HASS_SOCKET_URL);
console.log('PORT:', process.env.PORT);