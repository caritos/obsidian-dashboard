import { Vault, MetadataCache, TFile } from 'obsidian';

export interface PhotoData {
    url: string;
    fileName: string;
    filePath: string;
}

export class PhotoCollector {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private cache: PhotoData[] | null = null;
    private cacheTimestamp: number = 0;
    private readonly cacheDuration: number = 60000; // 1 minute

    constructor(vault: Vault, metadataCache: MetadataCache) {
        this.vault = vault;
        this.metadataCache = metadataCache;
    }

    /**
     * Collects all imgur URLs from markdown files in the vault
     */
    async collectPhotos(): Promise<PhotoData[]> {
        const now = Date.now();

        // Return cached data if still valid
        if (this.cache && (now - this.cacheTimestamp < this.cacheDuration)) {
            return this.cache;
        }

        const photos: PhotoData[] = [];
        const files = this.vault.getMarkdownFiles();

        for (const file of files) {
            const urls = await this.extractImgurUrls(file);
            urls.forEach(url => {
                photos.push({
                    url,
                    fileName: file.basename,
                    filePath: file.path
                });
            });
        }

        // Update cache
        this.cache = photos;
        this.cacheTimestamp = now;

        return photos;
    }

    /**
     * Extracts imgur URLs from a markdown file
     */
    private async extractImgurUrls(file: TFile): Promise<string[]> {
        const content = await this.vault.cachedRead(file);
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
    }

    /**
     * Gets a random photo from the collected photos
     */
    async getRandomPhoto(): Promise<PhotoData | null> {
        const photos = await this.collectPhotos();

        if (photos.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * photos.length);
        return photos[randomIndex];
    }

    /**
     * Invalidates the cache, forcing a fresh scan on next collection
     */
    invalidateCache(): void {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}
