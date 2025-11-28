import { useMemo, useRef, useState, useEffect } from 'react';
import ASSParser from '../../lib/ass-parser';
import type { ASSEvent } from '../../lib/ass-parser';
import clsx from 'clsx';

interface SubtitleDisplayProps {
    parser: ASSParser | null;
    currentTime: number;
    className?: string;
    onCharacterSelect?: (char: string) => void;
    scale?: number;
    verticalOffset?: number;
    backgroundMode?: 'none' | 'blur' | 'opaque';
}

export default function SubtitleDisplay({
    parser,
    currentTime,
    className,
    onCharacterSelect,
    scale = 1,
    verticalOffset = 0,
    backgroundMode = 'none'
}: SubtitleDisplayProps) {
    const subtitles = useMemo(() => {
        if (parser && parser.isReady()) {
            return parser.getActiveSubtitlesByStyle(currentTime);
        }
        return {};
    }, [parser, currentTime]);

    // Drag Selection State
    const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
    const isSelecting = useRef(false);

    // Reset selection when subtitles change
    useEffect(() => {
        setSelection(null);
    }, [subtitles]);

    if (!parser || !parser.isReady()) return null;

    // 1. Pointer Down: Start Selection
    const handlePointerDown = (index: number, e: React.PointerEvent) => {
        if (!onCharacterSelect) return;
        // Prevent default to stop scrolling/selection of page
        // e.preventDefault(); 
        // Explicit capture isn't always needed if we rely on Enter events, 
        // but releasing it ensures we don't get stuck on one element if we use Enter events
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        isSelecting.current = true;
        setSelection({ start: index, end: index });
    };

    // 2. Pointer Enter: Update Selection (Works better than Move for discrete items)
    const handlePointerEnter = (index: number) => {
        if (isSelecting.current) {
            setSelection(prev => prev ? { ...prev, end: index } : null);
        }
    };

    // 3. Pointer Up: Commit Selection
    const handlePointerUp = (fullText: string) => {
        if (!isSelecting.current || !selection || !onCharacterSelect) return;
        isSelecting.current = false;

        const start = Math.min(selection.start, selection.end);
        const end = Math.max(selection.start, selection.end);
        const selectedText = fullText.substring(start, end + 1);

        onCharacterSelect(selectedText);
    };

    // ---------- STYLE TYPE DETECTION (from TEXT, not style name) ----------
    const keys = Object.keys(subtitles);

    const hasChinese = (s: string) => /[\u4e00-\u9fff]/.test(s);
    const hasPinyinTone = (s: string) =>
        /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(s) || /[a-zA-Z]+[1-4]/.test(s);

    const styleType: Record<string, 'hanzi' | 'pinyin' | 'english' | 'other'> = {};

    let hanziKey: string | undefined;
    let pinyinKey: string | undefined;
    let englishKey: string | undefined;

    for (const key of keys) {
        const sampleText = subtitles[key].map(e => e.cleanText).join(' ');
        const trimmed = sampleText.trim();
        if (!trimmed) continue;

        if (!hanziKey && hasChinese(trimmed)) {
            hanziKey = key;
            styleType[key] = 'hanzi';
            continue;
        }

        if (!pinyinKey && !hasChinese(trimmed) && hasPinyinTone(trimmed)) {
            pinyinKey = key;
            styleType[key] = 'pinyin';
            continue;
        }

        if (!englishKey && !hasChinese(trimmed)) {
            englishKey = key;
            styleType[key] = 'english';
            continue;
        }
    }

    // Any styles we didn't classify are "other"
    for (const key of keys) {
        if (!styleType[key]) styleType[key] = 'other';
    }

    const otherKeys = keys.filter(
        k => k !== hanziKey && k !== pinyinKey && k !== englishKey
    );

    // ---------- BASIC LINE RENDERER ----------
    const renderSubtitleLine = (styleName: string, events: ASSEvent[]) => {
        if (!events.length) return null;

        const text = events.map(e => e.cleanText).join(' ');
        const type = styleType[styleName] || 'other';

        let styleClass = 'text-base text-zinc-100 font-medium whitespace-nowrap';

        if (type === 'english') {
            styleClass = 'text-lg md:text-xl text-zinc-100 whitespace-normal font-medium max-w-[90vw]';
        } else if (type === 'pinyin') {
            styleClass = 'text-sm md:text-base text-zinc-100 tracking-wide whitespace-normal max-w-[90vw]';
        } else if (type === 'hanzi') {
            styleClass = 'text-3xl md:text-6xl font-bold text-white tracking-widest whitespace-normal max-w-[90vw]';
        }

        const isHanzi = type === 'hanzi';

        // If it's Hanzi, split into clickable/draggable characters
        if (isHanzi && onCharacterSelect) {
            const textForSelection = text;

            return (
                <div
                    key={styleName}
                    className={clsx(
                        'text-center transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 touch-none select-none',
                        styleClass
                    )}
                    // We attach PointerUp to container to catch release outside of spans
                    onPointerUp={() => handlePointerUp(textForSelection)}
                    onPointerLeave={() => {
                        // Optional: Commit if dragged out of the container
                        if (isSelecting.current) handlePointerUp(textForSelection);
                    }}
                >
                    {Array.from(textForSelection).map((char: string, i: number) => {
                        const isSelected =
                            selection &&
                            i >= Math.min(selection.start, selection.end) &&
                            i <= Math.max(selection.start, selection.end);

                        return (
                            <span
                                key={i}
                                className={clsx(
                                    'cursor-pointer inline-block transition-all duration-150 px-1 rounded touch-none',
                                    isSelected
                                        ? 'bg-emerald-500/30 text-emerald-300 scale-110'
                                        : 'active:scale-95'
                                )}
                                onPointerDown={(e) => handlePointerDown(i, e)}
                                onPointerEnter={() => handlePointerEnter(i)}
                            >
                                {char}
                            </span>
                        );
                    })}
                </div>
            );
        }

        return (
            <div
                key={styleName}
                className={clsx(
                    'text-center transition-all duration-300 animate-in fade-in slide-in-from-bottom-1',
                    styleClass
                )}
            >
                {text}
            </div>
        );
    };

    // ---------- RUBY RENDERER ----------
    const renderRubyLine = (hanziEvents: ASSEvent[], pinyinEvents: ASSEvent[]) => {
        const hanziText = hanziEvents.map(e => e.cleanText).join('');
        const pinyinText = pinyinEvents.map(e => e.cleanText).join(' ');

        const hanziChars = Array.from(hanziText);
        const pinyinSyllables = pinyinText.split(/\s+/).filter(Boolean);

        if (!hanziChars.length) return null;

        const useRuby = pinyinSyllables.length === hanziChars.length;

        return (
            <div
                className="flex flex-wrap justify-center text-center transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 text-white touch-none select-none max-w-full"
                onPointerUp={() => handlePointerUp(hanziText)}
                onPointerLeave={() => {
                    if (isSelecting.current) handlePointerUp(hanziText);
                }}
            >
                {hanziChars.map((char, i) => {
                    const isSelected =
                        selection &&
                        i >= Math.min(selection.start, selection.end) &&
                        i <= Math.max(selection.start, selection.end);

                    const pinyin = useRuby ? pinyinSyllables[i] : undefined;

                    return (
                        <span
                            key={i}
                            className="inline-flex flex-col items-center mx-0.5 leading-tight"
                        >
                            {pinyin && (
                                <span className="text-sm md:text-base text-zinc-100/90 mb-1">
                                    {pinyin}
                                </span>
                            )}
                            <span
                                className={clsx(
                                    'cursor-pointer inline-block px-1 rounded text-4xl md:text-6xl font-bold tracking-widest transition-all duration-150 touch-none',
                                    isSelected
                                        ? 'bg-emerald-500/30 text-emerald-300 scale-110'
                                        : 'active:scale-95'
                                )}
                                onPointerDown={(e) => handlePointerDown(i, e)}
                                onPointerEnter={() => handlePointerEnter(i)}
                            >
                                {char}
                            </span>
                        </span>
                    );
                })}
            </div>
        );
    };

    // Background styles
    const bgStyle = backgroundMode === 'blur'
        ? 'backdrop-blur-md bg-black/40'
        : backgroundMode === 'opaque'
            ? 'bg-black'
            : '';

    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center p-4 min-h-[100px] transition-all duration-500 space-y-2 rounded-xl',
                bgStyle,
                className
            )}
            style={{
                transform: `scale(${scale}) translateY(${verticalOffset}px)`,
                transformOrigin: 'bottom center'
            }}
        >
            {/* TOP: Hanzi + pinyin (ruby style if we have both) */}
            {(hanziKey || pinyinKey) && (
                <div className="flex flex-col items-center max-w-full">
                    {hanziKey && pinyinKey ? (
                        renderRubyLine(subtitles[hanziKey], subtitles[pinyinKey])
                    ) : (
                        <>
                            {pinyinKey && renderSubtitleLine(pinyinKey, subtitles[pinyinKey])}
                            {hanziKey && renderSubtitleLine(hanziKey, subtitles[hanziKey])}
                        </>
                    )}
                </div>
            )}

            {/* BOTTOM: Bigger English line */}
            {englishKey && (
                <div className="flex justify-center max-w-full">
                    {renderSubtitleLine(englishKey, subtitles[englishKey])}
                </div>
            )}

            {otherKeys.map(key => renderSubtitleLine(key, subtitles[key]))}

            {keys.length === 0 && (
                <div className="flex flex-col items-center justify-center text-zinc-700 space-y-2 opacity-50">
                    <div className="w-8 h-0.5 bg-zinc-700/50 rounded-full" />
                    <span className="text-[10px] font-medium tracking-widest uppercase">
                        Waiting for dialogue
                    </span>
                </div>
            )}
        </div>
    );
}
