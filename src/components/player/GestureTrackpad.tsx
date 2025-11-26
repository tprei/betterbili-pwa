import { useRef, useState } from 'react';
import type { TouchEvent, MouseEvent } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Search, ArrowDown } from 'lucide-react';

interface GestureTrackpadProps {
    onNextSentence?: () => void;
    onPrevSentence?: () => void;
    onAnalyze?: () => void;
    onTogglePlay: () => void;
    onLoopStart?: () => void;
    onLoopEnd?: () => void;
    onRapidSeek?: (direction: 'next' | 'prev') => void;
    className?: string;
}

export default function GestureTrackpad({
    onNextSentence,
    onPrevSentence,
    onAnalyze,
    onTogglePlay,
    onLoopStart,
    onLoopEnd,
    onRapidSeek,
    className
}: GestureTrackpadProps) {
    const [activeGesture, setActiveGesture] = useState<'none' | 'tap' | 'swipe-h' | 'swipe-v' | 'hold-center' | 'hold-left' | 'hold-right'>('none');
    const [swipeDeltaX, setSwipeDeltaX] = useState(0);
    const [swipeDeltaY, setSwipeDeltaY] = useState(0);

    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchStartTime = useRef<number | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rapidSeekTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const isDragging = useRef(false);
    const lastTapTime = useRef<number>(0);

    // Constants
    const SWIPE_THRESHOLD_PX = 30;
    const LONG_PRESS_MS = 500;
    const TAP_DEBOUNCE_MS = 300; // Prevent rapid taps
    const HOLD_ZONE_PCT = 0.15; // 15% edge zone

    // SLOWED DOWN: 700ms between jumps (approx 1.5 jumps/sec)
    // This prevents the API from being overwhelmed by seek requests
    const RAPID_SEEK_MS = 700;

    // Helper to start rapid seek
    const startRapidSeek = (direction: 'next' | 'prev') => {
        if (rapidSeekTimer.current) return; // Already seeking

        // Fire immediately once
        onRapidSeek?.(direction);

        // Then fire on a slower interval
        rapidSeekTimer.current = setInterval(() => {
            onRapidSeek?.(direction);
        }, RAPID_SEEK_MS);
    };

    // Helper to stop rapid seek
    const stopRapidSeek = () => {
        if (rapidSeekTimer.current) {
            clearInterval(rapidSeekTimer.current);
            rapidSeekTimer.current = null;
        }
    };

    const handleStart = (clientX: number, clientY: number) => {
        touchStartX.current = clientX;
        touchStartY.current = clientY;
        touchStartTime.current = Date.now();
        isDragging.current = false;
        setSwipeDeltaX(0);
        setSwipeDeltaY(0);
        setActiveGesture('tap'); // Assume tap initially

        // Start long press timer (for STATIC hold)
        longPressTimer.current = setTimeout(() => {
            if (!isDragging.current) {
                // Determine Hold Zone
                const width = window.innerWidth;
                const zoneWidth = width * HOLD_ZONE_PCT;

                if (clientX < zoneWidth) {
                    setActiveGesture('hold-left');
                    startRapidSeek('prev');
                } else if (clientX > width - zoneWidth) {
                    setActiveGesture('hold-right');
                    startRapidSeek('next');
                } else {
                    setActiveGesture('hold-center');
                    onLoopStart?.(); // Start Looping
                }
            }
        }, LONG_PRESS_MS);
    };

    const handleMove = (clientX: number, clientY: number, target: EventTarget) => {
        if (touchStartX.current === null || touchStartY.current === null) return;

        const deltaX = clientX - touchStartX.current;
        const deltaY = clientY - touchStartY.current;

        // Determine if dragging
        if (!isDragging.current) {
            // FIX: If we are already holding center, prevent transitioning to swipe easily
            if (activeGesture === 'hold-center') return;

            if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX || Math.abs(deltaY) > SWIPE_THRESHOLD_PX) {
                isDragging.current = true;

                // Determine direction (Horizontal vs Vertical)
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    setActiveGesture('swipe-h');
                } else {
                    setActiveGesture('swipe-v');
                }

                // Cancel STATIC long press if we start moving
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }
        }

        if (isDragging.current) {
            setSwipeDeltaX(deltaX);
            setSwipeDeltaY(deltaY);

            // --- DRAG TO HOLD LOGIC ---
            // If we are dragging horizontally, check if we are in the edge zones
            if (activeGesture === 'swipe-h' || activeGesture === 'hold-left' || activeGesture === 'hold-right') {
                const rect = (target as HTMLElement).getBoundingClientRect();
                const relativeX = clientX - rect.left;
                const width = rect.width;

                const zoneWidth = width * HOLD_ZONE_PCT;

                if (relativeX < zoneWidth) {
                    // Entered Left Zone
                    if (activeGesture !== 'hold-left') {
                        setActiveGesture('hold-left');
                        startRapidSeek('prev');
                    }
                } else if (relativeX > width - zoneWidth) {
                    // Entered Right Zone
                    if (activeGesture !== 'hold-right') {
                        setActiveGesture('hold-right');
                        startRapidSeek('next');
                    }
                } else {
                    // In Middle - Cancel rapid seek if we were holding
                    if (activeGesture === 'hold-left' || activeGesture === 'hold-right') {
                        stopRapidSeek();
                        setActiveGesture('swipe-h'); // Revert to standard swipe visual
                    }
                }
            }
        }
    };

    const handleEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        // Stop any rapid seeking
        stopRapidSeek();

        if (activeGesture === 'swipe-h') {
            // Standard Swipe Logic (only if we weren't holding an edge)
            if (swipeDeltaX < -SWIPE_THRESHOLD_PX) {
                onPrevSentence?.();
            } else if (swipeDeltaX > SWIPE_THRESHOLD_PX) {
                onNextSentence?.();
            }
        } else if (activeGesture === 'swipe-v') {
            // Vertical Swipe Logic
            if (swipeDeltaY < -30) {
                onAnalyze?.();
            }
        } else if (activeGesture === 'tap' && !isDragging.current) {
            // Debounce taps
            const now = Date.now();
            if (now - lastTapTime.current > TAP_DEBOUNCE_MS) {
                lastTapTime.current = now;
                onTogglePlay();
            }
        }

        // Reset Loop if we were holding center
        if (activeGesture === 'hold-center') {
            onLoopEnd?.();
        }

        // Reset State
        touchStartX.current = null;
        touchStartY.current = null;
        touchStartTime.current = null;

        setActiveGesture('none');
        setSwipeDeltaX(0);
        setSwipeDeltaY(0);
        isDragging.current = false;
    };

    // Touch Events
    const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
    // Pass currentTarget to get the trackpad dimensions correctly in handleMove
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    const onTouchEnd = () => handleEnd();

    // Mouse Events (for desktop testing)
    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => {
        if (touchStartX.current !== null) handleMove(e.clientX, e.clientY, e.currentTarget);
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

                {/* Swipe Horizontal Feedback */}
                {activeGesture === 'swipe-h' && (
                    <div className="flex items-center space-x-6 text-emerald-400 animate-in fade-in zoom-in duration-200">
                        <ChevronLeft size={48} className={clsx("transition-opacity", swipeDeltaX < 0 ? "opacity-100" : "opacity-20")} />
                        <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-sm font-bold tracking-widest uppercase">
                                {swipeDeltaX < 0 ? 'PREV' : 'NEXT'}
                            </span>
                        </div>
                        <ChevronRight size={48} className={clsx("transition-opacity", swipeDeltaX > 0 ? "opacity-100" : "opacity-20")} />
                    </div>
                )}

                {/* Vertical Swipe Feedback */}
                {activeGesture === 'swipe-v' && swipeDeltaY < 0 && (
                    <div className="flex flex-col items-center text-blue-400 animate-in fade-in zoom-in duration-200">
                        <div className={clsx("transition-transform duration-200", swipeDeltaY < 0 ? "-translate-y-2" : "")}>
                            <ArrowDown size={48} className="rotate-180" />
                        </div>
                        <span className="mt-2 text-sm font-bold tracking-widest uppercase">Analyze</span>
                    </div>
                )}

                {/* Center Hold Feedback */}
                {activeGesture === 'hold-center' && (
                    <div className="flex flex-col items-center text-purple-400 animate-pulse">
                        <div className="p-4 bg-purple-500/10 rounded-full mb-2 ring-1 ring-purple-500/30">
                            <Search size={40} />
                        </div>
                        <span className="text-sm font-bold tracking-widest uppercase">Looping Sentence</span>
                    </div>
                )}

                {/* Side Hold / Drag-to-Edge Feedback */}
                {(activeGesture === 'hold-left' || activeGesture === 'hold-right') && (
                    <div className={clsx(
                        "absolute top-1/2 -translate-y-1/2 flex flex-col items-center text-emerald-400 animate-pulse",
                        activeGesture === 'hold-left' ? "left-8" : "right-8"
                    )}>
                        {activeGesture === 'hold-left' ? <ChevronLeft size={64} /> : <ChevronRight size={64} />}
                        <span className="text-xs font-bold tracking-widest uppercase mt-2">Seeking</span>
                    </div>
                )}

                {activeGesture === 'tap' && (
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
