import { TFile } from 'obsidian';

export interface DailyActivity {
    created: Set<TFile>;
    modified: Set<TFile>;
}

export interface ActivityData {
    dailyActivity: Map<string, DailyActivity>;
    totalNotes: number;
    dateRange: {
        start: string;
        end: string;
    };
}

export interface StreakData {
    current: number;
    longest: number;
    currentStart: string | null;
    longestStart: string | null;
    longestEnd: string | null;
}
