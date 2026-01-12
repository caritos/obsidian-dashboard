# MOC Trending Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dashboard widget that displays trending MOCs (Maps of Content) for what/where/who categories based on recent vault activity.

**Architecture:** Widget-based system using existing factory pattern. New MocDataCollector scans resources/ directory for frontmatter references, calculates trending scores, and caches results. Widget renders three category sections with interactive elements.

**Tech Stack:** TypeScript, Obsidian API, existing widget architecture

---

## Task 1: Create FrontmatterParser Utility

**Files:**
- Create: `src/services/FrontmatterParser.ts`

**Step 1: Write the parser utility**

Create the frontmatter parser with wikilink extraction logic:

```typescript
export class FrontmatterParser {
    /**
     * Extracts wikilink references from a frontmatter field
     * Handles both array and single-value formats
     * Example: "[[~sophia]]" -> "sophia"
     * Example: "[[%photo]]" -> "photo"
     */
    static extractWikilinks(value: string | string[] | undefined): string[] {
        if (!value) return [];

        const values = Array.isArray(value) ? value : [value];
        const wikilinks: string[] = [];

        for (const val of values) {
            if (typeof val !== 'string') continue;

            // Match [[content]] pattern
            const matches = val.matchAll(/\[\[([^\]]+)\]\]/g);
            for (const match of matches) {
                wikilinks.push(match[1]);
            }
        }

        return wikilinks;
    }

    /**
     * Strips MOC category prefixes from wikilink
     * Example: "~sophia" -> "sophia"
     * Example: "%photo" -> "photo"
     * Example: "+stony-brook" -> "stony-brook"
     */
    static stripMocPrefix(wikilink: string): string {
        return wikilink.replace(/^[~%+@]/, '');
    }

    /**
     * Extracts MOC category from prefix
     * Returns: 'what' | 'where' | 'who' | 'when' | null
     */
    static getMocCategory(wikilink: string): 'what' | 'where' | 'who' | 'when' | null {
        if (wikilink.startsWith('%')) return 'what';
        if (wikilink.startsWith('+')) return 'where';
        if (wikilink.startsWith('~')) return 'who';
        if (wikilink.startsWith('@')) return 'when';
        return null;
    }
}
```

**Step 2: Commit**

```bash
git add src/services/FrontmatterParser.ts
git commit -m "feat: add frontmatter parser utility

Add utility to extract wikilinks from frontmatter and parse MOC
category prefixes.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create MOC Data Types

**Files:**
- Create: `src/services/MocTypes.ts`

**Step 1: Define MOC-specific types**

```typescript
import { TFile } from 'obsidian';

export type MocCategory = 'what' | 'where' | 'who';

export interface MocTrendingData {
    category: MocCategory;
    mocName: string;
    mocFile: TFile | null;
    score: number;
    recentlyLinkedNotes: TFile[];
    recentActivityCount: number;
    newBacklinksCount: number;
}

export interface MocTrendingSettings {
    timeWindow: number;
    maxMocsPerCategory: number;
    scoreWeighting: {
        activityWeight: number;
        newBacklinkWeight: number;
    };
    mocBasePath: string;
    resourcesPath: string;
}

export interface MocReference {
    mocName: string;
    category: MocCategory;
    sourceFile: TFile;
    isNewNote: boolean;
}
```

**Step 2: Commit**

```bash
git add src/services/MocTypes.ts
git commit -m "feat: add MOC trending types

Define TypeScript types for MOC trending data and settings.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create MocDataCollector Service (Part 1: Scanning)

**Files:**
- Create: `src/services/MocDataCollector.ts`

**Step 1: Create collector skeleton with vault scanning**

```typescript
import { TFile, Vault, MetadataCache } from 'obsidian';
import { MocTrendingData, MocTrendingSettings, MocReference, MocCategory } from './MocTypes';
import { FrontmatterParser } from './FrontmatterParser';

export class MocDataCollector {
    private vault: Vault;
    private metadataCache: MetadataCache;
    private cache: Map<MocCategory, MocTrendingData[]> | null = null;
    private cacheTime: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(vault: Vault, metadataCache: MetadataCache) {
        this.vault = vault;
        this.metadataCache = metadataCache;
    }

    /**
     * Collects trending MOC data for all categories
     */
    async collectTrendingMocs(settings: MocTrendingSettings): Promise<Map<MocCategory, MocTrendingData[]>> {
        // Check cache
        const now = Date.now();
        if (this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
            return this.cache;
        }

        const categories: MocCategory[] = ['what', 'where', 'who'];
        const result = new Map<MocCategory, MocTrendingData[]>();

        // Scan resources directory for MOC references
        const mocReferences = await this.scanResourcesDirectory(settings);

        // Build trending data for each category
        for (const category of categories) {
            const categoryRefs = mocReferences.filter(ref => ref.category === category);
            const trendingData = this.calculateTrendingScores(categoryRefs, settings, category);

            // Sort by score and take top N
            trendingData.sort((a, b) => b.score - a.score);
            const topMocs = trendingData.slice(0, settings.maxMocsPerCategory);

            result.set(category, topMocs);
        }

        // Update cache
        this.cache = result;
        this.cacheTime = now;

        return result;
    }

    /**
     * Scans resources directory for MOC references in frontmatter
     */
    private async scanResourcesDirectory(settings: MocTrendingSettings): Promise<MocReference[]> {
        const references: MocReference[] = [];
        const files = this.vault.getMarkdownFiles();

        // Calculate time window
        const now = Date.now();
        const timeWindowMs = settings.timeWindow * 24 * 60 * 60 * 1000;
        const cutoffTime = now - timeWindowMs;

        for (const file of files) {
            // Only process files in resources directory
            if (!file.path.startsWith(settings.resourcesPath + '/')) {
                continue;
            }

            // Get frontmatter
            const cache = this.metadataCache.getFileCache(file);
            if (!cache || !cache.frontmatter) {
                continue;
            }

            const frontmatter = cache.frontmatter;
            const isNewNote = file.stat.ctime >= cutoffTime;

            // Extract MOC references from who/what/where fields
            const fields: { field: string; category: MocCategory }[] = [
                { field: 'who', category: 'who' },
                { field: 'what', category: 'what' },
                { field: 'where', category: 'where' }
            ];

            for (const { field, category } of fields) {
                const wikilinks = FrontmatterParser.extractWikilinks(frontmatter[field]);

                for (const wikilink of wikilinks) {
                    const mocName = FrontmatterParser.stripMocPrefix(wikilink);

                    references.push({
                        mocName,
                        category,
                        sourceFile: file,
                        isNewNote
                    });
                }
            }
        }

        return references;
    }

    /**
     * Placeholder for calculating trending scores
     * Will be implemented in next step
     */
    private calculateTrendingScores(
        references: MocReference[],
        settings: MocTrendingSettings,
        category: MocCategory
    ): MocTrendingData[] {
        return [];
    }

    invalidateCache() {
        this.cache = null;
        this.cacheTime = 0;
    }
}
```

**Step 2: Commit**

```bash
git add src/services/MocDataCollector.ts
git commit -m "feat: add MOC data collector with vault scanning

Add service to scan resources directory for MOC references in
frontmatter with caching support.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Complete MocDataCollector (Part 2: Scoring)

**Files:**
- Modify: `src/services/MocDataCollector.ts:76-80`

**Step 1: Implement trending score calculation**

Replace the placeholder `calculateTrendingScores` method:

```typescript
    /**
     * Calculates trending scores for MOCs based on activity and backlinks
     */
    private calculateTrendingScores(
        references: MocReference[],
        settings: MocTrendingSettings,
        category: MocCategory
    ): MocTrendingData[] {
        // Group references by MOC name
        const mocMap = new Map<string, MocReference[]>();

        for (const ref of references) {
            if (!mocMap.has(ref.mocName)) {
                mocMap.set(ref.mocName, []);
            }
            mocMap.get(ref.mocName)!.push(ref);
        }

        // Calculate scores for each MOC
        const trendingData: MocTrendingData[] = [];
        const now = Date.now();
        const timeWindowMs = settings.timeWindow * 24 * 60 * 60 * 1000;
        const cutoffTime = now - timeWindowMs;

        for (const [mocName, refs] of mocMap.entries()) {
            // Calculate activity score (notes with recent creates/modifies)
            const recentlyActiveNotes = new Set<TFile>();
            for (const ref of refs) {
                const file = ref.sourceFile;
                const hasRecentActivity =
                    file.stat.ctime >= cutoffTime ||
                    file.stat.mtime >= cutoffTime;

                if (hasRecentActivity) {
                    recentlyActiveNotes.add(file);
                }
            }
            const activityScore = recentlyActiveNotes.size;

            // Calculate backlink score (new notes created in time window)
            const newBacklinks = refs.filter(ref => ref.isNewNote);
            const backlinkScore = newBacklinks.length;

            // Calculate weighted trending score
            const { activityWeight, newBacklinkWeight } = settings.scoreWeighting;
            const score = (activityScore * activityWeight) + (backlinkScore * newBacklinkWeight);

            // Skip MOCs with zero score
            if (score === 0) continue;

            // Find MOC file
            const mocFile = this.findMocFile(mocName, category, settings);

            trendingData.push({
                category,
                mocName,
                mocFile,
                score,
                recentlyLinkedNotes: Array.from(recentlyActiveNotes),
                recentActivityCount: activityScore,
                newBacklinksCount: backlinkScore
            });
        }

        return trendingData;
    }

    /**
     * Finds the MOC file for a given name and category
     */
    private findMocFile(mocName: string, category: MocCategory, settings: MocTrendingSettings): TFile | null {
        const categoryDirMap = {
            'what': 'what (%)',
            'where': 'where (+)',
            'who': 'who (~)'
        };

        const categoryDir = categoryDirMap[category];
        const prefix = category === 'what' ? '%' : category === 'where' ? '+' : '~';

        // Try different filename patterns
        const patterns = [
            `${settings.mocBasePath}/${categoryDir}/${prefix}${mocName}.md`,
            `${settings.mocBasePath}/${categoryDir}/${mocName}.md`
        ];

        for (const pattern of patterns) {
            const file = this.vault.getAbstractFileByPath(pattern);
            if (file instanceof TFile) {
                return file;
            }
        }

        return null;
    }
```

**Step 2: Commit**

```bash
git add src/services/MocDataCollector.ts
git commit -m "feat: add trending score calculation

Implement scoring algorithm based on recent activity and new
backlinks with configurable weights.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create MocTrendingModal Component

**Files:**
- Create: `src/components/MocTrendingModal.ts`

**Step 1: Create modal for displaying linked notes**

```typescript
import { App, Modal, TFile } from 'obsidian';

export class MocTrendingModal extends Modal {
    private notes: TFile[];
    private title: string;

    constructor(app: App, title: string, notes: TFile[]) {
        super(app);
        this.title = title;
        this.notes = notes;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Add title
        contentEl.createEl('h2', { text: this.title });

        // Add note list
        if (this.notes.length === 0) {
            contentEl.createEl('p', { text: 'No notes found.' });
            return;
        }

        const noteList = contentEl.createEl('div', { cls: 'moc-trending-note-list' });

        for (const note of this.notes) {
            const noteItem = noteList.createEl('div', { cls: 'moc-trending-note-item' });

            // Create clickable link
            const link = noteItem.createEl('a', {
                text: note.basename,
                cls: 'moc-trending-note-link'
            });
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.app.workspace.openLinkText(note.path, '', false);
                this.close();
            });

            // Add timestamp
            const timestamp = noteItem.createEl('span', {
                cls: 'moc-trending-note-time'
            });
            const modifiedDate = new Date(note.stat.mtime);
            timestamp.textContent = this.formatDate(modifiedDate);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private formatDate(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}
```

**Step 2: Commit**

```bash
git add src/components/MocTrendingModal.ts
git commit -m "feat: add MOC trending modal component

Add modal to display list of notes linked to a MOC with clickable
links and timestamps.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create MocTrendingWidget (Part 1: Structure)

**Files:**
- Create: `src/widgets/MocTrendingWidget.ts`

**Step 1: Create widget skeleton with basic structure**

```typescript
import { App } from 'obsidian';
import { Widget } from './Widget';
import { WidgetSettings } from '../types';
import { MocDataCollector } from '../services/MocDataCollector';
import { MocTrendingData, MocCategory, MocTrendingSettings } from '../services/MocTypes';
import { MocTrendingModal } from '../components/MocTrendingModal';

export class MocTrendingWidget extends Widget {
    private app: App;
    private mocDataCollector: MocDataCollector;

    constructor(app: App, mocDataCollector: MocDataCollector, settings: WidgetSettings) {
        // Pass a dummy DataCollector since we're using MocDataCollector instead
        super(null as any, settings);
        this.app = app;
        this.mocDataCollector = mocDataCollector;
    }

    getId(): string {
        return 'moc-trending';
    }

    getName(): string {
        return 'Trending MOCs';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: '🔥 ' + this.getName() });

        // Create content container
        const content = containerEl.createEl('div', { cls: 'moc-trending-container' });
        content.createEl('p', { text: 'Loading trending MOCs...' });
    }

    async update(): Promise<void> {
        if (!this.containerEl) return;

        const settings = this.settings as MocTrendingSettings;
        const trendingData = await this.mocDataCollector.collectTrendingMocs(settings);

        // Render categories
        const content = this.containerEl.querySelector('.moc-trending-container') as HTMLElement;
        if (!content) return;

        content.empty();

        // Render each category
        this.renderCategory(content, 'what', '📋 What (%)', trendingData.get('what') || []);
        this.renderCategory(content, 'where', '📍 Where (+)', trendingData.get('where') || []);
        this.renderCategory(content, 'who', '👤 Who (~)', trendingData.get('who') || []);
    }

    private renderCategory(container: HTMLElement, category: MocCategory, title: string, mocs: MocTrendingData[]): void {
        if (mocs.length === 0) return;

        const section = container.createEl('div', { cls: 'moc-trending-category' });
        section.createEl('h4', { text: title, cls: 'moc-trending-category-title' });

        const list = section.createEl('div', { cls: 'moc-trending-list' });

        mocs.forEach((moc, index) => {
            this.renderMocItem(list, moc, index + 1);
        });
    }

    private renderMocItem(container: HTMLElement, moc: MocTrendingData, rank: number): void {
        const item = container.createEl('div', { cls: 'moc-trending-item' });

        // Rank
        const rankEl = item.createEl('span', { cls: 'moc-trending-rank', text: `${rank}.` });

        // MOC name (clickable)
        const nameEl = item.createEl('a', {
            cls: 'moc-trending-name',
            text: moc.mocName
        });

        if (moc.mocFile) {
            nameEl.addEventListener('click', (e) => {
                e.preventDefault();
                this.app.workspace.openLinkText(moc.mocFile!.path, '', false);
            });
        } else {
            nameEl.addClass('moc-trending-missing');
            nameEl.title = 'MOC file not found';
        }

        // Metrics container
        const metrics = item.createEl('span', { cls: 'moc-trending-metrics' });

        // Activity count (clickable)
        const activityEl = metrics.createEl('span', {
            cls: 'moc-trending-metric',
            text: `↑${moc.recentActivityCount}`
        });
        activityEl.title = 'Recent activity';
        activityEl.addEventListener('click', (e) => {
            e.stopPropagation();
            new MocTrendingModal(
                this.app,
                `Recently Active Notes - ${moc.mocName}`,
                moc.recentlyLinkedNotes
            ).open();
        });

        // Backlink count (clickable)
        const backlinkEl = metrics.createEl('span', {
            cls: 'moc-trending-metric',
            text: `🔗${moc.newBacklinksCount}`
        });
        backlinkEl.title = 'New backlinks';
        backlinkEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const newNotes = moc.recentlyLinkedNotes.filter(file => {
                const now = Date.now();
                const settings = this.settings as MocTrendingSettings;
                const timeWindowMs = settings.timeWindow * 24 * 60 * 60 * 1000;
                return file.stat.ctime >= (now - timeWindowMs);
            });
            new MocTrendingModal(
                this.app,
                `New Notes Linking to ${moc.mocName}`,
                newNotes
            ).open();
        });
    }
}
```

**Step 2: Commit**

```bash
git add src/widgets/MocTrendingWidget.ts
git commit -m "feat: add MOC trending widget

Add widget to display trending MOCs with clickable links and
interactive metrics.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Widget Settings Types

**Files:**
- Modify: `src/types.ts:12-32`

**Step 1: Update default settings**

Update the `DEFAULT_SETTINGS` object to include proper MOC trending settings:

```typescript
export const DEFAULT_SETTINGS: DashboardSettings = {
    enabledWidgets: ['activity-heatmap', 'stats', 'moc-trending'],
    widgetOrder: ['activity-heatmap', 'stats', 'moc-trending'],
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
        'moc-trending': {
            timeWindow: 7,
            maxMocsPerCategory: 5,
            scoreWeighting: {
                activityWeight: 0.7,
                newBacklinkWeight: 0.3
            },
            mocBasePath: 'moc',
            resourcesPath: 'resources'
        }
    }
};
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: update default settings for MOC trending

Add proper default settings for MOC trending widget.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Register Widget in Main Plugin

**Files:**
- Modify: `src/main.ts`

**Step 1: Import MOC classes**

Add imports at the top of the file (after existing imports):

```typescript
import { MocDataCollector } from './services/MocDataCollector';
import { MocTrendingWidget } from './widgets/MocTrendingWidget';
```

**Step 2: Register MOC trending widget**

In the `onload()` method, find where widgets are registered and add the MOC trending widget registration. Add this after the existing widget registrations:

```typescript
// Register MOC Trending Widget
this.widgetRegistry.register('moc-trending', (settings: WidgetSettings) => {
    const mocDataCollector = new MocDataCollector(this.app.vault, this.app.metadataCache);
    return new MocTrendingWidget(this.app, mocDataCollector, settings);
});
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: register MOC trending widget

Add MOC trending widget to widget registry.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Add Settings UI for MOC Trending

**Files:**
- Modify: `src/settings/SettingsTab.ts`

**Step 1: Add MOC trending settings section**

Find the settings rendering code and add a new section for MOC trending settings. Add this after the existing widget settings sections:

```typescript
// MOC Trending Settings
if (this.plugin.settings.enabledWidgets.includes('moc-trending')) {
    containerEl.createEl('h3', { text: 'MOC Trending Settings' });

    const mocSettings = this.plugin.settings.widgetSettings['moc-trending'];

    // Time window setting
    new Setting(containerEl)
        .setName('Time window')
        .setDesc('Number of days to look back for trending activity')
        .addDropdown(dropdown => dropdown
            .addOption('7', '7 days')
            .addOption('14', '14 days')
            .addOption('30', '30 days')
            .addOption('60', '60 days')
            .addOption('90', '90 days')
            .setValue(String(mocSettings.timeWindow || 7))
            .onChange(async (value) => {
                mocSettings.timeWindow = parseInt(value);
                await this.plugin.saveSettings();
            }));

    // Max MOCs per category
    new Setting(containerEl)
        .setName('MOCs per category')
        .setDesc('Maximum number of trending MOCs to show per category')
        .addSlider(slider => slider
            .setLimits(3, 10, 1)
            .setValue(mocSettings.maxMocsPerCategory || 5)
            .setDynamicTooltip()
            .onChange(async (value) => {
                mocSettings.maxMocsPerCategory = value;
                await this.plugin.saveSettings();
            }));

    // Activity weight
    new Setting(containerEl)
        .setName('Activity weight')
        .setDesc('Weight for recent note activity (0.0 - 1.0)')
        .addSlider(slider => slider
            .setLimits(0, 1, 0.1)
            .setValue(mocSettings.scoreWeighting?.activityWeight || 0.7)
            .setDynamicTooltip()
            .onChange(async (value) => {
                if (!mocSettings.scoreWeighting) {
                    mocSettings.scoreWeighting = { activityWeight: 0.7, newBacklinkWeight: 0.3 };
                }
                mocSettings.scoreWeighting.activityWeight = value;
                mocSettings.scoreWeighting.newBacklinkWeight = 1 - value;
                await this.plugin.saveSettings();
            }));

    // Base paths
    new Setting(containerEl)
        .setName('MOC base path')
        .setDesc('Base directory for MOC files (relative to vault root)')
        .addText(text => text
            .setPlaceholder('moc')
            .setValue(mocSettings.mocBasePath || 'moc')
            .onChange(async (value) => {
                mocSettings.mocBasePath = value;
                await this.plugin.saveSettings();
            }));

    new Setting(containerEl)
        .setName('Resources path')
        .setDesc('Directory containing resource notes (relative to vault root)')
        .addText(text => text
            .setPlaceholder('resources')
            .setValue(mocSettings.resourcesPath || 'resources')
            .onChange(async (value) => {
                mocSettings.resourcesPath = value;
                await this.plugin.saveSettings();
            }));
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/settings/SettingsTab.ts
git commit -m "feat: add MOC trending settings UI

Add settings UI for time window, max MOCs, scoring weights, and
directory paths.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Add CSS Styles for MOC Trending Widget

**Files:**
- Modify: `styles.css`

**Step 1: Add MOC trending styles**

Add these styles at the end of the CSS file:

```css
/* MOC Trending Widget */
.moc-trending-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.moc-trending-category {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.moc-trending-category-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-muted);
}

.moc-trending-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.moc-trending-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--background-secondary);
    border-radius: 4px;
    transition: background 0.2s;
}

.moc-trending-item:hover {
    background: var(--background-modifier-hover);
}

.moc-trending-rank {
    font-weight: 600;
    color: var(--text-muted);
    min-width: 1.5rem;
}

.moc-trending-name {
    flex: 1;
    cursor: pointer;
    color: var(--text-normal);
    text-decoration: none;
}

.moc-trending-name:hover {
    color: var(--text-accent);
    text-decoration: underline;
}

.moc-trending-name.moc-trending-missing {
    color: var(--text-faint);
    font-style: italic;
    cursor: default;
}

.moc-trending-name.moc-trending-missing:hover {
    text-decoration: none;
}

.moc-trending-metrics {
    display: flex;
    gap: 0.75rem;
    font-size: 0.9rem;
}

.moc-trending-metric {
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    background: var(--background-primary);
    transition: background 0.2s;
}

.moc-trending-metric:hover {
    background: var(--background-modifier-hover);
}

/* MOC Trending Modal */
.moc-trending-note-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
}

.moc-trending-note-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--background-secondary);
    border-radius: 4px;
    transition: background 0.2s;
}

.moc-trending-note-item:hover {
    background: var(--background-modifier-hover);
}

.moc-trending-note-link {
    flex: 1;
    cursor: pointer;
    color: var(--text-normal);
    text-decoration: none;
}

.moc-trending-note-link:hover {
    color: var(--text-accent);
    text-decoration: underline;
}

.moc-trending-note-time {
    font-size: 0.85rem;
    color: var(--text-muted);
}
```

**Step 2: Commit**

```bash
git add styles.css
git commit -m "style: add MOC trending widget styles

Add CSS styles for MOC trending widget and modal.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Build and Test

**Files:**
- None (testing phase)

**Step 1: Build the plugin**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Manual testing checklist**

1. Copy `main.js`, `manifest.json`, `styles.css` to test vault's `.obsidian/plugins/dashboard/`
2. Reload Obsidian or toggle plugin
3. Open dashboard via Command Palette: "Dashboard: Open Dashboard"
4. Verify MOC Trending widget appears
5. Check that trending MOCs are displayed for what/where/who categories
6. Click on MOC name → should open MOC file
7. Click on activity count (↑) → should open modal with active notes
8. Click on backlink count (🔗) → should open modal with new notes
9. Go to Settings → Dashboard → verify MOC Trending settings appear
10. Change time window → verify widget updates
11. Change max MOCs per category → verify widget updates

**Step 3: Document any issues found**

If issues are found during testing, create follow-up tasks to fix them.

**Step 4: Commit if any fixes were needed**

```bash
git add .
git commit -m "fix: address issues found during testing

[Describe any fixes made]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Update Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md with MOC Trending info**

In the "Key Features" section, update to include MOC Trending:

```markdown
**Key Features:**
- Activity Heatmap (GitHub-style contribution graph)
- Stats Widget (streaks, totals, busiest days)
- MOC Trending (trending topics, people, and locations based on vault activity)
```

In the "Built-in Widgets" section, add:

```markdown
- `MocTrendingWidget` (src/widgets/MocTrendingWidget.ts): Trending MOCs display
```

In the "Key Components" section, add:

```markdown
**MocDataCollector** (`src/services/MocDataCollector.ts`):
- Scans resources directory for MOC references in frontmatter
- Calculates trending scores based on activity and backlinks
- Caching: 1-minute TTL (same as ActivityData)

**FrontmatterParser** (`src/services/FrontmatterParser.ts`):
- Utility for parsing YAML frontmatter
- Extracts wikilinks and MOC category prefixes
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with MOC trending info

Document new MOC trending feature and components.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Final Build and Verification

**Files:**
- None (verification phase)

**Step 1: Clean build**

```bash
npm run build
```

Expected: Build succeeds with no errors or warnings

**Step 2: Verify all files are tracked**

```bash
git status
```

Expected: No untracked files related to the feature

**Step 3: Review commit history**

```bash
git log --oneline feature/moc-trending-widget
```

Expected: Clean, descriptive commit messages for each step

**Step 4: Push branch**

```bash
git push -u origin feature/moc-trending-widget
```

Expected: Branch pushed successfully

---

## Success Criteria

- [ ] Widget displays trending MOCs for what/where/who categories
- [ ] Scores accurately reflect recent activity and new backlinks
- [ ] Interactive elements (clicks, hovers) work correctly
- [ ] Settings allow customization of time window, max MOCs, and paths
- [ ] Performance is comparable to existing widgets (cached, fast updates)
- [ ] Widget integrates seamlessly with existing dashboard
- [ ] All TypeScript compiles without errors
- [ ] Code follows existing patterns and conventions

## Next Steps After Implementation

1. Use **superpowers:finishing-a-development-branch** to decide: merge, PR, or cleanup
2. Test with real vault data
3. Gather user feedback
4. Consider future enhancements from design doc
