import { App, TFile } from 'obsidian';
import { Widget } from './Widget';
import { WidgetSettings } from '../types';

interface LatestNotesSettings extends WidgetSettings {
    maxNotes: number;
}

interface NoteInfo {
    file: TFile;
    title: string;
    tags: string[];
    what: string[];
    created: number;
}

export class LatestNotesWidget extends Widget {
    private app: App;
    private notes: NoteInfo[] = [];

    constructor(app: App, settings: LatestNotesSettings) {
        super(null, settings);
        this.app = app;
    }

    getId(): string {
        return 'latest-notes';
    }

    getName(): string {
        return 'Latest notes';
    }

    render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        containerEl.empty();

        // Create widget header
        const header = containerEl.createEl('div', { cls: 'widget-header' });
        header.createEl('h3', { text: this.getName() });

        // Create notes container
        const notesContainer = containerEl.createEl('div', { cls: 'latest-notes-container' });
        notesContainer.createEl('p', { text: 'Loading notes...' });
    }

    async update(): Promise<void> {
        if (!this.containerEl) return;

        const settings = this.settings as LatestNotesSettings;
        const maxNotes = settings.maxNotes || 100;

        // Get all markdown files
        const files = this.app.vault.getMarkdownFiles();

        // Sort by creation time (newest first) and take the first maxNotes
        const sortedFiles = files
            .sort((a, b) => b.stat.ctime - a.stat.ctime)
            .slice(0, maxNotes);

        // Build note info with tags and what
        this.notes = [];
        for (const file of sortedFiles) {
            const cache = this.app.metadataCache.getFileCache(file);
            const tags: string[] = [];
            const what: string[] = [];

            // Get tags from frontmatter
            if (cache?.frontmatter?.tags) {
                const frontmatterTags = cache.frontmatter.tags;
                if (Array.isArray(frontmatterTags)) {
                    tags.push(...frontmatterTags.map(tag => String(tag)));
                } else if (typeof frontmatterTags === 'string') {
                    tags.push(frontmatterTags);
                }
            }

            // Get tags from content
            if (cache?.tags) {
                for (const tag of cache.tags) {
                    if (!tags.includes(tag.tag)) {
                        tags.push(tag.tag);
                    }
                }
            }

            // Get "what" from frontmatter
            if (cache?.frontmatter?.what) {
                const frontmatterWhat = cache.frontmatter.what;
                if (Array.isArray(frontmatterWhat)) {
                    for (const item of frontmatterWhat) {
                        const itemStr = String(item);
                        // Extract content from wikilinks [[text]]
                        const match = itemStr.match(/\[\[(.+?)\]\]/);
                        if (match) {
                            // Remove % prefix if present
                            const text = match[1].startsWith('%') ? match[1].substring(1) : match[1];
                            what.push(text);
                        } else {
                            what.push(itemStr);
                        }
                    }
                } else if (typeof frontmatterWhat === 'string') {
                    const match = frontmatterWhat.match(/\[\[(.+?)\]\]/);
                    if (match) {
                        const text = match[1].startsWith('%') ? match[1].substring(1) : match[1];
                        what.push(text);
                    } else {
                        what.push(frontmatterWhat);
                    }
                }
            }

            this.notes.push({
                file,
                title: file.basename,
                tags: tags.sort(),
                what: what,
                created: file.stat.ctime
            });
        }

        // Render the notes
        this.renderNotes();
    }

    private renderNotes(): void {
        if (!this.containerEl) return;

        const notesContainer = this.containerEl.querySelector('.latest-notes-container') as HTMLElement;
        if (!notesContainer) return;

        notesContainer.empty();

        if (this.notes.length === 0) {
            notesContainer.createEl('p', {
                text: 'No notes found',
                cls: 'latest-notes-empty'
            });
            return;
        }

        // Create notes list
        const notesList = notesContainer.createEl('div', { cls: 'latest-notes-list' });

        for (const note of this.notes) {
            const noteItem = notesList.createEl('div', { cls: 'latest-note-item' });

            // Create title (clickable)
            const titleEl = noteItem.createEl('a', {
                cls: 'latest-note-title',
                text: note.title
            });

            titleEl.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.app.workspace.getLeaf(false).openFile(note.file);
            });

            // Create what container (subject matter)
            if (note.what.length > 0) {
                const whatContainer = noteItem.createEl('div', { cls: 'latest-note-what' });

                for (const subject of note.what) {
                    const subjectEl = whatContainer.createEl('span', {
                        cls: 'latest-note-what-tag',
                        text: subject
                    });

                    // Make subject tags clickable to search
                    subjectEl.addEventListener('click', () => {
                        this.app.workspace.trigger('global-search', { query: subject });
                    });
                }
            }

            // Create tags container
            if (note.tags.length > 0) {
                const tagsContainer = noteItem.createEl('div', { cls: 'latest-note-tags' });

                for (const tag of note.tags) {
                    const tagEl = tagsContainer.createEl('span', {
                        cls: 'latest-note-tag',
                        text: tag.startsWith('#') ? tag : `#${tag}`
                    });

                    // Make tags clickable to search
                    tagEl.addEventListener('click', () => {
                        const searchTag = tag.startsWith('#') ? tag : `#${tag}`;
                        this.app.workspace.trigger('global-search', { query: `tag:${searchTag}` });
                    });
                }
            }

            // Add creation date
            noteItem.createEl('div', {
                cls: 'latest-note-date',
                text: this.formatDate(note.created)
            });
        }
    }

    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        // Format as date
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}
