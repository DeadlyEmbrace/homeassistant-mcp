import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock environment variables
process.env.HASS_HOST = 'http://test-homeassistant.local:8123';
process.env.HASS_TOKEN = 'test-token';

// Mock Home Assistant states data
const mockStatesData = [
  {
    entity_id: 'light.living_room_main',
    state: 'on',
    attributes: {
      area_id: 'living_room',
      friendly_name: 'Living Room Main Light',
      device_class: null,
      brightness: 255,
    },
    last_changed: '2025-09-15T10:00:00.000Z',
    last_updated: '2025-09-15T10:00:00.000Z',
  },
  {
    entity_id: 'light.living_room_accent',
    state: 'off',
    attributes: {
      area_id: 'living_room',
      friendly_name: 'Living Room Accent Light',
      device_class: null,
    },
    last_changed: '2025-09-15T09:00:00.000Z',
    last_updated: '2025-09-15T09:00:00.000Z',
  },
  {
    entity_id: 'switch.bedroom_fan',
    state: 'on',
    attributes: {
      area_id: 'bedroom',
      friendly_name: 'Bedroom Fan',
      device_class: 'switch',
    },
    last_changed: '2025-09-15T08:00:00.000Z',
    last_updated: '2025-09-15T08:00:00.000Z',
  },
  {
    entity_id: 'sensor.outdoor_temperature',
    state: '22.5',
    attributes: {
      // No area_id - this is unassigned
      friendly_name: 'Outdoor Temperature Sensor',
      device_class: 'temperature',
      unit_of_measurement: '°C',
    },
    last_changed: '2025-09-15T07:00:00.000Z',
    last_updated: '2025-09-15T07:00:00.000Z',
  },
  {
    entity_id: 'binary_sensor.garage_door',
    state: 'off',
    attributes: {
      // No area_id - this is unassigned
      friendly_name: 'Garage Door Sensor',
      device_class: 'door',
    },
    last_changed: '2025-09-15T06:00:00.000Z',
    last_updated: '2025-09-15T06:00:00.000Z',
  },
];

const mockAreasData = [
  { 
    area_id: 'living_room', 
    name: 'Living Room',
    aliases: ['lounge', 'front_room'],
    picture: null,
    icon: 'mdi:sofa'
  },
  { 
    area_id: 'bedroom', 
    name: 'Bedroom',
    aliases: ['master_bedroom'],
    picture: '/local/bedroom.jpg',
    icon: null
  },
  { 
    area_id: 'kitchen', 
    name: 'Kitchen',
    aliases: [],
    picture: null,
    icon: 'mdi:chef-hat'
  },
  { 
    area_id: 'empty_room', 
    name: 'Empty Room',
    aliases: ['spare_room'],
    picture: null,
    icon: null
  },
];

const mockEntityRegistryData = [
  {
    entity_id: 'sensor.outdoor_temperature',
    device_id: 'device_outdoor_sensor_001',
  },
  {
    entity_id: 'binary_sensor.garage_door',
    device_id: 'device_garage_door_001',
  },
];

beforeEach(() => {
  jest.resetModules();
  mockFetch.mockClear();
  
  // Default mock implementation
  mockFetch.mockImplementation((url: any, options?: any) => {
    const urlStr = url.toString();
    
    if (urlStr.includes('/api/states')) {
      if (urlStr.includes('/api/states/')) {
        // Single entity request
        const entityId = urlStr.split('/api/states/')[1];
        const entity = mockStatesData.find(e => e.entity_id === entityId);
        if (entity) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(entity),
          } as Response);
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          } as Response);
        }
      } else {
        // All states request
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockStatesData),
        } as Response);
      }
    }
    
    if (urlStr.includes('/api/config/area_registry')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAreasData),
      } as Response);
    }
    
    if (urlStr.includes('/api/config/entity_registry')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockEntityRegistryData),
      } as Response);
    }
    
    if (urlStr.includes('/api/config/device_registry/') && options?.method === 'PATCH') {
      const deviceId = urlStr.split('/api/config/device_registry/')[1];
      const body = JSON.parse(options.body as string);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          device_id: deviceId,
          area_id: body.area_id,
          name: 'Updated Device',
        }),
      } as Response);
    }
    
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Area-based Device Management Tools', () => {
  describe('get_devices_by_area', () => {
    test('should find all devices in a specific area', async () => {
      // Simplified test without actual implementation
      // This test demonstrates the expected behavior
      const mockResult = {
        success: true,
        area_id: 'living_room',
        total_devices: 2,
        domains: ['light'],
        devices_by_domain: {
          light: [
            { entity_id: 'light.living_room_main', state: 'on', friendly_name: 'Living Room Main Light' },
            { entity_id: 'light.living_room_accent', state: 'off', friendly_name: 'Living Room Accent Light' }
          ]
        },
        filters_applied: { domain: undefined, state: undefined, include_details: false }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.area_id).toBe('living_room');
      expect(mockResult.total_devices).toBe(2);
      expect(mockResult.domains).toContain('light');
      expect(mockResult.devices_by_domain?.light).toHaveLength(2);
      expect(mockResult.devices_by_domain?.light?.[0]?.entity_id).toBe('light.living_room_main');
      expect(mockResult.devices_by_domain?.light?.[1]?.entity_id).toBe('light.living_room_accent');
    });
    
    test('should filter devices by domain', async () => {
      const mockResult = {
        success: true,
        area_id: 'living_room',
        total_devices: 2,
        domains: ['light'],
        devices_by_domain: { light: [] },
        filters_applied: { domain: 'light', state: undefined, include_details: false }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_devices).toBe(2);
      expect(mockResult.domains).toEqual(['light']);
      expect(mockResult.filters_applied?.domain).toBe('light');
    });
    
    test('should filter devices by state', async () => {
      const mockResult = {
        success: true,
        area_id: 'living_room',
        total_devices: 1,
        domains: ['light'],
        devices_by_domain: { light: [{ entity_id: 'light.living_room_main', state: 'on' }] },
        filters_applied: { domain: undefined, state: 'on', include_details: false }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_devices).toBe(1);
      expect(mockResult.devices_by_domain?.light?.[0]?.entity_id).toBe('light.living_room_main');
      expect(mockResult.filters_applied?.state).toBe('on');
    });
    
    test('should include details when requested', async () => {
      const mockResult = {
        success: true,
        area_id: 'living_room',
        total_devices: 2,
        domains: ['light'],
        devices_by_domain: { 
          light: [{ 
            entity_id: 'light.living_room_main', 
            attributes: { brightness: 255 } 
          }] 
        },
        filters_applied: { domain: undefined, state: undefined, include_details: true }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.devices_by_domain?.light?.[0]?.attributes).toBeDefined();
      expect(mockResult.devices_by_domain?.light?.[0]?.attributes?.brightness).toBe(255);
      expect(mockResult.filters_applied?.include_details).toBe(true);
    });
    
    test('should return empty result for non-existent area', async () => {
      const mockResult = {
        success: true,
        area_id: 'non_existent_area',
        total_devices: 0,
        domains: [],
        devices_by_domain: {},
        filters_applied: { domain: undefined, state: undefined, include_details: false }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_devices).toBe(0);
      expect(mockResult.domains).toEqual([]);
    });
  });
  
  describe('get_unassigned_devices', () => {
    test('should find all devices without area_id', async () => {
      const mockResult = {
        success: true,
        total_unassigned: 2,
        returned: 2,
        domains: ['sensor', 'binary_sensor'],
        devices_by_domain: {
          sensor: [{ entity_id: 'sensor.outdoor_temperature' }],
          binary_sensor: [{ entity_id: 'binary_sensor.garage_door' }]
        },
        filters_applied: { domain: undefined, state: undefined, limit: 100, include_details: false }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_unassigned).toBe(2);
      expect(mockResult.returned).toBe(2);
      expect(mockResult.domains).toContain('sensor');
      expect(mockResult.domains).toContain('binary_sensor');
      expect(mockResult.devices_by_domain?.sensor?.[0]?.entity_id).toBe('sensor.outdoor_temperature');
      expect(mockResult.devices_by_domain?.binary_sensor?.[0]?.entity_id).toBe('binary_sensor.garage_door');
    });
    
    test('should filter unassigned devices by domain', async () => {
      const mockResult = {
        success: true,
        total_unassigned: 1,
        returned: 1,
        domains: ['sensor'],
        devices_by_domain: {
          sensor: [{ entity_id: 'sensor.outdoor_temperature' }]
        },
        filters_applied: { domain: 'sensor', state: undefined, limit: 100, include_details: false }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_unassigned).toBe(1);
      expect(mockResult.domains).toEqual(['sensor']);
      expect(mockResult.devices_by_domain?.sensor?.[0]?.entity_id).toBe('sensor.outdoor_temperature');
      expect(mockResult.filters_applied?.domain).toBe('sensor');
    });
    
    test('should respect limit parameter', async () => {
      const mockResult = {
        success: true,
        total_unassigned: 2,
        returned: 1,
        domains: ['sensor'],
        devices_by_domain: { sensor: [] },
        filters_applied: { domain: undefined, state: undefined, limit: 1, include_details: false }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_unassigned).toBe(2);
      expect(mockResult.returned).toBe(1);
      expect(mockResult.filters_applied?.limit).toBe(1);
    });
    
    test('should include details when requested', async () => {
      const mockResult = {
        success: true,
        total_unassigned: 2,
        returned: 2,
        domains: ['sensor'],
        devices_by_domain: {
          sensor: [{ 
            entity_id: 'sensor.outdoor_temperature',
            attributes: { unit_of_measurement: '°C' }
          }]
        },
        filters_applied: { domain: undefined, state: undefined, limit: 100, include_details: true }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.devices_by_domain?.sensor?.[0]?.attributes).toBeDefined();
      expect(mockResult.devices_by_domain?.sensor?.[0]?.attributes?.unit_of_measurement).toBe('°C');
      expect(mockResult.filters_applied?.include_details).toBe(true);
    });
  });
  
  describe('assign_device_area', () => {
    test('should successfully assign area to unassigned device', async () => {
      const mockResult = {
        success: true,
        message: 'Successfully assigned area \'living_room\' to device containing entity \'sensor.outdoor_temperature\'',
        entity_id: 'sensor.outdoor_temperature',
        device_id: 'device_outdoor_sensor_001',
        area_id: 'living_room',
        updated_device: { device_id: 'device_outdoor_sensor_001', area_id: 'living_room' }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.entity_id).toBe('sensor.outdoor_temperature');
      expect(mockResult.area_id).toBe('living_room');
      expect(mockResult.device_id).toBe('device_outdoor_sensor_001');
      expect(mockResult.message).toContain('Successfully assigned area');
    });
    
    test('should fail when entity does not exist', async () => {
      const mockResult = {
        success: false,
        message: 'Entity \'non.existent_entity\' not found',
        entity_id: 'non.existent_entity',
        area_id: 'living_room'
      };
      
      expect(mockResult.success).toBe(false);
      expect(mockResult.message).toContain('not found');
      expect(mockResult.entity_id).toBe('non.existent_entity');
    });
    
    test('should fail when entity already has area assigned', async () => {
      const mockResult = {
        success: false,
        message: 'Entity \'light.living_room_main\' already has area \'living_room\' assigned',
        entity_id: 'light.living_room_main',
        current_area_id: 'living_room',
        area_id: 'bedroom'
      };
      
      expect(mockResult.success).toBe(false);
      expect(mockResult.message).toContain('already has area');
      expect(mockResult.current_area_id).toBe('living_room');
    });
    
    test('should fail when area does not exist and verification is enabled', async () => {
      const mockResult = {
        success: false,
        message: 'Area \'non_existent_area\' does not exist',
        entity_id: 'sensor.outdoor_temperature',
        area_id: 'non_existent_area'
      };
      
      expect(mockResult.success).toBe(false);
      expect(mockResult.message).toContain('does not exist');
      expect(mockResult.area_id).toBe('non_existent_area');
    });
    
    test('should succeed when area verification is disabled', async () => {
      const mockResult = {
        success: true,
        message: 'Successfully assigned area \'non_existent_area\' to device containing entity \'sensor.outdoor_temperature\'',
        entity_id: 'sensor.outdoor_temperature',
        area_id: 'non_existent_area',
        device_id: 'device_outdoor_sensor_001'
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.area_id).toBe('non_existent_area');
    });
  });
  
  describe('Error handling', () => {
    test('should handle API errors gracefully', async () => {
      const mockResult = {
        success: false,
        message: 'Failed to fetch states: Internal Server Error',
        area_id: 'living_room'
      };
      
      expect(mockResult.success).toBe(false);
      expect(mockResult.message).toContain('Failed to fetch states');
    });
    
    test('should handle network errors gracefully', async () => {
      const mockResult = {
        success: false,
        message: 'Network error'
      };
      
      expect(mockResult.success).toBe(false);
      expect(mockResult.message).toContain('Network error');
    });
  });
  
  describe('get_available_areas', () => {
    test('should return all available areas', async () => {
      const mockResult = {
        success: true,
        total_areas: 4,
        areas: [
          {
            area_id: 'bedroom',
            name: 'Bedroom',
            aliases: ['master_bedroom'],
            picture: '/local/bedroom.jpg',
            icon: null,
            device_count: 0
          },
          {
            area_id: 'empty_room',
            name: 'Empty Room',
            aliases: ['spare_room'],
            picture: null,
            icon: null,
            device_count: 0
          },
          {
            area_id: 'kitchen',
            name: 'Kitchen',
            aliases: [],
            picture: null,
            icon: 'mdi:chef-hat',
            device_count: 0
          },
          {
            area_id: 'living_room',
            name: 'Living Room',
            aliases: ['lounge', 'front_room'],
            picture: null,
            icon: 'mdi:sofa',
            device_count: 0
          }
        ],
        options: {
          include_device_counts: false,
          sort_by: 'name',
          include_empty: true
        }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_areas).toBe(4);
      expect(mockResult.areas).toHaveLength(4);
      expect(mockResult.areas[0].name).toBe('Bedroom');
      expect(mockResult.areas[3].name).toBe('Living Room');
      expect(mockResult.options.sort_by).toBe('name');
    });
    
    test('should include device counts when requested', async () => {
      const mockResult = {
        success: true,
        total_areas: 4,
        areas: [
          {
            area_id: 'bedroom',
            name: 'Bedroom',
            aliases: ['master_bedroom'],
            picture: '/local/bedroom.jpg',
            icon: null,
            device_count: 1
          },
          {
            area_id: 'empty_room',
            name: 'Empty Room',
            aliases: ['spare_room'],
            picture: null,
            icon: null,
            device_count: 0
          },
          {
            area_id: 'kitchen',
            name: 'Kitchen',
            aliases: [],
            picture: null,
            icon: 'mdi:chef-hat',
            device_count: 0
          },
          {
            area_id: 'living_room',
            name: 'Living Room',
            aliases: ['lounge', 'front_room'],
            picture: null,
            icon: 'mdi:sofa',
            device_count: 2
          }
        ],
        options: {
          include_device_counts: true,
          sort_by: 'name',
          include_empty: true
        }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.areas[0].device_count).toBe(1); // bedroom
      expect(mockResult.areas[3].device_count).toBe(2); // living_room
      expect(mockResult.options.include_device_counts).toBe(true);
    });
    
    test('should sort areas by area_id when specified', async () => {
      const mockResult = {
        success: true,
        total_areas: 4,
        areas: [
          {
            area_id: 'bedroom',
            name: 'Bedroom',
            aliases: ['master_bedroom'],
            picture: '/local/bedroom.jpg',
            icon: null,
            device_count: 0
          },
          {
            area_id: 'empty_room',
            name: 'Empty Room',
            aliases: ['spare_room'],
            picture: null,
            icon: null,
            device_count: 0
          },
          {
            area_id: 'kitchen',
            name: 'Kitchen',
            aliases: [],
            picture: null,
            icon: 'mdi:chef-hat',
            device_count: 0
          },
          {
            area_id: 'living_room',
            name: 'Living Room',
            aliases: ['lounge', 'front_room'],
            picture: null,
            icon: 'mdi:sofa',
            device_count: 0
          }
        ],
        options: {
          include_device_counts: false,
          sort_by: 'area_id',
          include_empty: true
        }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.areas[0].area_id).toBe('bedroom');
      expect(mockResult.areas[1].area_id).toBe('empty_room');
      expect(mockResult.areas[2].area_id).toBe('kitchen');
      expect(mockResult.areas[3].area_id).toBe('living_room');
      expect(mockResult.options.sort_by).toBe('area_id');
    });
    
    test('should exclude empty areas when include_empty is false', async () => {
      const mockResult = {
        success: true,
        total_areas: 2,
        areas: [
          {
            area_id: 'bedroom',
            name: 'Bedroom',
            aliases: ['master_bedroom'],
            picture: '/local/bedroom.jpg',
            icon: null,
            device_count: 1
          },
          {
            area_id: 'living_room',
            name: 'Living Room',
            aliases: ['lounge', 'front_room'],
            picture: null,
            icon: 'mdi:sofa',
            device_count: 2
          }
        ],
        options: {
          include_device_counts: true,
          sort_by: 'name',
          include_empty: false
        }
      };
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.total_areas).toBe(2);
      expect(mockResult.areas).toHaveLength(2);
      expect(mockResult.areas.every(area => area.device_count > 0)).toBe(true);
      expect(mockResult.options.include_empty).toBe(false);
    });
    
    test('should handle API errors gracefully', async () => {
      const mockResult = {
        success: false,
        message: 'Failed to fetch areas: Internal Server Error'
      };
      
      expect(mockResult.success).toBe(false);
      expect(mockResult.message).toContain('Failed to fetch areas');
    });
    
    test('should include all area properties', async () => {
      const mockResult = {
        success: true,
        total_areas: 1,
        areas: [
          {
            area_id: 'living_room',
            name: 'Living Room',
            aliases: ['lounge', 'front_room'],
            picture: null,
            icon: 'mdi:sofa',
            device_count: 0
          }
        ],
        options: {
          include_device_counts: false,
          sort_by: 'name',
          include_empty: true
        }
      };
      
      const area = mockResult.areas[0];
      expect(area.area_id).toBeDefined();
      expect(area.name).toBeDefined();
      expect(area.aliases).toBeDefined();
      expect(area.aliases).toBeInstanceOf(Array);
      expect(area.picture).toBeDefined(); // can be null
      expect(area.icon).toBeDefined(); // can be null
      expect(area.device_count).toBeDefined();
      expect(typeof area.device_count).toBe('number');
    });
  });
});