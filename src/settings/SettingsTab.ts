import { App, PluginSettingTab, Setting } from 'obsidian';
import DashboardPlugin from '../main';

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

        // Activity Heatmap Settings
        new Setting(containerEl)
            .setName('Activity heatmap')
            .setHeading();

        new Setting(containerEl)
            .setName('Date range')
            .setDesc('Number of days to display')
            .addText(text => text
                .setValue(this.plugin.settings.widgetSettings['activity-heatmap'].days.toString())
                .onChange(async (value) => {
                    const days = parseInt(value);
                    if (!isNaN(days) && days > 0) {
                        this.plugin.settings.widgetSettings['activity-heatmap'].days = days;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Count mode')
            .setDesc('How to count notes per day')
            .addDropdown(dropdown => dropdown
                .addOption('unique', 'Unique notes per day')
                .addOption('total', 'Total events (creation + modification)')
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
            .addText(text => text
                .setValue(this.plugin.settings.widgetSettings['stats'].streakMinNotes.toString())
                .onChange(async (value) => {
                    const min = parseInt(value);
                    if (!isNaN(min) && min > 0) {
                        this.plugin.settings.widgetSettings['stats'].streakMinNotes = min;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
