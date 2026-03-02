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
                void this.app.workspace.openLinkText(note.path, '', false);
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
            return `${diffDays} Days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}
