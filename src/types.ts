export interface DashboardSettings {
    enabledWidgets: string[];
    widgetOrder: string[];
    autoRefresh: boolean;
    widgetSettings: Record<string, WidgetSettings>;
    collapsedWidgets: string[];
}

export interface WidgetSettings {
    [key: string]: string | number | boolean | string[] | number[] | Record<string, string | number | boolean>;
}

export const DEFAULT_SETTINGS: DashboardSettings = {
    enabledWidgets: ['photo', 'weather', 'activity-heatmap', 'stats', 'moc-trending', 'latest-notes', 'latest-photos'],
    widgetOrder: ['photo', 'weather', 'activity-heatmap', 'stats', 'moc-trending', 'latest-notes', 'latest-photos'],
    autoRefresh: true,
    collapsedWidgets: [],
    widgetSettings: {
        'weather': {
            locationFilePath: 'resources/current-location.md',
            temperatureUnit: 'fahrenheit',
            windSpeedUnit: 'mph',
            cacheDuration: 30,
            visibleMetrics: [
                'sunrise',
                'sunset',
                'wind',
                'humidity',
                'pressure',
                'uvIndex',
                'visibility'
            ]
        },
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
        },
        'photo': {
            refreshInterval: 300,
            collectionFilePath: 'resources/random-photo-collection.md'
        },
        'latest-notes': {
            maxNotes: 100
        },
        'latest-photos': {
            maxPhotos: 100
        }
    }
};
