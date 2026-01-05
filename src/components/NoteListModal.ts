import { App, Modal, TFile } from 'obsidian';

interface NoteListData {
    date: string;
    created: TFile[];
    modified: TFile[];
}

export class NoteListModal extends Modal {
    private data: NoteListData;

    constructor(app: App, data: NoteListData) {
        super(app);
        this.data = data;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        contentEl.createEl('h2', { text: `Notes for ${this.data.date}` });

        // Created section
        if (this.data.created.length > 0) {
            this.renderNoteSection(contentEl, 'Created', this.data.created);
        }

        // Modified section
        if (this.data.modified.length > 0) {
            this.renderNoteSection(contentEl, 'Modified', this.data.modified);
        }

        // No activity message
        if (this.data.created.length === 0 && this.data.modified.length === 0) {
            contentEl.createEl('p', { text: 'No activity on this date.' });
        }
    }

    private renderNoteSection(containerEl: HTMLElement, title: string, files: TFile[]) {
        const section = containerEl.createEl('div', { cls: 'note-list-section' });
        section.createEl('h3', { text: `${title} (${files.length})` });

        const list = section.createEl('ul', { cls: 'note-list' });
        for (const file of files) {
            const li = list.createEl('li');
            const link = li.createEl('a', {
                text: file.basename,
                cls: 'note-link'
            });
            link.addEventListener('click', (e) => {
                e.preventDefault();
                void this.app.workspace.openLinkText(file.path, '', false);
                this.close();
            });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
