
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface CustomVideoPlayerProps {
    videoUrl: string;
    onTimeUpdate?: (time: number) => void;
    onDurationChange?: (duration: number) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
    command?: { type: 'play' | 'pause' | 'seek', value?: number } | null;
    onCommandHandled?: () => void;
    className?: string;
}

export default function CustomVideoPlayer({
    videoUrl,
    onTimeUpdate,
    onDurationChange,
    onPlayStateChange,
    command,
    onCommandHandled,
    className
}: CustomVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
    const [audioStreamUrl, setAudioStreamUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Sync play state to parent
    useEffect(() => {
        onPlayStateChange?.(isPlaying);
    }, [isPlaying, onPlayStateChange]);

    // Fetch the stream URLs from backend
    useEffect(() => {
        const fetchStream = async () => {
            try {
                setLoading(true);
                setError(null);
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                // 1. Get the stream URL
                const response = await fetch(`${apiUrl}/api/v1/video/stream?url=${encodeURIComponent(videoUrl)}`);
                if (!response.ok) throw new Error('Failed to fetch video stream');

                const data = await response.json();

                // 2. Construct proxy URLs
                // We need to proxy the stream to bypass Referer checks if the browser enforces them strictly on <video>
                // The backend provides a proxy endpoint: /api/v1/video/proxy?url=...

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

        if (videoUrl) {
            fetchStream();
        }
    }, [videoUrl]);

    // Handle external commands
    useEffect(() => {
        if (!command || !videoRef.current) return;

        switch (command.type) {
            case 'play':
                videoRef.current.play().catch(console.error);
                if (audioRef.current) audioRef.current.play().catch(console.error);
                break;
            case 'pause':
                videoRef.current.pause();
                if (audioRef.current) audioRef.current.pause();
                break;
            case 'seek':
                if (command.value !== undefined) {
                    // If value is small (like +/- 10), treat as delta? 
                    // No, the contract in Watch.tsx was delta, but we should probably normalize to absolute time here or there.
                    // Watch.tsx sends delta. Let's fix Watch.tsx to send absolute or handle delta here.
                    // Actually, let's assume command.value is ABSOLUTE time for 'seek'.
                    // If Watch.tsx sends delta, it should calculate absolute before sending.
                    // Wait, Watch.tsx `handleSeek` was sending delta. We need to fix that.

                    // For now, let's assume the command value IS the target time.
                    videoRef.current.currentTime = command.value;
                    if (audioRef.current) audioRef.current.currentTime = command.value;
                }
                break;
        }
        onCommandHandled?.();
    }, [command, onCommandHandled]);

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

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Effect to bind audio play/pause to video if not done via toggle
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        const onPlay = () => audio.play().catch(console.error);
        const onPause = () => audio.pause();
        const onSeeking = () => { audio.currentTime = video.currentTime; };

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('seeking', onSeeking);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('seeking', onSeeking);
        };
    }, [audioStreamUrl]);

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
                    onPlay={handlePlay}
                    onPause={handlePause}
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
            {/* Simple Overlay Controls for testing */}

        </div>
    );
}
