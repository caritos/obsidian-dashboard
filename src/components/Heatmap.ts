export interface HeatmapCell {
    date: string;
    count: number;
}

export interface HeatmapOptions {
    cellSize: number;
    cellGap: number;
    colorLevels: number;
}

export class HeatmapRenderer {
    private options: HeatmapOptions;

    constructor(options: Partial<HeatmapOptions> = {}) {
        this.options = {
            cellSize: options.cellSize || 10,
            cellGap: options.cellGap || 2,
            colorLevels: options.colorLevels || 4
        };
    }

    render(containerEl: HTMLElement, data: HeatmapCell[], onCellClick?: (date: string) => void) {
        containerEl.empty();

        if (data.length === 0) {
            containerEl.createEl('p', { text: 'No activity data available' });
            return;
        }

        // Calculate grid dimensions
        const weeks = Math.ceil(data.length / 7);
        const width = weeks * (this.options.cellSize + this.options.cellGap);
        const height = 7 * (this.options.cellSize + this.options.cellGap);

        // Create SVG
        const svg = containerEl.createSvg('svg', {
            attr: {
                width: width.toString(),
                height: height.toString(),
                class: 'heatmap-svg'
            }
        });

        // Get max count for color scaling
        const maxCount = Math.max(...data.map(d => d.count));

        // Render cells
        data.forEach((cell, index) => {
            const week = Math.floor(index / 7);
            const day = index % 7;

            const x = week * (this.options.cellSize + this.options.cellGap);
            const y = day * (this.options.cellSize + this.options.cellGap);

            const level = this.getColorLevel(cell.count, maxCount);

            const rect = svg.createSvg('rect', {
                attr: {
                    x: x.toString(),
                    y: y.toString(),
                    width: this.options.cellSize.toString(),
                    height: this.options.cellSize.toString(),
                    class: `heatmap-cell heatmap-level-${level}`,
                    'data-date': cell.date,
                    'data-count': cell.count.toString(),
                    'role': 'button',
                    'aria-label': `${cell.date}: ${cell.count} notes`,
                    'tabindex': '0'
                }
            });

            // Add tooltip
            rect.setAttribute('title', `${cell.date}: ${cell.count} notes`);

            // Add click handler
            if (onCellClick) {
                rect.addEventListener('click', () => onCellClick(cell.date));
                rect.style.cursor = 'pointer';
            }
        });
    }

    private getColorLevel(count: number, max: number): number {
        if (count === 0) return 0;
        if (max === 0) return 0;

        const percentage = count / max;
        if (percentage <= 0.25) return 1;
        if (percentage <= 0.50) return 2;
        if (percentage <= 0.75) return 3;
        return 4;
    }
}
