# Dashboard Plugin Design

**Date:** 2026-01-02
**Purpose:** Extensible dashboard framework for visualizing vault analytics
**License:** MIT
**Repository:** `obsidian-dashboard` (GitHub personal account)
**Distribution:** Obsidian Community Plugin directory

## Overview

An Obsidian plugin that provides a widget-based dashboard for visualizing note-taking patterns and vault analytics. The initial implementation focuses on note creation activity tracking with a GitHub-style heatmap, expandable to additional metrics and visualizations.

## Architecture

### Core Concept
Widget-based framework where each visualization is an independent, modular component that can be enabled/disabled and configured separately.

### Components

#### 1. DashboardView (extends `ItemView`)
- Container that renders active widgets
- Handles layout and widget positioning
- Opened via command palette: "Dashboard: Open Dashboard"
- Displays widgets in vertical stack based on user-configured order

#### 2. Widget Base Class
Abstract class that all widgets extend:
```typescript
abstract class Widget {
  abstract render(): HTMLElement;
  abstract update(): void;
  abstract getSettings(): WidgetSettings;
  destroy(): void;
}
```

#### 3. Widget Registry
Centralized registry for managing widgets:
- `registerWidget(widget)` - Add new widget type
- `getActiveWidgets()` - Get enabled widgets from settings
- Enables easy addition of future widgets

#### 4. Initial Widgets
- **ActivityHeatmapWidget** - GitHub-style activity heatmap
- **StatsWidget** - Summary statistics
- **MOCBreakdownWidget** - Category analysis charts

### Settings Structure
```typescript
interface DashboardSettings {
  enabledWidgets: string[];
  widgetOrder: string[];
  autoRefresh: boolean;
  widgetSettings: {
    [widgetId: string]: WidgetSettings;
  };
}
```

## Widget Specifications

### 1. Activity Heatmap Widget

**Purpose:** Visualize note creation and modification activity over the last 365 days.

**Data Collection:**
- Scans all `.md` files using `vault.getMarkdownFiles()`
- Extracts timestamps:
  - `file.stat.ctime` - Creation time
  - `file.stat.mtime` - Modification time
- Builds activity map:
  ```typescript
  Map<dateString, {
    created: Set<TFile>,
    modified: Set<TFile>
  }>
  ```
- A note counts once per day if created OR modified

**Rendering:**
- SVG calendar grid showing last 365 days
- Layout: 7 rows (days of week) × 52-53 columns (weeks)
- Color intensity scale:
  - 0 notes: background color
  - 1-2 notes: light intensity
  - 3-5 notes: medium intensity
  - 6+ notes: dark intensity
- Uses CSS variables for theme adaptation: `--interactive-accent` with opacity variations

**Interactivity:**
- **Hover:** Tooltip displays date and count ("5 notes on Jan 15, 2025")
- **Click:** Opens modal showing:
  - Date header
  - "Created" section with file links
  - "Modified" section with file links
  - All links open notes in Obsidian

**Performance:**
- Cache activity data in memory
- Refresh incrementally using `vault.on('modify')` and `vault.on('create')` events
- Avoid full vault re-scan on each render

**Settings:**
- Date range: Last 365 days (default), Current Year, All Time
- Count mode: Unique notes per day vs Total events
- Color scheme: Theme-adaptive (default), GitHub Green, Custom

### 2. Stats Widget

**Purpose:** Display key vault metrics at a glance.

**Metrics Displayed:**
- **Total Notes** - Count of all `.md` files
- **Current Streak** - Consecutive days with activity
- **Longest Streak** - Best streak on record
- **This Week** - Notes created/modified in last 7 days
- **This Month** - Notes created/modified in last 30 days
- **Busiest Day** - Date with most activity (with count)

**Layout:**
- Grid of stat cards (3 columns × 2 rows)
- Each card shows metric name, value, and optional icon

**Settings:**
- Visible metrics: Checkboxes to show/hide individual stats
- Streak definition: "At least X notes per day" (default: 1)

### 3. MOC Breakdown Widget

**Purpose:** Analyze note distribution across MOC categories (who/what/when/where).

**Data Collection:**
- Parse frontmatter from all notes
- Extract arrays: `who`, `what`, `when`, `where`
- Count notes per category (e.g., `[[%coding]]` appears in 45 notes)
- Track top categories per MOC type

**Visualization:**
- Tabbed or accordion view for each MOC type
- Chart options: Pie chart, Bar chart, or Table
- Shows top N categories (default: 10)
- Click category to see list of matching notes

**Settings:**
- Chart type: Pie, Bar, Table
- Categories to show: Number (default: 10)
- Excluded folders: List of paths to ignore (e.g., "templates/")

## Technical Implementation

### Tech Stack
- **TypeScript** - Required for Obsidian plugins
- **Obsidian API** - `obsidian` npm package
- **Chart.js** (optional) - For MOC visualizations, or use raw SVG
- **Build Tool** - esbuild (Obsidian standard)

### Project Structure
```
dashboard/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── DashboardView.ts     # Main view container
│   ├── WidgetRegistry.ts    # Widget management
│   ├── widgets/
│   │   ├── Widget.ts        # Base widget class
│   │   ├── ActivityHeatmap.ts
│   │   ├── StatsWidget.ts
│   │   └── MOCBreakdown.ts
│   ├── components/
│   │   ├── Heatmap.ts       # SVG heatmap generator
│   │   └── NoteListModal.ts # Modal for note lists
│   ├── services/
│   │   ├── DataCollector.ts # Vault scanning & caching
│   │   └── FrontmatterParser.ts
│   └── settings/
│       ├── Settings.ts      # Settings interface
│       └── SettingsTab.ts   # Settings UI
├── styles.css               # Plugin styles
├── manifest.json
├── package.json
└── tsconfig.json
```

### Key Technical Decisions

1. **Caching Strategy**
   - Cache activity data in memory
   - Refresh on vault events to avoid re-scanning on each view
   - Incremental updates when files change

2. **Theme Adaptation**
   - Use Obsidian CSS variables: `--interactive-accent`, `--background-primary`
   - Automatically adapts to light/dark themes

3. **Date Handling**
   - Use native `Date` objects
   - Normalize to YYYY-MM-DD strings for map keys
   - Handle timezone consistently

4. **Performance**
   - Limit frontmatter parsing to notes with valid YAML
   - Skip binary files
   - Lazy-load widget data (only when widget is visible)

## Settings Panel

**Location:** Obsidian Settings → Dashboard

### Global Settings
- **Enabled Widgets** - Checkboxes to show/hide each widget
- **Widget Order** - Drag-to-reorder list (determines vertical stacking)
- **Auto-refresh** - Toggle automatic data refresh (default: on)

### Widget-Specific Settings
Each widget has its own settings section as documented above.

### Settings Storage
- Persisted in `.obsidian/plugins/dashboard/data.json`
- Settings changes trigger widget `update()` calls

## Commands

- **"Dashboard: Open Dashboard"** - Opens the main dashboard view
- **"Dashboard: Refresh Data"** - Force reload all widget data
- **"Dashboard: Toggle Widget [name]"** - Quick enable/disable specific widgets

## Development Approach

### Phase 1: Foundation
1. Plugin scaffold with minimal DashboardView
2. Widget base class and registry
3. Basic settings panel

### Phase 2: Activity Heatmap
1. Data collection service
2. Heatmap SVG renderer
3. Tooltip and click interactions
4. Note list modal

### Phase 3: Stats Widget
1. Streak calculation logic
2. Stats card layout
3. Configurable metrics

### Phase 4: MOC Breakdown
1. Frontmatter parser
2. Category aggregation
3. Chart rendering
4. Category drill-down

### Phase 5: Polish
1. Settings panel completion
2. Theme styling
3. Performance optimization
4. Documentation

## Future Extensibility

The widget-based architecture enables easy addition of future widgets:
- Tag cloud visualization
- Link graph analytics
- Writing time tracking
- Word count trends
- Search analytics
- Custom user-defined widgets via plugin API

New widgets simply extend the base `Widget` class and register with the `WidgetRegistry`.

## Open Source Setup

### Repository Structure
```
obsidian-dashboard/
├── src/                    # Source code (as detailed above)
├── docs/                   # Documentation
│   └── README.md          # User guide
├── .github/
│   └── workflows/
│       └── release.yml    # Automated releases
├── LICENSE                # MIT License
├── README.md              # Project overview
├── CHANGELOG.md           # Version history
├── manifest.json          # Plugin manifest
├── versions.json          # Version compatibility
├── package.json
└── tsconfig.json
```

### Required Files for Community Plugin

1. **manifest.json** - Plugin metadata:
   ```json
   {
     "id": "dashboard",
     "name": "Dashboard",
     "version": "1.0.0",
     "minAppVersion": "0.15.0",
     "description": "Extensible dashboard for visualizing vault analytics",
     "author": "Your Name",
     "authorUrl": "https://github.com/yourusername",
     "isDesktopOnly": false
   }
   ```

2. **versions.json** - Obsidian version compatibility
3. **LICENSE** - MIT License text
4. **README.md** - Installation, usage, features, screenshots
5. **CHANGELOG.md** - Version history

### Community Plugin Submission Process

1. **Development** - Build and test plugin locally
2. **Initial Release** - Tag v1.0.0, create GitHub release with `main.js`, `manifest.json`, `styles.css`
3. **Submit PR** - To `obsidianmd/obsidian-releases` repository
4. **Review** - Obsidian team reviews for security and quality
5. **Approval** - Plugin appears in Community Plugin browser

### GitHub Actions Setup

Automated release workflow:
- Triggers on version tag push
- Builds plugin
- Creates GitHub release
- Attaches required files (main.js, manifest.json, styles.css)

### Contributing Guidelines

Include `CONTRIBUTING.md` with:
- How to set up development environment
- Code style guidelines
- How to add new widgets
- Pull request process
