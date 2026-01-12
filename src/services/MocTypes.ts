import { TFile } from 'obsidian';

export type MocCategory = 'what' | 'where' | 'who';

export interface MocTrendingData {
    category: MocCategory;
    mocName: string;
    mocFile: TFile | null;
    score: number;
    recentlyLinkedNotes: TFile[];
    recentActivityCount: number;
    newBacklinksCount: number;
}

export interface MocTrendingSettings {
    timeWindow: number;
    maxMocsPerCategory: number;
    scoreWeighting: {
        activityWeight: number;
        newBacklinkWeight: number;
    };
    mocBasePath: string;
    resourcesPath: string;
}

export interface MocReference {
    mocName: string;
    category: MocCategory;
    sourceFile: TFile;
    isNewNote: boolean;
}
