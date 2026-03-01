import { App, PluginSettingTab, Setting } from 'obsidian';
import DashboardPlugin from '../main';
import { MocTrendingSettings } from '../services/MocTypes';
import { WeatherSettings } from '../services/WeatherTypes';

export class DashboardSettingsTab extends PluginSettingTab {
    plugin: DashboardPlugin;

    constructor(app: App, plugin: DashboardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Auto refresh')
            .setDesc('Automatically refresh dashboard when vault changes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoRefresh)
                .onChange(async (value) => {
                    this.plugin.settings.autoRefresh = value;
                    await this.plugin.saveSettings();
                }));

        // Widget Settings
        new Setting(containerEl)
            .setName('Enabled widgets')
            .setHeading();

        new Setting(containerEl)
            .setName('Activity heatmap')
            .setDesc('Show note creation/modification heatmap')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabledWidgets.includes('activity-heatmap'))
                .onChange(async (value) => {
                    if (value) {
                        if (!this.plugin.settings.enabledWidgets.includes('activity-heatmap')) {
                            this.plugin.settings.enabledWidgets.push('activity-heatmap');
                        }
                    } else {
                        const index = this.plugin.settings.enabledWidgets.indexOf('activity-heatmap');
                        if (index > -1) {
                            this.plugin.settings.enabledWidgets.splice(index, 1);
                        }
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Statistics')
            .setDesc('Show vault statistics (streaks, totals, etc.)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabledWidgets.includes('stats'))
                .onChange(async (value) => {
                    if (value) {
                        if (!this.plugin.settings.enabledWidgets.includes('stats')) {
                            this.plugin.settings.enabledWidgets.push('stats');
                        }
                    } else {
                        const index = this.plugin.settings.enabledWidgets.indexOf('stats');
                        if (index > -1) {
                            this.plugin.settings.enabledWidgets.splice(index, 1);
                        }
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Trending maps of content')
            .setDesc('Show trending maps of content by category')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabledWidgets.includes('moc-trending'))
                .onChange(async (value) => {
                    if (value) {
                        if (!this.plugin.settings.enabledWidgets.includes('moc-trending')) {
                            this.plugin.settings.enabledWidgets.push('moc-trending');
                        }
                    } else {
                        const index = this.plugin.settings.enabledWidgets.indexOf('moc-trending');
                        if (index > -1) {
                            this.plugin.settings.enabledWidgets.splice(index, 1);
                        }
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Weather')
            .setDesc('Show current weather conditions and forecast')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabledWidgets.includes('weather'))
                .onChange(async (value) => {
                    if (value) {
                        if (!this.plugin.settings.enabledWidgets.includes('weather')) {
                            this.plugin.settings.enabledWidgets.push('weather');
                        }
                    } else {
                        const index = this.plugin.settings.enabledWidgets.indexOf('weather');
                        if (index > -1) {
                            this.plugin.settings.enabledWidgets.splice(index, 1);
                        }
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Random photo')
            .setDesc('Show random photos from imgur links in your vault')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabledWidgets.includes('photo'))
                .onChange(async (value) => {
                    if (value) {
                        if (!this.plugin.settings.enabledWidgets.includes('photo')) {
                            this.plugin.settings.enabledWidgets.push('photo');
                        }
                    } else {
                        const index = this.plugin.settings.enabledWidgets.indexOf('photo');
                        if (index > -1) {
                            this.plugin.settings.enabledWidgets.splice(index, 1);
                        }
                    }
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // Weather Settings
        if (this.plugin.settings.enabledWidgets.includes('weather')) {
            new Setting(containerEl)
                .setName('Weather')
                .setHeading();

            const weatherSettings = this.plugin.settings.widgetSettings['weather'] as unknown as WeatherSettings;

            new Setting(containerEl)
                .setName('Location file path')
                .setDesc('Path to Markdown file with location coordinates')
                .addText(text => text
                    .setPlaceholder('resources/current-location.md')
                    .setValue(weatherSettings.locationFilePath || 'resources/current-location.md')
                    .onChange(async (value) => {
                        weatherSettings.locationFilePath = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Temperature unit')
                .setDesc('Display temperature in Celsius or Fahrenheit')
                .addDropdown(dropdown => dropdown
                    .addOption('celsius', 'Celsius')
                    .addOption('fahrenheit', 'Fahrenheit')
                    .setValue(weatherSettings.temperatureUnit || 'fahrenheit')
                    .onChange(async (value) => {
                        weatherSettings.temperatureUnit = value as 'celsius' | 'fahrenheit';
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Wind speed unit')
                .setDesc('Display wind speed in kilometers or miles per hour')
                .addDropdown(dropdown => dropdown
                    .addOption('kmh', 'Kilometers per hour (km/h)')
                    .addOption('mph', 'Miles per hour (mph)')
                    .setValue(weatherSettings.windSpeedUnit || 'mph')
                    .onChange(async (value) => {
                        weatherSettings.windSpeedUnit = value as 'kmh' | 'mph';
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Cache duration')
                .setDesc('Minutes to cache weather data before refreshing')
                .addSlider(slider => slider
                    .setLimits(15, 120, 15)
                    .setValue(weatherSettings.cacheDuration || 30)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        weatherSettings.cacheDuration = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Visible metrics')
                .setDesc('Select which weather metrics to display')
                .setClass('weather-metrics-setting');

            const metrics = [
                { id: 'sunrise', label: 'Sunrise' },
                { id: 'sunset', label: 'Sunset' },
                { id: 'wind', label: 'Wind' },
                { id: 'humidity', label: 'Humidity' },
                { id: 'pressure', label: 'Pressure' },
                { id: 'uvIndex', label: 'UV index' },
                { id: 'visibility', label: 'Visibility' }
            ];

            const visibleMetrics = weatherSettings.visibleMetrics || [];

            metrics.forEach(metric => {
                new Setting(containerEl)
                    .setName(metric.label)
                    .addToggle(toggle => toggle
                        .setValue(visibleMetrics.includes(metric.id))
                        .onChange(async (value) => {
                            if (value) {
                                if (!visibleMetrics.includes(metric.id)) {
                                    visibleMetrics.push(metric.id);
                                }
                            } else {
                                const index = visibleMetrics.indexOf(metric.id);
                                if (index > -1) {
                                    visibleMetrics.splice(index, 1);
                                }
                            }
                            weatherSettings.visibleMetrics = visibleMetrics;
                            await this.plugin.saveSettings();
                        }));
            });
        }

        // Photo Settings
        if (this.plugin.settings.enabledWidgets.includes('photo')) {
            new Setting(containerEl)
                .setName('Random photo')
                .setHeading();

            const photoSettings = this.plugin.settings.widgetSettings['photo'];

            new Setting(containerEl)
                .setName('Collection file path')
                .setDesc('Path to file where photo URLs are stored')
                .addText(text => text
                    .setPlaceholder('resources/random-photo-collection.md')
                    .setValue((photoSettings?.collectionFilePath as string) || 'resources/random-photo-collection.md')
                    .onChange(async (value) => {
                        photoSettings.collectionFilePath = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Auto-refresh interval')
                .setDesc('Seconds between automatic photo changes')
                .addSlider(slider => slider
                    .setLimits(60, 600, 30)
                    .setValue((photoSettings?.refreshInterval as number) || 300)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        photoSettings.refreshInterval = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // Activity Heatmap Settings
        new Setting(containerEl)
            .setName('Activity heatmap')
            .setHeading();

        new Setting(containerEl)
            .setName('Date range')
            .setDesc('Number of days to display')
            .addText(text => {
                const days = this.plugin.settings.widgetSettings['activity-heatmap']?.days;
                const daysValue = typeof days === 'number' ? days : 365;
                return text
                    .setValue(String(daysValue))
                    .onChange(async (value) => {
                        const days = parseInt(value);
                        if (!isNaN(days) && days > 0) {
                            this.plugin.settings.widgetSettings['activity-heatmap'].days = days;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        new Setting(containerEl)
            .setName('Count mode')
            .setDesc('How to count notes per day')
            .addDropdown(dropdown => dropdown
                .addOption('unique', 'Unique notes per day')
                .addOption('total', 'Total events (creation and modification)')
                .setValue(this.plugin.settings.widgetSettings['activity-heatmap'].countMode as string)
                .onChange(async (value) => {
                    this.plugin.settings.widgetSettings['activity-heatmap'].countMode = value;
                    await this.plugin.saveSettings();
                }));

        // Stats Settings
        new Setting(containerEl)
            .setName('Statistics')
            .setHeading();

        new Setting(containerEl)
            .setName('Streak minimum')
            .setDesc('Minimum notes per day to count for streaks')
            .addText(text => {
                const streakMinNotes = this.plugin.settings.widgetSettings['stats']?.streakMinNotes;
                const minValue = typeof streakMinNotes === 'number' ? streakMinNotes : 1;
                return text
                    .setValue(String(minValue))
                    .onChange(async (value) => {
                        const min = parseInt(value);
                        if (!isNaN(min) && min > 0) {
                            this.plugin.settings.widgetSettings['stats'].streakMinNotes = min;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        // MOC Trending Settings
        if (this.plugin.settings.enabledWidgets.includes('moc-trending')) {
            new Setting(containerEl)
                .setName('Trending maps of content')
                .setHeading();

            const mocSettings = this.plugin.settings.widgetSettings['moc-trending'] as unknown as MocTrendingSettings;

            // Time window setting
            new Setting(containerEl)
                .setName('Time window')
                .setDesc('Number of days to look back for trending activity')
                .addDropdown(dropdown => dropdown
                    .addOption('7', '7 days')
                    .addOption('14', '14 days')
                    .addOption('30', '30 days')
                    .addOption('60', '60 days')
                    .addOption('90', '90 days')
                    .setValue(String(mocSettings.timeWindow || 7))
                    .onChange(async (value) => {
                        mocSettings.timeWindow = parseInt(value);
                        await this.plugin.saveSettings();
                    }));

            // Max MOCs per category
            new Setting(containerEl)
                .setName('Maps of content per category')
                .setDesc('Maximum number of trending maps of content to show per category')
                .addSlider(slider => slider
                    .setLimits(3, 10, 1)
                    .setValue(mocSettings.maxMocsPerCategory || 5)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        mocSettings.maxMocsPerCategory = value;
                        await this.plugin.saveSettings();
                    }));

            // Activity weight
            new Setting(containerEl)
                .setName('Activity weight')
                .setDesc('Weight for recent note activity (0.0 to 1.0)')
                .addSlider(slider => slider
                    .setLimits(0, 1, 0.1)
                    .setValue(mocSettings.scoreWeighting?.activityWeight || 0.7)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        if (!mocSettings.scoreWeighting) {
                            mocSettings.scoreWeighting = { activityWeight: 0.7, newBacklinkWeight: 0.3 };
                        }
                        mocSettings.scoreWeighting.activityWeight = value;
                        mocSettings.scoreWeighting.newBacklinkWeight = 1 - value;
                        await this.plugin.saveSettings();
                    }));

            // Base paths
            new Setting(containerEl)
                .setName('Map of content base path')
                .setDesc('Base directory for map of content files (relative to vault root)')
                .addText(text => text
                    .setPlaceholder('Moc')
                    .setValue(mocSettings.mocBasePath || 'moc')
                    .onChange(async (value) => {
                        mocSettings.mocBasePath = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Resources path')
                .setDesc('Directory containing resource notes (relative to vault root)')
                .addText(text => text
                    .setPlaceholder('Resources')
                    .setValue(mocSettings.resourcesPath || 'resources')
                    .onChange(async (value) => {
                        mocSettings.resourcesPath = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
