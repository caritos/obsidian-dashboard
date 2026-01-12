# Weather Widget Design

**Date:** 2026-01-12
**Status:** Validated Design

## Overview

Add a weather widget to the Obsidian dashboard that displays current weather conditions, sunrise/sunset times, and detailed meteorological data. Location information is read from a markdown file in the user's vault, keeping data portable and version-controlled.

## Requirements

### Functional
- Display current temperature, weather conditions, and detailed metrics
- Read location coordinates from `resources/current-location.md` (configurable)
- Fetch weather data from Open-Meteo API (free, no key required)
- Auto-update when location file changes
- Cache data to minimize API calls
- Support both Celsius/Fahrenheit and different wind speed units

### Non-Functional
- Follow existing widget architecture pattern
- Graceful error handling for missing/invalid data
- Respect API rate limits with caching
- Match Obsidian's design language and theme adaptivity

## Architecture

### Component Structure

The weather widget follows the existing widget pattern:

```
WeatherWidget (extends Widget)
├── WeatherService (API integration & caching)
├── LocationReader (parse location file)
└── WeatherTypes (type definitions)
```

### Data Flow

```
1. Widget.update() called
2. LocationReader reads resources/current-location.md
3. Parse frontmatter for latitude/longitude
4. WeatherService checks cache (30min TTL)
5. If cache miss: Fetch from Open-Meteo API
6. Render weather data to DOM
7. Register file watcher for auto-updates
```

### Location File Format

**Default path:** `resources/current-location.md`

```yaml
---
latitude: 37.7749
longitude: -122.4194
location: San Francisco, CA
---

Optional notes about the location can go here.
```

**Required fields:**
- `latitude`: Number between -90 and 90
- `longitude`: Number between -180 and 180

**Optional fields:**
- `location`: Human-readable location name for display

## Weather Data Display

### Hero Section (Prominent Display)
- Current temperature (large font)
- Weather condition text ("Clear", "Cloudy", etc.)
- Weather icon (emoji-based)
- Feels like temperature
- Daily high/low temperatures

### Detailed Metrics Grid (2-column layout)
- 🌅 **Sunrise** time (e.g., "7:26 am")
- 🌇 **Sunset** time (e.g., "4:56 pm")
- 💨 **Wind** speed & direction (e.g., "5 mph NE")
- 💧 **Humidity** percentage (e.g., "62%")
- 🌡️ **Pressure** (e.g., "30.14 in")
- ☀️ **UV Index** (e.g., "0 of 11")
- 👁️ **Visibility** (e.g., "10 mi")

## API Integration

### Open-Meteo API

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Query Parameters:**
```
latitude: <from location file>
longitude: <from location file>
current: temperature_2m,apparent_temperature,weather_code,wind_speed_10m,
         wind_direction_10m,relative_humidity_2m,surface_pressure,
         uv_index,visibility
daily: sunrise,sunset,temperature_2m_max,temperature_2m_min
temperature_unit: celsius | fahrenheit
wind_speed_unit: kmh | mph
timezone: auto
```

**Weather Code Mapping:**
Open-Meteo uses WMO weather codes (0-99). Map to:
- Text descriptions: "Clear", "Partly cloudy", "Rain", "Snow", etc.
- Emoji icons: ☀️ (clear), ⛅ (partly cloudy), 🌧️ (rain), ⛈️ (thunderstorm), 🌨️ (snow), 🌫️ (fog)

### Caching Strategy

```typescript
interface WeatherCache {
    data: WeatherData;
    timestamp: number;
    coordinates: { lat: number; lon: number };
}
```

**Cache Rules:**
- TTL: 30 minutes (configurable in settings)
- Stored in memory (not persisted to disk)
- Invalidate when:
  - Coordinates change in location file
  - Cache TTL expires
  - Manual refresh requested
- Prevent concurrent API requests with in-flight flag

### Rate Limiting
- Minimum 5 minutes between manual refreshes
- Respect cache TTL for automatic updates
- No requests if location file is invalid/missing

## Error Handling

### Location File Errors

**Missing File:**
```
No location set

Create resources/current-location.md with:
---
latitude: YOUR_LAT
longitude: YOUR_LON
---
```

**Invalid Frontmatter:**
- Missing latitude/longitude: "Missing coordinates in location file"
- Invalid coordinates: "Invalid coordinates (lat: -90 to 90, lon: -180 to 180)"
- Parsing error: "Unable to parse location file frontmatter"

### API Errors

**Network Failures:**
- Show cached data if available with "Using cached data" indicator
- If no cache: "Unable to fetch weather data. Check your connection."

**Timeout (10 seconds):**
- Retry once
- If second attempt fails: Show error with last cached data

**Invalid Response:**
- Log error to console for debugging
- Show: "Unable to parse weather data"

### Loading States
- Initial load: Show skeleton UI with "Loading weather..."
- Updates: Keep displaying current data while fetching
- File changes: Invalidate cache and fetch immediately

## Settings

### Widget Settings (`widgetSettings['weather']`)

```typescript
{
    locationFilePath: 'resources/current-location.md',
    temperatureUnit: 'fahrenheit' | 'celsius',
    windSpeedUnit: 'mph' | 'kmh',
    cacheDuration: 30, // minutes
    visibleMetrics: [
        'sunrise',
        'sunset',
        'wind',
        'humidity',
        'pressure',
        'uvIndex',
        'visibility'
    ]
}
```

### Settings UI

**General Section:**
- Location file path (text input with placeholder)
- Temperature unit (dropdown: Fahrenheit/Celsius)
- Wind speed unit (dropdown: mph/km/h)
- Cache duration (slider: 15-120 minutes)

**Visible Metrics Section:**
- Checkboxes for each metric to show/hide
- Default: all enabled

## Implementation Plan

### File Structure

```
src/
├── widgets/
│   └── WeatherWidget.ts          # Main widget implementation
├── services/
│   ├── WeatherService.ts         # API integration & caching
│   ├── LocationReader.ts         # Parse location file
│   └── WeatherTypes.ts           # Type definitions
└── (styles.css updates)          # Weather widget styling
```

### Type Definitions

```typescript
// WeatherTypes.ts
export interface LocationData {
    latitude: number;
    longitude: number;
    location?: string;
}

export interface CurrentWeather {
    temperature: number;
    apparentTemperature: number;
    condition: string;
    weatherCode: number;
    icon: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    uvIndex: number;
    visibility: number;
}

export interface DailyWeather {
    sunrise: string;      // ISO timestamp
    sunset: string;       // ISO timestamp
    temperatureMax: number;
    temperatureMin: number;
}

export interface WeatherData {
    current: CurrentWeather;
    daily: DailyWeather;
    location?: string;
    timestamp: number;
}

export interface WeatherSettings {
    locationFilePath: string;
    temperatureUnit: 'celsius' | 'fahrenheit';
    windSpeedUnit: 'kmh' | 'mph';
    cacheDuration: number;
    visibleMetrics: string[];
}
```

### Integration Points

1. **main.ts:** Register widget in `onload()`
   ```typescript
   this.widgetRegistry.register('weather', (settings: WidgetSettings) => {
       return new WeatherWidget(this.app, settings as WeatherSettings);
   });
   ```

2. **types.ts:** Add to `DEFAULT_SETTINGS`
   ```typescript
   enabledWidgets: ['weather', 'activity-heatmap', 'stats', 'moc-trending'],
   widgetOrder: ['weather', 'activity-heatmap', 'stats', 'moc-trending'],
   widgetSettings: {
       'weather': {
           locationFilePath: 'resources/current-location.md',
           temperatureUnit: 'fahrenheit',
           windSpeedUnit: 'mph',
           cacheDuration: 30,
           visibleMetrics: ['sunrise', 'sunset', 'wind', 'humidity',
                           'pressure', 'uvIndex', 'visibility']
       },
       // ... existing widgets
   }
   ```

3. **SettingsTab.ts:** Add weather settings UI section

4. **styles.css:** Add weather widget styles
   - `.weather-widget-container`
   - `.weather-hero`
   - `.weather-metrics-grid`
   - Theme-adaptive colors

### Implementation Steps

1. Create type definitions (`WeatherTypes.ts`)
2. Implement `LocationReader` service
3. Implement `WeatherService` with API integration
4. Create `WeatherWidget` class
5. Add styling to `styles.css`
6. Register widget in `main.ts`
7. Add settings UI in `SettingsTab.ts`
8. Update default settings in `types.ts`
9. Test error scenarios
10. Update CLAUDE.md with weather widget info

## Testing Scenarios

### Happy Path
1. User creates `resources/current-location.md` with valid coordinates
2. Widget fetches and displays weather data
3. Updates on file change
4. Cache prevents excessive API calls

### Error Scenarios
1. Missing location file → Shows helpful message
2. Invalid coordinates → Shows validation error
3. Network error → Shows cached data or error message
4. File deleted → Clears display, shows setup message
5. API timeout → Retries once, then shows error

### Edge Cases
1. Location file in subfolder (custom path)
2. File has content below frontmatter → Ignore, parse frontmatter only
3. Rapid file changes → Debounce updates
4. Plugin reload → Reinitialize file watcher

## Future Enhancements (Not in Scope)

- Multi-day forecast
- Weather alerts/warnings
- Historical weather data
- Multiple location support
- Custom weather icons
- Integration with calendar widget for weather-by-day
- Automatic location detection
- Weather-based note templates

## Dependencies

**External APIs:**
- Open-Meteo API (free, no key required)
- No additional npm packages needed

**Obsidian APIs Used:**
- `app.vault.adapter.read()` - Read location file
- `app.metadataCache.getCache()` - Parse frontmatter
- `app.vault.on('modify')` - Watch file changes
- `requestUrl()` - Make HTTP requests

## Privacy & Security

- No tracking or analytics
- No API keys required
- Location data stays in user's vault
- Weather data cached locally, not persisted
- All requests over HTTPS
- No personal data sent to APIs (only coordinates)

## Success Criteria

- [ ] Widget displays accurate weather data
- [ ] Location read from configurable vault file
- [ ] Auto-updates on location file changes
- [ ] Caching reduces API calls effectively
- [ ] Clear error messages for all failure scenarios
- [ ] Settings allow full customization
- [ ] Matches Obsidian design language
- [ ] Works in both light and dark themes
- [ ] No performance impact on dashboard load
- [ ] Passes Obsidian plugin automated scan
