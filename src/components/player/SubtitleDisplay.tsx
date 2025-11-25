import { useMemo, useRef, useState, useEffect } from 'react';
import ASSParser from '../../lib/ass-parser';
import type { ASSEvent } from '../../lib/ass-parser';
import clsx from 'clsx';

interface SubtitleDisplayProps {
    parser: ASSParser | null;
    currentTime: number;
    className?: string;
    onCharacterSelect?: (char: string) => void;
    isPaused?: boolean;
}

export default function SubtitleDisplay({ parser, currentTime, className, onCharacterSelect, isPaused }: SubtitleDisplayProps) {
    const subtitles = useMemo(() => {
        if (parser && parser.isReady()) {
            return parser.getActiveSubtitlesByStyle(currentTime);
        }
        return {};
    }, [parser, currentTime]);

    // Drag Selection State
    const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
    const isSelecting = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset selection when subtitles change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelection(null);
    }, [subtitles]);

    if (!parser || !parser.isReady()) return null;

    const handlePointerDown = (index: number) => {
        if (!isPaused || !onCharacterSelect) return;
        isSelecting.current = true;
        setSelection({ start: index, end: index });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isSelecting.current || !isPaused) return;

        // Find the element under the pointer
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target instanceof HTMLElement && target.dataset.charIndex) {
            const index = parseInt(target.dataset.charIndex, 10);
            setSelection(prev => {
                if (!prev) return { start: index, end: index };
                return { ...prev, end: index };
            });
        }
    };

    const handlePointerUp = (fullText: string) => {
        if (!isSelecting.current || !selection || !onCharacterSelect) return;
        isSelecting.current = false;

        const start = Math.min(selection.start, selection.end);
        const end = Math.max(selection.start, selection.end);
        const selectedText = fullText.substring(start, end + 1);

        onCharacterSelect(selectedText);
        // Keep selection visible? Or clear it? 
        // User might want to see what they selected. Let's keep it until they tap elsewhere or play.
        // Actually, let's clear it after a short delay or let the parent handle "X-Ray" state which might imply selection.
        // For now, we just fire the event.
    };

    const renderSubtitleLine = (styleName: string, events: ASSEvent[]) => {
        if (!events.length) return null;

        const text = events.map(e => e.cleanText).join(' ');

        let styleClass = "text-base text-zinc-300 font-medium";
        const isHanzi = styleName.toLowerCase().includes('hanzi');

        if (isHanzi) styleClass = "text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-md tracking-wide";
        if (styleName.toLowerCase().includes('pinyin')) styleClass = "text-sm md:text-base text-emerald-400 mb-1 font-mono opacity-90";
        if (styleName.toLowerCase().includes('english')) styleClass = "text-sm md:text-base text-zinc-400 italic";

        // If it's Hanzi and we are paused, split into clickable/draggable characters
        if (isHanzi && isPaused && onCharacterSelect) {
            return (
                <div
                    key={styleName}
                    className={clsx("text-center transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 touch-none select-none", styleClass)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={() => handlePointerUp(text)}
                    onPointerLeave={() => {
                        if (isSelecting.current) handlePointerUp(text);
                    }}
                >
                    {text.split('').map((char: string, i: number) => {
                        const isSelected = selection && i >= Math.min(selection.start, selection.end) && i <= Math.max(selection.start, selection.end);

                        return (
                            <span
                                key={i}
                                data-char-index={i}
                                onPointerDown={(e) => {
                                    e.currentTarget.releasePointerCapture(e.pointerId); // Allow pointer events to bubble/target other elements
                                    handlePointerDown(i);
                                }}
                                className={clsx(
                                    "cursor-pointer inline-block transition-all duration-150 p-0.5 rounded",
                                    isSelected ? "bg-emerald-500/30 text-emerald-300 scale-110" : "hover:bg-white/10 active:scale-95"
                                )}
                            >
                                {char}
                            </span>
                        );
                    })}
                </div>
            );
        }

        return (
            <div key={styleName} className={clsx("text-center transition-all duration-300 animate-in fade-in slide-in-from-bottom-1", styleClass)}>
                {text}
            </div>
        );
    };

    // Order of display: Hanzi -> Pinyin -> English
    const keys = Object.keys(subtitles);
    const hanziKey = keys.find(k => k.toLowerCase().includes('hanzi')) || keys.find(k => k.toLowerCase().includes('chinese'));
    const pinyinKey = keys.find(k => k.toLowerCase().includes('pinyin'));
    const englishKey = keys.find(k => k.toLowerCase().includes('english')) || keys.find(k => k.toLowerCase().includes('translation'));

    const otherKeys = keys.filter(k => k !== hanziKey && k !== pinyinKey && k !== englishKey);

    return (
        <div
            ref={containerRef}
            className={clsx(
                "flex flex-col items-center justify-center p-4 min-h-[100px] transition-all duration-500",
                className
            )}
        >
            {hanziKey && renderSubtitleLine(hanziKey, subtitles[hanziKey])}
            {pinyinKey && renderSubtitleLine(pinyinKey, subtitles[pinyinKey])}
            {englishKey && renderSubtitleLine(englishKey, subtitles[englishKey])}

            {otherKeys.map(key => renderSubtitleLine(key, subtitles[key]))}

            {keys.length === 0 && (
                <div className="flex flex-col items-center justify-center text-zinc-700 space-y-2 opacity-50">
                    <div className="w-8 h-0.5 bg-zinc-700/50 rounded-full" />
                    <span className="text-[10px] font-medium tracking-widest uppercase">Waiting for dialogue</span>
                </div>
            )}
        </div>
    );
}
