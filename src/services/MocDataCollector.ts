import { TFile, Vault, MetadataCache, normalizePath } from 'obsidian';
import { MocTrendingData, MocTrendingSettings, MocReference, MocCategory } from './MocTypes';
import { FrontmatterParser } from './FrontmatterParser';

/**
 * Collects and processes MOC (Map of Content) trending data from vault resources.
 *
 * This class scans the resources directory for markdown files containing MOC references
 * in their frontmatter (who/what/where fields), calculates trending scores based on
 * reference frequency and recency, and provides cached results for performance.
 *
 * The collector uses a time-based cache (1-minute TTL) to avoid redundant vault scans
 * and provides separate trending data for each MOC category (what, where, who).
 */
export class MocDataCollector {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private cache: Map<MocCategory, MocTrendingData[]> | null = null;
    private cacheTime: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(vault: Vault, metadataCache: MetadataCache) {
        this.vault = vault;
        this.metadataCache = metadataCache;
    }

    /**
     * Collects trending MOC data for all categories
     */
    async collectTrendingMocs(settings: MocTrendingSettings): Promise<Map<MocCategory, MocTrendingData[]>> {
        // Check cache
        const now = Date.now();
        if (this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
            return this.cache;
        }

        const categories: MocCategory[] = ['what', 'where', 'who'];
        const result = new Map<MocCategory, MocTrendingData[]>();

        // Scan resources directory for MOC references
        const mocReferences = await this.scanResourcesDirectory(settings);

        // Build trending data for each category
        for (const category of categories) {
            const categoryRefs = mocReferences.filter(ref => ref.category === category);
            const trendingData = this.calculateTrendingScores(categoryRefs, settings, category);

            // Sort by score and take top N
            trendingData.sort((a, b) => b.score - a.score);
            const topMocs = trendingData.slice(0, settings.maxMocsPerCategory);

            result.set(category, topMocs);
        }

        // Update cache
        this.cache = result;
        this.cacheTime = now;

        return result;
    }

    /**
     * Scans resources directory for MOC references in frontmatter
     */
    private async scanResourcesDirectory(settings: MocTrendingSettings): Promise<MocReference[]> {
        const references: MocReference[] = [];

        let files: TFile[];
        try {
            files = this.vault.getMarkdownFiles();
        } catch (error) {
            console.error('Error getting markdown files from vault:', error);
            throw new Error('Failed to access vault files');
        }

        // Calculate time window
        const now = Date.now();
        const timeWindowMs = settings.timeWindow * 24 * 60 * 60 * 1000;
        const cutoffTime = now - timeWindowMs;

        // Normalize the resources path for cross-platform compatibility
        const normalizedResourcesPath = normalizePath(settings.resourcesPath);

        for (const file of files) {
            try {
                // Only process files in resources directory
                // Normalize both paths for cross-platform comparison
                const normalizedFilePath = normalizePath(file.path);
                if (!normalizedFilePath.startsWith(normalizedResourcesPath + '/') &&
                    normalizedFilePath !== normalizedResourcesPath) {
                    continue;
                }

                // Get frontmatter
                const cache = this.metadataCache.getFileCache(file);
                if (!cache || !cache.frontmatter) {
                    continue;
                }

                const frontmatter = cache.frontmatter;
                const isNewNote = file.stat.ctime >= cutoffTime;

                // Extract MOC references from who/what/where fields
                const fields: { field: string; category: MocCategory }[] = [
                    { field: 'who', category: 'who' },
                    { field: 'what', category: 'what' },
                    { field: 'where', category: 'where' }
                ];

                for (const { field, category } of fields) {
                    const wikilinks = FrontmatterParser.extractWikilinks(frontmatter[field]);

                    for (const wikilink of wikilinks) {
                        const mocName = FrontmatterParser.stripMocPrefix(wikilink);

                        references.push({
                            mocName,
                            category,
                            sourceFile: file,
                            isNewNote
                        });
                    }
                }
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                // Continue processing other files
                continue;
            }
        }

        return references;
    }

    /**
     * Calculates trending scores for MOCs based on activity and backlinks
     */
    private calculateTrendingScores(
        references: MocReference[],
        settings: MocTrendingSettings,
        category: MocCategory
    ): MocTrendingData[] {
        // Group references by MOC name
        const mocMap = new Map<string, MocReference[]>();

        for (const ref of references) {
            if (!mocMap.has(ref.mocName)) {
                mocMap.set(ref.mocName, []);
            }
            mocMap.get(ref.mocName)!.push(ref);
        }

        // Calculate scores for each MOC
        const trendingData: MocTrendingData[] = [];
        const now = Date.now();
        const timeWindowMs = settings.timeWindow * 24 * 60 * 60 * 1000;
        const cutoffTime = now - timeWindowMs;

        for (const [mocName, refs] of mocMap.entries()) {
            // Calculate activity score (notes with recent creates/modifies)
            const recentlyActiveNotes = new Set<TFile>();
            for (const ref of refs) {
                const file = ref.sourceFile;
                const hasRecentActivity =
                    file.stat.ctime >= cutoffTime ||
                    file.stat.mtime >= cutoffTime;

                if (hasRecentActivity) {
                    recentlyActiveNotes.add(file);
                }
            }
            const activityScore = recentlyActiveNotes.size;

            // Calculate backlink score (new notes created in time window)
            const newBacklinks = refs.filter(ref => ref.isNewNote);
            const backlinkScore = newBacklinks.length;

            // Calculate weighted trending score
            const { activityWeight, newBacklinkWeight } = settings.scoreWeighting;
            const score = (activityScore * activityWeight) + (backlinkScore * newBacklinkWeight);

            // Skip MOCs with zero score
            if (score === 0) continue;

            // Find MOC file
            const mocFile = this.findMocFile(mocName, category, settings);

            trendingData.push({
                category,
                mocName,
                mocFile,
                score,
                recentlyLinkedNotes: Array.from(recentlyActiveNotes),
                recentActivityCount: activityScore,
                newBacklinksCount: backlinkScore
            });
        }

        return trendingData;
    }

    /**
     * Finds the MOC file for a given name and category
     */
    private findMocFile(mocName: string, category: MocCategory, settings: MocTrendingSettings): TFile | null {
        const categoryDirMap = {
            'what': 'what (%)',
            'where': 'where (+)',
            'who': 'who (~)'
        };

        const categoryDir = categoryDirMap[category];
        const prefix = category === 'what' ? '%' : category === 'where' ? '+' : '~';

        // Try different filename patterns
        const patterns = [
            normalizePath(`${settings.mocBasePath}/${categoryDir}/${prefix}${mocName}.md`),
            normalizePath(`${settings.mocBasePath}/${categoryDir}/${mocName}.md`)
        ];

        for (const pattern of patterns) {
            const file = this.vault.getAbstractFileByPath(pattern);
            if (file instanceof TFile) {
                return file;
            }
        }

        return null;
    }

    invalidateCache() {
        this.cache = null;
        this.cacheTime = 0;
    }
}
