# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Obsidian plugin** that provides an extensible dashboard for visualizing vault analytics. Built with TypeScript and uses esbuild for bundling.

**Key Features:**
- Weather Widget (current conditions, sunrise/sunset, detailed metrics)
- Activity Heatmap (GitHub-style contribution graph)
- Stats Widget (streaks, totals, busiest days)
- MOC Trending (trending topics, people, and locations based on vault activity)

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
   - `WeatherWidget` (src/widgets/WeatherWidget.ts): Weather conditions and forecast
   - `ActivityHeatmapWidget` (src/widgets/ActivityHeatmapWidget.ts): 365-day heatmap
   - `StatsWidget` (src/widgets/StatsWidget.ts): Key metrics display
   - `MocTrendingWidget` (src/widgets/MocTrendingWidget.ts): Trending MOCs display

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

**MocDataCollector** (`src/services/MocDataCollector.ts`):
- Scans resources directory for MOC references in frontmatter
- Calculates trending scores based on activity and backlinks
- Caching: 1-minute TTL (same as ActivityData)

**FrontmatterParser** (`src/services/FrontmatterParser.ts`):
- Utility for parsing YAML frontmatter
- Extracts wikilinks and MOC category prefixes

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

### Settings Persistence
- Settings stored via `this.loadData()` / `this.saveData()` (Obsidian API)
- Merged with `DEFAULT_SETTINGS` on load
- To save: call `plugin.saveSettings()` after modifying `plugin.settings`

## Obsidian Automated Review Bot - Common Issues to Avoid

When submitting to the Obsidian Community Plugin directory, the automated scan checks for code quality issues. Here are the issues we've encountered and how to avoid them:

### Critical Issues (Must Fix)

1. **Sentence Case for UI Text**
   - **Rule:** All user-facing text (labels, descriptions, placeholders, options) must use sentence case
   - **Sentence case definition:**
     - First word is ALWAYS capitalized
     - Subsequent words are lowercase (unless they are proper nouns, acronyms, or technical terms that require capitalization)
     - This applies to ALL UI text: setting names, descriptions, dropdown options, button labels, error messages, etc.

   - **Common Examples:**
     ```typescript
     // Setting Names (.setName)
     ✅ 'Temperature unit'        // First word capitalized
     ✅ 'Location file path'      // First word capitalized
     ❌ 'temperature unit'        // First word must be capitalized
     ❌ 'Temperature Unit'        // Don't title case

     // Descriptions (.setDesc)
     ✅ 'Display temperature in celsius or fahrenheit'  // First word capitalized, units lowercase
     ✅ 'Path to Markdown file with location coordinates' // 'Markdown' is proper noun
     ❌ 'display temperature...'  // First word must be capitalized
     ❌ 'Path to markdown file...' // 'Markdown' should be capitalized (proper noun)

     // Dropdown Options (.addOption)
     ✅ .addOption('celsius', 'Celsius (°C)')     // First word capitalized
     ✅ .addOption('fahrenheit', 'Fahrenheit (°F)') // First word capitalized
     ❌ .addOption('celsius', 'celsius (°C)')     // First word must be capitalized
     ❌ .addOption('kmh', 'kilometers per hour')  // First word must be capitalized
     ✅ .addOption('kmh', 'Kilometers per hour (km/h)') // Correct

     // Placeholders (.setPlaceholder)
     ✅ 'Resources'               // First word capitalized even if it's just a path
     ✅ 'your_lat'                // Lowercase because it's a technical placeholder
     ❌ 'resources'               // First word must be capitalized
     ❌ 'YOUR_LAT'                // Should be lowercase (technical placeholder)

     // Error Messages and Content Text
     ✅ 'No location set'         // First word capitalized
     ✅ 'Loading weather...'      // First word capitalized
     ❌ 'no location set'         // First word must be capitalized
     ```

   - **Special Cases:**
     - Proper nouns: Always capitalized regardless of position (e.g., "Markdown", "Celsius", "Fahrenheit")
     - Technical terms: Follow standard casing (e.g., "JSON", "API", "URL")
     - Mid-sentence units: Lowercase unless at the start (e.g., "Display in celsius" but "Celsius is a temperature scale")
     - Acronyms: Keep uppercase (e.g., "UV index", "MOC trending")

   - **Where to check:**
     - `.setName()` - Setting titles
     - `.setDesc()` - Setting descriptions
     - `.addOption()` - Dropdown option labels (second parameter)
     - `.setPlaceholder()` - Input placeholders
     - `.createEl()` with `text:` - Any displayed text in widgets
     - Error messages and user-facing strings

2. **Async Methods Must Have Await**
   - **Rule:** Any method marked `async` must contain at least one `await` expression
   - **Fix:** Add an actual async operation (e.g., `await this.app.vault.cachedRead(file)`)
   - **Example:**
     ```typescript
     // ❌ Bad: async but no await
     async readLocation(filePath: string): Promise<LocationData> {
         const file = this.app.vault.getAbstractFileByPath(filePath);
         const cache = this.app.metadataCache.getFileCache(file);
         return { latitude, longitude };
     }

     // ✅ Good: async with await
     async readLocation(filePath: string): Promise<LocationData> {
         const file = this.app.vault.getAbstractFileByPath(filePath);
         await this.app.vault.cachedRead(file); // Ensure file is loaded
         const cache = this.app.metadataCache.getFileCache(file);
         return { latitude, longitude };
     }
     ```

3. **No 'any' Types**
   - **Rule:** Explicit `any` types are not allowed
   - **Fix:** Create proper TypeScript interfaces
   - **Example:**
     ```typescript
     // ❌ Bad: using any
     private parseAPIResponse(json: any): WeatherData { ... }
     const settings = this.plugin.settings.widgetSettings['weather'] as Record<string, any>;

     // ✅ Good: proper interfaces
     interface OpenMeteoResponse {
         current: { temperature_2m: number; ... };
         daily: { sunrise: string[]; ... };
     }
     private parseAPIResponse(json: OpenMeteoResponse): WeatherData { ... }
     const settings = this.plugin.settings.widgetSettings['weather'] as WeatherSettings;
     ```

### Optional Issues (Best Practices)

4. **Remove Unused Imports**
   - **Rule:** Don't import modules/types that aren't used
   - **Example:**
     ```typescript
     // ❌ Bad: TFile imported but not used
     import { TFile } from 'obsidian';
     export interface LocationData { ... }

     // ✅ Good: removed unused import
     export interface LocationData { ... }
     ```

5. **Remove Unused Variables**
   - **Rule:** Don't assign values to variables that are never read
   - **Example:**
     ```typescript
     // ❌ Bad: iconEl assigned but never used
     const iconEl = tempSection.createEl('span', { cls: 'weather-icon', text: icon });

     // ✅ Good: no assignment if not needed
     tempSection.createEl('span', { cls: 'weather-icon', text: icon });
     ```

6. **Type Assertions for Union Types**
   - **Rule:** When dropdown values are string unions, TypeScript needs type assertions
   - **Example:**
     ```typescript
     // ❌ Bad: string not assignable to 'celsius' | 'fahrenheit'
     .onChange(async (value) => {
         weatherSettings.temperatureUnit = value;
     })

     // ✅ Good: type assertion
     .onChange(async (value) => {
         weatherSettings.temperatureUnit = value as 'celsius' | 'fahrenheit';
     })
     ```

### Pre-Submission Checklist

Before pushing changes, verify:
- [ ] All UI text uses sentence case (check .setName, .setDesc, .addOption, .createEl text)
- [ ] All `async` methods contain at least one `await` expression
- [ ] No `any` types (create interfaces instead)
- [ ] No unused imports (check all import statements)
- [ ] No unused variables (remove assignments for unused values)
- [ ] Run `npm run build` successfully with no TypeScript errors

## Project Status

- **Current Version:** 0.1.0
- **Status:** Submitted to Obsidian Community Plugin directory (PR #9235)
- **See:** PROJECT_STATUS.md for detailed status and future plans
