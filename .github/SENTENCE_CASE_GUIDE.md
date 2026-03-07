# Sentence Case Guide for UI Text

✅ **Automated**: ESLint now automatically enforces sentence case via the `obsidianmd/ui/sentence-case` rule!

This guide provides examples for understanding what the rule checks.

## What is Sentence Case?

**Sentence case**: First word capitalized, rest lowercase (except proper nouns, acronyms, technical terms)

```
✅ Temperature unit
❌ temperature unit   (first word must be capitalized)
❌ Temperature Unit   (don't title case)
```

## Where to Check

### 1. Setting Names (`.setName()`)
```typescript
// ✅ Correct
.setName('Temperature unit')
.setName('Location file path')
.setName('Refresh interval')

// ❌ Wrong
.setName('temperature unit')       // First word not capitalized
.setName('Temperature Unit')       // Title case
.setName('location File Path')     // Random capitalization
```

### 2. Setting Descriptions (`.setDesc()`)
```typescript
// ✅ Correct
.setDesc('Display temperature in celsius or fahrenheit')
.setDesc('Path to Markdown file with location coordinates')
.setDesc('How often to refresh the photo (in seconds)')

// ❌ Wrong
.setDesc('display temperature...')           // First word not capitalized
.setDesc('Display Temperature In Celsius')   // Title case
.setDesc('Path to markdown file...')         // 'Markdown' is proper noun
```

### 3. Dropdown Options (`.addOption()`)
The **second parameter** (display label) must use sentence case:

```typescript
// ✅ Correct
.addOption('celsius', 'Celsius (°C)')
.addOption('fahrenheit', 'Fahrenheit (°F)')
.addOption('kmh', 'Kilometers per hour (km/h)')
.addOption('mph', 'Miles per hour (mph)')

// ❌ Wrong
.addOption('celsius', 'celsius (°C)')              // First word not capitalized
.addOption('fahrenheit', 'FAHRENHEIT (°F)')        // All caps (unless acronym)
.addOption('kmh', 'Kilometers Per Hour')           // Title case
```

### 4. Placeholders (`.setPlaceholder()`)
```typescript
// ✅ Correct
.setPlaceholder('Resources')
.setPlaceholder('Enter location name')
.setPlaceholder('600')

// ❌ Wrong
.setPlaceholder('resources')           // First word not capitalized
.setPlaceholder('Enter Location Name') // Title case
```

### 5. Widget Content Text (`.createEl()`)
```typescript
// ✅ Correct
containerEl.createEl('p', { text: 'No location set' });
containerEl.createEl('p', { text: 'Loading weather...' });
containerEl.createEl('h3', { text: 'Current conditions' });

// ❌ Wrong
containerEl.createEl('p', { text: 'no location set' });      // First word not capitalized
containerEl.createEl('p', { text: 'Loading Weather...' });   // Don't capitalize mid-sentence
containerEl.createEl('h3', { text: 'Current Conditions' });  // Title case
```

### 6. Error Messages
```typescript
// ✅ Correct
text: 'Error loading photos: file not found'
text: 'Failed to fetch weather data'
text: 'No photos found in vault'

// ❌ Wrong
text: 'error loading photos'           // First word not capitalized
text: 'Failed To Fetch Weather Data'   // Title case
```

## Special Cases

### Proper Nouns (Always Capitalized)
- Markdown
- Celsius
- Fahrenheit
- JavaScript
- TypeScript
- API
- JSON

```typescript
// ✅ Correct
.setDesc('Path to Markdown file...')
.addOption('celsius', 'Celsius (°C)')
```

### Acronyms (Keep Uppercase)
- UV (UV index)
- API (API key)
- MOC (MOC trending)
- JSON

```typescript
// ✅ Correct
.setName('UV index threshold')
.setName('API endpoint URL')
```

### Technical Placeholders (Can be lowercase)
When it's a code variable or technical placeholder:

```typescript
// ✅ Correct (technical placeholder)
.setPlaceholder('your_lat')
.setPlaceholder('filename.json')

// ✅ Correct (user-facing text)
.setPlaceholder('Resources')
.setPlaceholder('Enter your name')
```

### Mid-Sentence Units
Units of measurement are lowercase unless starting the sentence:

```typescript
// ✅ Correct
.setDesc('Display temperature in celsius or fahrenheit')
.addOption('celsius', 'Celsius (°C)')  // OK at start of option label

// ❌ Wrong
.setDesc('Display temperature in Celsius or Fahrenheit')  // Don't capitalize mid-sentence
```

## Quick Checklist

Before committing, search for these patterns and verify sentence case:

```bash
# Find all setting names
grep -r "\.setName(" src/

# Find all descriptions
grep -r "\.setDesc(" src/

# Find all dropdown options
grep -r "\.addOption(" src/

# Find all placeholders
grep -r "\.setPlaceholder(" src/

# Find all text in createEl
grep -r "text:" src/
```

## Common Mistakes

| ❌ Wrong | ✅ Correct | Rule |
|---------|-----------|------|
| `temperature unit` | `Temperature unit` | First word always capitalized |
| `Temperature Unit` | `Temperature unit` | Don't title case |
| `display temperature...` | `Display temperature...` | First word always capitalized |
| `Path to markdown file` | `Path to Markdown file` | 'Markdown' is proper noun |
| `kilometers Per Hour` | `Kilometers per hour` | Don't title case |
| `FAHRENHEIT` | `Fahrenheit` | Not an acronym |
| `no location set` | `No location set` | First word always capitalized |

## Current Configuration

The sentence-case rule is configured in `eslint.config.mjs`:

```javascript
{
  rules: {
    'obsidianmd/ui/sentence-case': ['error', {
      enforceCamelCaseLower: true
    }]
  }
}
```

You can customize it by adding brands and acronyms:

```javascript
'obsidianmd/ui/sentence-case': ['error', {
  enforceCamelCaseLower: true,
  brands: ['Markdown', 'Obsidian', 'OpenMeteo'],
  acronyms: ['UV', 'API', 'MOC', 'JSON', 'URL']
}]
```

The rule runs automatically on every `npm run lint` and before every commit via the pre-commit hook.
