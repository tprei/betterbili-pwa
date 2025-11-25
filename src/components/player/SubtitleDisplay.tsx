import { useEffect, useState } from 'react';
import ASSParser from '../../lib/ass-parser';
import type { GroupedSubtitles } from '../../lib/ass-parser';
import clsx from 'clsx';

interface SubtitleDisplayProps {
    parser: ASSParser | null;
    currentTime: number;
    className?: string;
}

export default function SubtitleDisplay({ parser, currentTime, className }: SubtitleDisplayProps) {
    const [subtitles, setSubtitles] = useState<GroupedSubtitles>({});

    useEffect(() => {
        if (parser && parser.isReady()) {
            const active = parser.getActiveSubtitlesByStyle(currentTime);
            setSubtitles(active);
        } else {
            setSubtitles({});
        }
    }, [parser, currentTime]);

    if (!parser || !parser.isReady()) return null;

    // We expect styles like 'Hanzi', 'Pinyin', 'English'
    // But for now, let's just render whatever we have in a stack

    const renderSubtitleLine = (styleName: string, events: any[]) => {
        if (!events.length) return null;

        // Join multiple events for same style (rare but possible)
        const text = events.map(e => e.cleanText).join(' ');

        let styleClass = "text-base text-zinc-300 font-medium";
        if (styleName.toLowerCase().includes('hanzi')) styleClass = "text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-md tracking-wide";
        if (styleName.toLowerCase().includes('pinyin')) styleClass = "text-sm md:text-base text-emerald-400 mb-1 font-mono opacity-90";
        if (styleName.toLowerCase().includes('english')) styleClass = "text-sm md:text-base text-zinc-400 italic";

        return (
            <div key={styleName} className={clsx("text-center transition-all duration-300 animate-in fade-in slide-in-from-bottom-1", styleClass)}>
                {text}
            </div>
        );
    };

    // Order of display: Hanzi -> Pinyin -> English
    // We need to find the keys that match these roughly
    const keys = Object.keys(subtitles);
    const hanziKey = keys.find(k => k.toLowerCase().includes('hanzi')) || keys.find(k => k.toLowerCase().includes('chinese'));
    const pinyinKey = keys.find(k => k.toLowerCase().includes('pinyin'));
    const englishKey = keys.find(k => k.toLowerCase().includes('english')) || keys.find(k => k.toLowerCase().includes('translation'));

    // Fallback for unknown styles
    const otherKeys = keys.filter(k => k !== hanziKey && k !== pinyinKey && k !== englishKey);

    return (
        <div className={clsx(
            "flex flex-col items-center justify-center p-4 min-h-[100px] transition-all duration-500",
            className
        )}>
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
