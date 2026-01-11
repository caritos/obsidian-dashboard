# MOC Trending Widget Design

**Date:** 2026-01-11
**Status:** Approved
**Author:** Claude Code

## Overview

Add a new dashboard widget that displays which MOCs (Maps of Content) are currently "trending" based on recent vault activity. This helps users identify which topics, people, and locations are most active in their note-taking practice.

## User Requirements

- Display trending MOCs for three categories: **what (%)**, **where (+)**, and **who (~)**
- Exclude temporal MOCs: **when (@)**
- A MOC is trending when:
  1. Notes it references are being actively created/modified
  2. New notes are linking back to it in their frontmatter
- Time window for "trending" should be configurable (7, 14, 30 days, etc.)
- Follow "Building a Second Brain" methodology

## Vault Structure

```
vault/
├── moc/
│   ├── what (%)/      # Topics, projects, subjects
│   ├── where (+)/     # Locations, places
│   ├── who (~)/       # People
│   └── when (@)/      # Dates (excluded from trending)
└── resources/         # Content notes with MOC references in frontmatter
```

**Frontmatter Format in Resource Notes:**
```yaml
---
who:
  - "[[~sophia]]"
  - "[[~eladio]]"
what:
  - "[[%photo]]"
  - "[[%jiu-jitsu]]"
where:
  - "[[+stony-brook]]"
  - "[[+new-york]]"
when:
  - "[[@2024-02-13]]"
---
```

## Data Model

### Core Types

```typescript
interface MocTrendingData {
  category: 'what' | 'where' | 'who';  // Excludes 'when'
  mocName: string;                     // e.g., "photo", "sophia", "stony-brook"
  mocFile: TFile;                      // The MOC file itself
  score: number;                       // Trending score
  recentlyLinkedNotes: TFile[];        // Notes linking to this MOC
  recentActivityCount: number;         // Count of recent creates/modifies
  newBacklinksCount: number;           // New notes referencing this MOC
}

interface TrendingSettings extends WidgetSettings {
  timeWindow: number;                  // Days to look back (7, 14, 30, etc.)
  maxMocsPerCategory: number;          // How many top MOCs to show per category
  scoreWeighting: {
    activityWeight: number;            // Weight for linked notes activity
    newBacklinkWeight: number;         // Weight for new backlinks
  };
  mocBasePath: string;                 // Configurable base path (default: 'moc')
  resourcesPath: string;               // Configurable resources path
}
```

## Trending Score Algorithm

```typescript
trendingScore = (activityScore × activityWeight) + (backlinkScore × newBacklinkWeight)

where:
  activityScore = count of notes in resources/ that:
    - Reference this MOC in frontmatter (who/what/where)
    - Were created OR modified within timeWindow

  backlinkScore = count of notes that:
    - Reference this MOC in frontmatter
    - Were created (ctime) within timeWindow
```

**Default Weights:**
- `activityWeight: 0.7` (emphasize ongoing work)
- `newBacklinkWeight: 0.3` (recognize new connections)

**Example:**
- `%photo` referenced by 15 notes modified in last 7 days → activityScore = 15
- 3 new notes created in last 7 days referencing `%photo` → backlinkScore = 3
- Score = (15 × 0.7) + (3 × 0.3) = **11.4**

## Data Collection Strategy

1. **Scan Resources Directory:**
   - Use `app.vault.getMarkdownFiles()` to get all files
   - Filter for files in `resources/` path
   - Use `app.metadataCache.getFileCache()` for efficient frontmatter access

2. **Parse Frontmatter:**
   - Extract `what`, `where`, `who` arrays
   - Handle both array and single-value formats
   - Gracefully handle missing frontmatter

3. **Build MOC Reference Map:**
   - For each resource note, extract MOC wikilinks
   - Check file timestamps (ctime/mtime) against timeWindow
   - Track: MOC → [referenced notes]

4. **Calculate Scores:**
   - For each MOC, calculate activityScore and backlinkScore
   - Apply weighting formula
   - Sort by score within each category
   - Take top N per category (configurable)

5. **Caching:**
   - Reuse existing caching pattern from `DataCollector`
   - Cache TTL: 1 minute (same as activity data)
   - Invalidate on settings change

## User Interface

### Visual Layout

```
┌─────────────────────────────────────────┐
│ 🔥 Trending MOCs                        │
├─────────────────────────────────────────┤
│                                         │
│ 📋 What (%)                            │
│  1. photo         ↑12  🔗3             │
│  2. jiu-jitsu     ↑8   🔗2             │
│  3. recipe        ↑5   🔗1             │
│                                         │
│ 📍 Where (+)                           │
│  1. stony-brook   ↑7   🔗2             │
│  2. 3-harwick-lane ↑4  🔗1             │
│                                         │
│ 👤 Who (~)                             │
│  1. sophia        ↑9   🔗3             │
│  2. eladio        ↑6   🔗1             │
└─────────────────────────────────────────┘

Legend:
↑12 = 12 notes with recent activity
🔗3 = 3 new backlinks
```

### Interactive Features

- **Click MOC name** → Opens that MOC file
- **Hover over MOC** → Tooltip shows full trending score breakdown
- **Click activity count (↑)** → Modal showing recently active notes
- **Click backlink count (🔗)** → Modal showing new notes that reference this MOC

### Styling

- Reuse existing dashboard CSS patterns (`.widget-header`, `.stat-card`, etc.)
- Add subtle category-specific color accents
- Responsive grid layout
- Match existing widget aesthetic

## Implementation Plan

### File Structure

```
src/
├── widgets/
│   └── MocTrendingWidget.ts          # New widget class
├── services/
│   ├── MocDataCollector.ts           # New: MOC-specific data collection
│   └── FrontmatterParser.ts          # New: Parse YAML frontmatter
└── components/
    └── MocTrendingModal.ts           # Modal for showing linked notes
```

### New Files

#### 1. `MocTrendingWidget.ts`
- Extends `Widget` base class
- Implements `getId()`, `getName()`, `render()`, `update()`
- Renders three category sections
- Handles click events to open MOCs and show modals

#### 2. `MocDataCollector.ts`
- Scans vault for MOC files and resource notes
- Parses frontmatter to extract MOC references
- Calculates trending scores
- Returns sorted list of trending MOCs per category
- Implements caching (1-minute TTL)

#### 3. `FrontmatterParser.ts`
- Utility for parsing YAML frontmatter
- Extracts wikilinks from frontmatter fields
- Handles both `[[wikilink]]` and plain text formats
- Gracefully handles malformed frontmatter

#### 4. `MocTrendingModal.ts`
- Extends Obsidian's `Modal` class
- Displays list of notes related to a MOC
- Shows note titles with timestamps
- Clickable links to open notes

### Integration Points

#### Widget Registration (`main.ts`)

```typescript
// In onload()
this.widgetRegistry.register('moc-trending', (settings: WidgetSettings) => {
    const mocDataCollector = new MocDataCollector(this.app.vault, this.app.metadataCache);
    return new MocTrendingWidget(this.app, mocDataCollector, settings);
});
```

#### Default Settings (`types.ts`)

```typescript
// Add to DEFAULT_SETTINGS.widgetSettings
'moc-trending': {
    timeWindow: 7,                    // Days
    maxMocsPerCategory: 5,           // Top N per category
    scoreWeighting: {
        activityWeight: 0.7,
        newBacklinkWeight: 0.3
    },
    mocBasePath: 'moc',              // Configurable base path
    resourcesPath: 'resources'       // Configurable resources path
}
```

#### Settings UI (`SettingsTab.ts`)

Add settings section for MOC Trending widget:
- Time window dropdown (7, 14, 30, 60, 90 days)
- Max MOCs per category slider (3-10)
- Score weighting sliders (activity vs backlinks)
- Path configuration (mocBasePath, resourcesPath)

### Key Implementation Details

**Frontmatter Parsing:**
- Use Obsidian's `app.metadataCache.getFileCache(file).frontmatter`
- Parse `who`, `what`, `where` fields
- Extract wikilink text using regex: `/\[\[([^\]]+)\]\]/g`
- Strip category prefixes (`~`, `%`, `+`) to get MOC name

**MOC File Lookup:**
- Build map: `mocName → mocFile` for all three categories
- Check existence in respective directories
- Handle missing MOC files gracefully

**Performance Considerations:**
- Cache results for 1 minute (same as existing DataCollector)
- Only scan resources directory, not entire vault
- Use metadata cache instead of reading file contents when possible
- Limit to top N MOCs per category to keep UI fast

**Error Handling:**
- Handle missing frontmatter fields
- Handle malformed wikilinks
- Handle missing MOC files
- Handle file system errors during scan

## Success Criteria

1. Widget displays trending MOCs for what/where/who categories
2. Scores accurately reflect recent activity and new backlinks
3. Interactive elements (clicks, hovers) work correctly
4. Settings allow customization of time window and display options
5. Performance is comparable to existing widgets (cached, sub-100ms updates)
6. Widget integrates seamlessly with existing dashboard

## Future Enhancements

- Add sparkline graphs showing trending trajectory over time
- Add filter to show only MOCs above certain activity threshold
- Add export functionality for trending data
- Add comparison view (this week vs last week)
- Support custom MOC directory structures
