
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import CustomVideoPlayer from '../components/player/CustomVideoPlayer';
import SubtitleDisplay from '../components/player/SubtitleDisplay';
import GestureTrackpad from '../components/player/GestureTrackpad';
import PlayerControls from '../components/player/PlayerControls';
import ASSParser from '../lib/ass-parser';
import clsx from 'clsx';

export default function WatchPage() {
  const { hash } = useParams();

  // Construct Bilibili URL from hash
  const videoUrl = `https://www.bilibili.com/video/${hash}/`;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [parser, setParser] = useState<ASSParser | null>(null);

  const [playerCommand, setPlayerCommand] = useState<{ type: 'play' | 'pause' | 'seek', value?: number } | null>(null);

  // Load subtitles (Mock for now)
  useEffect(() => {
    const loadSubtitles = async () => {
      // In real app: fetch from /api/v1/subtitles/{hash}/raw
      // For now, let's create a dummy parser
      const p = new ASSParser();
      // Mock ASS content
      const mockAss = `
[Script Info]
Title: Test Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hanzi, Arial, 20, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 2, 2, 2, 10, 10, 10, 1
Style: Pinyin, Arial, 14, &H0000FF00, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 2, 2, 2, 10, 10, 10, 1
Style: English, Arial, 14, &H00CCCCCC, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 2, 2, 2, 10, 10, 10, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0, 0:00:01.00, 0:00:05.00, Hanzi,, 0, 0, 0,, 你好，世界！
Dialogue: 0, 0:00:01.00, 0:00:05.00, Pinyin,, 0, 0, 0,, Nǐ hǎo, shìjiè!
Dialogue: 0, 0:00:01.00, 0:00:05.00, English,, 0, 0, 0,, Hello, World!
Dialogue: 0, 0:00:06.00, 0:00:10.00, Hanzi,, 0, 0, 0,, 这是一个测试。
Dialogue: 0, 0:00:06.00, 0:00:10.00, Pinyin,, 0, 0, 0,, Zhè shì yīgè cèshì.
Dialogue: 0, 0:00:06.00, 0:00:10.00, English,, 0, 0, 0,, This is a test.
`;
      p.parse(mockAss);
      setParser(p);
    };
    loadSubtitles();
  }, []);

  const handleSeek = (timeOrDelta: number, isDelta: boolean = false) => {
    let targetTime = timeOrDelta;
    if (isDelta) {
      targetTime = Math.max(0, Math.min(duration, currentTime + timeOrDelta));
    }
    setPlayerCommand({ type: 'seek', value: targetTime });
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setPlayerCommand({ type: 'pause' });
    } else {
      setPlayerCommand({ type: 'play' });
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">

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
                videoUrl={videoUrl}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                onPlayStateChange={setIsPlaying}
                command={playerCommand}
                onCommandHandled={() => setPlayerCommand(null)}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="w-full z-30 shrink-0 bg-zinc-950 border-b border-zinc-900/50">
            <PlayerControls
              currentTime={currentTime}
              duration={duration}
              onSeek={(t) => handleSeek(t, false)}
            />
          </div>

          {/* Subtitles Area */}
          {/* Reduced padding to save space */}
          <div className="w-full px-3 py-0.5 z-20 shrink-0">
            <SubtitleDisplay
              parser={parser}
              currentTime={currentTime}
              className="w-full max-w-3xl mx-auto scale-75 origin-top"
            />
          </div>

          {/* Portrait: Character Info + Trackpad, stuck to bottom */}
          <div className="hidden portrait:flex flex-1 flex-col min-h-0">
            {/* Character info area (simple div, fills remaining space) */}
            <div className="flex-1 flex items-center justify-center overflow-hidden min-h-[80px]">
              <div className="text-center opacity-30">
                <span className="text-[9px] uppercase tracking-widest text-zinc-600">
                  Character Information
                </span>
              </div>
            </div>

            {/* Trackpad at the very bottom */}
            <div className="w-full shrink-0 pb-6">
              <div className="w-full h-32 relative group mx-auto max-w-md px-2">
                <GestureTrackpad
                  onSeek={(delta) => handleSeek(delta, true)}
                  onTogglePlay={handleTogglePlay}
                  onLongPress={() => console.log('X-Ray')}
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
            <div className="w-16 h-16 bg-zinc-800/50 rounded-full mb-3 animate-pulse" />
            <div className="space-y-1.5 w-full max-w-[150px]">
              <div className="h-2 bg-zinc-800/50 rounded w-3/4 mx-auto" />
              <div className="h-2 bg-zinc-800/50 rounded w-1/2 mx-auto" />
            </div>
            <span className="mt-6 text-[10px] uppercase tracking-widest opacity-50">Info</span>
          </div>

          {/* Bottom Right: Trackpad */}
          <div className="h-[200px] p-4 bg-zinc-950/30">
            <div className="w-full h-full relative group">
              <GestureTrackpad
                onSeek={(delta) => handleSeek(delta, true)}
                onLongPress={() => console.log('X-Ray')}
                onTogglePlay={handleTogglePlay}
                className="w-full h-full shadow-inner ring-1 ring-white/5"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
