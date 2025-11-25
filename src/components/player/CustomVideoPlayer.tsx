import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface CustomVideoPlayerRef {
    play: () => Promise<void>;
    pause: () => void;
    getCurrentTime: () => number;
    seek: (time: number) => void;
}

interface CustomVideoPlayerProps {
    src: string;
    onTimeUpdate?: (time: number) => void;
    onDurationChange?: (duration: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    className?: string;
}

const CustomVideoPlayer = forwardRef<CustomVideoPlayerRef, CustomVideoPlayerProps>(({
    src,
    onTimeUpdate,
    onDurationChange,
    onPlay,
    onPause,
    className
}, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // The Lock
    const isSeekingRef = useRef(false);
    // NEW: A secondary guard to ignore updates for a split second after seeking
    const ignoreUpdatesRef = useRef(false);

    const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
    const [audioStreamUrl, setAudioStreamUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        play: async () => {
            if (videoRef.current) {
                await videoRef.current.play();
                // Audio is handled by event listeners
            }
        },
        pause: () => {
            if (videoRef.current) {
                videoRef.current.pause();
                if (audioRef.current) audioRef.current.pause();
            }
        },
        getCurrentTime: () => {
            return videoRef.current?.currentTime ?? 0;
        },
        seek: (time: number) => {
            if (videoRef.current) {
                const safeTime = Number.isFinite(time) ? time : 0;

                console.log(`[Player] Requesting Seek to: ${safeTime}`);

                // 1. PAUSE FIRST: Stabilizes the media engine before jumping
                videoRef.current.pause();
                if (audioRef.current) audioRef.current.pause();

                // 2. SET TIME: This triggers the 'seeking' event natively
                videoRef.current.currentTime = safeTime;
            }
        }
    }));

    // Fetch stream URLs
    useEffect(() => {
        const fetchStream = async () => {
            try {
                setLoading(true);
                setError(null);
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                const response = await fetch(src);
                if (!response.ok) throw new Error('Failed to fetch video stream');

                const data = await response.json();

                if (data.video_url) {
                    const proxyVideoUrl = `${apiUrl}/video/proxy?url=${encodeURIComponent(data.video_url)}`;
                    setVideoStreamUrl(proxyVideoUrl);
                }

                if (data.audio_url) {
                    const proxyAudioUrl = `${apiUrl}/video/proxy?url=${encodeURIComponent(data.audio_url)}`;
                    setAudioStreamUrl(proxyAudioUrl);
                } else {
                    setAudioStreamUrl(null);
                }

            } catch (err) {
                console.error('Error fetching stream:', err);
                setError('Failed to load video. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (src) {
            fetchStream();
        }
    }, [src]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
    };

    // -------------------------------------------------------------------------
    // EVENT HANDLERS
    // -------------------------------------------------------------------------

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            // STRICT GUARD: Block updates during seek AND for a short time after
            if (isSeekingRef.current || ignoreUpdatesRef.current) return;

            const time = videoRef.current.currentTime;
            onTimeUpdate?.(time);

            // Passive Audio Sync (Only if playing normally)
            // Increased threshold to 0.5s to be less aggressive
            if (audioRef.current && !audioRef.current.paused) {
                if (Math.abs(audioRef.current.currentTime - time) > 0.5) {
                    audioRef.current.currentTime = time;
                }
            }
        }
    }, [onTimeUpdate]);

    const handleDurationChange = () => {
        if (videoRef.current) {
            onDurationChange?.(videoRef.current.duration);
        }
    };

    // -------------------------------------------------------------------------
    // NATIVE EVENT LISTENERS (The Source of Truth)
    // -------------------------------------------------------------------------
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video) return;

        const handlePlay = () => {
            audio?.play().catch(() => { });
            onPlay?.();
        };

        const handlePause = () => {
            audio?.pause();
            onPause?.();
        };

        // BROWSER SAYS: "I am starting to seek"
        const handleSeeking = () => {
            console.log('[Native] Seeking started - Locking Updates');
            isSeekingRef.current = true;
        };

        const handleSeeked = () => {
            console.log('[Native] Seek finished - Unlocking Updates');

            // 1. DO NOT Sync Audio here. 
            // Letting audio sync here often crashes the seek if audio isn't buffered.

            // 2. Unlock seeking flag
            isSeekingRef.current = false;

            // 3. Set a temporary guard against "Ghost" 0-time updates
            // Some browsers fire a timeUpdate=0 immediately after seeking before the real time.
            ignoreUpdatesRef.current = true;
            setTimeout(() => {
                ignoreUpdatesRef.current = false;
                // Force one valid update after the dust settles
                if (video) onTimeUpdate?.(video.currentTime);
            }, 500);
        };

        // BROWSER SAYS: "I am waiting for data" (Buffering)
        const handleWaiting = () => {
            audio?.pause();
        };

        // BROWSER SAYS: "I have data again"
        const handlePlaying = () => {
            if (!video.paused) audio?.play().catch(() => { });
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeking', handleSeeking);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeking', handleSeeking);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
        };
    }, [onPlay, onPause, onTimeUpdate, audioStreamUrl]);

    return (
        <div className={clsx("relative bg-black w-full h-full flex items-center justify-center overflow-hidden", className)}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 z-20 p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <p className="text-zinc-300 text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-zinc-800 rounded hover:bg-zinc-700 text-xs">Retry</button>
                </div>
            )}

            {videoStreamUrl && (
                <video
                    ref={videoRef}
                    src={videoStreamUrl}
                    className="absolute inset-0 w-full h-full object-contain"
                    playsInline
                    controls={false}
                    onClick={togglePlay}
                    onTimeUpdate={handleTimeUpdate}
                    onDurationChange={handleDurationChange}
                    muted={!!audioStreamUrl}
                />
            )}

            {audioStreamUrl && (
                <audio ref={audioRef} src={audioStreamUrl} className="hidden" />
            )}
        </div>
    );
});

CustomVideoPlayer.displayName = 'CustomVideoPlayer';
export default CustomVideoPlayer;
