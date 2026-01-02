import { Widget } from './Widget';
import { WidgetSettings } from '../types';

type WidgetFactory = (settings: WidgetSettings) => Widget;

export class WidgetRegistry {
    private widgets: Map<string, WidgetFactory> = new Map();

    register(id: string, factory: WidgetFactory) {
        this.widgets.set(id, factory);
    }

    unregister(id: string) {
        this.widgets.delete(id);
    }

    create(id: string, settings: WidgetSettings): Widget | null {
        const factory = this.widgets.get(id);
        if (!factory) {
            console.error(`Widget ${id} not found in registry`);
            return null;
        }
        return factory(settings);
    }

    getRegisteredIds(): string[] {
        return Array.from(this.widgets.keys());
    }

    has(id: string): boolean {
        return this.widgets.has(id);
    }
}
