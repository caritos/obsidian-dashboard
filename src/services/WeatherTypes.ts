import { TFile } from 'obsidian';

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
    cacheDuration: number;  // minutes
    visibleMetrics: string[];
}

export interface WeatherCache {
    data: WeatherData;
    timestamp: number;
    coordinates: { lat: number; lon: number };
}

// WMO Weather codes mapping
export const WEATHER_CODES: Record<number, { condition: string; icon: string }> = {
    0: { condition: 'Clear', icon: '☀️' },
    1: { condition: 'Mainly clear', icon: '🌤️' },
    2: { condition: 'Partly cloudy', icon: '⛅' },
    3: { condition: 'Overcast', icon: '☁️' },
    45: { condition: 'Foggy', icon: '🌫️' },
    48: { condition: 'Foggy', icon: '🌫️' },
    51: { condition: 'Light drizzle', icon: '🌦️' },
    53: { condition: 'Drizzle', icon: '🌦️' },
    55: { condition: 'Heavy drizzle', icon: '🌧️' },
    61: { condition: 'Light rain', icon: '🌧️' },
    63: { condition: 'Rain', icon: '🌧️' },
    65: { condition: 'Heavy rain', icon: '🌧️' },
    71: { condition: 'Light snow', icon: '🌨️' },
    73: { condition: 'Snow', icon: '🌨️' },
    75: { condition: 'Heavy snow', icon: '🌨️' },
    77: { condition: 'Snow grains', icon: '🌨️' },
    80: { condition: 'Light showers', icon: '🌦️' },
    81: { condition: 'Showers', icon: '🌧️' },
    82: { condition: 'Heavy showers', icon: '🌧️' },
    85: { condition: 'Light snow showers', icon: '🌨️' },
    86: { condition: 'Snow showers', icon: '🌨️' },
    95: { condition: 'Thunderstorm', icon: '⛈️' },
    96: { condition: 'Thunderstorm with hail', icon: '⛈️' },
    99: { condition: 'Thunderstorm with hail', icon: '⛈️' },
};
