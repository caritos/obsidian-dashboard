import { TFile, Vault, MetadataCache } from 'obsidian';
import { ActivityData, DailyActivity, StreakData } from './types';

export class DataCollector {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private cache: ActivityData | null = null;
    private cacheTime: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(vault: Vault, metadataCache: MetadataCache) {
        this.vault = vault;
        this.metadataCache = metadataCache;
    }

    collectActivityData(days: number = 365): ActivityData {
        // Check cache
        const now = Date.now();
        const cacheAge = now - this.cacheTime;
        if (this.cache && cacheAge < this.CACHE_TTL) {
            console.log('[DataCollector] Using cached data (age:', Math.round(cacheAge / 1000), 'seconds)');
            return this.cache;
        }

        console.log('[DataCollector] Cache miss or expired, scanning vault...');

        const dailyActivity = new Map<string, DailyActivity>();

        let files: TFile[];
        try {
            files = this.vault.getMarkdownFiles();
            console.log('[DataCollector] Total markdown files in vault:', files.length);
        } catch (error) {
            console.error('Error getting markdown files from vault:', error);
            throw new Error('Failed to access vault files');
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        console.log('[DataCollector] Date range:', this.getDateString(startDate.getTime()), 'to', this.getDateString(endDate.getTime()));
        console.log('[DataCollector] Scanning', days, 'days of activity');

        let filesInRange = 0;
        let filesProcessed = 0;

        for (const file of files) {
            try {
                filesProcessed++;

                // Try to extract date from frontmatter "when" field first
                const frontmatterDate = this.extractDateFromFrontmatter(file);

                let createdDate: string;
                let modifiedDate: string;

                if (frontmatterDate) {
                    // Use frontmatter date as the creation date
                    createdDate = frontmatterDate;
                    modifiedDate = frontmatterDate;
                } else {
                    // Fall back to filesystem timestamps
                    createdDate = this.getDateString(file.stat.ctime);
                    modifiedDate = this.getDateString(file.stat.mtime);
                }

                let addedToRange = false;

                // Track creation (using frontmatter date if available)
                const createdTimestamp = frontmatterDate
                    ? new Date(frontmatterDate).getTime()
                    : file.stat.ctime;

                if (this.isInRange(createdTimestamp, startDate, endDate)) {
                    if (!dailyActivity.has(createdDate)) {
                        dailyActivity.set(createdDate, {
                            created: new Set(),
                            modified: new Set()
                        });
                    }
                    dailyActivity.get(createdDate)!.created.add(file);
                    addedToRange = true;
                }

                // Track modification (only if no frontmatter date, otherwise skip to avoid duplicates)
                if (!frontmatterDate && this.isInRange(file.stat.mtime, startDate, endDate)) {
                    if (!dailyActivity.has(modifiedDate)) {
                        dailyActivity.set(modifiedDate, {
                            created: new Set(),
                            modified: new Set()
                        });
                    }
                    dailyActivity.get(modifiedDate)!.modified.add(file);
                    addedToRange = true;
                }

                if (addedToRange) {
                    filesInRange++;
                }

                // Log first few files for debugging
                if (filesProcessed <= 5) {
                    console.log(`[DataCollector] File ${filesProcessed}:`, file.path,
                        'created:', createdDate, 'modified:', modifiedDate,
                        'frontmatterDate:', frontmatterDate,
                        'inRange:', addedToRange);
                }
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                // Continue processing other files
                continue;
            }
        }

        console.log('[DataCollector] Processed', filesProcessed, 'files,', filesInRange, 'in date range');
        console.log('[DataCollector] Unique activity dates found:', dailyActivity.size);

        const activityData: ActivityData = {
            dailyActivity,
            totalNotes: files.length,
            dateRange: {
                start: this.getDateString(startDate.getTime()),
                end: this.getDateString(endDate.getTime())
            }
        };

        // Update cache
        this.cache = activityData;
        this.cacheTime = now;

        return activityData;
    }

    calculateStreaks(activityData: ActivityData, minNotes: number = 1): StreakData {
        const sortedDates = Array.from(activityData.dailyActivity.keys()).sort();

        let currentStreak = 0;
        let longestStreak = 0;
        let currentStart: string | null = null;
        let longestStart: string | null = null;
        let longestEnd: string | null = null;

        const today = this.getDateString(Date.now());
        let previousDate = this.getPreviousDate(today);

        // Check if there's activity today or yesterday
        const hasRecentActivity = activityData.dailyActivity.has(today) ||
                                  activityData.dailyActivity.has(previousDate);

        if (!hasRecentActivity) {
            currentStreak = 0;
        } else {
            // Calculate current streak going backwards from today
            let checkDate = today;
            while (true) {
                const activity = activityData.dailyActivity.get(checkDate);

                // If no activity on this date, streak is broken
                if (!activity) {
                    break;
                }

                const noteCount = activity.created.size + activity.modified.size;

                if (noteCount >= minNotes) {
                    if (currentStreak === 0) {
                        currentStart = checkDate;
                    }
                    currentStreak++;
                    checkDate = this.getPreviousDate(checkDate);
                } else {
                    // Activity exists but doesn't meet minNotes threshold
                    break;
                }
            }
        }

        // Calculate longest streak
        let tempStreak = 0;
        let tempStart: string | null = null;
        let lastDate: string | null = null;

        for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            const activity = activityData.dailyActivity.get(date)!;
            const noteCount = activity.created.size + activity.modified.size;

            if (noteCount >= minNotes) {
                // Check if this date is consecutive to the last date
                const isConsecutive = lastDate === null || this.getNextDate(lastDate) === date;

                if (isConsecutive) {
                    if (tempStreak === 0) {
                        tempStart = date;
                    }
                    tempStreak++;
                    lastDate = date;

                    if (tempStreak > longestStreak) {
                        longestStreak = tempStreak;
                        longestStart = tempStart;
                        longestEnd = date;
                    }
                } else {
                    // Gap detected, reset the streak
                    tempStreak = 1;
                    tempStart = date;
                    lastDate = date;

                    if (tempStreak > longestStreak) {
                        longestStreak = tempStreak;
                        longestStart = tempStart;
                        longestEnd = date;
                    }
                }
            } else {
                tempStreak = 0;
                tempStart = null;
                lastDate = null;
            }
        }

        return {
            current: currentStreak,
            longest: longestStreak,
            currentStart,
            longestStart,
            longestEnd
        };
    }

    invalidateCache() {
        this.cache = null;
        this.cacheTime = 0;
    }

    private getDateString(timestamp: number): string {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private isInRange(timestamp: number, start: Date, end: Date): boolean {
        return timestamp >= start.getTime() && timestamp <= end.getTime();
    }

    private getPreviousDate(dateString: string): string {
        const date = new Date(dateString);
        date.setDate(date.getDate() - 1);
        return this.getDateString(date.getTime());
    }

    private getNextDate(dateString: string): string {
        const date = new Date(dateString);
        date.setDate(date.getDate() + 1);
        return this.getDateString(date.getTime());
    }

    private extractDateFromFrontmatter(file: TFile): string | null {
        try {
            const metadata = this.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter?.when) {
                return null;
            }

            const whenField = metadata.frontmatter.when;
            const whenArray = Array.isArray(whenField) ? whenField : [whenField];

            // Look for YYYY-MM-DD format in the when array
            // Example: "[[@2020-01-13]]" -> "2020-01-13"
            const datePattern = /\[\[@?(\d{4}-\d{2}-\d{2})\]\]/;

            for (const value of whenArray) {
                if (typeof value !== 'string') continue;

                const match = value.match(datePattern);
                if (match) {
                    return match[1]; // Return YYYY-MM-DD
                }
            }

            return null;
        } catch (error) {
            // Silently fail and fall back to filesystem timestamps
            return null;
        }
    }
}
