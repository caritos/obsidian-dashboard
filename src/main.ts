import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardSettings, DEFAULT_SETTINGS, WidgetSettings } from './types';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './DashboardView';
import { WidgetRegistry } from './widgets/WidgetRegistry';
import { ActivityHeatmapWidget } from './widgets/ActivityHeatmapWidget';
import { StatsWidget } from './widgets/StatsWidget';
import { DashboardSettingsTab } from './settings/SettingsTab';

export default class DashboardPlugin extends Plugin {
    settings: DashboardSettings;
    widgetRegistry: WidgetRegistry;

    async onload() {
        await this.loadSettings();

        // Initialize widget registry
        this.widgetRegistry = new WidgetRegistry();

        // Register widgets
        this.widgetRegistry.register('activity-heatmap', (settings: WidgetSettings) => {
            return new ActivityHeatmapWidget(this.app, settings as WidgetSettings & {
                days: number;
                countMode: 'unique' | 'total';
                colorScheme: 'theme-adaptive' | 'github-green' | 'custom';
            });
        });

        this.widgetRegistry.register('stats', (settings: WidgetSettings) => {
            return new StatsWidget(this.app, settings as WidgetSettings & {
                visibleMetrics: string[];
                streakMinNotes: number;
            });
        });

        // Register view
        this.registerView(
            VIEW_TYPE_DASHBOARD,
            (leaf) => new DashboardView(leaf, this.widgetRegistry, this.settings)
        );

        // Register command to open dashboard
        this.addCommand({
            id: 'open-dashboard',
            name: 'Open Dashboard',
            callback: () => {
                this.activateView();
            }
        });

        // Register settings tab
        this.addSettingTab(new DashboardSettingsTab(this.app, this));

        console.log('Dashboard plugin loaded');
    }

    onunload() {
        console.log('Dashboard plugin unloaded');
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);

        if (leaves.length > 0) {
            // View already exists, reveal it
            leaf = leaves[0];
        } else {
            // Create new view
            leaf = workspace.getLeaf(true);
            await leaf.setViewState({
                type: VIEW_TYPE_DASHBOARD,
                active: true,
            });
        }

        workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
