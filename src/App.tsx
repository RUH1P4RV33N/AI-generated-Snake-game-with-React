import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Terminal, RefreshCw } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const SPEED_MS = 100;

const TRACKS = [
  { id: 1, title: "NULL_POINTER", artist: "SECTOR_7G", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "MEMORY_LEAK", artist: "SECTOR_7G", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  { id: 3, title: "KERNEL_PANIC", artist: "SECTOR_7G", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" },
];

export default function App() {
  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Game State Refs (for rAF) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const foodRef = useRef({ x: 15, y: 10 });
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const isPlayingRef = useRef(false);
  const flashRef = useRef(0);

  // --- UI State ---
  const [uiScore, setUiScore] = useState(0);
  const [uiGameOver, setUiGameOver] = useState(false);
  const [uiIsPlaying, setUiIsPlaying] = useState(false);
  const [shake, setShake] = useState(false);

  // --- Music Player Logic ---
  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  useEffect(() => {
    if (isMusicPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [currentTrackIndex, isMusicPlaying]);

  // --- Game Logic ---
  const startGame = () => {
    isPlayingRef.current = true;
    setUiIsPlaying(true);
    if (!isMusicPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      setIsMusicPlaying(true);
    }
  };

  const resetGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    foodRef.current = { x: 15, y: 10 };
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    gameOverRef.current = false;

    setUiScore(0);
    setUiGameOver(false);
    setShake(false);

    isPlayingRef.current = true;
    setUiIsPlaying(true);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!isPlayingRef.current || gameOverRef.current) return;

      const queuedDir = nextDirRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (queuedDir.y === 0) nextDirRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (queuedDir.y === 0) nextDirRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (queuedDir.x === 0) nextDirRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (queuedDir.x === 0) nextDirRef.current = { x: 1, y: 0 };
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateGame = (time: number) => {
    if (!isPlayingRef.current || gameOverRef.current) {
      drawGame();
      requestRef.current = requestAnimationFrame(updateGame);
      return;
    }

    if (time - lastUpdateTimeRef.current > SPEED_MS) {
      const head = snakeRef.current[0];
      dirRef.current = nextDirRef.current;
      const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

      // Collisions
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE ||
        snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y)
      ) {
        gameOverRef.current = true;
        setUiGameOver(true);
        triggerShake();
      } else {
        snakeRef.current.unshift(newHead);

        // Food
        if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
          scoreRef.current += 10;
          setUiScore(scoreRef.current);
          flashRef.current = 5; // 5 frames of flash
          
          let newFood;
          while (true) {
            newFood = {
              x: Math.floor(Math.random() * GRID_SIZE),
              y: Math.floor(Math.random() * GRID_SIZE)
            };
            if (!snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y)) {
              break;
            }
          }
          foodRef.current = newFood;
        } else {
          snakeRef.current.pop();
        }
      }
      lastUpdateTimeRef.current = time;
    }

    drawGame();
    requestRef.current = requestAnimationFrame(updateGame);
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const isGlitchFrame = Math.random() > 0.95;
    const offsetX = isGlitchFrame ? (Math.random() * 6 - 3) : 0;
    const offsetY = isGlitchFrame ? (Math.random() * 6 - 3) : 0;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw Food (Magenta)
    ctx.fillStyle = '#FF00FF';
    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 15;
    ctx.fillRect(foodRef.current.x * CELL_SIZE + 2, foodRef.current.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    // Draw Snake (Cyan)
    ctx.fillStyle = '#00FFFF';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = isGlitchFrame ? 25 : 10;
    snakeRef.current.forEach((segment, index) => {
      if (index === 0 && isGlitchFrame) {
          ctx.fillStyle = '#FFFFFF';
      } else {
          ctx.fillStyle = '#00FFFF';
      }
      ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });

    ctx.restore();

    // Flash effect
    if (flashRef.current > 0) {
       ctx.fillStyle = `rgba(255, 0, 255, ${flashRef.current * 0.15})`;
       ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
       flashRef.current--;
    }

    // Screen tearing effect on canvas occasionally
    if (isGlitchFrame && Math.random() > 0.5) {
       const tearY = Math.random() * CANVAS_SIZE;
       const tearH = Math.random() * 30 + 10;
       const tearX = (Math.random() * 30 - 15);
       const imageData = ctx.getImageData(0, tearY, CANVAS_SIZE, tearH);
       ctx.clearRect(0, tearY, CANVAS_SIZE, tearH);
       ctx.putImageData(imageData, tearX, tearY);
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 screen-tear">
      <div className="bg-static"></div>
      <div className="scanlines"></div>

      {/* Music Player */}
      <div className="z-10 w-full max-w-md border-2 border-[#FF00FF] bg-[#050505] p-4 mb-8 relative shadow-[8px_8px_0_rgba(255,0,255,0.3)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00FFFF] animate-pulse"></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-pixel text-[10px] text-[#FF00FF] mb-2 tracking-widest">AUDIO_STREAM</div>
            <h2 className="font-terminal text-3xl text-[#00FFFF] glitch-text" data-text={TRACKS[currentTrackIndex].title}>
              {TRACKS[currentTrackIndex].title}
            </h2>
            <p className="font-terminal text-xl text-gray-400 mt-1">{TRACKS[currentTrackIndex].artist}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevTrack} className="btn-glitch p-2">
              <SkipBack size={18} />
            </button>
            <button onClick={toggleMusic} className="btn-glitch p-3">
              {isMusicPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <button onClick={nextTrack} className="btn-glitch p-2">
              <SkipForward size={18} />
            </button>
          </div>
        </div>
        <audio
          ref={audioRef}
          src={TRACKS[currentTrackIndex].url}
          onEnded={nextTrack}
          onPlay={() => setIsMusicPlaying(true)}
          onPause={() => setIsMusicPlaying(false)}
        />
      </div>

      {/* Game Area */}
      <div className="z-10 flex flex-col items-center w-full max-w-md">
        <div className="flex justify-between w-full mb-4 px-2 font-pixel text-sm">
          <div className="text-[#00FFFF]">
            CYCLES: {uiScore}
          </div>
          <div className="text-[#FF00FF] animate-pulse">
            SYS.OP
          </div>
        </div>

        <div className={`relative border-4 border-[#00FFFF] bg-[#050505] shadow-[0_0_20px_rgba(0,255,255,0.2)] ${shake ? 'shake' : ''}`}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="block w-full h-auto max-w-[400px] aspect-square"
          />

          {/* Overlays */}
          {!uiIsPlaying && !uiGameOver && (
            <div className="absolute inset-0 bg-[#050505]/80 flex items-center justify-center backdrop-blur-sm">
              <button
                onClick={startGame}
                className="btn-glitch font-pixel text-xs sm:text-sm px-6 py-4 flex items-center gap-3"
              >
                <Terminal size={18} /> INITIATE_SEQUENCE
              </button>
            </div>
          )}

          {uiGameOver && (
            <div className="absolute inset-0 bg-[#050505]/90 flex flex-col items-center justify-center">
              <h3 className="font-pixel text-lg sm:text-xl text-[#FF00FF] mb-4 glitch-text" data-text="FATAL_EXCEPTION">
                FATAL_EXCEPTION
              </h3>
              <p className="font-terminal text-2xl text-[#00FFFF] mb-8">
                CYCLES_SURVIVED: {uiScore}
              </p>
              <button
                onClick={resetGame}
                className="btn-glitch font-pixel text-xs sm:text-sm px-6 py-4 flex items-center gap-3"
              >
                <RefreshCw size={18} /> EXECUTE_RECOVERY
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 font-terminal text-xl text-gray-500 tracking-widest">
          [W/A/S/D] OR [ARROWS] TO OVERRIDE
        </div>
      </div>
    </div>
  );
}
