import { App, TFile } from 'obsidian';
import { LocationData } from './WeatherTypes';

export class LocationReader {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async readLocation(filePath: string): Promise<LocationData> {
        // Get the file
        const file = this.app.vault.getAbstractFileByPath(filePath);

        if (!file || !(file instanceof TFile)) {
            throw new Error(`Location file not found: ${filePath}`);
        }

        // Ensure file content is loaded for metadata cache
        await this.app.vault.cachedRead(file);

        // Get cached metadata
        const cache = this.app.metadataCache.getFileCache(file);

        if (!cache || !cache.frontmatter) {
            throw new Error(`No frontmatter found in ${filePath}`);
        }

        const frontmatter = cache.frontmatter;

        // Extract and validate coordinates
        const latitude = frontmatter.latitude;
        const longitude = frontmatter.longitude;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            throw new Error('Missing or invalid latitude/longitude in frontmatter');
        }

        // Validate coordinate ranges
        if (latitude < -90 || latitude > 90) {
            throw new Error(`Invalid latitude: ${latitude} (must be between -90 and 90)`);
        }

        if (longitude < -180 || longitude > 180) {
            throw new Error(`Invalid longitude: ${longitude} (must be between -180 and 180)`);
        }

        return {
            latitude,
            longitude,
            location: frontmatter.location as string | undefined
        };
    }

    /**
     * Watch for changes to location file
     */
    watchLocation(filePath: string, callback: () => void): void {
        this.app.vault.on('modify', (file) => {
            if (file.path === filePath) {
                callback();
            }
        });
    }
}
