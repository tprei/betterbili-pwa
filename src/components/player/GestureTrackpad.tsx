import { useRef, useState } from 'react';
import type { TouchEvent, MouseEvent } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Search, ArrowDown } from 'lucide-react';

interface GestureTrackpadProps {
    onNextSentence?: () => void;
    onPrevSentence?: () => void;
    onAnalyze?: () => void;
    onTogglePlay: () => void;
    onLongPress: () => void;
    className?: string;
}

export default function GestureTrackpad({
    onNextSentence,
    onPrevSentence,
    onAnalyze,
    onTogglePlay,
    onLongPress,
    className
}: GestureTrackpadProps) {
    const [activeGesture, setActiveGesture] = useState<'none' | 'tap' | 'swipe-h' | 'swipe-v' | 'hold'>('none');
    const [swipeDeltaX, setSwipeDeltaX] = useState(0);
    const [swipeDeltaY, setSwipeDeltaY] = useState(0);

    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchStartTime = useRef<number | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDragging = useRef(false);
    const lastTapTime = useRef<number>(0);

    // Constants
    const SWIPE_THRESHOLD_PX = 30;
    const LONG_PRESS_MS = 500;
    const TAP_DEBOUNCE_MS = 300; // Prevent rapid taps

    const handleStart = (clientX: number, clientY: number) => {
        touchStartX.current = clientX;
        touchStartY.current = clientY;
        touchStartTime.current = Date.now();
        isDragging.current = false;
        setSwipeDeltaX(0);
        setSwipeDeltaY(0);
        setActiveGesture('tap'); // Assume tap initially

        // Start long press timer
        longPressTimer.current = setTimeout(() => {
            if (!isDragging.current) {
                setActiveGesture('hold');
                onLongPress();
            }
        }, LONG_PRESS_MS);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (touchStartX.current === null || touchStartY.current === null) return;

        const deltaX = clientX - touchStartX.current;
        const deltaY = clientY - touchStartY.current;

        // Determine if dragging
        if (!isDragging.current) {
            if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX || Math.abs(deltaY) > SWIPE_THRESHOLD_PX) {
                isDragging.current = true;

                // Determine direction (Horizontal vs Vertical)
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    setActiveGesture('swipe-h');
                } else {
                    setActiveGesture('swipe-v');
                }

                // Cancel long press if we start swiping
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }
        }

        if (isDragging.current) {
            setSwipeDeltaX(deltaX);
            setSwipeDeltaY(deltaY);
        }
    };

    const handleEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (activeGesture === 'swipe-h') {
            // Horizontal Swipe Logic
            // User Request: Swipe Left (negative delta) -> Previous
            // User Request: Swipe Right (positive delta) -> Next
            if (swipeDeltaX < -SWIPE_THRESHOLD_PX) {
                onPrevSentence?.();
            } else if (swipeDeltaX > SWIPE_THRESHOLD_PX) {
                onNextSentence?.();
            }
        } else if (activeGesture === 'swipe-v') {
            // Vertical Swipe Logic
            // Swipe Down (positive delta) -> Analyze
            // Ignore Swipe Up (negative delta)
            if (swipeDeltaY > SWIPE_THRESHOLD_PX) {
                onAnalyze?.();
            }
        } else if (activeGesture === 'tap' && !isDragging.current) {
            // Debounce taps to prevent rapid pause/unpause
            const now = Date.now();
            if (now - lastTapTime.current > TAP_DEBOUNCE_MS) {
                lastTapTime.current = now;
                onTogglePlay();
            }
        }

        // Reset
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
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();

    // Mouse Events (for desktop testing)
    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => {
        if (touchStartX.current !== null) handleMove(e.clientX, e.clientY);
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

                {activeGesture === 'swipe-v' && swipeDeltaY > 0 && (
                    <div className="flex flex-col items-center text-blue-400 animate-in fade-in zoom-in duration-200">
                        <div className={clsx("transition-transform duration-200", swipeDeltaY > 0 ? "translate-y-2" : "")}>
                            <ArrowDown size={48} />
                        </div>
                        <span className="mt-2 text-sm font-bold tracking-widest uppercase">Analyze</span>
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
