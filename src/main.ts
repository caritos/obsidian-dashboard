import { Plugin } from 'obsidian';
import { DashboardSettings, DEFAULT_SETTINGS } from './types';

export default class DashboardPlugin extends Plugin {
    settings: DashboardSettings;

    async onload() {
        await this.loadSettings();

        console.log('Dashboard plugin loaded');

        // Register command to open dashboard
        this.addCommand({
            id: 'open-dashboard',
            name: 'Open Dashboard',
            callback: () => {
                console.log('Dashboard command triggered');
            }
        });
    }

    onunload() {
        console.log('Dashboard plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
