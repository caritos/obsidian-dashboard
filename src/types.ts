export interface DashboardSettings {
    enabledWidgets: string[];
    widgetOrder: string[];
    autoRefresh: boolean;
    widgetSettings: Record<string, WidgetSettings>;
}

export interface WidgetSettings {
    [key: string]: string | number | boolean | string[] | number[];
}

export const DEFAULT_SETTINGS: DashboardSettings = {
    enabledWidgets: ['activity-heatmap', 'stats', 'moc-trending'],
    widgetOrder: ['activity-heatmap', 'stats', 'moc-trending'],
    autoRefresh: true,
    widgetSettings: {
        'activity-heatmap': {
            days: 365,
            countMode: 'unique',
            colorScheme: 'theme-adaptive'
        },
        'stats': {
            visibleMetrics: ['total', 'currentStreak', 'longestStreak', 'thisWeek', 'thisMonth', 'busiestDay'],
            streakMinNotes: 1
        },
        'moc-trending': {
            timeWindow: 7,
            maxMocsPerCategory: 5,
            scoreWeighting: {
                activityWeight: 0.7,
                newBacklinkWeight: 0.3
            },
            mocBasePath: 'moc',
            resourcesPath: 'resources'
        }
    }
};
