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
import { PhotoWidget } from './widgets/PhotoWidget';
import { PhotoCollector } from './services/PhotoCollector';
import { LatestNotesWidget } from './widgets/LatestNotesWidget';
import { LatestPhotosWidget } from './widgets/LatestPhotosWidget';

export default class DashboardPlugin extends Plugin {
    settings: DashboardSettings;
    widgetRegistry: WidgetRegistry;
    dataCollector: DataCollector;

    async onload() {
        await this.loadSettings();

        // Initialize data collector
        this.dataCollector = new DataCollector(this.app.vault, this.app.metadataCache);

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

        // Register Photo Widget
        this.widgetRegistry.register('photo', (settings: WidgetSettings) => {
            const photoSettings = settings as WidgetSettings & {
                refreshInterval: number;
                collectionFilePath: string;
            };
            const photoCollector = new PhotoCollector(
                this.app.vault,
                this.app.metadataCache,
                photoSettings.collectionFilePath
            );
            return new PhotoWidget(this.app, photoCollector, photoSettings);
        });

        // Register Latest Notes Widget
        this.widgetRegistry.register('latest-notes', (settings: WidgetSettings) => {
            return new LatestNotesWidget(this.app, settings as WidgetSettings & {
                maxNotes: number;
            });
        });

        // Register Latest Photos Widget
        this.widgetRegistry.register('latest-photos', (settings: WidgetSettings) => {
            return new LatestPhotosWidget(this.app, settings as WidgetSettings & {
                maxPhotos: number;
            });
        });

        // Register view
        this.registerView(
            VIEW_TYPE_DASHBOARD,
            (leaf) => new DashboardView(leaf, this.widgetRegistry, this.settings, this)
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
        const loadedData = await this.loadData();
        this.settings = this.deepMerge(DEFAULT_SETTINGS, loadedData || {});
    }

    private deepMerge(target: DashboardSettings, source: Partial<DashboardSettings>): DashboardSettings {
        const result: DashboardSettings = JSON.parse(JSON.stringify(target));

        if (!source) return result;

        // Merge top-level arrays
        if (source.enabledWidgets) result.enabledWidgets = [...source.enabledWidgets];
        if (source.widgetOrder) result.widgetOrder = [...source.widgetOrder];
        if (source.collapsedWidgets) result.collapsedWidgets = [...source.collapsedWidgets];
        if (typeof source.autoRefresh === 'boolean') result.autoRefresh = source.autoRefresh;

        // Deep merge widgetSettings
        if (source.widgetSettings) {
            for (const widgetId in source.widgetSettings) {
                if (Object.prototype.hasOwnProperty.call(source.widgetSettings, widgetId)) {
                    result.widgetSettings[widgetId] = {
                        ...result.widgetSettings[widgetId],
                        ...source.widgetSettings[widgetId]
                    };
                }
            }
        }

        return result;
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
