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
