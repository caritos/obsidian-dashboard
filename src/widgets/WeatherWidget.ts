import { App } from 'obsidian';
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { LocationReader } from '../services/LocationReader';
import { WeatherService } from '../services/WeatherService';
import { WeatherSettings, WeatherData } from '../services/WeatherTypes';

export class WeatherWidget extends Widget {
    private app: App;
    private locationReader: LocationReader;
    private weatherService: WeatherService;
    private weatherData: WeatherData | null = null;
    private error: string | null = null;

    constructor(app: App, settings: WidgetSettings) {
        super(null, settings);
        this.app = app;
        this.locationReader = new LocationReader(app);
        this.weatherService = new WeatherService();
    }

    getId(): string {
        return 'weather';
    }

    getName(): string {
        return 'Weather';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create content container
        const content = containerEl.createEl('div', { cls: 'weather-widget-container' });

        if (this.error) {
            this.renderError(content);
        } else if (this.weatherData) {
            this.renderWeather(content);
        } else {
            content.createEl('p', { text: 'Loading weather...' });
        }
    }

    update(): Promise<void> {
        return this.fetchAndRender();
    }

    private async fetchAndRender(): Promise<void> {
        const settings = this.settings as unknown as WeatherSettings;

        try {
            // Read location from file
            const locationData = await this.locationReader.readLocation(
                settings.locationFilePath
            );

            // Fetch weather data
            this.weatherData = await this.weatherService.fetchWeather(
                locationData.latitude,
                locationData.longitude,
                settings,
                locationData.location
            );

            this.error = null;

            // Setup file watcher for location changes
            this.locationReader.watchLocation(
                settings.locationFilePath,
                () => {
                    this.weatherService.invalidateCache();
                    void this.fetchAndRender();
                }
            );

        } catch (err) {
            this.error = err instanceof Error ? err.message : String(err);
            this.weatherData = this.weatherService.getCachedData();
        }

        // Re-render
        if (this.containerEl) {
            this.render(this.containerEl);
        }
    }

    private renderError(container: HTMLElement): void {
        const errorEl = container.createEl('div', { cls: 'weather-error' });

        if (this.error?.includes('not found')) {
            errorEl.createEl('p', { text: 'No location set' });
            errorEl.createEl('p', {
                text: `Create ${(this.settings as unknown as WeatherSettings).locationFilePath} with:`,
                cls: 'weather-error-hint'
            });
            const code = errorEl.createEl('pre');
            code.createEl('code', {
                text: '---\nlatitude: your_lat\nlongitude: your_lon\n---'
            });
        } else {
            errorEl.createEl('p', { text: this.error || 'Unknown error' });

            // Show cached data if available
            if (this.weatherData) {
                errorEl.createEl('p', {
                    text: 'Using cached data',
                    cls: 'weather-error-hint'
                });
                this.renderWeather(container);
            }
        }
    }

    private renderWeather(container: HTMLElement): void {
        if (!this.weatherData) return;

        const settings = this.settings as unknown as WeatherSettings;
        const { current, daily, location } = this.weatherData;

        // Hero section
        const hero = container.createEl('div', { cls: 'weather-hero' });

        const tempSection = hero.createEl('div', { cls: 'weather-temp-section' });
        tempSection.createEl('span', {
            cls: 'weather-icon',
            text: current.icon
        });
        tempSection.createEl('span', {
            cls: 'weather-temp',
            text: `${Math.round(current.temperature)}°`
        });

        hero.createEl('div', {
            cls: 'weather-condition',
            text: current.condition
        });

        const detailsEl = hero.createEl('div', { cls: 'weather-details' });
        detailsEl.createEl('span', {
            text: `Feels like ${Math.round(current.apparentTemperature)}°`
        });
        detailsEl.createEl('span', {
            text: ` • Day ${Math.round(daily.temperatureMax)}°`
        });
        detailsEl.createEl('span', {
            text: ` • Night ${Math.round(daily.temperatureMin)}°`
        });

        if (location) {
            hero.createEl('div', {
                cls: 'weather-location',
                text: location
            });
        }

        // Metrics grid
        const metricsGrid = container.createEl('div', { cls: 'weather-metrics-grid' });

        if (settings.visibleMetrics.includes('sunrise')) {
            this.renderMetric(metricsGrid, '🌅 Sunrise',
                WeatherService.formatTime(daily.sunrise));
        }

        if (settings.visibleMetrics.includes('sunset')) {
            this.renderMetric(metricsGrid, '🌇 Sunset',
                WeatherService.formatTime(daily.sunset));
        }

        if (settings.visibleMetrics.includes('wind')) {
            const windDir = WeatherService.formatWindDirection(current.windDirection);
            this.renderMetric(metricsGrid, '💨 Wind',
                `${Math.round(current.windSpeed)} ${settings.windSpeedUnit} ${windDir}`);
        }

        if (settings.visibleMetrics.includes('humidity')) {
            this.renderMetric(metricsGrid, '💧 Humidity',
                `${current.humidity}%`);
        }

        if (settings.visibleMetrics.includes('pressure')) {
            this.renderMetric(metricsGrid, '🌡️ Pressure',
                `${Math.round(current.pressure)} hPa`);
        }

        if (settings.visibleMetrics.includes('uvIndex')) {
            this.renderMetric(metricsGrid, '☀️ UV index',
                `${Math.round(current.uvIndex)} of 11`);
        }

        if (settings.visibleMetrics.includes('visibility')) {
            this.renderMetric(metricsGrid, '👁️ Visibility',
                `${Math.round(current.visibility)} km`);
        }
    }

    private renderMetric(
        container: HTMLElement,
        label: string,
        value: string
    ): void {
        const metric = container.createEl('div', { cls: 'weather-metric' });
        metric.createEl('div', { cls: 'weather-metric-label', text: label });
        metric.createEl('div', { cls: 'weather-metric-value', text: value });
    }

    destroy(): void {
        super.destroy();
        // Cleanup is handled by Obsidian's event system
    }
}
