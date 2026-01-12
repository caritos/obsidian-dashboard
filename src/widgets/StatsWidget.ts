import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { DataCollector } from '../services/DataCollector';
import { ActivityData } from '../services/types';
import { App, TFile } from 'obsidian';

interface StatsWidgetSettings extends WidgetSettings {
    visibleMetrics: string[];
    streakMinNotes: number;
}

interface Stats {
    total: number;
    currentStreak: number;
    longestStreak: number;
    thisWeek: number;
    thisMonth: number;
    busiestDay: { date: string; count: number } | null;
}

export class StatsWidget extends Widget {
    private app: App;

    constructor(app: App, dataCollector: DataCollector, settings: StatsWidgetSettings) {
        super(dataCollector, settings);
        this.app = app;
    }

    getId(): string {
        return 'stats';
    }

    getName(): string {
        return 'Statistics';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create stats container
        const statsContainer = containerEl.createEl('div', { cls: 'stats-container' });
        statsContainer.createEl('p', { text: 'Loading statistics...' });
    }

    update(): Promise<void> {
        const settings = this.settings as StatsWidgetSettings;
        const activityData = this.dataCollector!.collectActivityData(365);
        const streakData = this.dataCollector!.calculateStreaks(activityData, settings.streakMinNotes);

        // Calculate stats
        const stats: Stats = {
            total: activityData.totalNotes,
            currentStreak: streakData.current,
            longestStreak: streakData.longest,
            thisWeek: this.countNotesInLastDays(activityData, 7),
            thisMonth: this.countNotesInLastDays(activityData, 30),
            busiestDay: this.findBusiestDay(activityData)
        };

        // Render stats
        if (!this.containerEl) return Promise.resolve();
        const statsContainer = this.containerEl.querySelector('.stats-container') as HTMLElement;
        if (statsContainer) {
            statsContainer.empty();

            const grid = statsContainer.createEl('div', { cls: 'stats-grid' });

            // Render each visible metric
            if (settings.visibleMetrics.includes('total')) {
                this.renderStatCard(grid, 'Total notes', stats.total.toString(), 'file-text');
            }

            if (settings.visibleMetrics.includes('currentStreak')) {
                this.renderStatCard(grid, 'Current streak', `${stats.currentStreak} days`, 'flame');
            }

            if (settings.visibleMetrics.includes('longestStreak')) {
                this.renderStatCard(grid, 'Longest streak', `${stats.longestStreak} days`, 'trophy');
            }

            if (settings.visibleMetrics.includes('thisWeek')) {
                this.renderStatCard(grid, 'This week', stats.thisWeek.toString(), 'calendar');
            }

            if (settings.visibleMetrics.includes('thisMonth')) {
                this.renderStatCard(grid, 'This month', stats.thisMonth.toString(), 'calendar-range');
            }

            if (settings.visibleMetrics.includes('busiestDay') && stats.busiestDay) {
                this.renderStatCard(
                    grid,
                    'Busiest day',
                    `${stats.busiestDay.count} notes`,
                    'trending-up',
                    stats.busiestDay.date
                );
            }
        }
        return Promise.resolve();
    }

    private renderStatCard(
        container: HTMLElement,
        label: string,
        value: string,
        icon: string,
        subtitle?: string
    ) {
        const card = container.createEl('div', { cls: 'stat-card' });

        const iconEl = card.createEl('div', { cls: 'stat-icon' });
        const iconContent = iconEl.createEl('span', { cls: 'stat-icon-emoji' });
        iconContent.textContent = this.getIconEmoji(icon);

        const content = card.createEl('div', { cls: 'stat-content' });
        content.createEl('div', { cls: 'stat-label', text: label });
        content.createEl('div', { cls: 'stat-value', text: value });

        if (subtitle) {
            content.createEl('div', { cls: 'stat-subtitle', text: subtitle });
        }
    }

    private countNotesInLastDays(activityData: ActivityData, days: number): number {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const uniqueNotes = new Set();

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateString = this.getDateString(d);
            const activity = activityData.dailyActivity.get(dateString);

            if (activity) {
                activity.created.forEach((file: TFile) => uniqueNotes.add(file.path));
                activity.modified.forEach((file: TFile) => uniqueNotes.add(file.path));
            }
        }

        return uniqueNotes.size;
    }

    private findBusiestDay(activityData: ActivityData): { date: string; count: number } | null {
        let busiestDate: string | null = null;
        let maxCount = 0;

        for (const [date, activity] of activityData.dailyActivity.entries()) {
            const uniqueNotes = new Set([
                ...activity.created,
                ...activity.modified
            ]);
            const count = uniqueNotes.size;

            if (count > maxCount) {
                maxCount = count;
                busiestDate = date;
            }
        }

        return busiestDate ? { date: busiestDate, count: maxCount } : null;
    }

    private getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private getIconEmoji(icon: string): string {
        // Simple icon placeholders (in production, use actual icon library)
        const icons: Record<string, string> = {
            'file-text': '📄',
            'flame': '🔥',
            'trophy': '🏆',
            'calendar': '📅',
            'calendar-range': '📆',
            'trending-up': '📈'
        };
        return icons[icon] || '•';
    }
}
