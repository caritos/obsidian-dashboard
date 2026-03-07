import { ItemView, WorkspaceLeaf } from 'obsidian';
import { WidgetRegistry } from './widgets/WidgetRegistry';
import { Widget } from './widgets/Widget';
import { DashboardSettings } from './types';

export const VIEW_TYPE_DASHBOARD = 'dashboard-view';

export interface DashboardPlugin {
    settings: DashboardSettings;
    saveSettings(): Promise<void>;
}

export class DashboardView extends ItemView {
    private widgetRegistry: WidgetRegistry;
    private settings: DashboardSettings;
    private activeWidgets: Widget[] = [];
    private plugin: DashboardPlugin;

    constructor(leaf: WorkspaceLeaf, widgetRegistry: WidgetRegistry, settings: DashboardSettings, plugin: DashboardPlugin) {
        super(leaf);
        this.widgetRegistry = widgetRegistry;
        this.settings = settings;
        this.plugin = plugin;
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

                // Add collapse functionality
                const isCollapsed = this.settings.collapsedWidgets.includes(widgetId);
                if (isCollapsed) {
                    widgetContainer.classList.add('collapsed');
                }

                widget.render(widgetContainer);
                await widget.update();

                // Add collapse toggle AFTER update (in case widget re-renders during update)
                this.addCollapseToggle(widgetContainer, widgetId, isCollapsed);

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

    private addCollapseToggle(widgetContainer: HTMLElement, widgetId: string, isCollapsed: boolean): void {
        const header = widgetContainer.querySelector('.widget-header') as HTMLElement;
        if (!header) return;

        // Check if toggle already exists (avoid duplicates)
        const existingToggle = header.querySelector('.widget-collapse-toggle');
        if (existingToggle) {
            existingToggle.remove();
        }

        header.classList.add('collapsible');

        // Create toggle button
        const toggleBtn = document.createElement('span');
        toggleBtn.className = 'widget-collapse-toggle';
        toggleBtn.textContent = isCollapsed ? '▶' : '▼';

        // Insert toggle as first child of header (before h3)
        header.insertBefore(toggleBtn, header.firstChild);

        // Handle click on header to toggle
        header.addEventListener('click', (e) => {
            // Don't collapse if clicking on buttons inside header
            const target = e.target as HTMLElement;
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                return;
            }

            const currentlyCollapsed = widgetContainer.classList.contains('collapsed');

            if (currentlyCollapsed) {
                widgetContainer.classList.remove('collapsed');
                toggleBtn.textContent = '▼';
                this.plugin.settings.collapsedWidgets = this.plugin.settings.collapsedWidgets.filter(id => id !== widgetId);
            } else {
                widgetContainer.classList.add('collapsed');
                toggleBtn.textContent = '▶';
                if (!this.plugin.settings.collapsedWidgets.includes(widgetId)) {
                    this.plugin.settings.collapsedWidgets.push(widgetId);
                }
            }

            void this.plugin.saveSettings();
        });
    }
}
