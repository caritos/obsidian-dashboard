# Dashboard Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an extensible Obsidian plugin with widget-based dashboard showing note activity heatmap, stats, and MOC breakdowns.

**Architecture:** TypeScript plugin using Obsidian API with modular widget system. Widgets register with central registry, render independently, and share cached vault data.

**Tech Stack:** TypeScript, Obsidian API, esbuild, SVG for visualizations

---

## Task 1: Project Setup & Repository Initialization

**Files:**
- Create: `~/projects/obsidian-dashboard/` (new directory)
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `manifest.json`
- Create: `versions.json`
- Create: `LICENSE`
- Create: `README.md`

**Step 1: Create project directory**

```bash
mkdir -p ~/projects/obsidian-dashboard
cd ~/projects/obsidian-dashboard
```

**Step 2: Initialize git repository**

```bash
git init
git branch -M main
```

**Step 3: Create package.json**

Create `package.json`:
```json
{
  "name": "obsidian-dashboard",
  "version": "0.1.0",
  "description": "Extensible dashboard for visualizing vault analytics",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "version": "node version-bump.mjs && git add manifest.json versions.json"
  },
  "keywords": ["obsidian", "obsidian-plugin"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^16.11.6",
    "@typescript-eslint/eslint-plugin": "5.29.0",
    "@typescript-eslint/parser": "5.29.0",
    "builtin-modules": "3.3.0",
    "esbuild": "0.17.3",
    "obsidian": "latest",
    "tslib": "2.4.0",
    "typescript": "4.7.4"
  }
}
```

**Step 4: Create tsconfig.json**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES6",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES5", "ES6", "ES7"],
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

**Step 5: Create .gitignore**

Create `.gitignore`:
```
node_modules/
main.js
*.js.map
.DS_Store
```

**Step 6: Create manifest.json**

Create `manifest.json`:
```json
{
  "id": "dashboard",
  "name": "Dashboard",
  "version": "0.1.0",
  "minAppVersion": "0.15.0",
  "description": "Extensible dashboard for visualizing vault analytics",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourusername/obsidian-dashboard",
  "isDesktopOnly": false
}
```

**Step 7: Create versions.json**

Create `versions.json`:
```json
{
  "0.1.0": "0.15.0"
}
```

**Step 8: Create LICENSE**

Create `LICENSE`:
```
MIT License

Copyright (c) 2026 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 9: Create README.md**

Create `README.md`:
```markdown
# Dashboard

Extensible dashboard for visualizing Obsidian vault analytics.

## Features

- **Activity Heatmap** - GitHub-style visualization of note creation/modification
- **Stats Widget** - Key metrics (streaks, totals, busiest days)
- **MOC Breakdown** - Analyze notes by categories

## Installation

### From Community Plugins (once published)
1. Open Settings → Community Plugins
2. Search for "Dashboard"
3. Install and enable

### Manual Installation
1. Download latest release
2. Extract to `.obsidian/plugins/dashboard/`
3. Enable in Settings → Community Plugins

## Usage

Open dashboard via Command Palette: `Dashboard: Open Dashboard`

## Development

```bash
npm install
npm run dev
```

## License

MIT
```

**Step 10: Create esbuild.config.mjs**

Create `esbuild.config.mjs`:
```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = (process.argv[2] === 'production');

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtins],
	format: 'cjs',
	target: 'es2018',
	logLevel: "info",
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: 'main.js',
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
```

**Step 11: Commit initial setup**

```bash
git add .
git commit -m "chore: initial project setup"
```

---

## Task 2: Base Plugin Structure

**Files:**
- Create: `src/main.ts`
- Create: `src/types.ts`

**Step 1: Create src directory**

```bash
mkdir -p src
```

**Step 2: Create types.ts**

Create `src/types.ts`:
```typescript
export interface DashboardSettings {
    enabledWidgets: string[];
    widgetOrder: string[];
    autoRefresh: boolean;
    widgetSettings: Record<string, WidgetSettings>;
}

export interface WidgetSettings {
    [key: string]: any;
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
```

**Step 3: Create main.ts with basic plugin**

Create `src/main.ts`:
```typescript
import { Plugin } from 'obsidian';
import { DashboardSettings, DEFAULT_SETTINGS } from './types';

export default class DashboardPlugin extends Plugin {
    settings: DashboardSettings;

    async onload() {
        await this.loadSettings();

        console.log('Dashboard plugin loaded');

        // Register command to open dashboard
        this.addCommand({
            id: 'open-dashboard',
            name: 'Open Dashboard',
            callback: () => {
                console.log('Dashboard command triggered');
            }
        });
    }

    onunload() {
        console.log('Dashboard plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
```

**Step 4: Install dependencies**

```bash
npm install
```

**Step 5: Build the plugin**

```bash
npm run build
```

Expected output: `main.js` created successfully

**Step 6: Test in Obsidian (manual)**

1. Copy `main.js` and `manifest.json` to `.obsidian/plugins/dashboard/`
2. Enable plugin in Obsidian
3. Open Command Palette and verify "Dashboard: Open Dashboard" command exists
4. Run command and check console for "Dashboard command triggered"

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: add base plugin structure"
```

---

## Task 3: Widget Base Class & Registry

**Files:**
- Create: `src/widgets/Widget.ts`
- Create: `src/widgets/WidgetRegistry.ts`

**Step 1: Create widgets directory**

```bash
mkdir -p src/widgets
```

**Step 2: Create Widget.ts base class**

Create `src/widgets/Widget.ts`:
```typescript
import { WidgetSettings } from '../types';

export abstract class Widget {
    protected containerEl: HTMLElement;
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
```

**Step 3: Create WidgetRegistry.ts**

Create `src/widgets/WidgetRegistry.ts`:
```typescript
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
```

**Step 4: Build**

```bash
npm run build
```

Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add src/widgets/
git commit -m "feat: add widget base class and registry"
```

---

## Task 4: Dashboard View Component

**Files:**
- Create: `src/DashboardView.ts`
- Modify: `src/main.ts`

**Step 1: Create DashboardView.ts**

Create `src/DashboardView.ts`:
```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { WidgetRegistry } from './widgets/WidgetRegistry';
import { Widget } from './widgets/Widget';
import { DashboardSettings } from './types';

export const VIEW_TYPE_DASHBOARD = 'dashboard-view';

export class DashboardView extends ItemView {
    private widgetRegistry: WidgetRegistry;
    private settings: DashboardSettings;
    private activeWidgets: Widget[] = [];

    constructor(leaf: WorkspaceLeaf, widgetRegistry: WidgetRegistry, settings: DashboardSettings) {
        super(leaf);
        this.widgetRegistry = widgetRegistry;
        this.settings = settings;
    }

    getViewType(): string {
        return VIEW_TYPE_DASHBOARD;
    }

    getDisplayText(): string {
        return 'Dashboard';
    }

    getIcon(): string {
        return 'layout-dashboard';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('dashboard-view');

        // Create header
        const header = container.createEl('div', { cls: 'dashboard-header' });
        header.createEl('h2', { text: 'Dashboard' });

        // Create widgets container
        const widgetsContainer = container.createEl('div', { cls: 'dashboard-widgets' });

        // Render widgets in order
        for (const widgetId of this.settings.widgetOrder) {
            if (!this.settings.enabledWidgets.contains(widgetId)) {
                continue;
            }

            const widgetSettings = this.settings.widgetSettings[widgetId] || {};
            const widget = this.widgetRegistry.create(widgetId, widgetSettings);

            if (widget) {
                const widgetContainer = widgetsContainer.createEl('div', {
                    cls: 'dashboard-widget-container'
                });
                widgetContainer.setAttribute('data-widget-id', widgetId);

                widget.render(widgetContainer);
                await widget.update();

                this.activeWidgets.push(widget);
            }
        }
    }

    async onClose() {
        // Cleanup widgets
        for (const widget of this.activeWidgets) {
            widget.destroy();
        }
        this.activeWidgets = [];
    }

    async refresh() {
        for (const widget of this.activeWidgets) {
            await widget.update();
        }
    }

    updateSettings(settings: DashboardSettings) {
        this.settings = settings;
    }
}
```

**Step 2: Update main.ts to register view**

Modify `src/main.ts`:
```typescript
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardSettings, DEFAULT_SETTINGS } from './types';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './DashboardView';
import { WidgetRegistry } from './widgets/WidgetRegistry';

export default class DashboardPlugin extends Plugin {
    settings: DashboardSettings;
    widgetRegistry: WidgetRegistry;

    async onload() {
        await this.loadSettings();

        // Initialize widget registry
        this.widgetRegistry = new WidgetRegistry();

        // Register view
        this.registerView(
            VIEW_TYPE_DASHBOARD,
            (leaf) => new DashboardView(leaf, this.widgetRegistry, this.settings)
        );

        // Register command to open dashboard
        this.addCommand({
            id: 'open-dashboard',
            name: 'Open Dashboard',
            callback: () => {
                this.activateView();
            }
        });

        console.log('Dashboard plugin loaded');
    }

    onunload() {
        console.log('Dashboard plugin unloaded');
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);

        if (leaves.length > 0) {
            // View already exists, reveal it
            leaf = leaves[0];
        } else {
            // Create new view
            leaf = workspace.getLeaf(true);
            await leaf.setViewState({
                type: VIEW_TYPE_DASHBOARD,
                active: true,
            });
        }

        workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
```

**Step 3: Build**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Test in Obsidian**

1. Copy updated `main.js` to plugin folder
2. Reload plugin
3. Run "Dashboard: Open Dashboard" command
4. Verify empty dashboard view opens with "Dashboard" header

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add dashboard view component"
```

---

## Task 5: Data Collection Service

**Files:**
- Create: `src/services/DataCollector.ts`
- Create: `src/services/types.ts`

**Step 1: Create services directory**

```bash
mkdir -p src/services
```

**Step 2: Create services types**

Create `src/services/types.ts`:
```typescript
import { TFile } from 'obsidian';

export interface DailyActivity {
    created: Set<TFile>;
    modified: Set<TFile>;
}

export interface ActivityData {
    dailyActivity: Map<string, DailyActivity>;
    totalNotes: number;
    dateRange: {
        start: string;
        end: string;
    };
}

export interface StreakData {
    current: number;
    longest: number;
    currentStart: string | null;
    longestStart: string | null;
    longestEnd: string | null;
}
```

**Step 3: Create DataCollector.ts**

Create `src/services/DataCollector.ts`:
```typescript
import { TFile, Vault } from 'obsidian';
import { ActivityData, DailyActivity, StreakData } from './types';

export class DataCollector {
    private vault: Vault;
    private cache: ActivityData | null = null;
    private cacheTime: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async collectActivityData(days: number = 365): Promise<ActivityData> {
        // Check cache
        const now = Date.now();
        if (this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
            return this.cache;
        }

        const dailyActivity = new Map<string, DailyActivity>();
        const files = this.vault.getMarkdownFiles();

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        for (const file of files) {
            const createdDate = this.getDateString(file.stat.ctime);
            const modifiedDate = this.getDateString(file.stat.mtime);

            // Track creation
            if (this.isInRange(file.stat.ctime, startDate, endDate)) {
                if (!dailyActivity.has(createdDate)) {
                    dailyActivity.set(createdDate, {
                        created: new Set(),
                        modified: new Set()
                    });
                }
                dailyActivity.get(createdDate)!.created.add(file);
            }

            // Track modification
            if (this.isInRange(file.stat.mtime, startDate, endDate)) {
                if (!dailyActivity.has(modifiedDate)) {
                    dailyActivity.set(modifiedDate, {
                        created: new Set(),
                        modified: new Set()
                    });
                }
                dailyActivity.get(modifiedDate)!.modified.add(file);
            }
        }

        const activityData: ActivityData = {
            dailyActivity,
            totalNotes: files.length,
            dateRange: {
                start: this.getDateString(startDate.getTime()),
                end: this.getDateString(endDate.getTime())
            }
        };

        // Update cache
        this.cache = activityData;
        this.cacheTime = now;

        return activityData;
    }

    calculateStreaks(activityData: ActivityData, minNotes: number = 1): StreakData {
        const sortedDates = Array.from(activityData.dailyActivity.keys()).sort();

        let currentStreak = 0;
        let longestStreak = 0;
        let currentStart: string | null = null;
        let longestStart: string | null = null;
        let longestEnd: string | null = null;

        const today = this.getDateString(Date.now());
        let previousDate = this.getPreviousDate(today);

        // Check if there's activity today or yesterday
        const hasRecentActivity = activityData.dailyActivity.has(today) ||
                                  activityData.dailyActivity.has(previousDate);

        if (!hasRecentActivity) {
            currentStreak = 0;
        } else {
            // Calculate current streak going backwards from today
            let checkDate = today;
            while (activityData.dailyActivity.has(checkDate)) {
                const activity = activityData.dailyActivity.get(checkDate)!;
                const noteCount = activity.created.size + activity.modified.size;

                if (noteCount >= minNotes) {
                    if (currentStreak === 0) {
                        currentStart = checkDate;
                    }
                    currentStreak++;
                } else {
                    break;
                }

                checkDate = this.getPreviousDate(checkDate);
            }
        }

        // Calculate longest streak
        let tempStreak = 0;
        let tempStart: string | null = null;

        for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            const activity = activityData.dailyActivity.get(date)!;
            const noteCount = activity.created.size + activity.modified.size;

            if (noteCount >= minNotes) {
                if (tempStreak === 0) {
                    tempStart = date;
                }
                tempStreak++;

                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                    longestStart = tempStart;
                    longestEnd = date;
                }
            } else {
                tempStreak = 0;
                tempStart = null;
            }
        }

        return {
            current: currentStreak,
            longest: longestStreak,
            currentStart,
            longestStart,
            longestEnd
        };
    }

    invalidateCache() {
        this.cache = null;
        this.cacheTime = 0;
    }

    private getDateString(timestamp: number): string {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private isInRange(timestamp: number, start: Date, end: Date): boolean {
        return timestamp >= start.getTime() && timestamp <= end.getTime();
    }

    private getPreviousDate(dateString: string): string {
        const date = new Date(dateString);
        date.setDate(date.getDate() - 1);
        return this.getDateString(date.getTime());
    }
}
```

**Step 4: Build**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/services/
git commit -m "feat: add data collection service"
```

---

## Task 6: Activity Heatmap Widget - Part 1 (Rendering)

**Files:**
- Create: `src/widgets/ActivityHeatmapWidget.ts`
- Create: `src/components/Heatmap.ts`

**Step 1: Create components directory**

```bash
mkdir -p src/components
```

**Step 2: Create Heatmap.ts renderer**

Create `src/components/Heatmap.ts`:
```typescript
export interface HeatmapCell {
    date: string;
    count: number;
}

export interface HeatmapOptions {
    cellSize: number;
    cellGap: number;
    colorLevels: number;
}

export class HeatmapRenderer {
    private options: HeatmapOptions;

    constructor(options: Partial<HeatmapOptions> = {}) {
        this.options = {
            cellSize: options.cellSize || 10,
            cellGap: options.cellGap || 2,
            colorLevels: options.colorLevels || 4
        };
    }

    render(containerEl: HTMLElement, data: HeatmapCell[], onCellClick?: (date: string) => void) {
        containerEl.empty();

        if (data.length === 0) {
            containerEl.createEl('p', { text: 'No activity data available' });
            return;
        }

        // Calculate grid dimensions
        const weeks = Math.ceil(data.length / 7);
        const width = weeks * (this.options.cellSize + this.options.cellGap);
        const height = 7 * (this.options.cellSize + this.options.cellGap);

        // Create SVG
        const svg = containerEl.createSvg('svg', {
            attr: {
                width: width.toString(),
                height: height.toString(),
                class: 'heatmap-svg'
            }
        });

        // Get max count for color scaling
        const maxCount = Math.max(...data.map(d => d.count));

        // Render cells
        data.forEach((cell, index) => {
            const week = Math.floor(index / 7);
            const day = index % 7;

            const x = week * (this.options.cellSize + this.options.cellGap);
            const y = day * (this.options.cellSize + this.options.cellGap);

            const level = this.getColorLevel(cell.count, maxCount);

            const rect = svg.createSvg('rect', {
                attr: {
                    x: x.toString(),
                    y: y.toString(),
                    width: this.options.cellSize.toString(),
                    height: this.options.cellSize.toString(),
                    class: `heatmap-cell heatmap-level-${level}`,
                    'data-date': cell.date,
                    'data-count': cell.count.toString()
                }
            });

            // Add tooltip
            rect.setAttribute('title', `${cell.date}: ${cell.count} notes`);

            // Add click handler
            if (onCellClick) {
                rect.addEventListener('click', () => onCellClick(cell.date));
                rect.style.cursor = 'pointer';
            }
        });
    }

    private getColorLevel(count: number, max: number): number {
        if (count === 0) return 0;
        if (max === 0) return 0;

        const percentage = count / max;
        if (percentage <= 0.25) return 1;
        if (percentage <= 0.50) return 2;
        if (percentage <= 0.75) return 3;
        return 4;
    }
}
```

**Step 3: Create ActivityHeatmapWidget.ts**

Create `src/widgets/ActivityHeatmapWidget.ts`:
```typescript
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { HeatmapRenderer, HeatmapCell } from '../components/Heatmap';
import { DataCollector } from '../services/DataCollector';
import { Vault } from 'obsidian';

interface ActivityHeatmapSettings extends WidgetSettings {
    days: number;
    countMode: 'unique' | 'total';
    colorScheme: 'theme-adaptive' | 'github-green' | 'custom';
}

export class ActivityHeatmapWidget extends Widget {
    private vault: Vault;
    private dataCollector: DataCollector;
    private heatmapRenderer: HeatmapRenderer;

    constructor(vault: Vault, settings: ActivityHeatmapSettings) {
        super(settings);
        this.vault = vault;
        this.dataCollector = new DataCollector(vault);
        this.heatmapRenderer = new HeatmapRenderer();
    }

    getId(): string {
        return 'activity-heatmap';
    }

    getName(): string {
        return 'Activity Heatmap';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create heatmap container
        const heatmapContainer = containerEl.createEl('div', { cls: 'heatmap-container' });

        // Show loading state
        heatmapContainer.createEl('p', { text: 'Loading activity data...' });
    }

    async update(): Promise<void> {
        const settings = this.settings as ActivityHeatmapSettings;
        const activityData = await this.dataCollector.collectActivityData(settings.days);

        // Convert to heatmap cells
        const cells: HeatmapCell[] = [];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - settings.days);

        // Generate all dates in range
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateString = this.getDateString(d);
            const activity = activityData.dailyActivity.get(dateString);

            let count = 0;
            if (activity) {
                if (settings.countMode === 'unique') {
                    // Count unique notes (a note is counted once if created OR modified)
                    const uniqueFiles = new Set([
                        ...activity.created,
                        ...activity.modified
                    ]);
                    count = uniqueFiles.size;
                } else {
                    // Count total events
                    count = activity.created.size + activity.modified.size;
                }
            }

            cells.push({ date: dateString, count });
        }

        // Render heatmap
        const heatmapContainer = this.containerEl.querySelector('.heatmap-container') as HTMLElement;
        if (heatmapContainer) {
            this.heatmapRenderer.render(heatmapContainer, cells, (date) => {
                this.onCellClick(date);
            });
        }
    }

    private onCellClick(date: string) {
        console.log('Clicked on date:', date);
        // TODO: Show modal with notes for this date
    }

    private getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
```

**Step 4: Build**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add activity heatmap widget rendering"
```

---

## Task 7: Activity Heatmap Widget - Part 2 (Integration & Styling)

**Files:**
- Create: `styles.css`
- Modify: `src/main.ts`
- Modify: `src/DashboardView.ts`

**Step 1: Create styles.css**

Create `styles.css`:
```css
/* Dashboard View */
.dashboard-view {
    padding: 20px;
    overflow-y: auto;
}

.dashboard-header {
    margin-bottom: 30px;
    border-bottom: 1px solid var(--background-modifier-border);
    padding-bottom: 10px;
}

.dashboard-header h2 {
    margin: 0;
    color: var(--text-normal);
}

/* Widgets */
.dashboard-widgets {
    display: flex;
    flex-direction: column;
    gap: 30px;
}

.dashboard-widget-container {
    padding: 20px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
}

.widget-header {
    margin-bottom: 15px;
}

.widget-header h3 {
    margin: 0;
    color: var(--text-normal);
    font-size: 1.1em;
}

/* Heatmap */
.heatmap-container {
    display: flex;
    justify-content: center;
    padding: 20px 0;
}

.heatmap-svg {
    display: block;
}

.heatmap-cell {
    transition: opacity 0.2s;
}

.heatmap-cell:hover {
    opacity: 0.7;
    stroke: var(--text-accent);
    stroke-width: 1;
}

/* Theme-adaptive colors */
.heatmap-level-0 {
    fill: var(--background-secondary);
}

.heatmap-level-1 {
    fill: var(--interactive-accent);
    opacity: 0.3;
}

.heatmap-level-2 {
    fill: var(--interactive-accent);
    opacity: 0.5;
}

.heatmap-level-3 {
    fill: var(--interactive-accent);
    opacity: 0.7;
}

.heatmap-level-4 {
    fill: var(--interactive-accent);
    opacity: 1;
}
```

**Step 2: Update main.ts to register widget**

Modify `src/main.ts` - add after `this.widgetRegistry = new WidgetRegistry();`:
```typescript
import { ActivityHeatmapWidget } from './widgets/ActivityHeatmapWidget';

// ... existing code ...

    async onload() {
        await this.loadSettings();

        // Initialize widget registry
        this.widgetRegistry = new WidgetRegistry();

        // Register widgets
        this.widgetRegistry.register('activity-heatmap', (settings) => {
            return new ActivityHeatmapWidget(this.app.vault, settings);
        });

        // ... rest of onload ...
    }
```

**Step 3: Update WidgetRegistry to accept factory functions**

Modify `src/widgets/WidgetRegistry.ts`:
```typescript
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
```

**Step 4: Build**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Test in Obsidian**

1. Copy `main.js` and `styles.css` to plugin folder
2. Reload plugin
3. Open Dashboard
4. Verify heatmap appears with your vault's activity
5. Hover over cells to see tooltips
6. Click cells (should log to console)

**Step 6: Commit**

```bash
git add .
git commit -m "feat: integrate activity heatmap with styling"
```

---

## Task 8: Note List Modal

**Files:**
- Create: `src/components/NoteListModal.ts`
- Modify: `src/widgets/ActivityHeatmapWidget.ts`

**Step 1: Create NoteListModal.ts**

Create `src/components/NoteListModal.ts`:
```typescript
import { App, Modal, TFile } from 'obsidian';

interface NoteListData {
    date: string;
    created: TFile[];
    modified: TFile[];
}

export class NoteListModal extends Modal {
    private data: NoteListData;

    constructor(app: App, data: NoteListData) {
        super(app);
        this.data = data;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        contentEl.createEl('h2', { text: `Notes for ${this.data.date}` });

        // Created section
        if (this.data.created.length > 0) {
            const createdSection = contentEl.createEl('div', { cls: 'note-list-section' });
            createdSection.createEl('h3', { text: `Created (${this.data.created.length})` });

            const createdList = createdSection.createEl('ul', { cls: 'note-list' });
            for (const file of this.data.created) {
                const li = createdList.createEl('li');
                const link = li.createEl('a', {
                    text: file.basename,
                    cls: 'note-link'
                });
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.app.workspace.openLinkText(file.path, '', false);
                    this.close();
                });
            }
        }

        // Modified section
        if (this.data.modified.length > 0) {
            const modifiedSection = contentEl.createEl('div', { cls: 'note-list-section' });
            modifiedSection.createEl('h3', { text: `Modified (${this.data.modified.length})` });

            const modifiedList = modifiedSection.createEl('ul', { cls: 'note-list' });
            for (const file of this.data.modified) {
                const li = modifiedList.createEl('li');
                const link = li.createEl('a', {
                    text: file.basename,
                    cls: 'note-link'
                });
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.app.workspace.openLinkText(file.path, '', false);
                    this.close();
                });
            }
        }

        // No activity message
        if (this.data.created.length === 0 && this.data.modified.length === 0) {
            contentEl.createEl('p', { text: 'No activity on this date.' });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
```

**Step 2: Update ActivityHeatmapWidget to use modal**

Modify `src/widgets/ActivityHeatmapWidget.ts` - update the class:
```typescript
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { HeatmapRenderer, HeatmapCell } from '../components/Heatmap';
import { DataCollector } from '../services/DataCollector';
import { NoteListModal } from '../components/NoteListModal';
import { App, Vault, TFile } from 'obsidian';

interface ActivityHeatmapSettings extends WidgetSettings {
    days: number;
    countMode: 'unique' | 'total';
    colorScheme: 'theme-adaptive' | 'github-green' | 'custom';
}

export class ActivityHeatmapWidget extends Widget {
    private app: App;
    private vault: Vault;
    private dataCollector: DataCollector;
    private heatmapRenderer: HeatmapRenderer;

    constructor(app: App, settings: ActivityHeatmapSettings) {
        super(settings);
        this.app = app;
        this.vault = app.vault;
        this.dataCollector = new DataCollector(this.vault);
        this.heatmapRenderer = new HeatmapRenderer();
    }

    getId(): string {
        return 'activity-heatmap';
    }

    getName(): string {
        return 'Activity Heatmap';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create heatmap container
        const heatmapContainer = containerEl.createEl('div', { cls: 'heatmap-container' });

        // Show loading state
        heatmapContainer.createEl('p', { text: 'Loading activity data...' });
    }

    async update(): Promise<void> {
        const settings = this.settings as ActivityHeatmapSettings;
        const activityData = await this.dataCollector.collectActivityData(settings.days);

        // Convert to heatmap cells
        const cells: HeatmapCell[] = [];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - settings.days);

        // Generate all dates in range
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateString = this.getDateString(d);
            const activity = activityData.dailyActivity.get(dateString);

            let count = 0;
            if (activity) {
                if (settings.countMode === 'unique') {
                    // Count unique notes (a note is counted once if created OR modified)
                    const uniqueFiles = new Set([
                        ...activity.created,
                        ...activity.modified
                    ]);
                    count = uniqueFiles.size;
                } else {
                    // Count total events
                    count = activity.created.size + activity.modified.size;
                }
            }

            cells.push({ date: dateString, count });
        }

        // Render heatmap
        const heatmapContainer = this.containerEl.querySelector('.heatmap-container') as HTMLElement;
        if (heatmapContainer) {
            this.heatmapRenderer.render(heatmapContainer, cells, (date) => {
                this.onCellClick(date, activityData);
            });
        }
    }

    private async onCellClick(date: string, activityData: any) {
        const activity = activityData.dailyActivity.get(date);

        const created: TFile[] = activity ? Array.from(activity.created) : [];
        const modified: TFile[] = activity ? Array.from(activity.modified) : [];

        const modal = new NoteListModal(this.app, {
            date,
            created,
            modified
        });
        modal.open();
    }

    private getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
```

**Step 3: Update main.ts widget registration**

Modify `src/main.ts`:
```typescript
// Register widgets
this.widgetRegistry.register('activity-heatmap', (settings) => {
    return new ActivityHeatmapWidget(this.app, settings);
});
```

**Step 4: Add modal styling to styles.css**

Add to `styles.css`:
```css
/* Note List Modal */
.note-list-section {
    margin: 20px 0;
}

.note-list-section h3 {
    margin: 10px 0;
    color: var(--text-muted);
    font-size: 0.9em;
    text-transform: uppercase;
}

.note-list {
    list-style: none;
    padding: 0;
    margin: 10px 0;
}

.note-list li {
    padding: 5px 0;
}

.note-link {
    color: var(--text-accent);
    cursor: pointer;
    text-decoration: none;
}

.note-link:hover {
    text-decoration: underline;
}
```

**Step 5: Build**

```bash
npm run build
```

Expected: Build succeeds

**Step 6: Test in Obsidian**

1. Copy updated `main.js` and `styles.css`
2. Reload plugin
3. Open Dashboard
4. Click on a heatmap cell
5. Verify modal opens with list of notes
6. Click a note link and verify it opens

**Step 7: Commit**

```bash
git add src/ styles.css
git commit -m "feat: add note list modal for heatmap clicks"
```

---

## Task 9: Stats Widget

**Files:**
- Create: `src/widgets/StatsWidget.ts`
- Modify: `src/main.ts`
- Modify: `styles.css`

**Step 1: Create StatsWidget.ts**

Create `src/widgets/StatsWidget.ts`:
```typescript
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { DataCollector } from '../services/DataCollector';
import { App } from 'obsidian';

interface StatsWidgetSettings extends WidgetSettings {
    visibleMetrics: string[];
    streakMinNotes: number;
}

interface Stats {
    total: number;
    currentStreak: number;
    longestStreak: number;
    thisWeek: number;
    thisMonth: number;
    busiestDay: { date: string; count: number } | null;
}

export class StatsWidget extends Widget {
    private app: App;
    private dataCollector: DataCollector;

    constructor(app: App, settings: StatsWidgetSettings) {
        super(settings);
        this.app = app;
        this.dataCollector = new DataCollector(app.vault);
    }

    getId(): string {
        return 'stats';
    }

    getName(): string {
        return 'Statistics';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create stats container
        const statsContainer = containerEl.createEl('div', { cls: 'stats-container' });
        statsContainer.createEl('p', { text: 'Loading statistics...' });
    }

    async update(): Promise<void> {
        const settings = this.settings as StatsWidgetSettings;
        const activityData = await this.dataCollector.collectActivityData(365);
        const streakData = this.dataCollector.calculateStreaks(activityData, settings.streakMinNotes);

        // Calculate stats
        const stats: Stats = {
            total: activityData.totalNotes,
            currentStreak: streakData.current,
            longestStreak: streakData.longest,
            thisWeek: this.countNotesInLastDays(activityData, 7),
            thisMonth: this.countNotesInLastDays(activityData, 30),
            busiestDay: this.findBusiestDay(activityData)
        };

        // Render stats
        const statsContainer = this.containerEl.querySelector('.stats-container') as HTMLElement;
        if (statsContainer) {
            statsContainer.empty();

            const grid = statsContainer.createEl('div', { cls: 'stats-grid' });

            // Render each visible metric
            if (settings.visibleMetrics.contains('total')) {
                this.renderStatCard(grid, 'Total Notes', stats.total.toString(), 'file-text');
            }

            if (settings.visibleMetrics.contains('currentStreak')) {
                this.renderStatCard(grid, 'Current Streak', `${stats.currentStreak} days`, 'flame');
            }

            if (settings.visibleMetrics.contains('longestStreak')) {
                this.renderStatCard(grid, 'Longest Streak', `${stats.longestStreak} days`, 'trophy');
            }

            if (settings.visibleMetrics.contains('thisWeek')) {
                this.renderStatCard(grid, 'This Week', stats.thisWeek.toString(), 'calendar');
            }

            if (settings.visibleMetrics.contains('thisMonth')) {
                this.renderStatCard(grid, 'This Month', stats.thisMonth.toString(), 'calendar-range');
            }

            if (settings.visibleMetrics.contains('busiestDay') && stats.busiestDay) {
                this.renderStatCard(
                    grid,
                    'Busiest Day',
                    `${stats.busiestDay.count} notes`,
                    'trending-up',
                    stats.busiestDay.date
                );
            }
        }
    }

    private renderStatCard(
        container: HTMLElement,
        label: string,
        value: string,
        icon: string,
        subtitle?: string
    ) {
        const card = container.createEl('div', { cls: 'stat-card' });

        const iconEl = card.createEl('div', { cls: 'stat-icon' });
        iconEl.innerHTML = this.getIconSvg(icon);

        const content = card.createEl('div', { cls: 'stat-content' });
        content.createEl('div', { cls: 'stat-label', text: label });
        content.createEl('div', { cls: 'stat-value', text: value });

        if (subtitle) {
            content.createEl('div', { cls: 'stat-subtitle', text: subtitle });
        }
    }

    private countNotesInLastDays(activityData: any, days: number): number {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const uniqueNotes = new Set();

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateString = this.getDateString(d);
            const activity = activityData.dailyActivity.get(dateString);

            if (activity) {
                activity.created.forEach((file: any) => uniqueNotes.add(file.path));
                activity.modified.forEach((file: any) => uniqueNotes.add(file.path));
            }
        }

        return uniqueNotes.size;
    }

    private findBusiestDay(activityData: any): { date: string; count: number } | null {
        let busiestDate: string | null = null;
        let maxCount = 0;

        for (const [date, activity] of activityData.dailyActivity.entries()) {
            const uniqueNotes = new Set([
                ...activity.created,
                ...activity.modified
            ]);
            const count = uniqueNotes.size;

            if (count > maxCount) {
                maxCount = count;
                busiestDate = date;
            }
        }

        return busiestDate ? { date: busiestDate, count: maxCount } : null;
    }

    private getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private getIconSvg(icon: string): string {
        // Simple icon placeholders (in production, use actual icon library)
        const icons: Record<string, string> = {
            'file-text': '📄',
            'flame': '🔥',
            'trophy': '🏆',
            'calendar': '📅',
            'calendar-range': '📆',
            'trending-up': '📈'
        };
        return `<span class="stat-icon-emoji">${icons[icon] || '•'}</span>`;
    }
}
```

**Step 2: Register widget in main.ts**

Modify `src/main.ts` - add after activity-heatmap registration:
```typescript
import { StatsWidget } from './widgets/StatsWidget';

// ... in onload():
this.widgetRegistry.register('stats', (settings) => {
    return new StatsWidget(this.app, settings);
});
```

**Step 3: Add stats styling to styles.css**

Add to `styles.css`:
```css
/* Stats Widget */
.stats-container {
    padding: 10px 0;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: var(--background-secondary);
    border-radius: 6px;
    border: 1px solid var(--background-modifier-border);
}

.stat-icon {
    font-size: 24px;
    opacity: 0.8;
}

.stat-icon-emoji {
    display: inline-block;
}

.stat-content {
    flex: 1;
}

.stat-label {
    font-size: 0.85em;
    color: var(--text-muted);
    margin-bottom: 4px;
}

.stat-value {
    font-size: 1.3em;
    font-weight: 600;
    color: var(--text-normal);
}

.stat-subtitle {
    font-size: 0.75em;
    color: var(--text-muted);
    margin-top: 2px;
}
```

**Step 4: Build**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Test in Obsidian**

1. Copy updated files
2. Reload plugin
3. Open Dashboard
4. Verify stats widget appears below heatmap
5. Check that all metrics display correctly

**Step 6: Commit**

```bash
git add src/ styles.css
git commit -m "feat: add stats widget"
```

---

## Task 10: Settings Panel Foundation

**Files:**
- Create: `src/settings/SettingsTab.ts`
- Modify: `src/main.ts`

**Step 1: Create SettingsTab.ts**

Create `src/settings/SettingsTab.ts`:
```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';
import DashboardPlugin from '../main';

export class DashboardSettingsTab extends PluginSettingTab {
    plugin: DashboardPlugin;

    constructor(app: App, plugin: DashboardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Dashboard Settings' });

        // Global Settings
        containerEl.createEl('h3', { text: 'Global Settings' });

        new Setting(containerEl)
            .setName('Auto-refresh')
            .setDesc('Automatically refresh dashboard when vault changes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoRefresh)
                .onChange(async (value) => {
                    this.plugin.settings.autoRefresh = value;
                    await this.plugin.saveSettings();
                }));

        // Widget Settings
        containerEl.createEl('h3', { text: 'Enabled Widgets' });

        new Setting(containerEl)
            .setName('Activity Heatmap')
            .setDesc('Show note creation/modification heatmap')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabledWidgets.contains('activity-heatmap'))
                .onChange(async (value) => {
                    if (value) {
                        if (!this.plugin.settings.enabledWidgets.contains('activity-heatmap')) {
                            this.plugin.settings.enabledWidgets.push('activity-heatmap');
                        }
                    } else {
                        const index = this.plugin.settings.enabledWidgets.indexOf('activity-heatmap');
                        if (index > -1) {
                            this.plugin.settings.enabledWidgets.splice(index, 1);
                        }
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Statistics')
            .setDesc('Show vault statistics (streaks, totals, etc.)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabledWidgets.contains('stats'))
                .onChange(async (value) => {
                    if (value) {
                        if (!this.plugin.settings.enabledWidgets.contains('stats')) {
                            this.plugin.settings.enabledWidgets.push('stats');
                        }
                    } else {
                        const index = this.plugin.settings.enabledWidgets.indexOf('stats');
                        if (index > -1) {
                            this.plugin.settings.enabledWidgets.splice(index, 1);
                        }
                    }
                    await this.plugin.saveSettings();
                }));

        // Activity Heatmap Settings
        containerEl.createEl('h3', { text: 'Activity Heatmap Settings' });

        new Setting(containerEl)
            .setName('Date range')
            .setDesc('Number of days to display')
            .addText(text => text
                .setValue(this.plugin.settings.widgetSettings['activity-heatmap'].days.toString())
                .onChange(async (value) => {
                    const days = parseInt(value);
                    if (!isNaN(days) && days > 0) {
                        this.plugin.settings.widgetSettings['activity-heatmap'].days = days;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Count mode')
            .setDesc('How to count notes per day')
            .addDropdown(dropdown => dropdown
                .addOption('unique', 'Unique notes per day')
                .addOption('total', 'Total events (creation + modification)')
                .setValue(this.plugin.settings.widgetSettings['activity-heatmap'].countMode)
                .onChange(async (value) => {
                    this.plugin.settings.widgetSettings['activity-heatmap'].countMode = value;
                    await this.plugin.saveSettings();
                }));

        // Stats Settings
        containerEl.createEl('h3', { text: 'Statistics Settings' });

        new Setting(containerEl)
            .setName('Streak minimum')
            .setDesc('Minimum notes per day to count for streaks')
            .addText(text => text
                .setValue(this.plugin.settings.widgetSettings['stats'].streakMinNotes.toString())
                .onChange(async (value) => {
                    const min = parseInt(value);
                    if (!isNaN(min) && min > 0) {
                        this.plugin.settings.widgetSettings['stats'].streakMinNotes = min;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
```

**Step 2: Register settings tab in main.ts**

Modify `src/main.ts`:
```typescript
import { DashboardSettingsTab } from './settings/SettingsTab';

// ... in onload(), after registering widgets:
this.addSettingTab(new DashboardSettingsTab(this.app, this));
```

**Step 3: Build**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Test in Obsidian**

1. Copy updated `main.js`
2. Reload plugin
3. Open Settings → Dashboard
4. Verify all settings appear
5. Toggle widgets and verify changes save
6. Reload plugin and verify settings persist

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add settings panel"
```

---

## Task 11: GitHub Repository Setup

**Files:**
- Create: `.github/workflows/release.yml`
- Create: `version-bump.mjs`
- Update: `README.md`
- Create: `CHANGELOG.md`
- Create: `CONTRIBUTING.md`

**Step 1: Create GitHub repository**

```bash
# On GitHub, create new repository: obsidian-dashboard
# Then link local repo:
git remote add origin https://github.com/yourusername/obsidian-dashboard.git
```

**Step 2: Create release workflow**

Create `.github/workflows/release.yml`:
```yaml
name: Release Obsidian plugin

on:
  push:
    tags:
      - "*"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18.x"

      - name: Build plugin
        run: |
          npm install
          npm run build

      - name: Create release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          tag="${GITHUB_REF#refs/tags/}"
          gh release create "$tag" \
            --title="$tag" \
            --draft \
            main.js manifest.json styles.css
```

**Step 3: Create version-bump.mjs**

Create `version-bump.mjs`:
```javascript
import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// Update manifest.json
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Update versions.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
```

**Step 4: Update README.md**

Update `README.md` with comprehensive documentation:
```markdown
# Dashboard

An extensible Obsidian plugin for visualizing vault analytics through customizable widgets.

## Features

### 🗓️ Activity Heatmap
GitHub-style heatmap showing your note creation and modification patterns over the last 365 days. Click any day to see which notes were created or modified.

### 📊 Statistics
Key metrics at a glance:
- Total notes in vault
- Current writing streak
- Longest streak on record
- Activity this week/month
- Busiest day

### 🏷️ MOC Breakdown (Coming Soon)
Visualize note distribution across your Maps of Content categories.

## Installation

### From Obsidian Community Plugins (Recommended)
1. Open Settings → Community Plugins
2. Browse and search for "Dashboard"
3. Click Install
4. Enable the plugin

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/yourusername/obsidian-dashboard/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/dashboard/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

1. Open Command Palette (`Cmd/Ctrl + P`)
2. Search for "Dashboard: Open Dashboard"
3. View your vault analytics

### Settings

Access settings via Settings → Dashboard:

- **Enable/disable widgets** - Show only the widgets you want
- **Activity Heatmap** - Configure date range and counting mode
- **Statistics** - Customize streak requirements

## Development

### Prerequisites
- Node.js 16+
- npm

### Setup
```bash
git clone https://github.com/yourusername/obsidian-dashboard.git
cd obsidian-dashboard
npm install
```

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

This watches for file changes and rebuilds automatically.

### Testing
1. Build the plugin
2. Copy `main.js`, `manifest.json`, and `styles.css` to your test vault's `.obsidian/plugins/dashboard/`
3. Reload Obsidian

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Roadmap

- [x] Activity heatmap widget
- [x] Statistics widget
- [ ] MOC breakdown widget
- [ ] Custom widget API
- [ ] Export analytics data
- [ ] Tag cloud visualization
- [ ] Link graph analytics

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- 🐛 [Report bugs](https://github.com/yourusername/obsidian-dashboard/issues)
- 💡 [Request features](https://github.com/yourusername/obsidian-dashboard/issues)
- 📖 [Documentation](https://github.com/yourusername/obsidian-dashboard/wiki)
```

**Step 5: Create CHANGELOG.md**

Create `CHANGELOG.md`:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-01-02

### Added
- Activity heatmap widget with GitHub-style visualization
- Statistics widget showing streaks and key metrics
- Note list modal for viewing notes by date
- Settings panel for customizing widgets
- Theme-adaptive color scheme

### Features
- Click heatmap cells to see notes created/modified on that day
- Track writing streaks (current and longest)
- View total notes, weekly/monthly activity
- Configure heatmap date range and count mode
- Enable/disable individual widgets
```

**Step 6: Create CONTRIBUTING.md**

Create `CONTRIBUTING.md`:
```markdown
# Contributing to Dashboard

Thank you for your interest in contributing!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Make your changes in the `src/` directory
4. Build: `npm run build`
5. Test in Obsidian

## Adding a New Widget

Widgets are modular components that render in the dashboard. To add a new widget:

### 1. Create Widget Class

Create `src/widgets/YourWidget.ts`:

```typescript
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { App } from 'obsidian';

export class YourWidget extends Widget {
    private app: App;

    constructor(app: App, settings: WidgetSettings) {
        super(settings);
        this.app = app;
    }

    getId(): string {
        return 'your-widget-id';
    }

    getName(): string {
        return 'Your Widget Name';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create your UI
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Add widget content...
    }

    async update(): Promise<void> {
        // Fetch/process data
        // Update UI
    }
}
```

### 2. Register Widget

In `src/main.ts`:

```typescript
import { YourWidget } from './widgets/YourWidget';

// In onload():
this.widgetRegistry.register('your-widget-id', (settings) => {
    return new YourWidget(this.app, settings);
});
```

### 3. Add to Default Settings

In `src/types.ts`, add to `DEFAULT_SETTINGS`:

```typescript
enabledWidgets: ['activity-heatmap', 'stats', 'your-widget-id'],
widgetOrder: ['activity-heatmap', 'stats', 'your-widget-id'],
widgetSettings: {
    // ...
    'your-widget-id': {
        // Your default settings
    }
}
```

### 4. Add Settings UI (Optional)

In `src/settings/SettingsTab.ts`, add settings for your widget.

### 5. Style Your Widget

Add CSS to `styles.css`.

## Code Style

- Use TypeScript
- Follow existing code structure
- Add comments for complex logic
- Keep functions focused and small

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Build and test
4. Update documentation if needed
5. Submit PR with clear description

## Questions?

Open an issue for discussion before starting major changes.
```

**Step 7: Commit and push**

```bash
git add .
git commit -m "chore: add GitHub repository setup and documentation"
git push -u origin main
```

**Step 8: Create first release**

```bash
# Update version in package.json
npm version 0.1.0

# Push tag
git push --tags
```

Expected: GitHub Actions builds and creates draft release

---

## Task 12: Final Testing & Polish

**Files:**
- Update: Various files for bug fixes
- Test: Complete workflow

**Step 1: Full integration test**

Test in Obsidian:
1. Fresh install of plugin
2. Open dashboard - verify all widgets load
3. Click heatmap cells - verify modal works
4. Check all stats display correctly
5. Toggle widgets in settings - verify they show/hide
6. Change settings - verify changes persist
7. Reload Obsidian - verify everything still works

**Step 2: Fix any discovered issues**

For each bug found:
1. Create failing test (if applicable)
2. Fix the bug
3. Verify fix works
4. Commit with descriptive message

**Step 3: Performance check**

1. Test with large vault (1000+ notes)
2. Verify heatmap renders quickly
3. Check memory usage is reasonable
4. Optimize if needed

**Step 4: Browser compatibility**

1. Test in different Obsidian themes
2. Verify colors adapt correctly
3. Check responsive layout

**Step 5: Documentation review**

1. Verify README is accurate
2. Check all links work
3. Ensure installation instructions are clear
4. Add screenshots if needed

**Step 6: Final commit**

```bash
git add .
git commit -m "chore: final polish and testing"
git push
```

---

## Execution Complete

**Next Steps:**

1. **Community Plugin Submission** - Submit PR to `obsidianmd/obsidian-releases`
2. **Gather Feedback** - Share with community, collect issues/requests
3. **Iterate** - Add MOC breakdown widget and other features

**Future Enhancements:**
- MOC breakdown widget with charts
- Tag cloud visualization
- Custom widget API for developers
- Export analytics data
- More customization options
