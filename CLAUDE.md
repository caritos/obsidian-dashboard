# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Obsidian plugin** that provides an extensible dashboard for visualizing vault analytics. Built with TypeScript and uses esbuild for bundling.

**Key Features:**
- Activity Heatmap (GitHub-style contribution graph)
- Stats Widget (streaks, totals, busiest days)
- MOC Breakdown (planned, not yet implemented)

**Plugin ID:** `dashboard`
**Repository:** https://github.com/caritos/obsidian-dashboard

## Development Commands

### Build & Development
```bash
npm install              # Install dependencies
npm run dev              # Development mode with watch (rebuilds on changes)
npm run build            # Production build (runs TypeScript check + esbuild)
```

### Build Process
- **Development:** `npm run dev` runs esbuild in watch mode with inline sourcemaps
- **Production:** `npm run build` runs TypeScript type checking (`tsc -noEmit -skipLibCheck`) followed by esbuild production build
- **Output:** `main.js` (bundled), `manifest.json`, `styles.css`
- esbuild bundles `src/main.ts` → `main.js` with external dependencies (obsidian, electron, codemirror)

### Testing the Plugin
To test changes in Obsidian:
1. Build the plugin (`npm run dev` for continuous rebuilds)
2. Copy `main.js`, `manifest.json`, and `styles.css` to `.obsidian/plugins/dashboard/` in your test vault
3. Reload Obsidian or toggle the plugin in Settings → Community Plugins
4. Open dashboard via Command Palette: "Dashboard: Open Dashboard"

## Architecture

### Widget-Based System
The plugin uses a **factory pattern with a centralized registry** for extensibility:

1. **WidgetRegistry** (`src/widgets/WidgetRegistry.ts`): Factory that creates widgets by ID
   - Maps widget IDs to factory functions
   - Called by DashboardView to instantiate enabled widgets

2. **Widget Base Class** (`src/widgets/Widget.ts`): Abstract class all widgets extend
   - Methods: `getId()`, `getName()`, `render()`, `update()`, `destroy()`
   - Each widget manages its own DOM rendering and data updates

3. **Built-in Widgets:**
   - `ActivityHeatmapWidget` (src/widgets/ActivityHeatmapWidget.ts): 365-day heatmap
   - `StatsWidget` (src/widgets/StatsWidget.ts): Key metrics display
   - `moc-breakdown`: Referenced in settings but not implemented

### Plugin Lifecycle

**Initialization (main.ts):**
```
onload() → loadSettings() → create WidgetRegistry → register widgets →
register view → register command → add settings tab
```

**View Opening (DashboardView.ts):**
```
onOpen() → iterate widgetOrder → create enabled widgets →
render() each widget → update() each widget
```

**Data Flow:**
```
Widget.update() → DataCollector.collectActivityData() →
scan vault files → cache results (1-min TTL) → return ActivityData
```

### Key Components

**Main Plugin Class** (`src/main.ts`):
- Entry point extending Obsidian's `Plugin`
- Registers widgets in WidgetRegistry during `onload()`
- Registers the dashboard view (`VIEW_TYPE_DASHBOARD`)
- Adds command to open dashboard
- Manages settings persistence

**DashboardView** (`src/DashboardView.ts`):
- Custom Obsidian view (extends `ItemView`)
- Renders header and widgets container
- Instantiates widgets based on `settings.widgetOrder` and `settings.enabledWidgets`
- Calls `widget.render()` and `widget.update()` for each enabled widget

**DataCollector** (`src/services/DataCollector.ts`):
- Scans vault using `vault.getMarkdownFiles()`
- Builds `ActivityData` with daily activity (created/modified notes)
- Calculates streaks with configurable minimum notes threshold
- **Caching:** 1-minute TTL to avoid re-scanning on every widget update

**Settings** (`src/types.ts`, `src/settings/SettingsTab.ts`):
- `DashboardSettings`: enabled widgets, widget order, auto-refresh, per-widget settings
- Settings tab allows toggling widgets and configuring widget-specific options
- Per-widget settings stored in `widgetSettings` keyed by widget ID

### File Structure
```
src/
├── main.ts                    # Plugin entry point
├── DashboardView.ts           # Main dashboard view
├── types.ts                   # Core type definitions & settings
├── components/
│   ├── Heatmap.ts            # SVG heatmap rendering logic
│   └── NoteListModal.ts      # Modal for showing notes on a date
├── services/
│   ├── DataCollector.ts      # Vault scanning & activity data
│   └── types.ts              # Service-specific types
├── settings/
│   └── SettingsTab.ts        # Plugin settings UI
└── widgets/
    ├── Widget.ts             # Abstract widget base class
    ├── WidgetRegistry.ts     # Factory pattern registry
    ├── ActivityHeatmapWidget.ts
    └── StatsWidget.ts
```

## Adding a New Widget

1. **Create widget class** extending `Widget` in `src/widgets/`
2. **Implement required methods:** `getId()`, `getName()`, `render()`, `update()`
3. **Register in main.ts** `onload()`:
   ```typescript
   this.widgetRegistry.register('your-widget-id', (settings: WidgetSettings) => {
       return new YourWidget(this.app, settings);
   });
   ```
4. **Add to default settings** in `src/types.ts` → `DEFAULT_SETTINGS.enabledWidgets` and `widgetOrder`
5. **Add widget-specific settings** to `DEFAULT_SETTINGS.widgetSettings['your-widget-id']`
6. **(Optional)** Add settings UI in `src/settings/SettingsTab.ts`

## Important Notes

### TypeScript Configuration
- Strict mode enabled (`noImplicitAny`, `strictNullChecks`)
- Target: ES6, Module: ESNext
- Source maps inlined in development builds

### Obsidian API
- Plugin extends Obsidian's `Plugin` class
- Views extend `ItemView`
- Access vault via `this.app.vault`
- Use `TFile` for file references (has `stat.ctime`, `stat.mtime`)

### Known Limitations
- MOC Breakdown widget is in settings but not implemented
- Debug console.log statements present in DataCollector.ts and ActivityHeatmapWidget.ts
- Settings shows warning for missing `moc-breakdown` widget (expected until implemented)

### Settings Persistence
- Settings stored via `this.loadData()` / `this.saveData()` (Obsidian API)
- Merged with `DEFAULT_SETTINGS` on load
- To save: call `plugin.saveSettings()` after modifying `plugin.settings`

## Project Status

- **Current Version:** 0.1.0
- **Status:** Submitted to Obsidian Community Plugin directory (PR #9235)
- **See:** PROJECT_STATUS.md for detailed status and future plans
