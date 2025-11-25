import { useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import CustomVideoPlayer from '../components/player/CustomVideoPlayer';
import type { CustomVideoPlayerRef } from '../components/player/CustomVideoPlayer';
import SubtitleDisplay from '../components/player/SubtitleDisplay';
import GestureTrackpad from '../components/player/GestureTrackpad';
import PlayerControls from '../components/player/PlayerControls';
import ASSParser from '../lib/ass-parser';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function WatchPage() {
  const { hash } = useParams();
  const location = useLocation();
  const videoUrl = (location.state as { videoUrl?: string })?.videoUrl;
  const videoHash = hash; // Alias for clarity
  const { session } = useAuth();

  const playerRef = useRef<CustomVideoPlayerRef>(null);
  const isGestureProcessing = useRef(false); // Debounce gestures

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [parser, setParser] = useState<ASSParser | null>(null);
  const [xRayContent, setXRayContent] = useState<string | null>(null);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Load subtitles from API
  useEffect(() => {
    const loadSubtitles = async () => {
      if (!videoHash) return;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const headers: Record<string, string> = {};

        // Add auth token if available
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${apiUrl}/subtitles/${videoHash}/raw`, {
          headers
        });

        if (!response.ok) {
          console.warn('Failed to fetch subtitles:', response.status);
          return;
        }

        const assContent = await response.text();
        const p = new ASSParser();
        p.parse(assContent);
        console.log('ASS parsed?', p.getStats());
        setParser(p);
      } catch (error) {
        console.error('Error loading subtitles:', error);
      }
    };

    loadSubtitles();
  }, [videoHash, session]);

  // Helper to handle seek + play sequence
  const executeSeekAndPlay = (time: number) => {
    const player = playerRef.current;
    if (!player) return;

    // Optimistic UI update
    setCurrentTime(time);
    setXRayContent(null);

    // Perform Seek (The player will pause internally first)
    player.seek(time);

    // Force play after a short delay to ensure seek has registered
    setTimeout(() => {
      player.play();
      setIsPlaying(true);
    }, 100);
  };

  const handleSeek = (time: number, relative = false) => {
    const player = playerRef.current;
    if (!player) return;

    const current = player.getCurrentTime();
    const newTime = relative ? current + time : time;

    player.seek(newTime);
    setCurrentTime(newTime);
    setXRayContent(null);
  };

  const handleNextSentence = () => {
    // Debounce: If we just swiped, ignore for 300ms
    if (isGestureProcessing.current || !parser || !playerRef.current) return;
    isGestureProcessing.current = true;
    setTimeout(() => isGestureProcessing.current = false, 300);

    const player = playerRef.current;
    const currentVideoTime = player.getCurrentTime();
    const queryTime = currentVideoTime - subtitleOffset;

    const nextTime = parser.getNextEventTime(queryTime);

    if (nextTime !== null) {
      // 0.01s buffer
      const seekTime = nextTime + subtitleOffset + 0.01;
      executeSeekAndPlay(seekTime);
    }
  };

  const handlePrevSentence = () => {
    // Debounce
    if (isGestureProcessing.current || !parser || !playerRef.current) return;
    isGestureProcessing.current = true;
    setTimeout(() => isGestureProcessing.current = false, 300);

    const player = playerRef.current;
    const currentVideoTime = player.getCurrentTime();
    const queryTime = currentVideoTime - subtitleOffset;

    const activeSubs = parser.getActiveSubtitles(queryTime);
    const currentSub = activeSubs.length > 0
      ? activeSubs.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0]
      : null;

    // Restart logic (>0.2s in)
    if (currentSub && currentSub.startTime !== null) {
      if (queryTime - currentSub.startTime > 0.2) {
        const seekTime = currentSub.startTime + subtitleOffset;
        executeSeekAndPlay(seekTime);
        return;
      }
    }

    // Prev logic
    const prevTime = parser.getPrevEventTime(queryTime);
    if (prevTime !== null) {
      const seekTime = prevTime + subtitleOffset;
      executeSeekAndPlay(seekTime);
    } else {
      executeSeekAndPlay(0);
    }
  };

  const handleAnalyze = () => {
    if (parser) {
      const active = parser.getActiveSubtitlesByStyle(currentTime - subtitleOffset);
      // Try to find Hanzi content
      const keys = Object.keys(active);
      const hanziKey = keys.find(k => k.toLowerCase().includes('hanzi')) || keys.find(k => k.toLowerCase().includes('chinese'));

      if (hanziKey && active[hanziKey].length > 0) {
        const text = active[hanziKey].map(e => e.cleanText).join(' ');
        setXRayContent(text);
        setIsPlaying(false); // Pause when analyzing
        if (playerRef.current) playerRef.current.pause();
      }
    }
  };

  const handleCharacterSelect = (char: string) => {
    setXRayContent(char);
    setIsPlaying(false);
    if (playerRef.current) playerRef.current.pause();
  };

  const handleTogglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
        setXRayContent(null); // Clear X-Ray on play
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-zinc-950 text-zinc-100 overflow-y-auto font-sans relative">

      {/* Sync Modal Overlay */}
      {isSyncModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-80 shadow-2xl flex flex-col items-center">
            <h3 className="text-lg font-bold text-white mb-4">Subtitle Sync</h3>

            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={() => setSubtitleOffset(prev => Math.round((prev - 0.1) * 10) / 10)}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-2xl font-bold text-emerald-400 transition-colors"
              >
                -
              </button>

              <div className="flex flex-col items-center w-24">
                <span className={clsx("text-3xl font-mono font-bold", subtitleOffset > 0 ? "text-rose-400" : subtitleOffset < 0 ? "text-emerald-400" : "text-white")}>
                  {subtitleOffset > 0 ? '+' : ''}{subtitleOffset.toFixed(1)}s
                </span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Offset</span>
              </div>

              <button
                onClick={() => setSubtitleOffset(prev => Math.round((prev + 0.1) * 10) / 10)}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-2xl font-bold text-rose-400 transition-colors"
              >
                +
              </button>
            </div>

            <div className="flex space-x-2 w-full">
              <button
                onClick={() => setSubtitleOffset(0)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-400 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition-colors"
              >
                Done
              </button>
            </div>

            <p className="mt-4 text-[10px] text-zinc-600 text-center">
              Positive (+) delays subtitles.<br />Negative (-) advances subtitles.
            </p>
          </div>
        </div>
      )}

      {/* 
        Responsive Layout Strategy:
        - Portrait: Flex Column (Video -> Controls -> Subtitles -> Info -> Trackpad)
        - Landscape: Grid (Left: Video/Subs, Right: Info/Trackpad)
      */}

      <div className="flex-1 flex flex-col landscape:grid landscape:grid-cols-[1fr_280px] landscape:grid-rows-1 overflow-hidden min-h-0">

        {/* LEFT COLUMN (Landscape) / TOP SECTION (Portrait) */}
        <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden">

          {/* Video Player Area */}
          {/* In landscape, we want this to take maximum space. In portrait, it's aspect-video. */}
          <div className="w-full bg-black relative shrink-0 landscape:flex-1 landscape:min-h-0 flex items-center justify-center">
            <div className="w-full aspect-video landscape:aspect-auto landscape:h-full relative">
              <CustomVideoPlayer
                ref={playerRef}
                src={videoUrl ? `${import.meta.env.VITE_API_URL || '/api/v1'}/video/stream?url=${encodeURIComponent(videoUrl)}` : ''}
                className="w-full h-full object-contain max-h-[60vh] landscape:max-h-full"
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="w-full z-30 shrink-0 bg-zinc-950 border-b border-zinc-900/50">
            <PlayerControls
              currentTime={currentTime}
              duration={duration}
              onSeek={(t) => handleSeek(t, false)}
              onSyncClick={() => setIsSyncModalOpen(true)}
            />
          </div>

          {/* Subtitles Area */}
          {/* Reduced padding to save space */}
          <div className="w-full px-3 py-0.5 z-20 shrink-0">
            <SubtitleDisplay
              parser={parser}
              currentTime={currentTime - subtitleOffset}
              className="w-full max-w-3xl mx-auto scale-75 origin-top"
              onCharacterSelect={handleCharacterSelect}
              isPaused={!isPlaying}
            />
          </div>

          {/* Portrait: Character Info + Trackpad, stuck to bottom */}
          <div className="hidden portrait:flex flex-1 flex-col min-h-0">
            {/* Character info area (simple div, fills remaining space) */}
            <div className="flex-1 flex items-center justify-center overflow-hidden min-h-[80px]">
              {xRayContent ? (
                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                  <div className="text-4xl font-bold text-white mb-2">{xRayContent}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-widest">X-Ray Analysis</div>
                </div>
              ) : (
                <div className="text-center opacity-30">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-600">
                    Character Information
                  </span>
                </div>
              )}
            </div>

            {/* Trackpad at the very bottom */}
            <div className="w-full shrink-0 pb-6">
              <div className="w-full h-32 relative group mx-auto max-w-md px-2">
                <GestureTrackpad
                  onNextSentence={handleNextSentence}
                  onPrevSentence={handlePrevSentence}
                  onAnalyze={handleAnalyze}
                  onTogglePlay={handleTogglePlay}
                  onLongPress={handleAnalyze}
                  className="w-full h-full shadow-lg ring-1 ring-white/5"
                />
                <p className="absolute -bottom-5 left-0 right-0 text-center text-[8px] text-zinc-500 font-medium uppercase tracking-wider">
                  Swipe / Tap
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Landscape Only) */}
        <div className="hidden landscape:flex flex-col border-l border-zinc-800 bg-zinc-900/30 h-full w-[280px]">

          {/* Top Right: Character Info Display */}
          <div className="flex-1 p-4 border-b border-zinc-800/50 flex flex-col items-center justify-center text-zinc-500">
            {xRayContent ? (
              <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 text-center">
                <div className="text-6xl font-bold text-white mb-4">{xRayContent}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest">X-Ray Analysis</div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-zinc-800/50 rounded-full mb-3 animate-pulse" />
                <div className="space-y-1.5 w-full max-w-[150px]">
                  <div className="h-2 bg-zinc-800/50 rounded w-3/4 mx-auto" />
                  <div className="h-2 bg-zinc-800/50 rounded w-1/2 mx-auto" />
                </div>
                <span className="mt-6 text-[10px] uppercase tracking-widest opacity-50">Info</span>
              </>
            )}
          </div>

          {/* Bottom Right: Trackpad */}
          <div className="h-[200px] p-4 bg-zinc-950/30">
            <div className="w-full h-full relative group">
              <GestureTrackpad
                onNextSentence={handleNextSentence}
                onPrevSentence={handlePrevSentence}
                onAnalyze={handleAnalyze}
                onTogglePlay={handleTogglePlay}
                onLongPress={handleAnalyze}
                className="w-full h-full shadow-inner ring-1 ring-white/5"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
