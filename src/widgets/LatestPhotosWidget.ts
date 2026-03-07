import { App, TFile } from 'obsidian';
import { Widget } from './Widget';
import { WidgetSettings } from '../types';

interface LatestPhotosSettings extends WidgetSettings {
    maxPhotos: number;
}

interface PhotoInfo {
    url: string;
    fileName: string;
    filePath: string;
    file: TFile;
    timestamp: number;
}

export class LatestPhotosWidget extends Widget {
    private app: App;
    private photos: PhotoInfo[] = [];

    constructor(app: App, settings: LatestPhotosSettings) {
        super(null, settings);
        this.app = app;
    }

    getId(): string {
        return 'latest-photos';
    }

    getName(): string {
        return 'Latest photos';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create photos container
        const photosContainer = containerEl.createEl('div', { cls: 'latest-photos-container' });
        photosContainer.createEl('p', { text: 'Loading photos...' });
    }

    async update(): Promise<void> {
        if (!this.containerEl) return;

        const settings = this.settings as LatestPhotosSettings;
        const maxPhotos = settings.maxPhotos || 100;

        // Get all markdown files
        const files = this.app.vault.getMarkdownFiles();

        // Sort by modification time (newest first)
        const sortedFiles = files.sort((a, b) => b.stat.mtime - a.stat.mtime);

        // Extract imgur photos from files
        this.photos = [];
        for (const file of sortedFiles) {
            if (this.photos.length >= maxPhotos) {
                break;
            }

            const urls = await this.extractImgurUrls(file);
            for (const url of urls) {
                if (this.photos.length >= maxPhotos) {
                    break;
                }

                this.photos.push({
                    url,
                    fileName: file.basename,
                    filePath: file.path,
                    file,
                    timestamp: file.stat.mtime
                });
            }
        }

        // Render the photos
        this.renderPhotos();
    }

    private async extractImgurUrls(file: TFile): Promise<string[]> {
        try {
            const content = await this.app.vault.cachedRead(file);
            const urls: string[] = [];

            // Match markdown image syntax: ![alt](url)
            const markdownImageRegex = /!\[.*?\]\((https?:\/\/(?:i\.)?imgur\.com\/[^\s)]+)\)/g;
            let match;
            while ((match = markdownImageRegex.exec(content)) !== null) {
                urls.push(match[1]);
            }

            // Match plain URLs: https://imgur.com/... or https://i.imgur.com/...
            const plainUrlRegex = /https?:\/\/(?:i\.)?imgur\.com\/\S+/g;
            while ((match = plainUrlRegex.exec(content)) !== null) {
                // Avoid duplicates from markdown syntax
                if (!urls.includes(match[0])) {
                    urls.push(match[0]);
                }
            }

            return urls;
        } catch (error) {
            console.warn(`LatestPhotosWidget: Failed to read file ${file.path}:`, error);
            return [];
        }
    }

    private renderPhotos(): void {
        if (!this.containerEl) return;

        const photosContainer = this.containerEl.querySelector('.latest-photos-container') as HTMLElement;
        if (!photosContainer) return;

        photosContainer.empty();

        if (this.photos.length === 0) {
            photosContainer.createEl('p', {
                text: 'No imgur photos found in vault',
                cls: 'latest-photos-empty'
            });
            return;
        }

        // Create photos grid
        const photosGrid = photosContainer.createEl('div', { cls: 'latest-photos-grid' });

        for (const photo of this.photos) {
            const photoItem = photosGrid.createEl('div', { cls: 'latest-photo-item' });

            // Create clickable wrapper
            const photoLink = photoItem.createEl('div', { cls: 'latest-photo-link' });

            photoLink.addEventListener('click', async () => {
                await this.app.workspace.getLeaf(false).openFile(photo.file);
            });

            // Create image
            const img = photoLink.createEl('img', {
                cls: 'latest-photo-img'
            });
            img.src = photo.url;
            img.alt = `Photo from ${photo.fileName}`;

            // Add loading state
            img.addEventListener('load', () => {
                img.classList.add('latest-photo-loaded');
            });

            img.addEventListener('error', () => {
                photoItem.classList.add('latest-photo-error');
                photoLink.empty();
                photoLink.createEl('div', {
                    cls: 'latest-photo-error-text',
                    text: '❌'
                });
            });

            // Create caption with source note
            const caption = photoItem.createEl('div', { cls: 'latest-photo-caption' });

            const sourceLink = caption.createEl('a', {
                cls: 'latest-photo-source',
                text: photo.fileName
            });

            sourceLink.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await this.app.workspace.getLeaf(false).openFile(photo.file);
            });

            caption.createEl('div', {
                cls: 'latest-photo-date',
                text: this.formatDate(photo.timestamp)
            });
        }
    }

    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        // Format as date
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}
