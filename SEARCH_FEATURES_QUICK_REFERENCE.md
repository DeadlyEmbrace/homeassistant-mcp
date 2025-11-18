# Quick Reference: New Search Features

## New Tool: search_devices_by_label

Search and filter devices by organizational labels (tags).

### Basic Usage
```json
{
  "labels": ["office"]
}
```

### With Filters
```json
{
  "labels": ["office", "climate"],
  "match_all": false,
  "domain": "sensor",
  "device_class": "temperature",
  "area": "office",
  "limit": 100,
  "offset": 0
}
```

### Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `labels` | string[] | **required** | Label names or IDs to filter by |
| `match_all` | boolean | false | If true, device must have ALL labels (AND). If false, ANY label (OR) |
| `include_unlabeled` | boolean | false | Include devices without labels |
| `domain` | string | - | Filter by domain (e.g., "light", "sensor") |
| `device_class` | string | - | Filter by device class (e.g., "temperature") |
| `area` | string | - | Filter by area name/ID |
| `state` | string | - | Filter by state (e.g., "on", "off") |
| `include_area_info` | boolean | true | Include area information |
| `include_attributes` | boolean | false | Include full attributes |
| `limit` | number | 100 | Max results (max: 500) |
| `offset` | number | 0 | Starting position for pagination |

### Response
```json
{
  "success": true,
  "total_found": 20,
  "returned": 20,
  "offset": 0,
  "limit": 100,
  "has_more": false,
  "label_info": [
    {
      "label_id": "office",
      "name": "Office",
      "color": "red",
      "icon": "mdi:chair-rolling"
    }
  ],
  "devices": [
    {
      "entity_id": "sensor.temperature",
      "state": "23.5",
      "friendly_name": "Temperature",
      "domain": "sensor",
      "device_class": "temperature",
      "labels": ["office", "climate"],
      "label_names": ["Office", "Climate"],
      "area": {
        "area_id": "office",
        "name": "Office",
        "floor_id": "main",
        "icon": "mdi:office-building"
      }
    }
  ],
  "filters_applied": {
    "labels": ["office"],
    "match_all": false,
    "domain": "sensor"
  }
}
```

---

## Enhanced: search_devices

Now supports label filtering and pagination.

### New Features
- **Label filtering**: Filter by labels (OR logic)
- **Pagination**: offset/limit parameters
- **Label info**: Automatically included in results

### New Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `labels` | string[] | - | Filter by labels (device has at least one) |
| `offset` | number | 0 | Starting position for pagination |
| `include_label_info` | boolean | true | Include label information |

### Usage Example
```json
{
  "area": "office",
  "labels": ["office", "climate"],
  "domain": "sensor",
  "device_class": "temperature",
  "limit": 50,
  "offset": 0
}
```

### Response Changes
Added fields:
- `offset`: Current offset
- `has_more`: Boolean indicating more results
- `labels`: Array of label IDs (in each device)
- `label_names`: Array of label names (in each device)

---

## Fixed: search_devices_by_area

Now returns complete results without artificial limits.

### Changes
- **Removed**: `limit_per_area` parameter
- **Added**: `limit` parameter (global, default: 10,000)
- **Added**: `total_available` and `truncated` in response

### Usage
```json
{
  "areas": ["office", "bedroom"],
  "domains": ["sensor", "light"],
  "group_by": "area",
  "limit": 10000
}
```

### Response Changes
```json
{
  "success": true,
  "total_devices_found": 278,
  "total_available": 278,
  "truncated": false,
  "devices_by_area": {
    "office": [...],
    "bedroom": [...]
  }
}
```

---

## Common Patterns

### 1. Find devices with specific label
```json
// search_devices_by_label
{
  "labels": ["office"]
}
```

### 2. Combine area + labels
```json
// search_devices
{
  "area": "office",
  "labels": ["climate"]
}
```

### 3. Temperature sensors in office
```json
// search_devices
{
  "area": "office",
  "domain": "sensor",
  "device_class": "temperature"
}
```

### 4. Paginate through results
```json
// Page 1
{
  "labels": ["office"],
  "limit": 20,
  "offset": 0
}

// Page 2
{
  "labels": ["office"],
  "limit": 20,
  "offset": 20
}
```

### 5. Devices with ALL specified labels (AND logic)
```json
// search_devices_by_label
{
  "labels": ["office", "climate"],
  "match_all": true
}
```

### 6. Devices with ANY specified label (OR logic)
```json
// search_devices_by_label
{
  "labels": ["office", "climate"],
  "match_all": false
}
```

---

## Migration Examples

### Before: Could only search by area
```json
{
  "area": "office"
}
```

### After: Can combine multiple filters
```json
{
  "area": "office",
  "labels": ["climate"],
  "domain": "sensor",
  "device_class": "temperature"
}
```

### Before: Results might be incomplete
```json
// search_devices_by_area with limit_per_area: 50
{
  "areas": ["office"]
}
// Could miss devices if area had >50 entities
```

### After: Complete results
```json
// search_devices_by_area with limit: 10000
{
  "areas": ["office"]
}
// Returns all devices (up to 10,000)
```

---

## Response Format (Standardized)

All search functions now return:

```json
{
  "success": boolean,
  "total_found": number,           // Total matching devices
  "returned": number,              // Devices in this response
  "offset": number,                // Current position (if paginated)
  "limit": number,                 // Applied limit
  "has_more": boolean,             // More results available?
  "devices": [...],                // Device array
  "filters_applied": {...},        // Echo of filters used
  "search_method": string          // Method used
}
```

Each device object includes:
```json
{
  "entity_id": string,
  "state": string,
  "friendly_name": string,
  "domain": string,
  "device_class": string,
  "labels": string[],              // NEW
  "label_names": string[],         // NEW
  "area": {...},                   // Optional
  "attributes": {...}              // Optional
}
```

---

## Testing

Run the test scripts:

```bash
# Test search by label
node test-search-by-label.js

# Test enhanced search with combined filters
node test-enhanced-search.js

# Test complete area search results
node test-complete-area-search.js
```

---

## Summary of Improvements

✅ **Search by Label** - New tool to replicate UI label filtering  
✅ **Complete Area Results** - Fixed truncation issues  
✅ **Combined Filters** - Area + labels + domain + device_class  
✅ **Pagination** - Offset/limit support across all search tools  
✅ **Consistent Responses** - Standardized format across all tools  
✅ **Label Information** - Automatically included in search results  
✅ **Backward Compatible** - All existing code continues to work  

---

**Last Updated:** November 18, 2025
