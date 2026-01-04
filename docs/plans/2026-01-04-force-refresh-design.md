# Force Refresh Dashboard Design

**Date:** 2026-01-04
**Feature:** Command palette force refresh that bypasses DataCollector cache

## Problem

The dashboard uses a 1-minute cache in `DataCollector` to avoid rescanning the vault on every widget update. Users need a way to force an immediate refresh that bypasses this cache to see the latest vault changes.

## Current Architecture Issues

Each widget creates its own `DataCollector` instance:
- **ActivityHeatmapWidget**: `new DataCollector(this.vault)` in constructor
- **StatsWidget**: `new DataCollector(this.vault)` in constructor

This means:
- Multiple caches for the same data
- Vault scanned multiple times (inefficient)
- No way to invalidate all caches at once

## Proposed Solution

### 1. Shared DataCollector Architecture

**Create single DataCollector instance:**
- Initialize in `DashboardPlugin.onload()` alongside `WidgetRegistry`
- Pass to widgets through registry factory functions
- Widgets receive DataCollector instead of creating their own

**Benefits:**
- Single cache for all widgets
- Vault scanned only once
- Simple coordinated cache invalidation
- Better resource efficiency

**Changes Required:**
- `DashboardPlugin`: Create and store `DataCollector` instance
- Widget factories: Pass `DataCollector` to widget constructors
- `ActivityHeatmapWidget`: Accept `DataCollector` in constructor, remove instantiation
- `StatsWidget`: Accept `DataCollector` in constructor, remove instantiation
- `Widget` base class: Accept `DataCollector` in constructor signature

### 2. Force Refresh Command

**Command:**
```typescript
this.addCommand({
    id: 'force-refresh-dashboard',
    name: 'Force refresh dashboard',
    checkCallback: (checking: boolean) => {
        const dashboardView = this.getDashboardView();
        if (dashboardView) {
            if (!checking) {
                this.dataCollector.invalidateCache();
                dashboardView.refresh();
            }
            return true;
        }
        return false;
    }
});
```

**Behavior:**
- Only available when dashboard is open (uses `checkCallback`)
- Invalidates cache via `dataCollector.invalidateCache()`
- Triggers widget refresh via `dashboardView.refresh()`

**Helper Method:**
```typescript
getDashboardView(): DashboardView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);
    if (leaves.length > 0) {
        return leaves[0].view as DashboardView;
    }
    return null;
}
```

## Implementation Steps

1. Add `DataCollector` instance to `DashboardPlugin`
2. Update `Widget` base class constructor to accept `DataCollector`
3. Update `ActivityHeatmapWidget` to receive `DataCollector` instead of creating it
4. Update `StatsWidget` to receive `DataCollector` instead of creating it
5. Update widget factory functions in `main.ts` to pass `DataCollector`
6. Add `getDashboardView()` helper method to `DashboardPlugin`
7. Register force refresh command in `DashboardPlugin.onload()`

## Testing

- Open dashboard, wait 1+ minute, create a note, run force refresh → should show new note immediately
- Run force refresh command when dashboard is closed → command should not appear
- Run force refresh with multiple widgets enabled → all widgets should update
