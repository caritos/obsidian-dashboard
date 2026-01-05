import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { HeatmapRenderer, HeatmapCell } from '../components/Heatmap';
import { DataCollector } from '../services/DataCollector';
import { NoteListModal } from '../components/NoteListModal';
import { ActivityData } from '../services/types';
import { App, TFile } from 'obsidian';

interface ActivityHeatmapSettings extends WidgetSettings {
    days: number;
    countMode: 'unique' | 'total';
    colorScheme: 'theme-adaptive' | 'github-green' | 'custom';
}

export class ActivityHeatmapWidget extends Widget {
    private app: App;
    private heatmapRenderer: HeatmapRenderer;
    private activityData: ActivityData | null = null;

    constructor(app: App, dataCollector: DataCollector, settings: ActivityHeatmapSettings) {
        super(dataCollector, settings);
        this.app = app;
        this.heatmapRenderer = new HeatmapRenderer();
    }

    getId(): string {
        return 'activity-heatmap';
    }

    getName(): string {
        return 'Activity Heatmap';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create heatmap container
        const heatmapContainer = containerEl.createEl('div', { cls: 'heatmap-container' });

        // Show loading state
        heatmapContainer.createEl('p', { text: 'Loading activity data...' });
    }

    update(): Promise<void> {
        const settings = this.settings as ActivityHeatmapSettings;

        try {
            this.activityData = this.dataCollector.collectActivityData(settings.days);

            // Convert to heatmap cells
            const cells: HeatmapCell[] = [];
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - settings.days);

            // Generate all dates in range
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateString = this.getDateString(d);
                const activity = this.activityData.dailyActivity.get(dateString);

                let count = 0;
                if (activity) {
                    if (settings.countMode === 'unique') {
                        // Count unique notes (a note is counted once if created OR modified)
                        const uniqueFiles = new Set([
                            ...activity.created,
                            ...activity.modified
                        ]);
                        count = uniqueFiles.size;
                    } else {
                        // Count total events
                        count = activity.created.size + activity.modified.size;
                    }
                }

                cells.push({ date: dateString, count });
            }

            // Render heatmap
            if (!this.containerEl) return Promise.resolve();
            const heatmapContainer = this.containerEl.querySelector('.heatmap-container') as HTMLElement;
            if (heatmapContainer) {
                this.heatmapRenderer.render(heatmapContainer, cells, (date) => {
                    this.onCellClick(date);
                });
            }
            return Promise.resolve();
        } catch (error) {
            console.error('Error collecting activity data:', error);
            if (this.containerEl) {
                const heatmapContainer = this.containerEl.querySelector('.heatmap-container') as HTMLElement;
                if (heatmapContainer) {
                    heatmapContainer.empty();
                    heatmapContainer.createEl('p', {
                        text: 'Error loading activity data. Please try again.',
                        cls: 'error-message'
                    });
                }
            }
            return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        }
    }

    private onCellClick(date: string) {
        if (!this.activityData) {
            return;
        }

        const activity = this.activityData.dailyActivity.get(date);

        const created: TFile[] = activity ? Array.from(activity.created) : [];
        const modified: TFile[] = activity ? Array.from(activity.modified) : [];

        const modal = new NoteListModal(this.app, {
            date,
            created,
            modified
        });
        modal.open();
    }

    private getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
