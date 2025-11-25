
import { useRef, useState } from 'react';
import type { TouchEvent, MouseEvent } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface GestureTrackpadProps {
    onSeek: (delta: number) => void;
    onTogglePlay: () => void;
    onLongPress: () => void;
    className?: string;
}

export default function GestureTrackpad({ onSeek, onTogglePlay, onLongPress, className }: GestureTrackpadProps) {
    const [activeGesture, setActiveGesture] = useState<'none' | 'tap' | 'swipe' | 'hold'>('none');
    const [swipeDelta, setSwipeDelta] = useState(0);

    const touchStartX = useRef<number | null>(null);
    const touchStartTime = useRef<number | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDragging = useRef(false);

    // Constants
    // const TAP_THRESHOLD_MS = 200; // Unused
    const SWIPE_THRESHOLD_PX = 30;
    const LONG_PRESS_MS = 500;

    const handleStart = (clientX: number) => {
        touchStartX.current = clientX;
        touchStartTime.current = Date.now();
        isDragging.current = false;
        setSwipeDelta(0);
        setActiveGesture('tap'); // Assume tap initially

        // Start long press timer
        longPressTimer.current = setTimeout(() => {
            if (!isDragging.current) {
                setActiveGesture('hold');
                onLongPress();
            }
        }, LONG_PRESS_MS);
    };

    const handleMove = (clientX: number) => {
        if (touchStartX.current === null) return;

        const deltaX = clientX - touchStartX.current;

        if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
            isDragging.current = true;
            setActiveGesture('swipe');
            setSwipeDelta(deltaX);

            // Cancel long press if we start swiping
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }
    };

    const handleEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (activeGesture === 'swipe') {
            // Commit seek
            // Map pixels to seconds (e.g., 10px = 1s)
            const seekSeconds = Math.round(swipeDelta / 10);
            if (seekSeconds !== 0) {
                onSeek(seekSeconds);
            }
        } else if (activeGesture === 'tap' && !isDragging.current) {
            onTogglePlay();
        }

        // Reset
        touchStartX.current = null;
        touchStartTime.current = null;
        setActiveGesture('none');
        setSwipeDelta(0);
        isDragging.current = false;
    };

    // Touch Events
    const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    // Mouse Events (for desktop testing)
    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX);
    const onMouseMove = (e: MouseEvent) => {
        if (touchStartX.current !== null) handleMove(e.clientX);
    };
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => {
        if (touchStartX.current !== null) handleEnd();
    };

    return (
        <div
            className={clsx(
                "relative w-full h-full rounded-2xl overflow-hidden touch-none select-none transition-all duration-300",
                "bg-gradient-to-b from-zinc-900 to-zinc-950",
                "active:scale-[0.99] active:shadow-inner",
                className
            )}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            {/* Subtle Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />

            {/* Center Icon / State Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {activeGesture === 'none' && (
                    <div className="flex flex-col items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                        <div className="w-16 h-16 rounded-full border-2 border-zinc-500/30 flex items-center justify-center mb-2">
                            <div className="w-2 h-2 bg-zinc-500/50 rounded-full" />
                        </div>
                    </div>
                )}

                {activeGesture === 'swipe' && (
                    <div className="flex items-center space-x-6 text-emerald-400 animate-in fade-in zoom-in duration-200">
                        <ChevronLeft size={48} className={clsx("transition-opacity", swipeDelta < 0 ? "opacity-100" : "opacity-20")} />
                        <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-4xl font-bold tracking-tighter tabular-nums">
                                {Math.round(swipeDelta / 10) > 0 ? '+' : ''}{Math.round(swipeDelta / 10)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-widest opacity-80">Seconds</span>
                        </div>
                        <ChevronRight size={48} className={clsx("transition-opacity", swipeDelta > 0 ? "opacity-100" : "opacity-20")} />
                    </div>
                )}

                {activeGesture === 'hold' && (
                    <div className="flex flex-col items-center text-purple-400 animate-pulse">
                        <div className="p-4 bg-purple-500/10 rounded-full mb-2 ring-1 ring-purple-500/30">
                            <Search size={40} />
                        </div>
                        <span className="text-sm font-bold tracking-widest uppercase">X-Ray Mode</span>
                    </div>
                )}

                {activeGesture === 'tap' && !isDragging.current && (
                    <div className="w-full h-full flex items-center justify-center animate-ping opacity-20">
                        <div className="w-20 h-20 bg-white/10 rounded-full" />
                    </div>
                )}
            </div>

            {/* Active State Border Glow */}
            <div className={clsx(
                "absolute inset-0 rounded-2xl border-2 transition-colors duration-300 pointer-events-none",
                activeGesture !== 'none' ? "border-emerald-500/20" : "border-white/5"
            )} />
        </div>
    );
}
