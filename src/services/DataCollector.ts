import { TFile, Vault } from 'obsidian';
import { ActivityData, DailyActivity, StreakData } from './types';

export class DataCollector {
    private vault: Vault;
    private cache: ActivityData | null = null;
    private cacheTime: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async collectActivityData(days: number = 365): Promise<ActivityData> {
        // Check cache
        const now = Date.now();
        if (this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
            return this.cache;
        }

        const dailyActivity = new Map<string, DailyActivity>();

        let files: TFile[];
        try {
            files = this.vault.getMarkdownFiles();
            console.log(`[Dashboard] Found ${files.length} markdown files in vault`);
        } catch (error) {
            console.error('Error getting markdown files from vault:', error);
            throw new Error('Failed to access vault files');
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        for (const file of files) {
            try {
                const createdDate = this.getDateString(file.stat.ctime);
                const modifiedDate = this.getDateString(file.stat.mtime);

                // Track creation
                if (this.isInRange(file.stat.ctime, startDate, endDate)) {
                    if (!dailyActivity.has(createdDate)) {
                        dailyActivity.set(createdDate, {
                            created: new Set(),
                            modified: new Set()
                        });
                    }
                    dailyActivity.get(createdDate)!.created.add(file);
                }

                // Track modification
                if (this.isInRange(file.stat.mtime, startDate, endDate)) {
                    if (!dailyActivity.has(modifiedDate)) {
                        dailyActivity.set(modifiedDate, {
                            created: new Set(),
                            modified: new Set()
                        });
                    }
                    dailyActivity.get(modifiedDate)!.modified.add(file);
                }
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                // Continue processing other files
                continue;
            }
        }

        const activityData: ActivityData = {
            dailyActivity,
            totalNotes: files.length,
            dateRange: {
                start: this.getDateString(startDate.getTime()),
                end: this.getDateString(endDate.getTime())
            }
        };

        console.log(`[Dashboard] Collected activity for ${dailyActivity.size} days`);
        console.log(`[Dashboard] Date range: ${activityData.dateRange.start} to ${activityData.dateRange.end}`);

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
}
