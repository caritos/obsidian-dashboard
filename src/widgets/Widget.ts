import { WidgetSettings } from '../types';

export abstract class Widget {
    protected containerEl?: HTMLElement;
    protected settings: WidgetSettings;

    constructor(settings: WidgetSettings) {
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
