# Pre-Commit Checks

This project is configured to automatically check for code quality issues before commits.

## Official Obsidian ESLint Plugin ✅

We use the [official Obsidian ESLint plugin](https://github.com/obsidianmd/eslint-plugin) with:
- **ESLint 9** with flat config format (`eslint.config.mjs`)
- **30+ Obsidian-specific rules** including sentence-case enforcement
- **TypeScript rules** to catch async/promise errors

## What Gets Checked (Automatically)

### 1. TypeScript Rules (Catch ObsidianReviewBot Errors)

- **`@typescript-eslint/no-floating-promises`** - Catches promises returned in event listeners
  ```typescript
  // ❌ Bad - Promise returned where void expected
  button.addEventListener('click', async () => {
      await doSomething();
  });

  // ✅ Good - Use void operator
  button.addEventListener('click', () => {
      void doSomething();
  });
  ```

- **`@typescript-eslint/no-misused-promises`** - Catches async functions used incorrectly

- **`@typescript-eslint/require-await`** - Catches async methods without await
  ```typescript
  // ❌ Bad - Async but no await
  async update(): Promise<void> {
      this.data = getData();
  }

  // ✅ Good - Has await expression
  async update(): Promise<void> {
      this.data = await fetchData();
  }
  ```

- **`@typescript-eslint/no-explicit-any`** - No `any` types allowed
- **`@typescript-eslint/no-unused-vars`** - No unused imports/variables

### 2. Obsidian Plugin Rules (30+ Rules!)

**UI/Sentence Case** (Most Important):
- **`obsidianmd/ui/sentence-case`** - Automatically enforces AND auto-fixes sentence case! 🔧
  ```typescript
  // ❌ Bad - Will be caught by linter
  .setName('temperature unit')       // First word not capitalized
  .setName('Temperature Unit')       // Title case
  .setDesc('display temperature...') // First word not capitalized

  // ✅ Good - Passes linting
  .setName('Temperature unit')
  .setDesc('Display temperature in celsius or fahrenheit')

  // Auto-fix with: npm run lint:fix
  ```

**Command Best Practices**:
- `no-command-in-command-id` - Don't use "command" in command IDs
- `no-command-in-command-name` - Don't use "command" in command names
- `no-default-hotkeys` - Don't set default hotkeys (let users configure)

**Settings Tab**:
- `no-manual-html-headings` - Use `setHeading()` instead of HTML
- `no-problematic-settings-headings` - Proper heading structure

**Performance & Memory**:
- `no-view-references-in-plugin` - Don't store view references
- `no-plugin-as-component` - Don't pass plugin to MarkdownRenderer

**File Operations**:
- `prefer-file-manager-trash-file` - Use FileManager instead of Vault methods

**Type Safety**:
- `no-tfile-tfolder-cast` - Use instanceof instead of casting

**And 15+ more rules!** See full list in `eslint.config.mjs`

### 3. TypeScript Type Checking
Runs `tsc -noEmit -skipLibCheck` to catch type errors

## What You DON'T Need to Check Manually

✅ **Sentence case** - Now automated! The `obsidianmd/ui/sentence-case` rule catches all issues
✅ **Async/await errors** - TypeScript rules catch these
✅ **Promise handling** - TypeScript rules catch these
✅ **Type safety** - TypeScript + ESLint catch these

The only thing you might need to check manually is if you use very unusual UI patterns that the rule might not recognize (rare).

## How It Works

### Automatic (Pre-Commit Hook)
When you run `git commit`, husky automatically runs:
1. `npm run lint` - ESLint checks
2. `npm run typecheck` - TypeScript checks

If either fails, the commit is blocked until you fix the issues.

### Manual Commands

```bash
# Run linting only
npm run lint

# Auto-fix lint issues where possible
npm run lint:fix

# Run TypeScript type checking
npm run typecheck

# Full build (lint + typecheck + bundle)
npm run build
```

## Bypassing Pre-Commit Checks

**Not recommended**, but if absolutely necessary:
```bash
git commit --no-verify -m "message"
```

## Troubleshooting

### Hook not running?
Make sure husky is installed:
```bash
npm install
```

### Want to test the hook manually?
```bash
.husky/pre-commit
```

### Disable hooks temporarily?
```bash
git config core.hooksPath /dev/null  # Disable
git config --unset core.hooksPath    # Re-enable
```
