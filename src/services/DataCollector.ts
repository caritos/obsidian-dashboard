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
            console.debug('[DataCollector] Using cached data (age:', Math.round(cacheAge / 1000), 'seconds)');
            return this.cache;
        }

        console.debug('[DataCollector] Cache miss or expired, scanning vault...');

        const dailyActivity = new Map<string, DailyActivity>();

        let files: TFile[];
        try {
            files = this.vault.getMarkdownFiles();
            console.debug('[DataCollector] Total markdown files in vault:', files.length);
        } catch (error) {
            console.error('Error getting markdown files from vault:', error);
            throw new Error('Failed to access vault files');
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        console.debug('[DataCollector] Date range:', this.getDateString(startDate.getTime()), 'to', this.getDateString(endDate.getTime()));
        console.debug('[DataCollector] Scanning', days, 'days of activity');

        let filesInRange = 0;
        let filesProcessed = 0;
        let filesWithFrontmatter = 0;
        let filesSkipped = 0;

        for (const file of files) {
            try {
                filesProcessed++;

                // Try to extract date from frontmatter "when" field first
                const frontmatterDate = this.extractDateFromFrontmatter(file);

                // Skip files without frontmatter dates - their filesystem timestamps are unreliable
                // (usually set to sync/migration date rather than actual creation date)
                if (!frontmatterDate) {
                    filesSkipped++;
                    continue;
                }

                filesWithFrontmatter++;

                const createdDate = frontmatterDate;
                const createdTimestamp = new Date(frontmatterDate).getTime();

                let addedToRange = false;

                // Track creation using frontmatter date
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

                if (addedToRange) {
                    filesInRange++;
                }

                // Log first few files for debugging
                if (filesProcessed <= 5) {
                    console.debug(`[DataCollector] File ${filesProcessed}:`, file.path,
                        'frontmatterDate:', frontmatterDate,
                        'inRange:', addedToRange);
                }
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                // Continue processing other files
                continue;
            }
        }

        console.debug('[DataCollector] Processed', filesProcessed, 'files');
        console.debug('[DataCollector] Files with frontmatter dates:', filesWithFrontmatter);
        console.debug('[DataCollector] Files skipped (no frontmatter):', filesSkipped);
        console.debug('[DataCollector] Files in date range:', filesInRange);
        console.debug('[DataCollector] Unique activity dates found:', dailyActivity.size);

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

        console.debug('[Streaks] Total unique dates with activity:', sortedDates.length);
        console.debug('[Streaks] First 10 dates:', sortedDates.slice(0, 10));
        console.debug('[Streaks] Last 10 dates:', sortedDates.slice(-10));

        let currentStreak = 0;
        let longestStreak = 0;
        let currentStart: string | null = null;
        let longestStart: string | null = null;
        let longestEnd: string | null = null;

        const today = this.getDateString(Date.now());
        let previousDate = this.getPreviousDate(today);

        console.debug('[Streaks] Today:', today, 'Has activity today:', activityData.dailyActivity.has(today));
        console.debug('[Streaks] Yesterday:', previousDate, 'Has activity yesterday:', activityData.dailyActivity.has(previousDate));

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

                // Debug logging for first few dates
                if (i < 10) {
                    console.debug(`[Streaks] Date ${i}:`, date, 'lastDate:', lastDate,
                        'nextDate:', lastDate ? this.getNextDate(lastDate) : 'N/A',
                        'isConsecutive:', isConsecutive, 'tempStreak:', tempStreak);
                }

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
                        console.debug('[Streaks] New longest streak:', longestStreak, 'days from', longestStart, 'to', longestEnd);
                    }
                } else {
                    // Gap detected, reset the streak
                    if (tempStreak > 1) {
                        console.debug('[Streaks] Gap detected after', tempStreak, 'day streak. Last date:', lastDate, 'Current date:', date);
                    }
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

        // Check if the final streak is the longest
        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
            longestStart = tempStart;
            longestEnd = lastDate;
            console.debug('[Streaks] Final streak is longest:', longestStreak, 'days from', longestStart, 'to', longestEnd);
        }

        console.debug('[Streaks] FINAL - Current streak:', currentStreak, 'days');
        console.debug('[Streaks] FINAL - Longest streak:', longestStreak, 'days from', longestStart, 'to', longestEnd);

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
        // Parse the date components directly to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day - 1);
        const newYear = date.getFullYear();
        const newMonth = String(date.getMonth() + 1).padStart(2, '0');
        const newDay = String(date.getDate()).padStart(2, '0');
        return `${newYear}-${newMonth}-${newDay}`;
    }

    private getNextDate(dateString: string): string {
        // Parse the date components directly to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day + 1);
        const newYear = date.getFullYear();
        const newMonth = String(date.getMonth() + 1).padStart(2, '0');
        const newDay = String(date.getDate()).padStart(2, '0');
        return `${newYear}-${newMonth}-${newDay}`;
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
        } catch {
            // Silently fail and fall back to filesystem timestamps
            return null;
        }
    }
}
