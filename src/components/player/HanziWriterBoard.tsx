import { useEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';
import clsx from 'clsx';

interface HanziWriterBoardProps {
    text: string;
    className?: string;
    strokeColor?: string;
    outlineColor?: string;
    radicalColor?: string;
}

export default function HanziWriterBoard({
    text,
    className,
    strokeColor = '#FFFFFF',
    outlineColor = '#333333',
    radicalColor = '#10B981' // emerald-500
}: HanziWriterBoardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const writersRef = useRef<HanziWriter[]>([]);
    const shouldStopRef = useRef(false);
    const isAnimatingRef = useRef(false);

    // Determine size based on character count to prevent overflow
    const getCharSize = (count: number) => {
        if (count <= 1) return 120;
        if (count <= 2) return 100;
        if (count <= 4) return 80;
        if (count <= 6) return 60;
        return 40;
    };
    const charSize = getCharSize(text.length);

    // Initialize Writers and Start Animation Loop
    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Signal any currently running loop to stop
        shouldStopRef.current = true;

        // Execute immediately to prevent layout flash
        containerRef.current.innerHTML = '';
        writersRef.current = [];

        const chars = Array.from(text);
        const writers: HanziWriter[] = [];

        chars.forEach((char) => {
            if (/[\u4e00-\u9fff]/.test(char)) {
                const charDiv = document.createElement('div');
                charDiv.style.display = 'inline-block';
                charDiv.style.width = `${charSize}px`;
                charDiv.style.height = `${charSize}px`;
                // Add relative positioning to ensure SVG stays contained
                charDiv.style.position = 'relative';
                containerRef.current?.appendChild(charDiv);

                const writer = HanziWriter.create(charDiv, char, {
                    width: charSize,
                    height: charSize,
                    padding: 5,
                    strokeColor,
                    outlineColor,
                    radicalColor,
                    showCharacter: false,
                    showOutline: true,
                    strokeAnimationSpeed: 2, // Standard speed
                    delayBetweenStrokes: 200, // Slight delay between strokes
                });
                writers.push(writer);
            } else {
                const textDiv = document.createElement('div');
                textDiv.textContent = char;
                textDiv.style.display = 'inline-block';
                textDiv.style.width = `${charSize * 0.6}px`;
                textDiv.style.height = `${charSize}px`;
                textDiv.style.textAlign = 'center';
                textDiv.style.fontSize = `${charSize * 0.6}px`;
                textDiv.style.lineHeight = `${charSize}px`;
                textDiv.style.verticalAlign = 'top';
                textDiv.style.color = strokeColor;
                textDiv.style.margin = '0 4px';
                containerRef.current?.appendChild(textDiv);
            }
        });

        writersRef.current = writers;

        // 2. RESET the stop signal so the NEW loop can run
        shouldStopRef.current = false;

        // 3. Trigger loop
        startAnimationLoop();

        return () => {
            shouldStopRef.current = true;
        };
    }, [text, strokeColor, outlineColor, radicalColor, charSize]);

    const startAnimationLoop = async () => {
        // Prevent multiple loops from overlapping
        if (isAnimatingRef.current) return;
        isAnimatingRef.current = true;

        // Give a tiny initial buffer for data to load
        await new Promise(r => setTimeout(r, 100));

        while (!shouldStopRef.current) {
            const currentWriters = writersRef.current;
            if (currentWriters.length === 0) break;

            // Animate sequence
            for (const writer of currentWriters) {
                if (shouldStopRef.current) break;
                // animateCharacter returns a promise that resolves when animation completes
                await writer.animateCharacter();
            }

            if (shouldStopRef.current) break;

            // Loop Delay
            await new Promise(r => setTimeout(r, 2000));
            if (shouldStopRef.current) break;

            // Hide all to reset for next loop
            currentWriters.forEach(w => w.hideCharacter());
            await new Promise(r => setTimeout(r, 500));
        }
        isAnimatingRef.current = false;
    };

    return (
        <div className={clsx("flex flex-col items-center w-full", className)}>
            <div
                ref={containerRef}
                className="flex flex-wrap justify-center items-center gap-1 transition-all duration-300 relative z-10"
                // Enforce exact height to stop vertical jumping
                style={{
                    height: charSize,
                    minHeight: charSize
                }}
            />
        </div>
    );
}
