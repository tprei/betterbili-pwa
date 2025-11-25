import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface CustomVideoPlayerRef {
    play: () => Promise<void>;
    pause: () => void;
    currentTime: number;
}

interface CustomVideoPlayerProps {
    src: string; // Changed from videoUrl to src to match standard video props
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
    const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
    const [audioStreamUrl, setAudioStreamUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        play: async () => {
            if (videoRef.current) {
                await videoRef.current.play();
                if (audioRef.current) await audioRef.current.play();
            }
        },
        pause: () => {
            if (videoRef.current) {
                videoRef.current.pause();
                if (audioRef.current) audioRef.current.pause();
            }
        },
        get currentTime() {
            return videoRef.current?.currentTime || 0;
        },
        set currentTime(time: number) {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
                if (audioRef.current) audioRef.current.currentTime = time;
            }
        }
    }));

    // Fetch the stream URLs from backend
    useEffect(() => {
        const fetchStream = async () => {
            try {
                setLoading(true);
                setError(null);
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                // 1. Get the stream URL
                const response = await fetch(src);
                if (!response.ok) throw new Error('Failed to fetch video stream');

                const data = await response.json();

                if (data.video_url) {
                    const proxyVideoUrl = `${apiUrl}/api/v1/video/proxy?url=${encodeURIComponent(data.video_url)}`;
                    setVideoStreamUrl(proxyVideoUrl);
                }

                if (data.audio_url) {
                    const proxyAudioUrl = `${apiUrl}/api/v1/video/proxy?url=${encodeURIComponent(data.audio_url)}`;
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

    // Sync Audio/Video
    const togglePlay = () => {
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play();
            if (audioRef.current) audioRef.current.play();
        } else {
            videoRef.current.pause();
            if (audioRef.current) audioRef.current.pause();
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            onTimeUpdate?.(time);

            // Sync audio if it drifts
            if (audioRef.current && Math.abs(audioRef.current.currentTime - time) > 0.5) {
                audioRef.current.currentTime = time;
            }
        }
    };

    const handleDurationChange = () => {
        if (videoRef.current) {
            onDurationChange?.(videoRef.current.duration);
        }
    };

    // Effect to bind audio play/pause to video if not done via toggle
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        const onPlayEvent = () => {
            audio.play().catch(console.error);
            onPlay?.();
        };
        const onPauseEvent = () => {
            audio.pause();
            onPause?.();
        };
        const onSeeking = () => { audio.currentTime = video.currentTime; };

        video.addEventListener('play', onPlayEvent);
        video.addEventListener('pause', onPauseEvent);
        video.addEventListener('seeking', onSeeking);

        return () => {
            video.removeEventListener('play', onPlayEvent);
            video.removeEventListener('pause', onPauseEvent);
            video.removeEventListener('seeking', onSeeking);
        };
    }, [audioStreamUrl, onPlay, onPause]);

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
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-zinc-800 rounded hover:bg-zinc-700 text-xs"
                    >
                        Retry
                    </button>
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
                <audio
                    ref={audioRef}
                    src={audioStreamUrl}
                    className="hidden"
                />
            )}
        </div>
    );
});

CustomVideoPlayer.displayName = 'CustomVideoPlayer';
export default CustomVideoPlayer;
