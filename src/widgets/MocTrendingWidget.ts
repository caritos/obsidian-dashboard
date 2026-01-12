import { App } from 'obsidian';
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { MocDataCollector } from '../services/MocDataCollector';
import { MocTrendingData, MocCategory, MocTrendingSettings } from '../services/MocTypes';
import { MocTrendingModal } from '../components/MocTrendingModal';

export class MocTrendingWidget extends Widget {
    private app: App;
    private mocDataCollector: MocDataCollector;

    constructor(app: App, mocDataCollector: MocDataCollector, settings: WidgetSettings) {
        // Pass null for DataCollector since we're using MocDataCollector instead
        super(null, settings);
        this.app = app;
        this.mocDataCollector = mocDataCollector;
    }

    getId(): string {
        return 'moc-trending';
    }

    getName(): string {
        return 'Trending MOCs';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: '🔥 ' + this.getName() });

        // Create content container
        const content = containerEl.createEl('div', { cls: 'moc-trending-container' });
        content.createEl('p', { text: 'Loading trending MOCs...' });
    }

    async update(): Promise<void> {
        if (!this.containerEl) return;

        const settings = this.settings as unknown as MocTrendingSettings;
        const trendingData = this.mocDataCollector.collectTrendingMocs(settings);

        // Render categories
        const content = this.containerEl.querySelector('.moc-trending-container') as HTMLElement;
        if (!content) return;

        content.empty();

        // Render each category
        this.renderCategory(content, 'what', '📋 What (%)', trendingData.get('what') || []);
        this.renderCategory(content, 'where', '📍 Where (+)', trendingData.get('where') || []);
        this.renderCategory(content, 'who', '👤 Who (~)', trendingData.get('who') || []);
    }

    private renderCategory(container: HTMLElement, category: MocCategory, title: string, mocs: MocTrendingData[]): void {
        if (mocs.length === 0) return;

        const section = container.createEl('div', { cls: 'moc-trending-category' });
        section.createEl('h4', { text: title, cls: 'moc-trending-category-title' });

        const list = section.createEl('div', { cls: 'moc-trending-list' });

        mocs.forEach((moc, index) => {
            this.renderMocItem(list, moc, index + 1);
        });
    }

    private renderMocItem(container: HTMLElement, moc: MocTrendingData, rank: number): void {
        const item = container.createEl('div', { cls: 'moc-trending-item' });

        // Rank
        item.createEl('span', { cls: 'moc-trending-rank', text: `${rank}.` });

        // MOC name (clickable)
        const nameEl = item.createEl('a', {
            cls: 'moc-trending-name',
            text: moc.mocName
        });

        if (moc.mocFile) {
            nameEl.addEventListener('click', (e) => {
                e.preventDefault();
                void this.app.workspace.openLinkText(moc.mocFile!.path, '', false);
            });
        } else {
            nameEl.addClass('moc-trending-missing');
            nameEl.title = 'MOC file not found';
        }

        // Metrics container
        const metrics = item.createEl('span', { cls: 'moc-trending-metrics' });

        // Activity count (clickable)
        const activityEl = metrics.createEl('span', {
            cls: 'moc-trending-metric',
            text: `↑${moc.recentActivityCount}`
        });
        activityEl.title = 'Recent activity';
        activityEl.addEventListener('click', (e) => {
            e.stopPropagation();
            new MocTrendingModal(
                this.app,
                `Recently Active Notes - ${moc.mocName}`,
                moc.recentlyLinkedNotes
            ).open();
        });

        // Backlink count (clickable)
        const backlinkEl = metrics.createEl('span', {
            cls: 'moc-trending-metric',
            text: `🔗${moc.newBacklinksCount}`
        });
        backlinkEl.title = 'New backlinks';
        backlinkEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const newNotes = moc.recentlyLinkedNotes.filter(file => {
                const now = Date.now();
                const settings = this.settings as unknown as MocTrendingSettings;
                const timeWindowMs = settings.timeWindow * 24 * 60 * 60 * 1000;
                return file.stat.ctime >= (now - timeWindowMs);
            });
            new MocTrendingModal(
                this.app,
                `New Notes Linking to ${moc.mocName}`,
                newNotes
            ).open();
        });
    }
}
