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
            const createdSection = contentEl.createEl('div', { cls: 'note-list-section' });
            createdSection.createEl('h3', { text: `Created (${this.data.created.length})` });

            const createdList = createdSection.createEl('ul', { cls: 'note-list' });
            for (const file of this.data.created) {
                const li = createdList.createEl('li');
                const link = li.createEl('a', {
                    text: file.basename,
                    cls: 'note-link'
                });
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.app.workspace.openLinkText(file.path, '', false);
                    this.close();
                });
            }
        }

        // Modified section
        if (this.data.modified.length > 0) {
            const modifiedSection = contentEl.createEl('div', { cls: 'note-list-section' });
            modifiedSection.createEl('h3', { text: `Modified (${this.data.modified.length})` });

            const modifiedList = modifiedSection.createEl('ul', { cls: 'note-list' });
            for (const file of this.data.modified) {
                const li = modifiedList.createEl('li');
                const link = li.createEl('a', {
                    text: file.basename,
                    cls: 'note-link'
                });
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.app.workspace.openLinkText(file.path, '', false);
                    this.close();
                });
            }
        }

        // No activity message
        if (this.data.created.length === 0 && this.data.modified.length === 0) {
            contentEl.createEl('p', { text: 'No activity on this date.' });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
