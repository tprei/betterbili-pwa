import { useMemo } from 'react';
import ASSParser from '../../lib/ass-parser';
import clsx from 'clsx';

interface SubtitleTimelineProps {
    parser: ASSParser | null;
    currentTime: number;
    className?: string;
    targetTrack?: string; // Optional: Allow forcing a specific track
}

export default function SubtitleTimeline({ parser, currentTime, className, targetTrack }: SubtitleTimelineProps) {
    const segments = useMemo(() => {
        // Safety check to ensure the instance has the method (in case of hot-reload/version mismatch)
        if (!parser || !parser.isReady() || typeof (parser as any).getNavigableEvents !== 'function') {
            return [];
        }

        // Pass the targetTrack (or undefined to let parser auto-detect Mandarin)
        return (parser as any).getNavigableEvents(targetTrack);
    }, [parser, targetTrack]);

    // Window configuration
    const WINDOW_SECONDS = 30; // Show 15s before and 15s after
    const HALF_WINDOW = WINDOW_SECONDS / 2;

    if (!segments.length) return null;

    return (
        <div className={clsx("w-full h-3 relative bg-zinc-900/50 rounded-full overflow-hidden border border-zinc-800/50", className)}>

            {/* Center Marker (Current Time) */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />

            {/* Render segments relative to window */}
            {segments.map((seg: any, i: number) => {
                const start = seg.startTime || 0;
                const end = seg.endTime || 0;

                // Filter out segments completely outside the window
                if (end < currentTime - HALF_WINDOW || start > currentTime + HALF_WINDOW) return null;

                // Calculate position percentages relative to the window
                // Window Start = currentTime - HALF_WINDOW
                // 0% = Window Start
                // 100% = Window End (currentTime + HALF_WINDOW)

                const windowStart = currentTime - HALF_WINDOW;

                const relativeStart = start - windowStart;
                const relativeEnd = end - windowStart;

                const leftPercent = (relativeStart / WINDOW_SECONDS) * 100;
                const widthPercent = ((relativeEnd - relativeStart) / WINDOW_SECONDS) * 100;

                const isActive = currentTime >= start && currentTime <= end;

                return (
                    <div
                        key={i}
                        className={clsx(
                            "absolute top-0.5 bottom-0.5 rounded-sm min-w-[2px]",
                            "transition-[left,width,background-color] duration-300 ease-linear", // Smooth scrolling
                            isActive ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] z-10" : "bg-zinc-600/60"
                        )}
                        style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`
                        }}
                    />
                );
            })}
        </div>
    );
}
