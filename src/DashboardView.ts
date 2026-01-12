import { ItemView, WorkspaceLeaf } from 'obsidian';
import { WidgetRegistry } from './widgets/WidgetRegistry';
import { Widget } from './widgets/Widget';
import { DashboardSettings } from './types';

export const VIEW_TYPE_DASHBOARD = 'dashboard-view';

export class DashboardView extends ItemView {
    private widgetRegistry: WidgetRegistry;
    private settings: DashboardSettings;
    private activeWidgets: Widget[] = [];

    constructor(leaf: WorkspaceLeaf, widgetRegistry: WidgetRegistry, settings: DashboardSettings) {
        super(leaf);
        this.widgetRegistry = widgetRegistry;
        this.settings = settings;
    }

    getViewType(): string {
        return VIEW_TYPE_DASHBOARD;
    }

    getDisplayText(): string {
        return 'Dashboard';
    }

    getIcon(): string {
        return 'layout-dashboard';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('dashboard-view');

        // Create header
        const header = container.createEl('div', { cls: 'dashboard-header' });
        header.createEl('h2', { text: 'Dashboard' });

        // Create widgets container
        const widgetsContainer = container.createEl('div', { cls: 'dashboard-widgets' });

        // Render widgets in order
        for (const widgetId of this.settings.widgetOrder) {
            if (!this.settings.enabledWidgets.includes(widgetId)) {
                continue;
            }

            const widgetSettings = this.settings.widgetSettings[widgetId] || {};
            const widget = this.widgetRegistry.create(widgetId, widgetSettings);

            if (widget) {
                const widgetContainer = widgetsContainer.createEl('div', {
                    cls: 'dashboard-widget-container'
                });
                widgetContainer.setAttribute('data-widget-id', widgetId);

                widget.render(widgetContainer);
                await widget.update();

                this.activeWidgets.push(widget);
            }
        }
    }

    onClose(): Promise<void> {
        // Cleanup widgets
        for (const widget of this.activeWidgets) {
            widget.destroy();
        }
        this.activeWidgets = [];
        return Promise.resolve();
    }

    async refresh() {
        for (const widget of this.activeWidgets) {
            await widget.update();
        }
    }

    updateSettings(settings: DashboardSettings) {
        this.settings = settings;
    }
}
