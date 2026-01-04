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
    enabledWidgets: ['activity-heatmap', 'stats', 'moc-breakdown'],
    widgetOrder: ['activity-heatmap', 'stats', 'moc-breakdown'],
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
        'moc-breakdown': {
            chartType: 'pie',
            categoriesCount: 10,
            excludedFolders: []
        }
    }
};
