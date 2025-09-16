import { z } from "zod";


export const DomainSchema = z.enum([
    "light",
    "climate",
    "alarm_control_panel",
    "cover",
    "switch",
    "contact",
    "media_player",
    "fan",
    "lock",
    "vacuum",
    "scene",
    "script",
    "camera",
    "update"
]);

// Generic list request schema

export const ListRequestSchema = z.object({
    domain: DomainSchema,
    area: z.string().optional(),
    floor: z.string().optional(),
});

// Areas

export const AreaSchema = z.object({
    id: z.string(),
    name: z.string(),
    floor: z.string(),
});

export const FloorSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const ListFloorsResponseSchema = z.object({
    floors: z.array(FloorSchema),
});

// Alarm

export const AlarmAttributesSchema = z.object({
    code_format: z.string().optional(),
    changed_by: z.string().optional(),
    code_arm_required: z.boolean().optional(),
    friendly_name: z.string().optional(),
    supported_features: z.number().optional(),
});

export const AlarmSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: AlarmAttributesSchema,
});


export const ListAlarmsResponseSchema = z.object({
    alarms: z.array(AlarmSchema),
});


// Devices

export const DeviceSchema = z.object({
    id: z.string(),
    name: z.string(),
    name_by_user: z.string().optional(),
    model: z.string(),
    model_id: z.string().nullable(),
    manufacturer: z.string(),
    area_id: z.string().nullable(),
    config_entries: z.array(z.string()),
    primary_config_entry: z.string(),
    connections: z.array(z.tuple([z.string(), z.string()])),
    configuration_url: z.string().nullable(),
    disabled_by: z.string().nullable(),
    entry_type: z.string().nullable(),
    hw_version: z.string().nullable(),
    sw_version: z.string().nullable(),
    via_device_id: z.string().nullable(),
    created_at: z.number(),
    modified_at: z.number(),
    identifiers: z.array(z.any()),
    labels: z.array(z.string()),
    serial_number: z.string().optional()
});

export const ListDevicesResponseSchema = z.object({
    _meta: z.object({}).optional(),
    devices: z.array(DeviceSchema)
});

// Media Player
export const MediaPlayerAttributesSchema = z.object({
    volume_level: z.number().optional(),
    is_volume_muted: z.boolean().optional(),
    media_content_id: z.string().optional(),
    media_content_type: z.string().optional(),
    media_duration: z.number().optional(),
    media_position: z.number().optional(),
    media_title: z.string().optional(),
    source: z.string().optional(),
    source_list: z.array(z.string()).optional(),
    supported_features: z.number().optional(),
});

export const MediaPlayerSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: MediaPlayerAttributesSchema,
});

// Fan
export const FanAttributesSchema = z.object({
    percentage: z.number().optional(),
    preset_mode: z.string().optional(),
    preset_modes: z.array(z.string()).optional(),
    oscillating: z.boolean().optional(),
    direction: z.string().optional(),
    supported_features: z.number().optional(),
});

export const FanSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: FanAttributesSchema,
});

// Lock
export const LockAttributesSchema = z.object({
    code_format: z.string().optional(),
    changed_by: z.string().optional(),
    locked: z.boolean(),
    supported_features: z.number().optional(),
});

export const LockSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: LockAttributesSchema,
});

// Vacuum
export const VacuumAttributesSchema = z.object({
    battery_level: z.number().optional(),
    fan_speed: z.string().optional(),
    fan_speed_list: z.array(z.string()).optional(),
    status: z.string().optional(),
    supported_features: z.number().optional(),
});

export const VacuumSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: VacuumAttributesSchema,
});

// Scene
export const SceneAttributesSchema = z.object({
    entity_id: z.array(z.string()).optional(),
    supported_features: z.number().optional(),
});

export const SceneSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: SceneAttributesSchema,
});

// Script
export const ScriptAttributesSchema = z.object({
    last_triggered: z.string().optional(),
    mode: z.string().optional(),
    variables: z.record(z.any()).optional(),
    supported_features: z.number().optional(),
});

export const ScriptSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: ScriptAttributesSchema,
});

// Camera
export const CameraAttributesSchema = z.object({
    motion_detection: z.boolean().optional(),
    frontend_stream_type: z.string().optional(),
    supported_features: z.number().optional(),
});

export const CameraSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: CameraAttributesSchema,
});

// Update
export const UpdateAttributesSchema = z.object({
    title: z.string().optional(),
    installed_version: z.string().optional(),
    latest_version: z.string().optional(),
    skipped_version: z.string().optional(),
    release_summary: z.string().optional(),
    release_url: z.string().optional(),
    auto_update: z.boolean().optional(),
    device_class: z.enum(['firmware']).optional(),
    supported_features: z.number().optional(),
    in_progress: z.boolean().optional(),
    update_percentage: z.number().optional(),
});

export const UpdateSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: UpdateAttributesSchema,
});

// Response schemas for new devices
export const ListMediaPlayersResponseSchema = z.object({
    media_players: z.array(MediaPlayerSchema),
});

export const ListFansResponseSchema = z.object({
    fans: z.array(FanSchema),
});

export const ListLocksResponseSchema = z.object({
    locks: z.array(LockSchema),
});

export const ListVacuumsResponseSchema = z.object({
    vacuums: z.array(VacuumSchema),
});

export const ListScenesResponseSchema = z.object({
    scenes: z.array(SceneSchema),
});

export const ListScriptsResponseSchema = z.object({
    scripts: z.array(ScriptSchema),
});

export const ListCamerasResponseSchema = z.object({
    cameras: z.array(CameraSchema),
});

export const ListUpdatesResponseSchema = z.object({
    updates: z.array(UpdateSchema),
});

// Area management schemas
export const DeviceByAreaSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    friendly_name: z.string(),
    device_class: z.string().optional(),
    last_changed: z.string().optional(),
    last_updated: z.string().optional(),
    attributes: z.record(z.any()).optional(),
});

export const GetDevicesByAreaRequestSchema = z.object({
    area_id: z.string(),
    include_details: z.boolean().default(false).optional(),
    domain_filter: z.string().optional(),
    state_filter: z.string().optional(),
});

export const GetDevicesByAreaResponseSchema = z.object({
    success: z.boolean(),
    area_id: z.string(),
    total_devices: z.number(),
    domains: z.array(z.string()),
    devices_by_domain: z.record(z.array(DeviceByAreaSchema)),
    filters_applied: z.object({
        domain: z.string().optional(),
        state: z.string().optional(),
        include_details: z.boolean(),
    }),
});

export const GetUnassignedDevicesRequestSchema = z.object({
    domain_filter: z.string().optional(),
    state_filter: z.string().optional(),
    include_details: z.boolean().default(false).optional(),
    limit: z.number().min(1).max(500).default(100).optional(),
});

export const GetUnassignedDevicesResponseSchema = z.object({
    success: z.boolean(),
    total_unassigned: z.number(),
    returned: z.number(),
    domains: z.array(z.string()),
    devices_by_domain: z.record(z.array(DeviceByAreaSchema)),
    filters_applied: z.object({
        domain: z.string().optional(),
        state: z.string().optional(),
        limit: z.number(),
        include_details: z.boolean(),
    }),
});

export const AssignDeviceAreaRequestSchema = z.object({
    entity_id: z.string(),
    area_id: z.string(),
    verify_area_exists: z.boolean().default(true).optional(),
});

export const AssignDeviceAreaResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    entity_id: z.string(),
    device_id: z.string().optional(),
    area_id: z.string().optional(),
    current_area_id: z.string().optional(),
    updated_device: z.record(z.any()).optional(),
});

// Available areas schemas
export const AreaInfoSchema = z.object({
    area_id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()),
    picture: z.string().nullable(),
    icon: z.string().nullable(),
    device_count: z.number(),
});

export const GetAvailableAreasRequestSchema = z.object({
    include_device_counts: z.boolean().default(false).optional(),
    sort_by: z.enum(['name', 'area_id']).default('name').optional(),
    include_empty: z.boolean().default(true).optional(),
});

export const GetAvailableAreasResponseSchema = z.object({
    success: z.boolean(),
    total_areas: z.number(),
    areas: z.array(AreaInfoSchema),
    options: z.object({
        include_device_counts: z.boolean(),
        sort_by: z.enum(['name', 'area_id']),
        include_empty: z.boolean(),
    }),
});