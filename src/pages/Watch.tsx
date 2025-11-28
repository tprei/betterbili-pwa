import { useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import CustomVideoPlayer from '../components/player/CustomVideoPlayer';
import type { CustomVideoPlayerRef } from '../components/player/CustomVideoPlayer';
import SubtitleDisplay from '../components/player/SubtitleDisplay';
import GestureTrackpad from '../components/player/GestureTrackpad';
import PlayerControls from '../components/player/PlayerControls';
import HanziWriterBoard from '../components/player/HanziWriterBoard';
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

  // Loop State: Persist the start/end of the sentence being looped
  const loopTargetRef = useRef<{ start: number; end: number } | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [parser, setParser] = useState<ASSParser | null>(null);
  const [xRayContent, setXRayContent] = useState<string | null>(null);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLoopingSentence, setIsLoopingSentence] = useState(false); // Loop state UI flag

  // Subtitle Appearance State
  const [subScale, setSubScale] = useState(1);
  const [subVerticalOffset, setSubVerticalOffset] = useState(0); // pixels
  const [subBackground, setSubBackground] = useState<'none' | 'blur' | 'opaque'>('none');
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);

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

  // Modified: Accepts 'force' to bypass debounce for rapid seeking
  const handleNextSentence = (force = false) => {
    if ((isGestureProcessing.current && !force) || !parser || !playerRef.current) return;

    if (!force) {
      isGestureProcessing.current = true;
      setTimeout(() => isGestureProcessing.current = false, 300);
    }

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

  // Modified: Accepts 'force' to bypass debounce for rapid seeking
  const handlePrevSentence = (force = false) => {
    if ((isGestureProcessing.current && !force) || !parser || !playerRef.current) return;

    if (!force) {
      isGestureProcessing.current = true;
      setTimeout(() => isGestureProcessing.current = false, 300);
    }

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

  const onPlayerTimeUpdate = (time: number) => {
    setCurrentTime(time);

    // FIXED LOOP LOGIC: Check against the saved loop target, not current active subs
    if (isLoopingSentence && loopTargetRef.current && playerRef.current) {
      const queryTime = time - subtitleOffset;
      const { start, end } = loopTargetRef.current;

      // If we passed the end of the sentence (with small buffer), seek back to start
      if (queryTime > end + 0.15) {
        executeSeekAndPlay(start + subtitleOffset);
      }
    }
  };

  const handleLoopStart = () => {
    if (!playerRef.current || !parser) return;

    const currentVideoTime = playerRef.current.getCurrentTime();
    const queryTime = currentVideoTime - subtitleOffset;

    // 1. Try to find active subtitle
    const activeSubs = parser.getActiveSubtitles(queryTime);
    let targetSub = activeSubs.length > 0
      ? activeSubs.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0]
      : null;

    // 2. If no active subtitle (we are in a gap), find the previous one
    if (!targetSub) {
      const events = parser.getEvents();
      // Iterate backwards to find the nearest previous event
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if ((ev.endTime || 0) < queryTime) {
          targetSub = ev;
          break;
        }
      }
    }

    // 3. Start Looping
    if (targetSub && targetSub.startTime !== null && targetSub.endTime !== null) {
      setIsLoopingSentence(true);
      loopTargetRef.current = { start: targetSub.startTime, end: targetSub.endTime };
      executeSeekAndPlay(targetSub.startTime + subtitleOffset);
    } else {
      // Fallback if no subtitles found at all: just mark state to prevent weirdness
      setIsLoopingSentence(true);
      loopTargetRef.current = { start: queryTime, end: queryTime + 5 }; // Mock loop
    }
  };

  const handleLoopEnd = () => {
    setIsLoopingSentence(false);
    loopTargetRef.current = null;
  };

  const handleRapidSeek = (direction: 'next' | 'prev') => {
    if (direction === 'next') handleNextSentence(true);
    else handlePrevSentence(true);
  };

  const handleAnalyze = () => {
    if (parser) {
      const active = parser.getActiveSubtitlesByStyle(currentTime - subtitleOffset);
      const keys = Object.keys(active);

      // FIX: Content Detection instead of Style Name Detection
      // Look through ALL active lines to find one with Hanzi characters
      let hanziText = '';

      for (const key of keys) {
        const text = active[key].map(e => e.cleanText).join(' ');
        // Check for Chinese characters Unicode range
        if (/[\u4e00-\u9fff]/.test(text)) {
          hanziText = text;
          break; // Found it
        }
      }

      if (hanziText) {
        setXRayContent(hanziText);
        setIsPlaying(false); // Pause when analyzing
        if (playerRef.current) playerRef.current.pause();
      } else if (keys.length > 0) {
        // Fallback: If no Hanzi found, grab the first available text (might be English)
        const text = active[keys[0]].map(e => e.cleanText).join(' ');
        setXRayContent(text);
        setIsPlaying(false);
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

      {/* Appearance Modal Overlay */}
      {isAppearanceModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-80 shadow-2xl flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 text-center">Subtitle Appearance</h3>

            {/* Size Control */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-zinc-400 mb-2 uppercase tracking-wider font-medium">
                <span>Size</span>
                <span>{Math.round(subScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={subScale}
                onChange={(e) => setSubScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Vertical Position Control */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-zinc-400 mb-2 uppercase tracking-wider font-medium">
                <span>Vertical Position</span>
                <span>{subVerticalOffset}px</span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                step="10"
                value={subVerticalOffset}
                onChange={(e) => setSubVerticalOffset(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Background Control */}
            <div className="mb-8">
              <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-medium">Background</div>
              <div className="flex bg-zinc-800 rounded-lg p-1">
                {(['none', 'blur', 'opaque'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSubBackground(mode)}
                    className={clsx(
                      "flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                      subBackground === mode ? "bg-zinc-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsAppearanceModalOpen(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col landscape:grid landscape:grid-cols-[1fr_280px] landscape:grid-rows-1 overflow-hidden min-h-0">

        {/* LEFT COLUMN (Landscape) / TOP SECTION (Portrait) */}
        <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden">

          {/* Video Player Area */}
          <div className="w-full bg-black relative shrink-0 landscape:flex-1 landscape:min-h-0 flex items-center justify-center group">
            <div className="w-full aspect-video landscape:aspect-auto landscape:h-full relative">
              <CustomVideoPlayer
                ref={playerRef}
                src={videoUrl ? `${import.meta.env.VITE_API_URL || '/api/v1'}/video/stream?url=${encodeURIComponent(videoUrl)}` : ''}
                className="w-full h-full object-contain max-h-[60vh] landscape:max-h-full"
                onTimeUpdate={onPlayerTimeUpdate}
                onDurationChange={setDuration}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Mobile Landscape Overlay Subtitles */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden landscape:block lg:hidden pointer-events-none">
                <SubtitleDisplay
                  parser={parser}
                  currentTime={currentTime - subtitleOffset}
                  className="w-max mx-auto origin-bottom pointer-events-auto drop-shadow-md rounded-xl scale-50"
                  onCharacterSelect={handleCharacterSelect}
                  scale={subScale}
                  verticalOffset={subVerticalOffset}
                  backgroundMode={subBackground}
                />
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="w-full z-30 shrink-0 bg-zinc-950 border-b border-zinc-900/50">
            <PlayerControls
              currentTime={currentTime}
              duration={duration}
              parser={parser}
              onSeek={(t) => handleSeek(t, false)}
              onSyncClick={() => setIsSyncModalOpen(true)}
              onAppearanceClick={() => setIsAppearanceModalOpen(true)}
            />
          </div>

          {/* Subtitles Area (Portrait & Desktop Landscape) */}
          <div className="w-full px-3 py-0.5 z-20 shrink-0 block landscape:hidden lg:block">
            <SubtitleDisplay
              parser={parser}
              currentTime={currentTime - subtitleOffset}
              className="w-full max-w-3xl mx-auto origin-top"
              onCharacterSelect={handleCharacterSelect}
              scale={1}
              verticalOffset={0}
              backgroundMode="none"
            />
          </div>

          {/* Portrait: Character Info + Trackpad */}
          <div className="hidden portrait:flex flex-1 flex-col min-h-0">
            <div className="flex-1 flex items-center justify-center overflow-hidden min-h-[80px]">
              {xRayContent ? (
                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 w-full">
                  <HanziWriterBoard
                    text={xRayContent}
                    className="mb-2"
                  />
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

            <div className="w-full shrink-0 pb-6">
              <div className="w-full h-32 relative group mx-auto max-w-md px-2">
                <GestureTrackpad
                  onNextSentence={handleNextSentence}
                  onPrevSentence={handlePrevSentence}
                  onAnalyze={handleAnalyze}
                  onTogglePlay={handleTogglePlay}
                  onLoopStart={handleLoopStart}
                  onLoopEnd={handleLoopEnd}
                  onRapidSeek={handleRapidSeek}
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
          <div className="flex-1 p-4 border-b border-zinc-800/50 flex flex-col items-center justify-center text-zinc-500 overflow-hidden">
            {xRayContent ? (
              <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 text-center w-full">
                <div className="mb-4 scale-75 origin-center">
                  <HanziWriterBoard text={xRayContent} />
                </div>
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

          <div className="h-[200px] p-4 bg-zinc-950/30">
            <div className="w-full h-full relative group">
              <GestureTrackpad
                onNextSentence={handleNextSentence}
                onPrevSentence={handlePrevSentence}
                onAnalyze={handleAnalyze}
                onTogglePlay={handleTogglePlay}
                onLoopStart={handleLoopStart}
                onLoopEnd={handleLoopEnd}
                onRapidSeek={handleRapidSeek}
                className="w-full h-full shadow-inner ring-1 ring-white/5"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
