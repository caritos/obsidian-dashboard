import { App } from 'obsidian';
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { PhotoCollector, PhotoData } from '../services/PhotoCollector';

interface PhotoWidgetSettings extends WidgetSettings {
    refreshInterval: number; // in seconds
}

export class PhotoWidget extends Widget {
    private app: App;
    private photoCollector: PhotoCollector;
    private currentPhoto: PhotoData | null = null;
    private refreshIntervalId: number | null = null;

    constructor(app: App, photoCollector: PhotoCollector, settings: PhotoWidgetSettings) {
        super(null, settings);
        this.app = app;
        this.photoCollector = photoCollector;
    }

    getId(): string {
        return 'photo';
    }

    getName(): string {
        return 'Random photo';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header photo-widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Add refresh button
        const refreshButton = header.createEl('button', {
            cls: 'photo-refresh-button',
            text: '🔄'
        });
        refreshButton.setAttribute('aria-label', 'Refresh photo');
        refreshButton.addEventListener('click', () => {
            void this.update();
        });

        // Create photo container
        const photoContainer = containerEl.createEl('div', { cls: 'photo-container' });

        if (this.currentPhoto) {
            this.renderPhoto(photoContainer, this.currentPhoto);
        } else {
            photoContainer.createEl('p', { text: 'Loading photo...' });
        }
    }

    async update(): Promise<void> {
        // Get a random photo
        this.currentPhoto = await this.photoCollector.getRandomPhoto();

        // Re-render
        if (this.containerEl) {
            this.render(this.containerEl);
        }

        // Set up auto-refresh if enabled
        this.setupAutoRefresh();
    }

    private renderPhoto(container: HTMLElement, photo: PhotoData): void {
        container.empty();

        if (!photo) {
            container.createEl('p', {
                text: 'No imgur photos found in vault',
                cls: 'photo-empty'
            });
            return;
        }

        // Create clickable link wrapper
        const linkWrapper = container.createEl('a', {
            cls: 'photo-link',
            href: photo.url
        });
        linkWrapper.setAttribute('target', '_blank');
        linkWrapper.setAttribute('rel', 'noopener noreferrer');

        // Create image element
        const img = linkWrapper.createEl('img', {
            cls: 'photo-image'
        });
        img.src = photo.url;
        img.alt = `Photo from ${photo.fileName}`;

        // Add loading state
        img.addEventListener('load', () => {
            img.addClass('photo-loaded');
        });

        img.addEventListener('error', () => {
            container.empty();
            container.createEl('p', {
                text: 'Failed to load photo',
                cls: 'photo-error'
            });
        });

        // Add caption with source note
        const caption = container.createEl('div', { cls: 'photo-caption' });
        caption.createEl('span', {
            text: `From: ${photo.fileName}`,
            cls: 'photo-source'
        });
    }

    private setupAutoRefresh(): void {
        // Clear existing interval if any
        if (this.refreshIntervalId !== null) {
            window.clearInterval(this.refreshIntervalId);
        }

        const settings = this.settings as PhotoWidgetSettings;
        const intervalMs = settings.refreshInterval * 1000;

        // Set up new interval
        this.refreshIntervalId = window.setInterval(() => {
            void this.update();
        }, intervalMs);
    }

    destroy(): void {
        // Clear refresh interval
        if (this.refreshIntervalId !== null) {
            window.clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
        }

        super.destroy();
    }
}
