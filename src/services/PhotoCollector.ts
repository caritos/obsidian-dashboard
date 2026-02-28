import { Vault, MetadataCache, TFile, TAbstractFile } from 'obsidian';

export interface PhotoData {
    url: string;
    fileName: string;
    filePath: string;
}

export class PhotoCollector {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private collectionFilePath: string;
    private cache: PhotoData[] | null = null;
    private cacheTimestamp: number = 0;
    private readonly cacheDuration: number = 300000; // 5 minutes

    constructor(vault: Vault, metadataCache: MetadataCache, collectionFilePath: string) {
        this.vault = vault;
        this.metadataCache = metadataCache;
        this.collectionFilePath = collectionFilePath;
    }

    /**
     * Reads photos from the collection file
     */
    async collectPhotos(): Promise<PhotoData[]> {
        const now = Date.now();

        // Return cached data if still valid
        if (this.cache && (now - this.cacheTimestamp < this.cacheDuration)) {
            console.log(`PhotoCollector: Using cached photos (${this.cache.length} photos)`);
            return this.cache;
        }

        console.log(`PhotoCollector: Reading from collection file: ${this.collectionFilePath}`);
        const photos = await this.readCollectionFile();

        // Update cache
        this.cache = photos;
        this.cacheTimestamp = now;

        console.log(`PhotoCollector: Loaded ${photos.length} photos from collection file`);
        return photos;
    }

    /**
     * Reads the photo collection file and parses photos
     */
    private async readCollectionFile(): Promise<PhotoData[]> {
        const file = this.vault.getAbstractFileByPath(this.collectionFilePath);

        if (!file || !(file instanceof TFile)) {
            console.log('PhotoCollector: Collection file not found, returning empty array');
            return [];
        }

        const content = await this.vault.cachedRead(file);
        const photos: PhotoData[] = [];

        // Parse lines like: - ![alt](url) <!-- from: filename.md | path: path/to/file.md -->
        const photoLineRegex = /!\[.*?\]\((https?:\/\/(?:i\.)?imgur\.com\/[^\s)]+)\)\s*<!--\s*from:\s*(.+?)\s*\|\s*path:\s*(.+?)\s*-->/g;
        let match;

        while ((match = photoLineRegex.exec(content)) !== null) {
            photos.push({
                url: match[1],
                fileName: match[2].trim(),
                filePath: match[3].trim()
            });
        }

        return photos;
    }

    /**
     * Scans the entire vault and updates the collection file
     */
    async rebuildCollection(onProgress?: (current: number, total: number, found: number) => void): Promise<number> {
        console.log('PhotoCollector: Starting full vault scan...');
        const startTime = Date.now();
        const photos: PhotoData[] = [];
        const files = this.vault.getMarkdownFiles();

        // Exclude the collection file itself
        const filesToScan = files.filter(f => f.path !== this.collectionFilePath);
        console.log(`PhotoCollector: Found ${filesToScan.length} markdown files to scan`);

        // Process files in batches to avoid blocking UI
        const batchSize = 50;
        for (let i = 0; i < filesToScan.length; i += batchSize) {
            const batch = filesToScan.slice(i, i + batchSize);

            // Process batch
            const batchPromises = batch.map(file => this.extractImgurUrls(file));
            const batchResults = await Promise.all(batchPromises);

            // Collect URLs from batch
            batch.forEach((file, index) => {
                batchResults[index].forEach(url => {
                    photos.push({
                        url,
                        fileName: file.basename,
                        filePath: file.path
                    });
                });
            });

            // Report progress
            const current = Math.min(i + batchSize, filesToScan.length);
            if (onProgress) {
                onProgress(current, filesToScan.length, photos.length);
            }

            // Yield to UI thread between batches
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const scanTime = Date.now() - startTime;
        console.log(`PhotoCollector: Scan complete! Found ${photos.length} imgur photos in ${scanTime}ms`);

        // Write to collection file
        await this.writeCollectionFile(photos);

        // Invalidate cache
        this.invalidateCache();

        return photos.length;
    }

    /**
     * Writes photos to the collection file
     */
    private async writeCollectionFile(photos: PhotoData[]): Promise<void> {
        let content = '# Random Photo Collection\n\n';
        content += `> Auto-generated file. Last updated: ${new Date().toISOString()}\n`;
        content += `> Total photos: ${photos.length}\n\n`;

        if (photos.length === 0) {
            content += 'No imgur photos found in vault.\n';
        } else {
            for (const photo of photos) {
                content += `- ![](${photo.url}) <!-- from: ${photo.fileName} | path: ${photo.filePath} -->\n`;
            }
        }

        // Ensure parent directory exists
        const dirPath = this.collectionFilePath.substring(0, this.collectionFilePath.lastIndexOf('/'));
        if (dirPath) {
            const dir = this.vault.getAbstractFileByPath(dirPath);
            if (!dir) {
                await this.vault.createFolder(dirPath);
            }
        }

        // Write file
        const file = this.vault.getAbstractFileByPath(this.collectionFilePath);
        if (file instanceof TFile) {
            await this.vault.modify(file, content);
        } else {
            await this.vault.create(this.collectionFilePath, content);
        }

        console.log(`PhotoCollector: Wrote ${photos.length} photos to ${this.collectionFilePath}`);
    }

    /**
     * Extracts imgur URLs from a markdown file
     */
    private async extractImgurUrls(file: TFile): Promise<string[]> {
        try {
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
        } catch (error) {
            console.warn(`PhotoCollector: Failed to read file ${file.path}:`, error);
            return [];
        }
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
     * Invalidates the cache, forcing a fresh read on next collection
     */
    invalidateCache(): void {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}
