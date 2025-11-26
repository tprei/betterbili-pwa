/**
 * ASS Subtitle Parser for Browser
 * Parses .ASS subtitle files and extracts multi-language tracks for real-time rendering
 */

/**
 * Style definition interface
 */
export interface ASSStyle {
    Name: string;
    Fontname?: string;
    Fontsize?: string;
    PrimaryColour?: string;
    SecondaryColour?: string;
    OutlineColour?: string;
    BackColour?: string;
    Bold?: string;
    Italic?: string;
    Underline?: string;
    StrikeOut?: string;
    ScaleX?: string;
    ScaleY?: string;
    Spacing?: string;
    Angle?: string;
    BorderStyle?: string;
    Outline?: string;
    Shadow?: string;
    Alignment?: string;
    MarginL?: string;
    MarginR?: string;
    MarginV?: string;
    Encoding?: string;
    cssColor?: string;
    cssFontSize?: string;
}

/**
 * Subtitle event interface
 */
export interface ASSEvent {
    Layer?: string;
    Start?: string;
    End?: string;
    Style?: string;
    Name?: string;
    MarginL?: string;
    MarginR?: string;
    MarginV?: string;
    Effect?: string;
    Text?: string;
    startTime: number | null;
    endTime: number | null;
    cleanText?: string;
    htmlText?: string;
}

/**
 * Script info interface
 */
export interface ScriptInfo {
    [key: string]: string;
}

/**
 * Parser statistics interface
 */
export interface ParserStats {
    totalEvents: number;
    languages: string[];
    languageCount: number;
    duration: number;
    parsed: boolean;
}

/**
 * Grouped subtitles interface
 */
export interface GroupedSubtitles {
    [styleName: string]: ASSEvent[];
}

/**
 * ASS Parser class for parsing subtitle files
 */
class ASSParser {
    private styles = new Map<string, ASSStyle>();
    private events: ASSEvent[] = [];
    private scriptInfo: ScriptInfo = {};
    private parsed = false;

    /**
     * Parse ASS subtitle content
     * @param assContent - Raw .ASS file content
     * @returns Success status
     */
    parse(assContent: string): boolean {
        try {
            this.reset();
            const lines = assContent.split('\n').map(line => line.trim());

            let currentSection: string | null = null;
            let styleFormat: string[] | null = null;
            let eventFormat: string[] | null = null;
            const defaultEventFormat = ['Layer', 'Start', 'End', 'Style', 'Name', 'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'];

            for (const line of lines) {
                // Skip empty lines and comments
                if (!line || line.startsWith(';') || line.startsWith('!')) {
                    continue;
                }

                // Section headers
                if (line.startsWith('[') && line.endsWith(']')) {
                    currentSection = line.slice(1, -1).toLowerCase();
                    continue;
                }

                // Parse based on current section
                switch (currentSection) {
                    case 'script info':
                        this.parseScriptInfo(line);
                        break;
                    case 'v4+ styles':
                        if (/^format:/i.test(line)) {
                            styleFormat = this.parseFormat(line);
                        } else if (/^style:/i.test(line) && styleFormat) {
                            this.parseStyle(line, styleFormat);
                        }
                        break;
                    case 'events':
                        if (/^format:/i.test(line)) {
                            eventFormat = this.parseFormat(line);
                        } else if (/^dialogue:/i.test(line)) {
                            this.parseEvent(line, eventFormat || defaultEventFormat);
                        }
                        break;
                }
            }

            // Sort events by start time for efficient lookup
            this.events.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
            this.parsed = true;

            return true;

        } catch (error) {
            console.error('ASS Parser Error:', error);
            return false;
        }
    }

    /**
     * Reset parser state
     */
    reset(): void {
        this.styles.clear();
        this.events = [];
        this.scriptInfo = {};
        this.parsed = false;
    }

    /**
     * Parse script info line
     */
    private parseScriptInfo(line: string): void {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            this.scriptInfo[key] = value;
        }
    }

    /**
     * Parse format line (for styles or events)
     */
    private parseFormat(line: string): string[] {
        const formatPart = line.split(':', 2)[1];
        if (!formatPart) return [];
        return formatPart.split(',').map(field => field.trim());
    }

    /**
     * Parse style definition
     */
    private parseStyle(line: string, format: string[]): void {
        // Match "Style:" with any amount of spaces, any casing
        const match = line.match(/^Style\s*:\s*(.*)$/i);
        if (!match) return;

        const stylePart = match[1]; // everything after "Style:"
        const values = stylePart.split(',');

        const style: Partial<ASSStyle> = {};
        for (let i = 0; i < format.length && i < values.length; i++) {
            const formatKey = format[i];
            if (formatKey && values[i] !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (style as any)[formatKey] = values[i]!.trim();
            }
        }

        if (style.Name) {
            if (style.PrimaryColour) {
                style.cssColor = this.assColorToCSS(style.PrimaryColour);
            }
            if (style.Fontsize) {
                style.cssFontSize = `${style.Fontsize}px`;
            }
            this.styles.set(style.Name, style as ASSStyle);
        }
    }

    /**
     * Parse dialogue event
     */
    private parseEvent(line: string, format: string[]): void {
        // Match "Dialogue:" with flexible spacing/casing
        const match = line.match(/^Dialogue\s*:\s*(.*)$/i);
        if (!match) return;

        const eventPart = match[1]; // everything after "Dialogue:"

        // Robust split: keep commas inside the last field (Text)
        const values: string[] = [];
        if (format && format.length > 0) {
            const wanted = format.length;
            const raw = eventPart.split(',');
            if (raw.length >= wanted) {
                for (let i = 0; i < wanted - 1; i++) {
                    values.push(raw[i]!);
                }
                values.push(raw.slice(wanted - 1).join(',')); // rest is Text
            } else {
                for (let i = 0; i < raw.length; i++) values.push(raw[i]!);
            }
        }

        const event: Partial<ASSEvent> = {};
        for (let i = 0; i < format.length && i < values.length; i++) {
            const formatKey = format[i];
            if (formatKey && values[i] !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (event as any)[formatKey] = values[i]!.trim();
            }
        }

        // Flexible field accessor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getField = (obj: any, key: string, aliases: string[] = []): string | undefined => {
            if (obj[key] !== undefined) return obj[key];
            const lower = key.toLowerCase();
            const upper = key.toUpperCase();
            if (obj[lower] !== undefined) return obj[lower];
            if (obj[upper] !== undefined) return obj[upper];
            for (const a of aliases) {
                if (obj[a] !== undefined) return obj[a];
                const al = a.toLowerCase();
                const au = a.toUpperCase();
                if (obj[al] !== undefined) return obj[al];
                if (obj[au] !== undefined) return obj[au];
            }
            return undefined;
        };

        const startStr = getField(event, 'Start');
        const endStr = getField(event, 'End');
        const textStr = getField(event, 'Text');

        if (startStr && endStr) {
            event.startTime = this.parseTimestamp(startStr);
            event.endTime = this.parseTimestamp(endStr);

            if (textStr !== undefined) {
                event.cleanText = this.cleanText(textStr);
                event.htmlText = this.formatText(textStr);
            }

            if (event.startTime !== null && event.endTime !== null && event.cleanText) {
                this.events.push(event as ASSEvent);
            }
        }
    }

    /**
     * Parse ASS timestamp to seconds
     * Supports: H:MM:SS, H:MM:SS.xx, MM:SS, MM:SS.xx
     * Allows both . and , as decimal separators
     */
    private parseTimestamp(timestamp: string): number | null {
        try {
            // Allow optional hours, flexible decimal separator
            const match = timestamp.match(
                /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/
            );
            if (!match) return null;

            const [, hours, minutes, seconds, fraction] = match;
            const h = hours ? parseInt(hours) : 0;
            const m = parseInt(minutes!);
            const s = parseInt(seconds!);

            let fracSeconds = 0;
            if (fraction) {
                const frac = String(fraction);
                if (frac.length === 3) fracSeconds = parseInt(frac) / 1000;
                else if (frac.length === 2) fracSeconds = parseInt(frac) / 100;
                else if (frac.length === 1) fracSeconds = parseInt(frac) / 10;
            }

            return h * 3600 + m * 60 + s + fracSeconds;
        } catch {
            return null;
        }
    }

    /**
     * Convert ASS color (&HAABBGGRR) to CSS color
     */
    private assColorToCSS(assColor: string): string {
        try {
            // Remove &H prefix and extract RGB components
            const hex = assColor.replace(/^&H/, '');
            if (hex.length >= 6) {
                const b = hex.slice(0, 2);
                const g = hex.slice(2, 4);
                const r = hex.slice(4, 6);
                return `#${r}${g}${b}`;
            }
            return '#ffffff'; // Default white
        } catch {
            return '#ffffff';
        }
    }

    /**
     * Clean text content by removing ASS tags
     */
    private cleanText(text: string): string {
        return text
            .replace(/\{[^}]*\}/g, '') // Remove ASS override tags
            .replace(/\\N/g, '\n')     // Convert line breaks
            .replace(/\\n/g, '\n')     // Alternative line breaks
            .trim();
    }

    /**
     * Format text for HTML display, preserving some styling
     */
    private formatText(text: string): string {
        let html = text;

        // Handle color tags
        html = html.replace(/\{\\c&H([0-9A-Fa-f]{6,8})\}/g, (_, color) => {
            const cssColor = this.assColorToCSS(`&H${color}`);
            return `<span style="color: ${cssColor};">`;
        });

        // Handle color reset
        html = html.replace(/\{\\c\}/g, '</span>');

        // Handle line breaks
        html = html.replace(/\\N/g, '<br>');
        html = html.replace(/\\n/g, '<br>');

        // Remove other ASS tags for now
        html = html.replace(/\{[^}]*\}/g, '');

        return html;
    }

    /**
     * Get active subtitles for a given time
     * @param currentTime - Current video time in seconds
     * @returns Array of active subtitle events
     */
    getActiveSubtitles(currentTime: number): ASSEvent[] {
        if (!this.parsed) return [];

        return this.events.filter(event =>
            currentTime >= (event.startTime || 0) && currentTime <= (event.endTime || 0)
        );
    }

    /**
     * Get subtitles grouped by style/language
     * @param currentTime - Current video time in seconds
     * @returns Subtitles grouped by style name
     */
    getActiveSubtitlesByStyle(currentTime: number): GroupedSubtitles {
        const activeSubtitles = this.getActiveSubtitles(currentTime);
        const grouped: GroupedSubtitles = {};

        for (const subtitle of activeSubtitles) {
            const styleName = subtitle.Style || 'Default';
            if (!grouped[styleName]) {
                grouped[styleName] = [];
            }
            grouped[styleName].push(subtitle);
        }

        return grouped;
    }

    /**
     * Get all available styles/languages
     * @returns Array of style names
     */
    getAvailableStyles(): string[] {
        return Array.from(this.styles.keys());
    }

    /**
     * Get style information
     * @param styleName - Name of the style
     * @returns Style object or null if not found
     */
    getStyle(styleName: string): ASSStyle | null {
        return this.styles.get(styleName) || null;
    }

    /**
     * Check if parser has valid subtitle data
     * @returns True if subtitles are loaded and ready
     */
    isReady(): boolean {
        return this.parsed && this.events.length > 0;
    }

    /**
     * Get parser statistics
     * @returns Statistics about loaded subtitles
     */
    getStats(): ParserStats {
        const languages = this.getAvailableStyles();
        const duration = this.events.length > 0 ?
            Math.max(...this.events.map(e => e.endTime || 0)) : 0;

        return {
            totalEvents: this.events.length,
            languages: languages,
            languageCount: languages.length,
            duration: duration,
            parsed: this.parsed
        };
    }
    /**
     * Deduplicate events that start at the same time
     */
    private dedupeEventsByStart(events: ASSEvent[]): ASSEvent[] {
        const result: ASSEvent[] = [];
        let lastStart: number | null = null;
        for (const event of events) {
            const start = event.startTime;
            if (start === null || !Number.isFinite(start)) continue;

            if (lastStart !== null && Math.abs(start - lastStart) < 1e-3) {
                continue;
            }
            result.push(event);
            lastStart = start;
        }
        return result;
    }

    /**
     * Normalize event text for comparison
     */
    private normalizeEventText(event: ASSEvent): string {
        if (!event) return '';
        const text = event.cleanText || '';
        return text.replace(/\s+/g, ' ').trim().toLowerCase();
    }

    /**
     * Merge adjacent events with same text
     */
    private mergeAdjacentDuplicateEvents(events: ASSEvent[]): ASSEvent[] {
        if (!events.length) return [];

        const merged: ASSEvent[] = [];
        const duplicateMergeWindowSeconds = 0.18;

        for (const event of events) {
            const normalizedText = this.normalizeEventText(event);
            if (!normalizedText) continue;

            const clone = { ...event };
            const start = clone.startTime;
            const end = clone.endTime;

            if (start === null || end === null || end <= start) continue;

            const last = merged[merged.length - 1];
            if (last) {
                const lastText = this.normalizeEventText(last);
                const lastEnd = last.endTime || 0;
                const gap = start - lastEnd;
                const overlaps = start <= lastEnd;

                if (lastText && lastText === normalizedText && (overlaps || (gap >= 0 && gap <= duplicateMergeWindowSeconds))) {
                    const extendedEnd = Math.max(lastEnd, end);
                    last.endTime = extendedEnd;
                    continue;
                }
            }

            merged.push(clone);
        }

        return merged;
    }

    /**
     * Helper to find the "Main" track (usually Mandarin/Chinese)
     */
    private resolvePreferredStyle(): string | null {
        const styles = this.getAvailableStyles();
        if (!styles.length) return null;

        // Priority list for the "Main" timeline track
        const preferredOrder = ['Mandarin', 'Chinese', 'Mandarin Simplified', 'Chinese Simplified', 'CHS', 'Default'];

        for (const candidate of preferredOrder) {
            const match = styles.find(style => style.toLowerCase() === candidate.toLowerCase());
            if (match) return match;
        }

        return styles[0];
    }

    /**
     * Get processed events for navigation (deduped and merged)
     * Filters by style BEFORE merging to prevent track interference
     */
    getNavigableEvents(requestedStyle?: string): ASSEvent[] {
        if (!this.parsed) return [];

        const targetStyle = requestedStyle || this.resolvePreferredStyle();

        // 1. Filter raw events by the specific style first
        let filteredEvents = this.events;
        if (targetStyle) {
            filteredEvents = this.events.filter(e => e.Style === targetStyle);
        }

        // 2. Filter out empty text
        const validEvents = filteredEvents.filter(e => e.cleanText);

        // 3. Dedupe by start time (removes accidental double-layers in the same track)
        const deduped = this.dedupeEventsByStart(validEvents);

        // 4. Merge split segments (e.g. "Hello..." + "...World" -> "Hello... ...World")
        return this.mergeAdjacentDuplicateEvents(deduped);
    }

    /**
     * Get the start time of the next dialogue event relative to current time
     * Uses merged events to avoid micro-segment jumps
     * @param currentTime - Current video time in seconds
     * @returns Start time of next event or null if none
     */
    getNextEventTime(currentTime: number): number | null {
        const events = this.getNavigableEvents();
        if (events.length === 0) return null;

        const buffer = 0.05;
        const nextEvent = events.find(e => (e.startTime || 0) > currentTime + buffer);

        return nextEvent ? nextEvent.startTime : null;
    }

    /**
     * Get the start time of the previous dialogue event relative to current time
     * Uses merged events to avoid micro-segment jumps
     * @param currentTime - Current video time in seconds
     * @returns Start time of previous event or null if none
     */
    getPrevEventTime(currentTime: number): number | null {
        const events = this.getNavigableEvents();
        if (events.length === 0) return null;

        const buffer = 0.05;

        // Iterate backwards
        for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            if ((event.startTime || 0) < currentTime - buffer) {
                return event.startTime;
            }
        }

        return null;
    }

    /**
     * Get all parsed events
     * @returns Array of all ASSEvents
     */
    getEvents(): ASSEvent[] {
        return this.events;
    }
}

export default ASSParser;
export { ASSParser };
