import { Volume2, Info, Timer, Settings2 } from 'lucide-react';
import clsx from 'clsx';
import SubtitleTimeline from './SubtitleTimeline';
import ASSParser from '../../lib/ass-parser';

interface PlayerControlsProps {
    currentTime: number;
    duration: number; // In seconds
    parser: ASSParser | null;
    onSeek: (time: number) => void;
    onSyncClick?: () => void;
    onAppearanceClick?: () => void;
    className?: string;
}

export default function PlayerControls({
    currentTime,
    duration,
    parser,
    onSeek,
    onSyncClick,
    onAppearanceClick,
    className
}: PlayerControlsProps) {
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={clsx("flex flex-col space-y-2 w-full px-4 py-2 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50", className)}>
            {/* Progress Bar */}
            <div
                className="relative w-full h-1 bg-zinc-700 rounded-full cursor-pointer group"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percent = x / rect.width;
                    onSeek(percent * duration);
                }}
            >
                <div
                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${progress}%` }}
                />
            </div>

            {/* Subtitle Timeline */}
            <div className="w-full px-0.5">
                <SubtitleTimeline
                    parser={parser}
                    currentTime={currentTime}
                />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
                {/* Time Display */}
                <div className="text-xs font-mono text-zinc-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-1">
                    <button
                        onClick={onSyncClick}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        aria-label="Subtitle Sync"
                    >
                        <Timer size={18} />
                    </button>
                    <button
                        onClick={onAppearanceClick}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        aria-label="Subtitle Appearance"
                    >
                        <Settings2 size={18} />
                    </button>
                    <button
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        aria-label="Audio Settings"
                    >
                        <Volume2 size={18} />
                    </button>
                    <button
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        aria-label="Gesture Info"
                    >
                        <Info size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
