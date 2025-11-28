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

        shouldStopRef.current = true; // Stop any existing loop

        // Small timeout to allow cleanup of previous loop
        const initTimer = setTimeout(() => {
            shouldStopRef.current = false;
            containerRef.current!.innerHTML = '';
            writersRef.current = [];

            const chars = Array.from(text);
            const writers: HanziWriter[] = [];

            chars.forEach((char) => {
                if (/[\u4e00-\u9fff]/.test(char)) {
                    const charDiv = document.createElement('div');
                    charDiv.style.display = 'inline-block';
                    charDiv.style.width = `${charSize}px`;
                    charDiv.style.height = `${charSize}px`;
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
                        strokeAnimationSpeed: 4, // Fast speed by default
                        delayBetweenStrokes: 50, // Fast strokes
                    });
                    writers.push(writer);
                } else {
                    const textDiv = document.createElement('div');
                    textDiv.textContent = char;
                    textDiv.style.display = 'inline-block';
                    textDiv.style.fontSize = `${charSize * 0.6}px`;
                    textDiv.style.lineHeight = `${charSize}px`;
                    textDiv.style.verticalAlign = 'top';
                    textDiv.style.color = strokeColor;
                    textDiv.style.margin = '0 4px';
                    containerRef.current?.appendChild(textDiv);
                }
            });

            writersRef.current = writers;
            startAnimationLoop();
        }, 50);

        return () => {
            clearTimeout(initTimer);
            shouldStopRef.current = true;
        };
    }, [text, strokeColor, outlineColor, radicalColor, charSize]);

    const startAnimationLoop = async () => {
        if (isAnimatingRef.current) return;
        isAnimatingRef.current = true;

        while (!shouldStopRef.current) {
            const currentWriters = writersRef.current;
            if (currentWriters.length === 0) break;

            // Animate sequence
            for (const writer of currentWriters) {
                if (shouldStopRef.current) break;
                await writer.animateCharacter();
            }

            if (shouldStopRef.current) break;

            // Loop Delay
            await new Promise(r => setTimeout(r, 1000));
            if (shouldStopRef.current) break;

            // Hide all to reset for next loop
            currentWriters.forEach(w => w.hideCharacter());
            await new Promise(r => setTimeout(r, 300));
        }
        isAnimatingRef.current = false;
    };

    return (
        <div className={clsx("flex flex-col items-center w-full", className)}>
            <div
                ref={containerRef}
                className="flex flex-wrap justify-center items-center mb-2 gap-1"
                style={{ minHeight: charSize }}
            />
        </div>
    );
}
