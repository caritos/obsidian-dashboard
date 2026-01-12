import { WidgetSettings } from '../types';
import { DataCollector } from '../services/DataCollector';

export abstract class Widget {
    protected containerEl?: HTMLElement;
    protected settings: WidgetSettings;
    protected dataCollector: DataCollector | null;

    constructor(dataCollector: DataCollector | null, settings: WidgetSettings) {
        this.dataCollector = dataCollector;
        this.settings = settings;
    }

    abstract getId(): string;
    abstract getName(): string;
    abstract render(containerEl: HTMLElement): void;
    abstract update(): Promise<void>;

    destroy() {
        if (this.containerEl) {
            this.containerEl.empty();
        }
    }

    getSettings(): WidgetSettings {
        return this.settings;
    }

    updateSettings(settings: WidgetSettings) {
        this.settings = settings;
    }
}
