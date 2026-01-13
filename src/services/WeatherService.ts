import { requestUrl } from 'obsidian';
import {
    WeatherData,
    WeatherCache,
    WeatherSettings,
    WEATHER_CODES
} from './WeatherTypes';

interface OpenMeteoResponse {
    current: {
        temperature_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
        relative_humidity_2m: number;
        surface_pressure: number;
        uv_index: number;
        visibility: number;
    };
    daily: {
        sunrise: string[];
        sunset: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
    };
}

export class WeatherService {
    private cache: WeatherCache | null = null;
    private inFlight: Promise<WeatherData> | null = null;

    /**
     * Fetch weather data with caching
     */
    async fetchWeather(
        latitude: number,
        longitude: number,
        settings: WeatherSettings,
        location?: string
    ): Promise<WeatherData> {
        // Check cache
        if (this.isCacheValid(latitude, longitude, settings.cacheDuration)) {
            return this.cache!.data;
        }

        // Prevent concurrent requests
        if (this.inFlight) {
            return this.inFlight;
        }

        // Fetch fresh data
        this.inFlight = this.fetchFromAPI(latitude, longitude, settings, location);

        try {
            const data = await this.inFlight;
            this.updateCache(data, latitude, longitude);
            return data;
        } finally {
            this.inFlight = null;
        }
    }

    /**
     * Check if cache is valid
     */
    private isCacheValid(
        latitude: number,
        longitude: number,
        cacheDuration: number
    ): boolean {
        if (!this.cache) return false;

        // Check if coordinates changed
        if (
            this.cache.coordinates.lat !== latitude ||
            this.cache.coordinates.lon !== longitude
        ) {
            return false;
        }

        // Check if cache expired
        const now = Date.now();
        const cacheAge = now - this.cache.timestamp;
        const maxAge = cacheDuration * 60 * 1000; // Convert minutes to ms

        return cacheAge < maxAge;
    }

    /**
     * Fetch from Open-Meteo API
     */
    private async fetchFromAPI(
        latitude: number,
        longitude: number,
        settings: WeatherSettings,
        location?: string
    ): Promise<WeatherData> {
        const url = new URL('https://api.open-meteo.com/v1/forecast');

        // Add query parameters
        url.searchParams.append('latitude', latitude.toString());
        url.searchParams.append('longitude', longitude.toString());
        url.searchParams.append('current', [
            'temperature_2m',
            'apparent_temperature',
            'weather_code',
            'wind_speed_10m',
            'wind_direction_10m',
            'relative_humidity_2m',
            'surface_pressure',
            'uv_index',
            'visibility'
        ].join(','));
        url.searchParams.append('daily', [
            'sunrise',
            'sunset',
            'temperature_2m_max',
            'temperature_2m_min'
        ].join(','));
        url.searchParams.append('temperature_unit', settings.temperatureUnit);
        url.searchParams.append('wind_speed_unit', settings.windSpeedUnit);
        url.searchParams.append('timezone', 'auto');

        try {
            const response = await requestUrl({
                url: url.toString(),
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                throw: false,
            });

            if (response.status !== 200) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            return this.parseAPIResponse(response.json, location);
        } catch (error) {
            throw new Error(`Failed to fetch weather data: ${error.message}`);
        }
    }

    /**
     * Parse API response into our data structure
     */
    private parseAPIResponse(json: OpenMeteoResponse, location?: string): WeatherData {
        const current = json.current;
        const daily = json.daily;

        const weatherCode = current.weather_code;
        const weatherInfo = WEATHER_CODES[weatherCode] || {
            condition: 'Unknown',
            icon: '❓'
        };

        return {
            current: {
                temperature: current.temperature_2m,
                apparentTemperature: current.apparent_temperature,
                condition: weatherInfo.condition,
                weatherCode: weatherCode,
                icon: weatherInfo.icon,
                humidity: current.relative_humidity_2m,
                windSpeed: current.wind_speed_10m,
                windDirection: current.wind_direction_10m,
                pressure: current.surface_pressure,
                uvIndex: current.uv_index,
                visibility: current.visibility / 1000, // Convert m to km
            },
            daily: {
                sunrise: daily.sunrise[0],
                sunset: daily.sunset[0],
                temperatureMax: daily.temperature_2m_max[0],
                temperatureMin: daily.temperature_2m_min[0],
            },
            location,
            timestamp: Date.now(),
        };
    }

    /**
     * Update cache with fresh data
     */
    private updateCache(
        data: WeatherData,
        latitude: number,
        longitude: number
    ): void {
        this.cache = {
            data,
            timestamp: Date.now(),
            coordinates: { lat: latitude, lon: longitude },
        };
    }

    /**
     * Invalidate cache (for manual refresh or location change)
     */
    invalidateCache(): void {
        this.cache = null;
    }

    /**
     * Get cached data if available
     */
    getCachedData(): WeatherData | null {
        return this.cache?.data || null;
    }

    /**
     * Format wind direction from degrees to compass direction
     */
    static formatWindDirection(degrees: number): string {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    /**
     * Format time from ISO timestamp
     */
    static formatTime(isoString: string): string {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
}
