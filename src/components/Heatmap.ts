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
        const labelOffset = 30; // Space for day labels on the left
        const monthLabelHeight = 20; // Space for month labels on top
        const weeks = Math.ceil(data.length / 7);
        const gridWidth = weeks * (this.options.cellSize + this.options.cellGap);
        const gridHeight = 7 * (this.options.cellSize + this.options.cellGap);
        const width = gridWidth + labelOffset;
        const height = gridHeight + monthLabelHeight;

        // Create SVG
        const svg = containerEl.createSvg('svg', {
            attr: {
                width: width.toString(),
                height: height.toString(),
                viewBox: `0 0 ${width} ${height}`,
                preserveAspectRatio: 'xMinYMin meet',
                class: 'heatmap-svg'
            }
        });

        // Get max count for color scaling
        const maxCount = Math.max(...data.map(d => d.count));

        // Add day labels (Mon, Wed, Fri)
        const dayLabels = ['Mon', 'Wed', 'Fri'];
        const dayIndices = [0, 2, 4]; // Monday, Wednesday, Friday

        dayIndices.forEach((dayIndex, i) => {
            const y = dayIndex * (this.options.cellSize + this.options.cellGap) + monthLabelHeight + (this.options.cellSize / 2);
            svg.createSvg('text', {
                attr: {
                    x: '0',
                    y: y.toString(),
                    class: 'heatmap-day-label',
                    'text-anchor': 'start',
                    'dominant-baseline': 'middle'
                }
            }).textContent = dayLabels[i];
        });

        // Track month boundaries for labels
        let lastMonth = -1;
        const monthPositions: { month: string; x: number }[] = [];

        // Render cells and track month changes
        data.forEach((cell, index) => {
            const week = Math.floor(index / 7);
            const day = index % 7;

            const x = week * (this.options.cellSize + this.options.cellGap) + labelOffset;
            const y = day * (this.options.cellSize + this.options.cellGap) + monthLabelHeight;

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
                rect.addClass('heatmap-cell-clickable');
            }

            // Track month changes (only on first day of week to avoid duplicate labels)
            if (day === 0) {
                const date = new Date(cell.date);
                const month = date.getMonth();
                if (month !== lastMonth) {
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    monthPositions.push({ month: monthNames[month], x });
                    lastMonth = month;
                }
            }
        });

        // Add month labels
        monthPositions.forEach(({ month, x }) => {
            svg.createSvg('text', {
                attr: {
                    x: x.toString(),
                    y: '12',
                    class: 'heatmap-month-label',
                    'text-anchor': 'start'
                }
            }).textContent = month;
        });
    }

    private getColorLevel(count: number, max: number): number {
        if (count === 0) return 0;

        // Use absolute thresholds for better visibility
        // This makes typical daily activity (1-10 notes) more visible
        if (count >= 50) return 4;
        if (count >= 20) return 3;
        if (count >= 5) return 2;
        return 1; // 1-4 notes
    }
}
