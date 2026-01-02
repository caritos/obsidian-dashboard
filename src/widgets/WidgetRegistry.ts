import { Widget } from './Widget';
import { WidgetSettings } from '../types';

type WidgetConstructor = new (settings: WidgetSettings) => Widget;

export class WidgetRegistry {
    private widgets: Map<string, WidgetConstructor> = new Map();

    register(id: string, widgetClass: WidgetConstructor) {
        this.widgets.set(id, widgetClass);
    }

    unregister(id: string) {
        this.widgets.delete(id);
    }

    create(id: string, settings: WidgetSettings): Widget | null {
        const WidgetClass = this.widgets.get(id);
        if (!WidgetClass) {
            console.error(`Widget ${id} not found in registry`);
            return null;
        }
        return new WidgetClass(settings);
    }

    getRegisteredIds(): string[] {
        return Array.from(this.widgets.keys());
    }

    has(id: string): boolean {
        return this.widgets.has(id);
    }
}
