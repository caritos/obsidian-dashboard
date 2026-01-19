# Design: Add "When (@)" Category to MOC Trending

**Date:** 2026-01-19
**Status:** Approved

## Overview

Add "when (@)" as a fourth MOC category to the Trending MOCs widget, allowing time-based organization alongside the existing what/where/who categories.

## Background

The MOC system currently supports three categories:
- **What (%)** - Topics/subjects
- **Where (+)** - Locations
- **Who (~)** - People

Users already have a `moc/when (@)/` directory structure for time period MOCs and use templates that include `when: [[%2026]]` style frontmatter references.

## Goals

- Add "when (@)" as a fourth category in the trending widget
- Support time period MOCs (e.g., `@2026`, `@2024-q1`, `@week-3`)
- Display order: What → Where → Who → When
- Use 📅 calendar icon for visual representation

## Design

### 1. Type System Changes

**File:** `src/services/MocTypes.ts`

Update the `MocCategory` type definition:
```typescript
export type MocCategory = 'what' | 'where' | 'who' | 'when';
```

This change propagates automatically through all code using `MocCategory`.

### 2. Data Collection Updates

**File:** `src/services/MocDataCollector.ts`

**Change 1 - Scan "when" frontmatter field** (line 37):
```typescript
const categories: MocCategory[] = ['what', 'where', 'who', 'when'];
```

**Change 2 - Add "when" to fields array** (line 104-108):
```typescript
const fields: { field: string; category: MocCategory }[] = [
    { field: 'who', category: 'who' },
    { field: 'what', category: 'what' },
    { field: 'where', category: 'where' },
    { field: 'when', category: 'when' }
];
```

**Change 3 - Add "when" directory mapping** (line 205-212):
```typescript
const categoryDirMap = {
    'what': 'what (%)',
    'where': 'where (+)',
    'who': 'who (~)',
    'when': 'when (@)'
};

const prefix = category === 'what' ? '%' :
               category === 'where' ? '+' :
               category === 'who' ? '~' : '@';
```

### 3. Widget Rendering Updates

**File:** `src/widgets/MocTrendingWidget.ts`

Add fourth category rendering call (after line 55):
```typescript
this.renderCategory(content, 'what', '📋 What (%)', trendingData.get('what') || []);
this.renderCategory(content, 'where', '📍 Where (+)', trendingData.get('where') || []);
this.renderCategory(content, 'who', '👤 Who (~)', trendingData.get('who') || []);
this.renderCategory(content, 'when', '📅 When (@)', trendingData.get('when') || []);
```

No other widget changes needed - existing `renderCategory()` and `renderMocItem()` methods are already generic.

## File Structure

MOC files expected at:
```
<mocBasePath>/when (@)/@<time-period>.md
```

Examples:
- `moc/when (@)/@2026.md`
- `moc/when (@)/@2024-q1.md`
- `moc/when (@)/@week-3.md`

## Implementation Notes

### Why This Works

The existing architecture is already designed for extensibility:
- `FrontmatterParser.stripMocPrefix()` already handles `@` prefix (line 34)
- `FrontmatterParser.getMocCategory()` already recognizes `@` as "when" (line 45)
- Category-agnostic rendering methods work with any category
- Score calculation and trending logic are category-independent

### Changes Required

Minimal changes needed:
1. Type definition: 1 line
2. Data collector: 3 small updates
3. Widget: 1 renderCategory() call

Total: ~5 lines of code changes

## Testing Checklist

- [ ] Verify "when" MOCs appear in trending widget
- [ ] Verify clicking on "when" MOC name opens MOC file
- [ ] Verify activity count shows recently active notes
- [ ] Verify new backlinks count shows new notes
- [ ] Verify clicking metrics opens modal with note list
- [ ] Verify missing MOC files show "missing" indicator
- [ ] Verify trending scores calculated correctly for "when" category

## Future Considerations

- None - this is a straightforward extension of existing functionality
