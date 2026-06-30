import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import type { PuzzlePiece } from '../store/useGameStore';
import { useHandTracking } from '../hooks/useHandTracking';
import { Cursor } from './PuzzleHandsCursor';
import { Leaderboard } from './PuzzleHandsLeaderboard';
import {
  playClickSound,
  playPinchSound,
  playSwapSound,
  playVictorySound,
  playResetSound,
} from '../utils/synth';
import {
  Camera,
  Tv,
  MousePointer,
  Hand,
  Volume2,
  VolumeX,
  Clock,
  Zap,
  Check,
  AlertCircle,
  HelpCircle,
  Cpu,
} from 'lucide-react';

/* --- PROCEDURAL CYBER ART GENERATOR --- */
export const generateProceduralImage = (
  type: 'sunset' | 'matrix' | 'neon-grid',
  width: number,
  height: number
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (type === 'sunset') {
    // Deep blue-purple to orange-red synthwave sunset gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0018');
    grad.addColorStop(0.4, '#1b002c');
    grad.addColorStop(0.7, '#6b114d');
    grad.addColorStop(1, '#ff3b3b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Neon grid floor (perspective lines in the bottom half)
    const midY = height * 0.65;
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1.5;

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Perspective lines radiating outward
    const lines = 16;
    for (let i = 0; i <= lines; i++) {
      const xTop = (width / lines) * i;
      const xBottom = (width * 2 / lines) * (i - lines / 2) + width / 2;
      ctx.beginPath();
      ctx.moveTo(xTop, midY);
      ctx.lineTo(xBottom, height);
      ctx.stroke();
    }

    // Horizontal spacing compression for perspective grid
    const hLines = 8;
    for (let i = 0; i < hLines; i++) {
      const y = midY + (height - midY) * Math.pow(i / hLines, 2.2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Synthwave Sun
    const sunX = width / 2;
    const sunY = midY - 10;
    const sunRadius = Math.min(width, height) * 0.22;

    const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
    sunGrad.addColorStop(0.1, '#fbee22');
    sunGrad.addColorStop(1, '#ff007f');
    
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 30;
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, Math.PI, 0); // Upper half circle
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw horizontal scanline splits across the sun
    ctx.strokeStyle = '#1b002c';
    ctx.lineWidth = 5;
    for (let y = sunY - sunRadius + 12; y < sunY; y += 14) {
      ctx.beginPath();
      ctx.moveTo(sunX - sunRadius - 10, y);
      ctx.lineTo(sunX + sunRadius + 10, y);
      ctx.stroke();
    }
  } else if (type === 'matrix') {
    // Cyber Green Terminal theme
    ctx.fillStyle = '#010502';
    ctx.fillRect(0, 0, width, height);

    // Green Background Grid
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 1;
    const size = 25;
    for (let x = 0; x < width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Binary code rains falling down
    ctx.font = '12px monospace';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#10B981';

    for (let col = 15; col < width; col += 35) {
      const length = 6 + Math.floor(Math.random() * 12);
      const startY = Math.random() * height;
      for (let i = 0; i < length; i++) {
        const char = Math.random() > 0.5 ? '1' : '0';
        ctx.fillStyle = `rgba(16, 185, 129, ${1 - i / length})`;
        ctx.fillText(char, col, (startY + i * 16) % height);
      }
    }
    ctx.shadowBlur = 0;

    // Glowing core text
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER_SYS_DECRYPT', width / 2, height / 2 - 10);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#10B981';
    ctx.fillText('STATUS: ENCRYPTED // SLICE CORE TO EXTRACT', width / 2, height / 2 + 20);
    ctx.shadowBlur = 0;
  } else {
    // Neon Grid Synthwave theme
    const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width / 1.5);
    grad.addColorStop(0, '#100a28');
    grad.addColorStop(1, '#020005');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    const step = 35;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Geometric neon overlay shapes
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    // Inner triangle
    const r = Math.min(width, height) * 0.22;
    ctx.moveTo(width / 2, height / 2 - r);
    ctx.lineTo(width / 2 + r * Math.cos(Math.PI/6), height / 2 + r * Math.sin(Math.PI/6));
    ctx.lineTo(width / 2 - r * Math.cos(Math.PI/6), height / 2 + r * Math.sin(Math.PI/6));
    ctx.closePath();
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }

  // Corner HUD text indicators
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SYS_LOG: v1.0.8', 25, 30);
  ctx.fillText('IP_STREAM: OPERATIONAL', 25, 45);
  ctx.textAlign = 'right';
  ctx.fillText('AI_MODEL: MP_HANDS_WASM', width - 25, 30);
  ctx.fillText('REPLAY_BUFFER: ENABLED', width - 25, 45);

  return canvas.toDataURL('image/jpeg');
};

interface GameContainerProps {
  onExit?: () => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({ onExit }) => {
  // Zustand States
  const {
    phase,
    difficulty,
    gridSize,
    pieces,
    timer,
    score,
    isTimerRunning,
    setPhase,
    setDifficulty,
    setPieces,
    swapPieces,
    tickTimer,
    stopTimer,
    resetGame,
    checkVictory,
    calculateScore,
    addLeaderboardEntry,
  } = useGameStore();

  // Local UI States
  const [controlMode, setControlMode] = useState<'mouse' | 'hand'>('mouse');
  const [imageSource, setImageSource] = useState<'webcam' | 'procedural'>('procedural');
  const [artType, setArtType] = useState<'sunset' | 'matrix' | 'neon-grid'>('sunset');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hoveredCellIdx, setHoveredCellIdx] = useState<number | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [callsign, setCallsign] = useState('');
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [boardRect, setBoardRect] = useState<DOMRect | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<any>(null);

  // Initialize MediaPipe Hook
  const { isReady: handsReady, pinchDetected, cursorPos } = useHandTracking(
    videoRef,
    skeletonCanvasRef,
    controlMode === 'hand' && phase === 'solve'
  );

  // Handle active camera streaming
  const startCameraStream = useCallback(async () => {
    setCameraPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Webcam stream request rejected:', err);
      setCameraPermissionError(
        'Webcam access blocked or unavailable. Falling back to Procedural Cyber Art.'
      );
      setImageSource('procedural');
      setCameraActive(false);
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  }, []);

  // Handle countdown triggers in phase 'capture'
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      captureAndSliceImage();
      return;
    }
    const timerTimeout = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timerTimeout);
  }, [countdown]);

  // Handle timer ticks during solve phase
  useEffect(() => {
    if (isTimerRunning && phase === 'solve') {
      timerIntervalRef.current = setInterval(() => {
        tickTimer();
        calculateScore();
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, phase]);

  // Update Board Rect for laser mapping
  const updateBoardRect = () => {
    if (boardRef.current) {
      setBoardRect(boardRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (phase === 'solve') {
      window.addEventListener('resize', updateBoardRect);
      // Give a tiny offset to ensure DOM has rendered
      setTimeout(updateBoardRect, 200);
    }
    return () => window.removeEventListener('resize', updateBoardRect);
  }, [phase, gridSize]);

  // Mouse Selection Click Handler
  const { selectedPieceIdx, selectPiece } = useGameStore();

  const handlePieceClick = (cellIdx: number) => {
    if (controlMode !== 'mouse' || phase !== 'solve') return;
    playClickSound();

    if (selectedPieceIdx === null) {
      selectPiece(cellIdx);
    } else {
      if (selectedPieceIdx !== cellIdx) {
        swapPieces(selectedPieceIdx, cellIdx);
        playSwapSound();
        checkVictoryAndCelebrate();
      } else {
        selectPiece(null);
      }
    }
  };

  // Check Game Completion
  const checkVictoryAndCelebrate = () => {
    if (checkVictory()) {
      stopTimer();
      playVictorySound();
      setShowVictoryModal(true);

      // Trigger Confetti explosion
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 180,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#D7FF2F', '#00f0ff', '#ff007f', '#10B981'],
        });
      });
    }
  };

  // Image capture & partition slicing
  const captureAndSliceImage = useCallback(() => {
    let imgDataUrl = '';
    const sliceWidth = 640;
    const sliceHeight = 480;

    if (imageSource === 'webcam') {
      if (!videoRef.current || !captureCanvasRef.current) return;
      const video = videoRef.current;
      const canvas = captureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = sliceWidth;
      canvas.height = sliceHeight;

      // Draw mirrored video stream frame
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset scale/translation

      imgDataUrl = canvas.toDataURL('image/jpeg');
    } else {
      // Procedural art capture
      imgDataUrl = generateProceduralImage(artType, sliceWidth, sliceHeight);
    }

    // Slicing logic into Grid
    const img = new Image();
    img.src = imgDataUrl;
    img.onload = () => {
      const pieceWidth = sliceWidth / gridSize;
      const pieceHeight = sliceHeight / gridSize;
      const list: PuzzlePiece[] = [];

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const pieceCanvas = document.createElement('canvas');
          pieceCanvas.width = pieceWidth;
          pieceCanvas.height = pieceHeight;
          const pCtx = pieceCanvas.getContext('2d');
          pCtx?.drawImage(
            img,
            x * pieceWidth, y * pieceHeight, pieceWidth, pieceHeight,
            0, 0, pieceWidth, pieceHeight
          );

          const id = y * gridSize + x;
          list.push({
            id,
            currentIdx: id,
            correctIdx: id,
            imageUrl: pieceCanvas.toDataURL('image/jpeg'),
          });
        }
      }

      // Shuffle pieces
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      shuffled.forEach((p, idx) => (p.currentIdx = idx));

      setPieces(shuffled);
      stopCameraStream();
      setPhase('solve');
      // trigger a timer starts inside setPhase
    };
  }, [gridSize, imageSource, artType, setPieces, setPhase, stopCameraStream]);

  // Handle Gesture Pinch coordinates checking
  useEffect(() => {
    if (phase !== 'solve' || controlMode !== 'hand') {
      setHoveredCellIdx(null);
      return;
    }
    if (!boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    setBoardRect(rect); // maintain updated coordinates

    const screenX = cursorPos.x * window.innerWidth;
    const screenY = cursorPos.y * window.innerHeight;

    const localX = screenX - rect.left;
    const localY = screenY - rect.top;

    if (localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height) {
      const col = Math.floor((localX / rect.width) * gridSize);
      const row = Math.floor((localY / rect.height) * gridSize);
      const clampedCol = Math.max(0, Math.min(gridSize - 1, col));
      const clampedRow = Math.max(0, Math.min(gridSize - 1, row));
      const idx = clampedRow * gridSize + clampedCol;
      setHoveredCellIdx(idx);
    } else {
      setHoveredCellIdx(null);
    }
  }, [cursorPos, phase, controlMode, gridSize]);

  // Monitor pinch events for hand-tracking swaps
  const prevPinchRef = useRef(false);

  useEffect(() => {
    if (controlMode !== 'hand' || phase !== 'solve') return;

    const prevPinch = prevPinchRef.current;

    if (!prevPinch && pinchDetected) {
      // Pinch Event Start -> Select hovered item
      if (hoveredCellIdx !== null) {
        selectPiece(hoveredCellIdx);
        playPinchSound();
      }
    } else if (prevPinch && !pinchDetected) {
      // Pinch Event End -> Swap items if hovered another slot
      if (
        selectedPieceIdx !== null &&
        hoveredCellIdx !== null &&
        selectedPieceIdx !== hoveredCellIdx
      ) {
        swapPieces(selectedPieceIdx, hoveredCellIdx);
        playSwapSound();
        checkVictoryAndCelebrate();
      } else {
        selectPiece(null);
      }
    }

    prevPinchRef.current = pinchDetected;
  }, [pinchDetected, hoveredCellIdx, selectedPieceIdx, controlMode, phase]);

  // Handle start button triggering from main menu
  const handleStartInitialization = () => {
    playClickSound();
    if (imageSource === 'webcam') {
      setPhase('capture');
      startCameraStream();
    } else {
      setPhase('capture'); // brief animation or preview
      setTimeout(() => {
        captureAndSliceImage();
      }, 800);
    }
  };

  // Submit high score to local database
  const handleScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim()) return;

    playClickSound();

    const startingOrder = [...pieces]
      .sort((a, b) => a.correctIdx - b.correctIdx) // sort by original correct indices
      .map((p) => {
        // Find which currentIdx contains this piece correctIdx
        return p.currentIdx;
      });

    addLeaderboardEntry({
      id: Math.random().toString(36).substr(2, 9),
      playerName: callsign.trim().toUpperCase(),
      completionTime: timer,
      difficulty,
      gridSize,
      score,
      date: new Date().toLocaleDateString(),
      moveHistory: useGameStore.getState().moveHistory,
      startingOrder,
      imageType: imageSource === 'webcam' ? 'webcam' : artType,
    });

    setShowVictoryModal(false);
    setCallsign('');
    setPhase('leaderboard');
  };

  const handleQuit = () => {
    playResetSound();
    stopCameraStream();
    resetGame();
    if (onExit) onExit();
  };

  return (
    <div className="relative w-full min-h-screen bg-black text-white font-mono flex flex-col items-center justify-between select-none overflow-x-hidden">
      {/* Scanline Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(18,12,38,0.25)_0%,rgba(0,0,0,1)_95%)] pointer-events-none z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] pointer-events-none z-10" />

      {/* Hidden processing canvas */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* --- HUD HEADER BAR --- */}
      <header className="w-full max-w-7xl px-6 py-4 flex justify-between items-center z-20 border-b border-white/5 relative">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-[#D7FF2F] animate-pulse" />
          <h1 className="text-lg font-black tracking-[0.25em] text-[#D7FF2F]">
            CYBER_PUZZLE.AI
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          {/* Controls status */}
          <div className="hidden md:flex items-center gap-2 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
            <span className="text-gray-400">INPUT:</span>
            <span className="text-[#D7FF2F]">
              {controlMode === 'hand' ? 'AI_WEBCAM_GESTURE' : 'MANUAL_MOUSE'}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              playClickSound();
              setSoundEnabled(!soundEnabled);
            }}
            className="p-2 rounded-full border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          {/* Exit HUD Button */}
          <button
            onClick={handleQuit}
            className="px-3 py-1.5 rounded border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500 text-[10px] tracking-wider transition-all"
          >
            EXIT HUD
          </button>
        </div>
      </header>

      {/* --- MAIN CORE CONTROLLER --- */}
      <main className="flex-grow w-full flex items-center justify-center py-8 z-20 relative px-4">
        <AnimatePresence mode="wait">
          {/* PHASE 1: MENU / IDLE */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#09090b]/80 border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_rgba(215,255,47,0.03)] backdrop-blur-md flex flex-col gap-8"
            >
              {/* Heading */}
              <div className="text-center">
                <h2 className="text-3xl font-black tracking-widest text-white mb-2">
                  LOAD CORE MATRIX
                </h2>
                <p className="text-xs text-gray-500 tracking-wider">
                  CONFIGURE DECRYPTION SYSTEM & START INTERACTION
                </p>
              </div>

              {/* Step 1: Control Scheme */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                  01 // CONTROLLER MODE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      playClickSound();
                      setControlMode('mouse');
                    }}
                    className={`flex items-center justify-center gap-3 p-4 rounded-xl border text-xs font-bold tracking-wider transition-all ${
                      controlMode === 'mouse'
                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <MousePointer className="w-4 h-4" />
                    MOUSE & TOUCH
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      setControlMode('hand');
                    }}
                    className={`flex items-center justify-center gap-3 p-4 rounded-xl border text-xs font-bold tracking-wider transition-all ${
                      controlMode === 'hand'
                        ? 'bg-[#D7FF2F] text-black border-[#D7FF2F] shadow-[0_0_20px_rgba(215,255,47,0.35)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Hand className="w-4 h-4 animate-bounce" />
                    AI HAND TRACKING
                  </button>
                </div>
              </div>

              {/* Step 2: Difficulty Level */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                  02 // DECRYPTION DIFFICULTY
                </label>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
                  {(['easy', 'insane'] as const).map((diff) => {
                    const active = difficulty === diff;
                    const details = {
                      easy: { grid: '3x3', mult: '1.0x' },
                      insane: { grid: '6x6', mult: '3.0x' },
                    }[diff];

                    return (
                      <button
                        key={diff}
                        onClick={() => {
                          playClickSound();
                          setDifficulty(diff);
                        }}
                        className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border transition-all ${
                          active
                            ? 'bg-[#D7FF2F]/10 border-[#D7FF2F] text-[#D7FF2F] shadow-[0_0_15px_rgba(215,255,47,0.15)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-black tracking-wider uppercase">
                          {diff}
                        </span>
                        <span className="text-[10px] text-gray-500 mt-1">
                          {details.grid} • {details.mult}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Input image source */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                  03 // INPUT CORE IMAGE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      playClickSound();
                      setImageSource('procedural');
                    }}
                    className={`flex items-center justify-center gap-3 p-4 rounded-xl border text-xs font-bold tracking-wider transition-all ${
                      imageSource === 'procedural'
                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Tv className="w-4 h-4" />
                    CYBER PROCEDURAL ART
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      setImageSource('webcam');
                    }}
                    className={`flex items-center justify-center gap-3 p-4 rounded-xl border text-xs font-bold tracking-wider transition-all ${
                      imageSource === 'webcam'
                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    LIVE WEBCAM
                  </button>
                </div>

                {cameraPermissionError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/35 rounded-xl text-red-400 text-xs mt-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{cameraPermissionError}</span>
                  </div>
                )}

                {/* Procedural arts catalog */}
                {imageSource === 'procedural' && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['sunset', 'matrix', 'neon-grid'] as const).map((type) => {
                      const isActive = artType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            playClickSound();
                            setArtType(type);
                          }}
                          className={`py-2 px-3 text-[10px] uppercase font-bold tracking-wider border rounded-lg transition-all ${
                            isActive
                              ? 'bg-[#D7FF2F]/10 border-[#D7FF2F] text-[#D7FF2F]'
                              : 'bg-white/5 border-white/5 hover:border-white/15 text-gray-400 hover:text-white'
                          }`}
                        >
                          {type.replace('-', ' ')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartInitialization}
                className="mt-4 w-full py-4 rounded-xl bg-gradient-to-r from-[#D7FF2F] to-[#c2e62a] text-black font-black tracking-[0.2em] uppercase text-sm shadow-[0_0_30px_rgba(215,255,47,0.3)] hover:shadow-[0_0_40px_rgba(215,255,47,0.45)] hover:scale-[1.01] active:scale-95 transition-all"
              >
                INITIATE CORE PROTOCOL
              </button>
            </motion.div>
          )}

          {/* PHASE 2: CAPTURE SNAPSHOT */}
          {phase === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl flex flex-col items-center gap-6"
            >
              {/* Instructions */}
              <div className="text-center">
                <h2 className="text-2xl font-black tracking-widest text-[#D7FF2F] uppercase">
                  {imageSource === 'webcam' ? 'ALIGN CAMERA CORE' : 'COMPILING ARTWORK MATRIX'}
                </h2>
                <p className="text-xs text-gray-500 tracking-wider mt-1">
                  {imageSource === 'webcam'
                    ? 'GET READY TO POSE IN FRONT OF THE CAMERA LENS'
                    : 'PROCESSING PROCEDURAL RETRO SCI-FI VECTOR ASSETS'}
                </p>
              </div>

              {/* Viewport Frame */}
              <div className="relative w-full max-w-xl aspect-[4/3] rounded-2xl border-2 border-dashed border-white/20 bg-neutral-950/80 overflow-hidden shadow-2xl flex items-center justify-center">
                {/* Webcam Stream */}
                {imageSource === 'webcam' ? (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                      autoPlay
                      playsInline
                      muted
                    />
                    {/* Scanning Line overlay */}
                    <div className="absolute left-0 w-full h-1 bg-[#D7FF2F] opacity-30 shadow-[0_0_10px_#D7FF2F] animate-[scan_2.5s_ease-in-out_infinite]" />
                    
                    {/* Crosshair Target */}
                    <div className="absolute w-24 h-24 border border-white/20 pointer-events-none rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-[#D7FF2F] rounded-full animate-ping" />
                    </div>
                  </>
                ) : (
                  // Procedural Art preview loading
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-neutral-950">
                    <div className="relative w-full h-full rounded-lg border border-white/5 overflow-hidden">
                      <img
                        src={generateProceduralImage(artType, 480, 360)}
                        alt="Procedural Vector preview"
                        className="w-full h-full object-cover animate-pulse"
                      />
                      <div className="absolute left-0 w-full h-1.5 bg-cyan-400 opacity-60 shadow-[0_0_12px_#00f0ff] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  </div>
                )}

                {/* Countdown Overlay */}
                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center z-30"
                    >
                      <span className="text-8xl font-black text-[#D7FF2F] drop-shadow-[0_0_20px_#D7FF2F] tracking-tighter">
                        {countdown}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full max-w-xl">
                <button
                  onClick={handleQuit}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold uppercase text-xs tracking-wider transition-all"
                >
                  ABORT protocolo
                </button>

                {imageSource === 'webcam' ? (
                  <button
                    onClick={() => {
                      playClickSound();
                      setCountdown(3);
                    }}
                    disabled={!cameraActive || countdown !== null}
                    className="flex-1 py-3.5 rounded-xl bg-[#D7FF2F] text-black font-black uppercase text-xs tracking-wider shadow-[0_0_25px_rgba(215,255,47,0.3)] hover:shadow-[0_0_35px_rgba(215,255,47,0.5)] active:scale-95 transition-all disabled:opacity-50"
                  >
                    CAPTURE IN 3s
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playClickSound();
                      captureAndSliceImage();
                    }}
                    className="flex-1 py-3.5 rounded-xl bg-cyan-400 text-black font-black uppercase text-xs tracking-wider shadow-[0_0_25px_rgba(0,240,255,0.3)] hover:shadow-[0_0_35px_rgba(0,240,255,0.5)] active:scale-95 transition-all"
                  >
                    CONFIRM & DECRYPT
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* PHASE 3: PLAY / SOLVE BOARD */}
          {phase === 'solve' && (
            <motion.div
              key="solve"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* LEFT SIDEBAR: HUD stats */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Timer Box */}
                <div className="bg-[#09090b]/80 border border-white/10 p-5 rounded-2xl flex flex-col gap-1 backdrop-blur-md">
                  <div className="flex items-center justify-between text-gray-500 font-bold text-[10px] tracking-wider uppercase">
                    <span>ELAPSED TIMESTACK</span>
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <span className="text-4xl font-black font-mono tracking-wider text-white">
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Score / Multiplier */}
                <div className="bg-[#09090b]/80 border border-white/10 p-5 rounded-2xl flex flex-col gap-1 backdrop-blur-md">
                  <div className="flex items-center justify-between text-gray-500 font-bold text-[10px] tracking-wider uppercase">
                    <span>ESTIMATED SCORE</span>
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#D7FF2F] drop-shadow-[0_0_6px_rgba(215,255,47,0.3)]">
                      {score}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">
                      x{{ easy: 1, insane: 3 }[difficulty]}
                    </span>
                  </div>
                </div>

                {/* Integrity Status */}
                <div className="bg-[#09090b]/80 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 backdrop-blur-md">
                  <div className="text-gray-500 font-bold text-[10px] tracking-wider uppercase">
                    MATRIX INTEGRITY
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="bg-[#D7FF2F] h-full shadow-[0_0_8px_#D7FF2F] transition-all duration-300"
                      style={{
                        width: `${
                          (pieces.filter((p) => p.currentIdx === p.correctIdx).length /
                            pieces.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>SOLVED SLICES:</span>
                    <span>
                      {pieces.filter((p) => p.currentIdx === p.correctIdx).length} /{' '}
                      {pieces.length}
                    </span>
                  </div>
                </div>

                {/* Quit Button */}
                <button
                  onClick={handleQuit}
                  className="w-full py-3.5 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold uppercase text-xs tracking-wider transition-all"
                >
                  TERMINATE RUN
                </button>
              </div>

              {/* CENTER: Puzzle Board */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center">
                {/* Laser Overlay and Hand tracking references */}
                <div
                  ref={boardRef}
                  className="relative w-full border-2 border-white/10 rounded-2xl bg-[#030303] overflow-hidden shadow-2xl p-1"
                  style={{ aspectRatio: '4/3' }}
                >
                  {/* Glowing board framing */}
                  <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none z-10" />

                  {/* Sliced Pieces Map */}
                  {pieces.map((piece) => {
                    const row = Math.floor(piece.currentIdx / gridSize);
                    const col = piece.currentIdx % gridSize;
                    const widthPct = 100 / gridSize;
                    const heightPct = 100 / gridSize;

                    const isHovered = hoveredCellIdx === piece.currentIdx;
                    const isSelected = selectedPieceIdx === piece.currentIdx;

                    let borderStyle = 'border-white/10';
                    if (isSelected) {
                      borderStyle = 'border-[#10B981] z-20 shadow-[0_0_20px_#10B981] ring-2 ring-[#10B981] scale-[0.98]';
                    } else if (isHovered && controlMode === 'hand') {
                      borderStyle = 'border-[#D7FF2F] z-10 shadow-[0_0_15px_#D7FF2F] scale-[0.99]';
                    }

                    return (
                      <motion.div
                        layout
                        key={piece.id}
                        onClick={() => handlePieceClick(piece.currentIdx)}
                        className={`absolute overflow-hidden cursor-pointer transition-all duration-150 ${borderStyle}`}
                        style={{
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                          left: `${col * widthPct}%`,
                          top: `${row * heightPct}%`,
                          padding: '1px',
                        }}
                        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                      >
                        <div className="w-full h-full relative rounded-md overflow-hidden bg-neutral-900">
                          <img
                            src={piece.imageUrl}
                            alt={`slice-${piece.id}`}
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />
                          {/* Slices index tracker */}
                          <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[9px] font-mono text-white/40">
                            {piece.id + 1}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT SIDEBAR: PIP webcam feed for hand tracking */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {controlMode === 'hand' && (
                  <div className="bg-[#09090b]/80 border border-white/10 p-4 rounded-2xl flex flex-col gap-3 backdrop-blur-md">
                    <div className="flex items-center justify-between text-gray-500 font-bold text-[10px] tracking-wider uppercase">
                      <span>GESTURE EYE (WEBCAM)</span>
                      <span className={`w-2 h-2 rounded-full ${handsReady ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                    </div>

                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-white/10 bg-black">
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-70"
                        autoPlay
                        playsInline
                        muted
                      />
                      
                      {/* Wireframe Skeletal overlay canvas */}
                      <canvas
                        ref={skeletonCanvasRef}
                        width="320"
                        height="240"
                        className="absolute inset-0 w-full h-full pointer-events-none z-20"
                      />

                      {!handsReady && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-3">
                          <span className="w-5 h-5 border-2 border-t-transparent border-[#D7FF2F] rounded-full animate-spin mb-2" />
                          <span className="text-[10px] text-gray-400 font-bold">LOADING HAND MODELS...</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Make a <strong className="text-white font-bold">PINCH</strong> gesture (Thumb & Index tips touching) to select and hold. Release pinch over another block to swap.
                    </p>
                  </div>
                )}

                {/* Mouse controls explanation */}
                {controlMode === 'mouse' && (
                  <div className="bg-[#09090b]/80 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 backdrop-blur-md text-xs text-gray-400 leading-relaxed">
                    <div className="text-gray-500 font-bold text-[10px] tracking-wider uppercase">
                      MANUAL METHOD
                    </div>
                    <p>
                      Click once on a piece to select/lift it (highlighted in emerald green), then click another piece to swap their positions.
                    </p>
                    <div className="flex items-center gap-1.5 p-2.5 bg-[#D7FF2F]/5 border border-[#D7FF2F]/20 rounded-xl text-[#D7FF2F] text-[10px] font-bold mt-1">
                      <HelpCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Swap pieces into their correct sequence!</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PHASE 4: LEADERBOARD SCREEN */}
          {phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center"
            >
              <Leaderboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- FLOATING VIRTUAL CURSOR (HAND MODE ONLY) --- */}
      {controlMode === 'hand' && phase === 'solve' && (
        <Cursor x={cursorPos.x} y={cursorPos.y} pinchDetected={pinchDetected} />
      )}

      {/* --- LASER GLOW SVG LINES CONNECTOR --- */}
      {controlMode === 'hand' && phase === 'solve' && selectedPieceIdx !== null && boardRect && (
        <svg className="fixed inset-0 pointer-events-none z-[90]">
          <defs>
            <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="1" />
              <stop offset="100%" stopColor="#D7FF2F" stopOpacity="1" />
            </linearGradient>
          </defs>
          {(() => {
            const row = Math.floor(selectedPieceIdx / gridSize);
            const col = selectedPieceIdx % gridSize;
            const cellW = boardRect.width / gridSize;
            const cellH = boardRect.height / gridSize;

            const startX = boardRect.left + (col + 0.5) * cellW;
            const startY = boardRect.top + (row + 0.5) * cellH;

            const endX = cursorPos.x * window.innerWidth;
            const endY = cursorPos.y * window.innerHeight;

            return (
              <>
                {/* Glowing laser tracer */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="url(#laserGrad)"
                  strokeWidth="3.5"
                  className="opacity-90"
                  style={{
                    filter: 'drop-shadow(0 0 10px #10B981) drop-shadow(0 0 4px #D7FF2F)',
                  }}
                />
                <circle
                  cx={startX}
                  cy={startY}
                  r="6.5"
                  fill="#10B981"
                  style={{
                    filter: 'drop-shadow(0 0 8px #10B981)',
                  }}
                />
              </>
            );
          })()}
        </svg>
      )}

      {/* --- VICTORY ENTRY FORM MODAL --- */}
      <AnimatePresence>
        {showVictoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#09090b] border border-[#D7FF2F]/40 p-6 rounded-2xl flex flex-col relative shadow-[0_0_50px_rgba(215,255,47,0.15)] font-mono text-white"
            >
              {/* Glow Accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D7FF2F]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-[#D7FF2F]/10 border border-[#D7FF2F]/30 text-[#D7FF2F] mb-3 animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black tracking-widest text-white">
                  CORE SECURED!
                </h3>
                <p className="text-xs text-gray-500 uppercase mt-1">
                  DECRYPTION ALGORITHM SUCCESSFUL
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">
                    COMPLETION TIME
                  </span>
                  <span className="text-xl font-bold text-white mt-0.5">{timer}s</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">
                    FINAL SCORE
                  </span>
                  <span className="text-xl font-black text-[#D7FF2F] mt-0.5">{score}</span>
                </div>
              </div>

              {/* Form submit */}
              <form onSubmit={handleScoreSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                    ENTER CALLSIGN PROTOCOL
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="SOLVER_ONE"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 focus:border-[#D7FF2F] px-4 py-3 rounded-xl outline-none transition-colors uppercase font-bold tracking-wider text-center text-[#D7FF2F] text-lg focus:shadow-[0_0_15px_rgba(215,255,47,0.15)]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#D7FF2F] text-black font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_20px_rgba(215,255,47,0.3)] hover:shadow-[0_0_30px_rgba(215,255,47,0.45)] transition-all"
                >
                  UPLOAD STATS TO GRID
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD FOOTER DATA BAR --- */}
      <footer className="w-full px-6 py-3 border-t border-white/5 text-[9px] text-gray-600 flex flex-col md:flex-row justify-between items-center z-20 gap-2 relative bg-black/65 backdrop-blur-sm">
        <div>SYS_NODE: LOCALHOST // SECTOR_88 // SECURITY: ACTIVE</div>
        <div>DESIGNED BY ANTIGRAVITY FOR SHERIYANS PUZZLE HUB</div>
      </footer>
    </div>
  );
};
