import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardSettings, DEFAULT_SETTINGS, WidgetSettings } from './types';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './DashboardView';
import { WidgetRegistry } from './widgets/WidgetRegistry';
import { ActivityHeatmapWidget } from './widgets/ActivityHeatmapWidget';
import { StatsWidget } from './widgets/StatsWidget';
import { DashboardSettingsTab } from './settings/SettingsTab';
import { DataCollector } from './services/DataCollector';
import { MocDataCollector } from './services/MocDataCollector';
import { MocTrendingWidget } from './widgets/MocTrendingWidget';
import { WeatherWidget } from './widgets/WeatherWidget';

export default class DashboardPlugin extends Plugin {
    settings: DashboardSettings;
    widgetRegistry: WidgetRegistry;
    dataCollector: DataCollector;

    async onload() {
        await this.loadSettings();

        // Initialize data collector
        this.dataCollector = new DataCollector(this.app.vault);

        // Initialize widget registry
        this.widgetRegistry = new WidgetRegistry();

        // Register widgets
        this.widgetRegistry.register('activity-heatmap', (settings: WidgetSettings) => {
            return new ActivityHeatmapWidget(this.app, this.dataCollector, settings as WidgetSettings & {
                days: number;
                countMode: 'unique' | 'total';
                colorScheme: 'theme-adaptive' | 'github-green' | 'custom';
            });
        });

        this.widgetRegistry.register('stats', (settings: WidgetSettings) => {
            return new StatsWidget(this.app, this.dataCollector, settings as WidgetSettings & {
                visibleMetrics: string[];
                streakMinNotes: number;
            });
        });

        // Register MOC Trending Widget
        this.widgetRegistry.register('moc-trending', (settings: WidgetSettings) => {
            const mocDataCollector = new MocDataCollector(this.app.vault, this.app.metadataCache);
            return new MocTrendingWidget(this.app, mocDataCollector, settings);
        });

        // Register Weather Widget
        this.widgetRegistry.register('weather', (settings: WidgetSettings) => {
            return new WeatherWidget(this.app, settings);
        });

        // Register view
        this.registerView(
            VIEW_TYPE_DASHBOARD,
            (leaf) => new DashboardView(leaf, this.widgetRegistry, this.settings)
        );

        // Register command to open dashboard
        this.addCommand({
            id: 'open',
            name: 'Open',
            callback: async () => {
                await this.activateView();
            }
        });

        // Register force refresh command
        this.addCommand({
            id: 'force-refresh',
            name: 'Force refresh',
            checkCallback: (checking: boolean) => {
                const dashboardView = this.getDashboardView();
                if (dashboardView) {
                    if (!checking) {
                        this.dataCollector.invalidateCache();
                        void dashboardView.refresh().catch(console.error);
                    }
                    return true;
                }
                return false;
            }
        });

        // Register settings tab
        this.addSettingTab(new DashboardSettingsTab(this.app, this));
    }

    onunload() {
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

        await workspace.revealLeaf(leaf);
    }

    getDashboardView(): DashboardView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);
        if (leaves.length > 0) {
            const view = leaves[0].view;
            if (view instanceof DashboardView) {
                return view;
            }
        }
        return null;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
