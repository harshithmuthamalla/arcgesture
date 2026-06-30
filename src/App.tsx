import { useEffect, useRef, useState } from 'react';
import { useHandTracker } from './hooks/useHandTracker';
import { EffectsCanvas } from './components/EffectsCanvas';
import { GameContainer as PuzzleHandsGame } from './components/PuzzleHandsGame';
import {
  startBackgroundHum,
  stopBackgroundHum,
  updateBackgroundHum,
  playSwitchSound,
  playChimeSound,
  playTickSound,
  startMicrophone,
  stopMicrophone,
  soundCountdownBeep,
  soundSnap,
  soundShatter,
  soundComplete,
  soundSaved,
  soundFail,
  soundBounce,
  soundPowerShot
} from './utils/audio';
import {
  captureVideoFrame,
  applyPhotoboothEffect,
  generatePuzzlePieces,
  isNearOwnCell,
  displaceCellOccupant,
  generatePolaroid,
  buildStripCanvas,
  startShatterPhysics,
  updateShatterParticles,
  drawReactorCore,
  spawnReactorGlitch,
  drawReactorGlitches,
  initPongBall,
  updatePongBall,
  drawPongArena,
  spawnRhythmNote,
  updateRhythmNotes,
  drawRhythmGame
} from './utils/arcadeGames';
import type { PuzzlePiece, ShatterFragment, ReactorGlitch, PongBall, PongPaddle, RhythmNote } from './utils/arcadeGames';

interface Point {
  x: number;
  y: number;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [effectIndex, setEffectIndex] = useState(0);

  // Calibration Steps ('none' | 'raise_hands' | 'spread_hands' | 'complete')
  const [calibStep, setCalibStep] = useState<'none' | 'raise_hands' | 'spread_hands' | 'complete'>('complete');

  // Settings Panel States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [grainMultiplier, setGrainMultiplier] = useState(1.0);
  const [neonMultiplier, setNeonMultiplier] = useState(1.0);
  
  // Use Case Modes ('standard' | 'medical' | 'blueprint' | 'puzzle')
  const [useCase, setUseCase] = useState<'standard' | 'medical' | 'blueprint' | 'puzzle'>('standard');
  const [hoverUseCase, setHoverUseCase] = useState<'standard' | 'medical' | 'blueprint' | 'puzzle' | null>(null);
  const [hoverProgress, setHoverProgress] = useState(0);

  // Audio Reactivity States
  const [audioReactive, setAudioReactive] = useState(false);
  const [audioHoverProgress, setAudioHoverProgress] = useState(0);
  const [lastAudioToggleTime, setLastAudioToggleTime] = useState(0);

  // Standout Document View Zoom & Pan
  const [docZoom, setDocZoom] = useState(1.0);
  const [docPan, setDocPan] = useState({ x: 0, y: 0 });

  // Shockwave Gesture Combo States
  const [shockwaveTime, setShockwaveTime] = useState(-1.0);
  const [shockwaveCenter, setShockwaveCenter] = useState({ x: 0.5, y: 0.5 });
  const lastClapTimeRef = useRef<number>(0);
  const lastClapDistRef = useRef<number>(1.0);

  // Mission Mode Game Loop States (Original HUD scan test)
  const [isMissionActive, setIsMissionActive] = useState(false);
  const [missionTimer, setMissionTimer] = useState(60);
  const [stability, setStability] = useState(50);
  const [gestureAccuracy, setGestureAccuracy] = useState(90);

  // Scorecard States (Original HUD)
  const [showScorecard, setShowScorecard] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalRank, setFinalRank] = useState('TRAINEE');

  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const thumbsUpHoldStartRef = useRef<number>(0);

  // Timer reference for settings panel auto-closing
  const lastRightHandTimeRef = useRef<number>(0);

  // Aspect ratio state styling
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties>({
    width: '100%',
    height: '100%'
  });
  const videoAspect = 16 / 9;

  // ── NEW VIEW STATES ──────────────────────────────────────────────────────────
  const [view, setView] = useState<'hud' | 'arcade' | 'game'>('hud');
  const [currentGame, setCurrentGame] = useState<'reactor' | 'pong' | 'rhythm' | 'puzzlehands' | null>(null);
  const [gameStep, setGameStep] = useState<'calibration' | 'play' | 'result'>('calibration');
  const [arcadeCalibStep, setArcadeCalibStep] = useState<'raise_hands' | 'spread_hands' | 'complete'>('raise_hands');
  const [trackingLost, setTrackingLost] = useState(false);
  const lastTrackingTimeRef = useRef<number>(0);
  const gameTimerRef = useRef<number>(0);




  // ── PUZZLE CAM STATES ────────────────────────────────────────────────────────
  const [puzzlePhase, setPuzzlePhase] = useState<'tracking' | 'countdown' | 'solve' | 'shattering'>('tracking');
  const [puzzlePieces, setPuzzlePieces] = useState<PuzzlePiece[]>([]);
  const [shatterFragments, setShatterFragments] = useState<ShatterFragment[]>([]);
  const [polaroids, setPolaroids] = useState<HTMLCanvasElement[]>([]);
  const [showStripModal, setShowStripModal] = useState(false);
  const [puzzleBox, setPuzzleBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const puzzleFullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPuzzleFistTimeRef = useRef<number>(0);
  const lastCountdownNumberRef = useRef<number>(-1);
  const [placedCount, setPlacedCount] = useState(0);
  const [draggedPiece, setDraggedPiece] = useState<{ index: number; hand: 'L' | 'R'; offsetX: number; offsetY: number } | null>(null);
  const countdownStartRef = useRef<number>(0);

  // ── REACTOR STABILIZER STATES ────────────────────────────────────────────────
  const [reactorStability, setReactorStability] = useState(50.0);
  const [reactorTemp, setReactorTemp] = useState(30.0);
  const [reactorTimer, setReactorTimer] = useState(60);
  const [reactorGlitches, setReactorGlitches] = useState<ReactorGlitch[]>([]);
  const [glitchesCleared, setGlitchesCleared] = useState(0);
  const lastGlitchSpawnTimeRef = useRef<number>(0);
  const lastClapActionTimeRef = useRef<number>(0);

  // ── HOLOPONG STATES ──────────────────────────────────────────────────────────
  const [pongBall, setPongBall] = useState<PongBall | null>(null);
  const [pongPaddleL, setPongPaddleL] = useState<PongPaddle>({ y: 240, height: 80, width: 12, shieldActive: false, shieldTimer: 0 });
  const [pongPaddleR, setPongPaddleR] = useState<PongPaddle>({ y: 240, height: 80, width: 12, shieldActive: false, shieldTimer: 0 });
  const [pongScore, setPongScore] = useState({ player: 0, ai: 0 });
  const [pongWinner, setPongWinner] = useState<'player' | 'ai' | null>(null);
  const [pongPlayMode, setPongPlayMode] = useState<'solo' | 'dual' | 'judge'>('solo');
  const [pongRallyCount, setPongRallyCount] = useState(0);
  const [pongPowerShots, setPongPowerShots] = useState(0);
  const [pongMaxRally, setPongMaxRally] = useState(0);

  // ── RHYTHM HANDS STATES ──────────────────────────────────────────────────────
  const [rhythmNotes, setRhythmNotes] = useState<RhythmNote[]>([]);
  const [rhythmScore, setRhythmScore] = useState(0);
  const [rhythmCombo, setRhythmCombo] = useState(0);
  const [rhythmMaxCombo, setRhythmMaxCombo] = useState(0);
  const [rhythmTimer, setRhythmTimer] = useState(60);
  const [rhythmDifficulty, setRhythmDifficulty] = useState<'easy' | 'normal' | 'expert'>('normal');
  const lastNoteSpawnTimeRef = useRef<number>(0);
  const [rhythmFeedback, setRhythmFeedback] = useState<{ text: string; color: string; time: number } | null>(null);
  const [rhythmHits, setRhythmHits] = useState({ perfect: 0, good: 0, late: 0, miss: 0 });
  const [cameraReleased, setCameraReleased] = useState(true);
  const [medicalDiagramIndex, setMedicalDiagramIndex] = useState(0);

  // Expose tracker API
  const {
    modelsReady,
    errorMsg,
    effectMode,
    pointsState,
    pointsRef,
    leftAttractor,
    rightAttractor,
    leftVelocity,
    rightVelocity,
    leftDepth,
    rightDepth,
    pinchLActive,
    pinchRActive,
    isThumbsUpL,
    isThumbsUpR,
    isFistL,
    isFistR,
    isFieldLocked,
    clapDist,
    rawLandmarks,
    controlMapping,
    setControlMapping,
    processFrame,
    setErrorMsg
  } = useHandTracker(videoRef, canvasRef, () => {
    if (useCase === 'medical') {
      setMedicalDiagramIndex((prev) => (prev + 1) % 3);
    } else {
      setEffectIndex((prev) => (prev + 1) % 7);
    }
  });

  // Video aspect ratio resize logic
  useEffect(() => {
    const handleResize = () => {
      const windowAspect = window.innerWidth / window.innerHeight;
      if (windowAspect > videoAspect) {
        setContainerStyle({
          width: `${window.innerHeight * videoAspect}px`,
          height: '100%'
        });
      } else {
        setContainerStyle({
          width: '100%',
          height: `${window.innerWidth / videoAspect}px`
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [videoAspect]);

  // Keyboard Shortcuts Fallback for Demo Safety
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view === 'hud') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          playSwitchSound();
          setEffectIndex((prev) => (prev + 1) % 7);
        } else if (e.key === '1') {
          setUseCase('standard');
          playChimeSound();
        } else if (e.key === '2') {
          setUseCase('medical');
          playChimeSound();
        } else if (e.key === '3') {
          setUseCase('blueprint');
          playChimeSound();
        } else if (e.key === '4') {
          setUseCase('puzzle');
          playChimeSound();
        }
      } else if (view === 'game' && gameStep === 'play') {
        if (e.key === 'Escape') {
          setView('arcade');
          setCurrentGame(null);
          playSwitchSound();
        } else if (e.key === 'r' || e.key === 'R') {
          // Restart game
          if (currentGame === 'reactor') {
            setReactorStability(50);
            setReactorTemp(30);
            setReactorTimer(60);
            setReactorGlitches([]);
            setGlitchesCleared(0);
          } else if (currentGame === 'pong') {
            setPongScore({ player: 0, ai: 0 });
            setPongWinner(null);
            setPongRallyCount(0);
            setPongPowerShots(0);
            setPongMaxRally(0);
            if (canvasRef.current) {
              const box = { x: 30, y: 100, width: canvasRef.current.width - 60, height: canvasRef.current.height - 180 };
              setPongBall(initPongBall(box));
            }
          } else if (currentGame === 'rhythm') {
            setRhythmScore(0);
            setRhythmCombo(0);
            setRhythmMaxCombo(0);
            setRhythmTimer(60);
            setRhythmNotes([]);
            setRhythmHits({ perfect: 0, good: 0, late: 0, miss: 0 });
          }
          playSwitchSound();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, gameStep, currentGame]);

  // Background Audio Controller
  useEffect(() => {
    if (rawLandmarks.length > 0 && calibStep === 'complete') {
      startBackgroundHum();
      const avgDepth = (leftDepth + rightDepth) / 2;
      updateBackgroundHum(avgDepth);
    } else {
      stopBackgroundHum();
    }
  }, [rawLandmarks, leftDepth, rightDepth, calibStep]);

  // Webcam setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;
    const shouldRunCamera = useCase !== 'puzzle' && currentGame !== 'puzzlehands';

    const setupCamera = async () => {
      if (!shouldRunCamera) {
        setVideoReady(false);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        // Wait 350ms to ensure browser releases the camera lock before mounting iframe
        setTimeout(() => {
          if (active) setCameraReleased(true);
        }, 350);
        return;
      }

      setCameraReleased(false);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Webcam media access API is not available.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              if (active) setVideoReady(true);
            });
          };
        }
      } catch (err: any) {
        console.error(err);
        if (active) setErrorMsg(err.message || 'Webcam access denied.');
      }
    };

    setupCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraReleased(false);
      stopBackgroundHum();
      stopMicrophone();
    };
  }, [setErrorMsg, useCase, currentGame]);

  // MediaRecorder canvas recording export
  const startRecording = () => {
    try {
      const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
      if (!canvas) return;

      recordedChunksRef.current = [];
      const stream = canvas.captureStream(30);

      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      const recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      const gameName = currentGame || 'hologram';
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `arcgesture-arcade-${gameName}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Record for 5 seconds automatically
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 5000);
    } catch (err) {
      console.error('Recording initialization failed:', err);
      setIsRecording(false);
    }
  };

  // Original HUD Mission Mode Timer Hook
  useEffect(() => {
    let timerId: number;
    if (isMissionActive && missionTimer > 0) {
      timerId = window.setInterval(() => {
        setMissionTimer((prev) => {
          if (prev <= 1) {
            setIsMissionActive(false);
            const score = Math.round(stability * 50 + gestureAccuracy * 50);
            setFinalScore(score);
            let rank = 'TRAINEE';
            if (score > 9000) rank = 'S-CLASS HOLO OPERATOR';
            else if (score > 7500) rank = 'A-CLASS HOLO OPERATOR';
            else if (score > 5000) rank = 'B-CLASS HOLO OPERATOR';
            setFinalRank(rank);
            setShowScorecard(true);
            playChimeSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isMissionActive, missionTimer, stability, gestureAccuracy]);

  // Main operational loop
  useEffect(() => {
    let animationId: number;
    let lastFrameTime = performance.now();

    const loop = () => {
      processFrame();

      const now = performance.now();
      const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const handsPresent = rawLandmarks.length > 0;

      // Thumbs-up hold for recording (Arcade view / Game view)
      const thumbsUpActive = isThumbsUpL || isThumbsUpR;
      if (thumbsUpActive && view !== 'hud') {
        if (thumbsUpHoldStartRef.current === 0) {
          thumbsUpHoldStartRef.current = now;
        } else {
          const elapsed = now - thumbsUpHoldStartRef.current;
          setRecordingProgress(Math.min(100, (elapsed / 2000) * 100));
          if (elapsed > 2000 && !isRecording) {
            startRecording();
            thumbsUpHoldStartRef.current = 0;
            setRecordingProgress(0);
          }
        }
      } else {
        thumbsUpHoldStartRef.current = 0;
        setRecordingProgress(0);
      }

      // --- VIEW SCHEMES ────────────────────────────────────────────────────────

      if (view === 'hud') {
        // Original HUD Gesture combo calibrations and hit boxes
        if (calibStep === 'raise_hands' && handsPresent) {
          setCalibStep('spread_hands');
          playSwitchSound();
        } else if (calibStep === 'spread_hands' && handsPresent) {
          if (clapDist > 0.42) {
            setCalibStep('complete');
            playSwitchSound();
          }
        }

        if (calibStep === 'complete' && handsPresent) {
          // --- GESTURE COMBO: PORTAL SHOCKWAVE ---
          if (clapDist < 0.20) {
            lastClapTimeRef.current = now;
            lastClapDistRef.current = clapDist;
          } else if (now - lastClapTimeRef.current < 450) {
            const expansionSpeed = (clapDist - lastClapDistRef.current) / ((now - lastClapTimeRef.current) / 1000);
            if (expansionSpeed > 1.4 && shockwaveTime < 0.0) {
              setShockwaveTime(0.0);
              setShockwaveCenter({
                x: (1.0 - leftAttractor.x + (1.0 - rightAttractor.x)) / 2,
                y: (leftAttractor.y + rightAttractor.y) / 2
              });
              playSwitchSound();
            }
          }

          if (shockwaveTime >= 0.0) {
            setShockwaveTime((prev) => {
              const next = prev + 0.016;
              return next >= 0.8 ? -1.0 : next;
            });
          }

          // Document Zoom & Pan (MRI / Blueprint)
          if (useCase !== 'standard' && useCase !== 'puzzle') {
            const targetZoom = Math.max(0.2, Math.min(3.0, 0.4 + (clapDist - 0.15) * 4.5));
            setDocZoom(targetZoom);

            const midX = (leftAttractor.x + rightAttractor.x) / 2;
            const midY = (leftAttractor.y + rightAttractor.y) / 2;
            setDocPan({
              x: (midX - 0.5) * 1.3,
              y: (midY - 0.5) * 1.3
            });
          }

          // Bounding box SVG points calculation in Standard Mode
          if (useCase === 'standard') {
            // pointsState contains calculated corners
          }

          // Original HUD settings panel trigger and hover sliders
          const screenXL = 1.0 - leftAttractor.x;
          const screenYL = leftAttractor.y;
          const screenXR = 1.0 - rightAttractor.x;
          const screenYR = rightAttractor.y;

          let currentHover: 'standard' | 'medical' | 'blueprint' | 'puzzle' | null = null;
          const checkHoverBtn = (mx: number, my: number) => {
            if (my >= 0.02 && my <= 0.12) {
              if (mx >= 0.22 && mx <= 0.34) return 'standard';
              if (mx >= 0.38 && mx <= 0.50) return 'medical';
              if (mx >= 0.54 && mx <= 0.66) return 'blueprint';
              if (mx >= 0.70 && mx <= 0.82) return 'puzzle';
            }
            return null;
          };

          const hoverL = checkHoverBtn(screenXL, screenYL);
          const hoverR = checkHoverBtn(screenXR, screenYR);
          currentHover = hoverL || hoverR;

          if (currentHover) {
            setHoverUseCase(currentHover);
            setHoverProgress((prev) => {
              const next = prev + 2.0;
              if (next >= 100) {
                setUseCase(currentHover!);
                playChimeSound();
                return 0;
              }
              if (Math.floor(next) % 25 === 0 && Math.floor(prev) % 25 !== Math.floor(next) % 25) {
                playTickSound();
              }
              return next;
            });
          } else {
            setHoverUseCase(null);
            setHoverProgress(0);
          }

          // HUD settings panel trigger
          if (screenXL > 0.85 || screenXR > 0.85) {
            setIsSettingsOpen(true);
            lastRightHandTimeRef.current = now;
          } else {
            if (now - lastRightHandTimeRef.current > 3500) {
              setIsSettingsOpen(false);
            }
          }

          if (isSettingsOpen) {
            const checkSliderAndToggle = (att: typeof leftAttractor) => {
              const mx = 1.0 - att.x;
              const my = att.y;

              if (mx > 0.78) {
                const val = Math.max(0.0, Math.min(1.0, (mx - 0.80) / 0.16));
                if (my >= 0.20 && my <= 0.28) {
                  setSpeedMultiplier(0.1 + val * 2.9);
                  if (Math.random() < 0.12) playTickSound();
                } else if (my >= 0.35 && my <= 0.43) {
                  setGrainMultiplier(val * 3.0);
                  if (Math.random() < 0.12) playTickSound();
                } else if (my >= 0.50 && my <= 0.58) {
                  setNeonMultiplier(val * 3.0);
                  if (Math.random() < 0.12) playTickSound();
                }
              }
              return mx >= 0.78 && my >= 0.65 && my <= 0.73;
            };

            const activeAudioL = checkSliderAndToggle(leftAttractor);
            const activeAudioR = checkSliderAndToggle(rightAttractor);
            if (activeAudioL || activeAudioR) {
              setAudioHoverProgress((prev) => {
                const next = prev + 2.0;
                if (next >= 100 && now - lastAudioToggleTime > 1500) {
                  setLastAudioToggleTime(now);
                  setAudioReactive((act) => {
                    const ns = !act;
                    if (ns) startMicrophone();
                    else stopMicrophone();
                    return ns;
                  });
                  playChimeSound();
                  return 0;
                }
                if (Math.floor(next) % 25 === 0 && Math.floor(prev) % 25 !== Math.floor(next) % 25) {
                  playTickSound();
                }
                return next;
              });
            } else {
              setAudioHoverProgress(0);
            }
          }
        }

        // --- PUZZLE CAM USE CASE RUNNER ---
        if (useCase === 'puzzle' && canvasRef.current) {
          const canvasEl = canvasRef.current;
          const ctx2 = canvasEl.getContext('2d');
          if (ctx2) {
            // Draw skeleton landmarks in the frame
            ctx2.clearRect(0, 0, canvasEl.width, canvasEl.height);

            // Calculate current frame box between index attractors
            if (puzzlePhase === 'tracking') {
              if (rawLandmarks.length === 2) {
                const sorted = [...rawLandmarks].sort((a, b) => (1 - b[0].x) - (1 - a[0].x));
                const idxL = { x: (1.0 - sorted[0][8].x) * canvasEl.width, y: sorted[0][8].y * canvasEl.height };
                const idxR = { x: (1.0 - sorted[1][8].x) * canvasEl.width, y: sorted[1][8].y * canvasEl.height };

                // Bounding box coordinates with padding
                const pad = 24;
                const minX = Math.min(idxL.x, idxR.x) - pad;
                const maxX = Math.max(idxL.x, idxR.x) + pad;
                const minY = Math.min(idxL.y, idxR.y) - pad;
                const maxY = Math.max(idxL.y, idxR.y) + pad;

                const curBox = {
                  x: Math.max(0, minX),
                  y: Math.max(0, minY),
                  width: Math.min(canvasEl.width, maxX) - Math.max(0, minX),
                  height: Math.min(canvasEl.height, maxY) - Math.max(0, minY)
                };

                setPuzzleBox(curBox);

                // Draw yellow photobooth bounding box
                ctx2.strokeStyle = '#f5c518';
                ctx2.lineWidth = 3.0;
                ctx2.strokeRect(curBox.x, curBox.y, curBox.width, curBox.height);

                // Corner lines
                const cornerLen = 16;
                ctx2.lineWidth = 4;
                const corners = [
                  [curBox.x, curBox.y, 1, 1],
                  [curBox.x + curBox.width, curBox.y, -1, 1],
                  [curBox.x, curBox.y + curBox.height, 1, -1],
                  [curBox.x + curBox.width, curBox.y + curBox.height, -1, -1]
                ];
                corners.forEach(([cx, cy, dx, dy]) => {
                  ctx2.beginPath();
                  ctx2.moveTo(cx, cy + cornerLen * dy);
                  ctx2.lineTo(cx, cy);
                  ctx2.lineTo(cx + cornerLen * dx, cy);
                  ctx2.stroke();
                });

                // If both hands pinching, start countdown
                if (pinchLActive && pinchRActive && curBox.width > 50 && curBox.height > 50) {
                  setPuzzlePhase('countdown');
                  countdownStartRef.current = now;
                  lastCountdownNumberRef.current = -1;
                }
              }
            } else if (puzzlePhase === 'countdown') {
              const elapsed = (now - countdownStartRef.current) / 1000;
              const remaining = 3 - elapsed;
              if (remaining <= 0) {
                // Snapshot capture
                if (videoRef.current && puzzleBox) {
                  const crop = captureVideoFrame(videoRef.current, puzzleBox, canvasEl.width, canvasEl.height);
                  
                  // Color frame for Polaroid Strip
                  const color = document.createElement('canvas');
                  color.width = crop.width;
                  color.height = crop.height;
                  color.getContext('2d')?.drawImage(crop, 0, 0);
                  applyPhotoboothEffect(color, false);
                  puzzleFullCanvasRef.current = color;

                  // B&W frame for puzzle pieces
                  const bw = document.createElement('canvas');
                  bw.width = crop.width;
                  bw.height = crop.height;
                  bw.getContext('2d')?.drawImage(crop, 0, 0);
                  applyPhotoboothEffect(bw, true);

                  const pieces = generatePuzzlePieces(color, bw, puzzleBox, 3);
                  setPuzzlePieces(pieces);
                  setPuzzlePhase('solve');

                  // Shutter flash effect
                  const flash = document.getElementById('flash-overlay');
                  if (flash) {
                    flash.classList.add('flash');
                    setTimeout(() => flash.classList.remove('flash'), 100);
                  }
                  soundCountdownBeep(1); // flash feedback beep
                  soundShatter();
                } else {
                  setPuzzlePhase('tracking');
                }
              } else {
                // Render countdown beeps and number overlay
                const n = Math.ceil(remaining);
                if (n !== lastCountdownNumberRef.current) {
                  lastCountdownNumberRef.current = n;
                  soundCountdownBeep(n);
                }

                if (puzzleBox) {
                  ctx2.fillStyle = 'rgba(10, 10, 8, 0.45)';
                  ctx2.fillRect(puzzleBox.x, puzzleBox.y, puzzleBox.width, puzzleBox.height);
                  ctx2.strokeStyle = '#f5c518';
                  ctx2.lineWidth = 3;
                  ctx2.strokeRect(puzzleBox.x, puzzleBox.y, puzzleBox.width, puzzleBox.height);

                  ctx2.fillStyle = '#f5c518';
                  ctx2.font = `bold ${Math.max(36, puzzleBox.width * 0.3)}px monospace`;
                  ctx2.textAlign = 'center';
                  ctx2.textBaseline = 'middle';
                  ctx2.fillText(String(n), puzzleBox.x + puzzleBox.width / 2, puzzleBox.y + puzzleBox.height / 2);
                }
              }
            } else if (puzzlePhase === 'solve' && puzzleBox) {
              // Drag and drop hit detection using Attractors
              const pxL = { x: (1.0 - leftAttractor.x) * canvasEl.width, y: leftAttractor.y * canvasEl.height };
              const pxR = { x: (1.0 - rightAttractor.x) * canvasEl.width, y: rightAttractor.y * canvasEl.height };
              
              const tileW = Math.floor(puzzleBox.width / 3);
              const tileH = Math.floor(puzzleBox.height / 3);

              const handleDrag = (hand: 'L' | 'R', active: boolean, px: Point) => {
                if (active) {
                  if (!draggedPiece) {
                    // Find nearest piece
                    let best = null;
                    let bestDist = Infinity;
                    for (let i = 0; i < puzzlePieces.length; i++) {
                      const p = puzzlePieces[i];
                      if (p.displacing || p.placed) continue;
                      const cx = p.x + p.w / 2;
                      const cy = p.y + p.h / 2;
                      const d = Math.hypot(px.x - cx, px.y - cy);
                      if (d < Math.max(p.w, p.h) * 0.75 && d < bestDist) {
                        best = i;
                        bestDist = d;
                      }
                    }
                    if (best !== null) {
                      setDraggedPiece({
                        index: best,
                        hand,
                        offsetX: px.x - puzzlePieces[best].x,
                        offsetY: px.y - puzzlePieces[best].y
                      });
                      puzzlePieces[best].dragging = true;
                      puzzlePieces[best].placed = false;
                    }
                  } else if (draggedPiece.hand === hand) {
                    const p = puzzlePieces[draggedPiece.index];
                    p.x = px.x - draggedPiece.offsetX;
                    p.y = px.y - draggedPiece.offsetY;
                  }
                } else if (draggedPiece && draggedPiece.hand === hand) {
                  const p = puzzlePieces[draggedPiece.index];
                  p.dragging = false;
                  
                  if (isNearOwnCell(p, puzzleBox, tileW, tileH, 0.75)) {
                    displaceCellOccupant(puzzlePieces, p, p.row, p.col, puzzleBox, tileW, tileH, 3, 220);
                    p.x = puzzleBox.x + p.col * tileW;
                    p.y = puzzleBox.y + p.row * tileH;
                    p.placed = true;
                    soundSnap();
                  } else {
                    // clamp within boundary bounds
                    p.x = Math.min(Math.max(p.x, puzzleBox.x), puzzleBox.x + puzzleBox.width - p.w);
                    p.y = Math.min(Math.max(p.y, puzzleBox.y), puzzleBox.y + puzzleBox.height - p.h);
                    
                    const cx = p.x + p.w / 2;
                    const cy = p.y + p.h / 2;
                    const dropCol = Math.min(2, Math.max(0, Math.floor((cx - puzzleBox.x) / tileW)));
                    const dropRow = Math.min(2, Math.max(0, Math.floor((cy - puzzleBox.y) / tileH)));
                    displaceCellOccupant(puzzlePieces, p, dropRow, dropCol, puzzleBox, tileW, tileH, 3, 220);
                  }
                  
                  setDraggedPiece(null);
                  
                  // Check win
                  const isWin = puzzlePieces.every(p => p.placed);
                  if (isWin) {
                    soundComplete();
                  }
                }
              };

              handleDrag('L', pinchLActive, pxL);
              handleDrag('R', pinchRActive, pxR);

              // Render puzzle grid background
              ctx2.fillStyle = '#000000';
              ctx2.fillRect(puzzleBox.x, puzzleBox.y, puzzleBox.width, puzzleBox.height);

              ctx2.strokeStyle = 'rgba(245, 197, 24, 0.2)';
              ctx2.lineWidth = 1;
              for (let i = 1; i < 3; i++) {
                ctx2.beginPath();
                ctx2.moveTo(puzzleBox.x + i * tileW, puzzleBox.y);
                ctx2.lineTo(puzzleBox.x + i * tileW, puzzleBox.y + puzzleBox.height);
                ctx2.stroke();
                ctx2.beginPath();
                ctx2.moveTo(puzzleBox.x, puzzleBox.y + i * tileH);
                ctx2.lineTo(puzzleBox.x + puzzleBox.width, puzzleBox.y + i * tileH);
                ctx2.stroke();
              }

              // Render pieces (placed pieces show color canvas, dragging gets shadow glow)
              const sortedPieces = [...puzzlePieces].sort((a, b) => (a.dragging ? 1 : 0) - (b.dragging ? 1 : 0));
              sortedPieces.forEach((p) => {
                ctx2.save();
                if (p.dragging) {
                  ctx2.shadowColor = 'rgba(245, 197, 24, 0.9)';
                  ctx2.shadowBlur = 12;
                }
                ctx2.drawImage(p.placed ? p.colorCanvas : p.canvas, p.x, p.y, p.w, p.h);
                ctx2.strokeStyle = p.placed ? '#10b981' : 'rgba(234, 229, 214, 0.5)';
                ctx2.lineWidth = p.dragging ? 3 : 1.5;
                ctx2.strokeRect(p.x, p.y, p.w, p.h);
                ctx2.restore();
              });

              // Bounding border box
              const isWin = puzzlePieces.every(p => p.placed);
              ctx2.strokeStyle = isWin ? '#10b981' : '#f5c518';
              ctx2.lineWidth = 3.0;
              ctx2.strokeRect(puzzleBox.x, puzzleBox.y, puzzleBox.width, puzzleBox.height);

              // Complete notice
              if (isWin) {
                ctx2.fillStyle = 'rgba(16, 185, 129, 0.15)';
                ctx2.fillRect(puzzleBox.x, puzzleBox.y, puzzleBox.width, puzzleBox.height);
                ctx2.fillStyle = '#10b981';
                ctx2.font = `bold ${Math.max(12, puzzleBox.width * 0.05)}px monospace`;
                ctx2.textAlign = 'center';
                ctx2.textBaseline = 'middle';
                ctx2.fillText('COMPLETE! - FIST TO SAVE', puzzleBox.x + puzzleBox.width / 2, puzzleBox.y + puzzleBox.height / 2);

                // Fist lock gesture resets and shatters to Polaroid strip
                const fistActive = isFistL || isFistR;
                if (fistActive) {
                  if (lastPuzzleFistTimeRef.current === 0) {
                    lastPuzzleFistTimeRef.current = now;
                  } else if (now - lastPuzzleFistTimeRef.current > 400) {
                    lastPuzzleFistTimeRef.current = 0;
                    setPuzzlePhase('shattering');
                    setShatterFragments(startShatterPhysics(puzzleFullCanvasRef.current!, puzzleBox, 6, 6));
                    soundShatter();
                  }
                } else {
                  lastPuzzleFistTimeRef.current = 0;
                }
              }

              // Update progress state
              const placed = puzzlePieces.filter(p => p.placed).length;
              setPlacedCount(placed);
            } else if (puzzlePhase === 'shattering') {
              const elapsed = now - countdownStartRef.current;
              const active = updateShatterParticles(shatterFragments, dt, 850, elapsed);
              
              if (active) {
                shatterFragments.forEach((frag) => {
                  ctx2.save();
                  ctx2.globalAlpha = frag.alpha;
                  ctx2.translate(frag.x, frag.y);
                  ctx2.rotate(frag.rotation);
                  ctx2.scale(frag.scale, frag.scale);
                  ctx2.drawImage(frag.canvas, -frag.w / 2, -frag.h / 2, frag.w, frag.h);
                  ctx2.restore();
                });
              } else {
                // Done shattering: compile Polaroid photo
                const polaroid = generatePolaroid(puzzleFullCanvasRef.current!, polaroids.length + 1);
                const updatedPolaroids = [...polaroids, polaroid];
                setPolaroids(updatedPolaroids);
                soundSaved();

                // If 3 photos completed, show strip completing popup
                if (updatedPolaroids.length >= 3) {
                  setShowStripModal(true);
                }

                // Reset back to tracking phase
                setPuzzlePhase('tracking');
                setPuzzlePieces([]);
                setShatterFragments([]);
                setPuzzleBox(null);
                puzzleFullCanvasRef.current = null;
              }
            }
          }
        }
      } 
      
      // ── GAME PLAY MODE RUNNER ────────────────────────────────────────────────
      
      else if (view === 'game' && canvasRef.current) {
        const canvasEl = canvasRef.current;
        const ctx2 = canvasEl.getContext('2d');
        if (ctx2) {
          ctx2.clearRect(0, 0, canvasEl.width, canvasEl.height);

          // Watchdog tracking loss grace timer
          if (rawLandmarks.length === 0) {
            if (lastTrackingTimeRef.current === 0) {
              lastTrackingTimeRef.current = now;
            } else if (now - lastTrackingTimeRef.current > 600) {
              setTrackingLost(true);
            }
          } else {
            lastTrackingTimeRef.current = 0;
            setTrackingLost(false);
          }

          if (gameStep === 'calibration') {
            // Calibration overlay guide updates
            if (arcadeCalibStep === 'raise_hands') {
              if (rawLandmarks.length === 2) {
                setArcadeCalibStep('spread_hands');
                playSwitchSound();
              }
            } else if (arcadeCalibStep === 'spread_hands') {
              if (rawLandmarks.length === 2 && clapDist > 0.42) {
                setArcadeCalibStep('complete');
                playSwitchSound();
                setTimeout(() => {
                  setGameStep('play');
                  gameTimerRef.current = now;
                  
                  // Initialize specific game states
                  if (currentGame === 'reactor') {
                    setReactorStability(50);
                    setReactorTemp(30);
                    setReactorTimer(60);
                    setReactorGlitches([]);
                    setGlitchesCleared(0);
                  } else if (currentGame === 'pong') {
                    setPongScore({ player: 0, ai: 0 });
                    setPongWinner(null);
                    setPongRallyCount(0);
                    setPongPowerShots(0);
                    setPongMaxRally(0);
                    const box = { x: 30, y: 100, width: canvasEl.width - 60, height: canvasEl.height - 180 };
                    setPongBall(initPongBall(box));
                  } else if (currentGame === 'rhythm') {
                    setRhythmScore(0);
                    setRhythmCombo(0);
                    setRhythmMaxCombo(0);
                    setRhythmTimer(60);
                    setRhythmNotes([]);
                    setRhythmHits({ perfect: 0, good: 0, late: 0, miss: 0 });
                  }
                }, 1000);
              }
            }
          } else if (gameStep === 'play' && !trackingLost) {
            
            // ── REACTOR STABILIZER GAMEPLAY LOOP ──
            if (currentGame === 'reactor') {
              const box = { x: 40, y: 100, width: canvasEl.width - 80, height: canvasEl.height - 160 };
              const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

              // Stability and timer updates
              const timeElapsed = (now - gameTimerRef.current) / 1000;
              const remainingTime = Math.max(0, 60 - Math.floor(timeElapsed));
              setReactorTimer(remainingTime);

              // Spawn Glitches
              if (now - lastGlitchSpawnTimeRef.current > 3500 && reactorGlitches.length < 4) {
                lastGlitchSpawnTimeRef.current = now;
                setReactorGlitches(prev => [...prev, spawnReactorGlitch(box)]);
              }

              // Stability Decay
              let decay = 1.0 * dt;
              decay += reactorGlitches.length * 0.8 * dt;
              if (isFieldLocked) {
                decay = 0; // Fist locked
              }
              if (reactorTemp > 100) {
                decay += 6 * dt; // overheating penalty
              }

              // Hands spread boost stability
              let boost = 0;
              if (clapDist > 0.45) {
                boost += 3.5 * dt;
              }

              // Target coordinate conversions
              const pxL = { x: (1.0 - leftAttractor.x) * canvasEl.width, y: leftAttractor.y * canvasEl.height };
              const pxR = { x: (1.0 - rightAttractor.x) * canvasEl.width, y: rightAttractor.y * canvasEl.height };

              // Scan node glitches with pinch hold
              reactorGlitches.forEach((g) => {
                const gx = box.x + g.x * box.width;
                const gy = box.y + g.y * box.height;

                const checkScan = (px: Point, active: boolean) => {
                  if (active && Math.hypot(px.x - gx, px.y - gy) < g.size * 2) {
                    g.clearedProgress = Math.min(100, g.clearedProgress + 100 * dt);
                  }
                };
                checkScan(pxL, pinchLActive);
                checkScan(pxR, pinchRActive);

                // Swipe velocity clean
                const checkSwipe = (px: Point, vel: Point) => {
                  const velMag = Math.hypot(vel.x, vel.y);
                  if (velMag > 1.2 && Math.hypot(px.x - gx, px.y - gy) < g.size * 2) {
                    g.clearedProgress = Math.min(100, g.clearedProgress + 150 * dt);
                  }
                };
                checkSwipe(pxL, leftVelocity);
                checkSwipe(pxR, rightVelocity);
              });

              // Clap Shockwave combo
              if (clapDist < 0.20 && now - lastClapActionTimeRef.current > 1500) {
                lastClapActionTimeRef.current = now;
                setShockwaveTime(0.0);
                setShockwaveCenter({
                  x: (1.0 - leftAttractor.x + (1.0 - rightAttractor.x)) / 2,
                  y: (leftAttractor.y + rightAttractor.y) / 2
                });
                soundShatter();

                // Clear glitches within range
                const scPx = { x: shockwaveCenter.x * canvasEl.width, y: shockwaveCenter.y * canvasEl.height };
                reactorGlitches.forEach((g) => {
                  const gx = box.x + g.x * box.width;
                  const gy = box.y + g.y * box.height;
                  if (Math.hypot(scPx.x - gx, scPx.y - gy) < 180) {
                    g.clearedProgress = 100;
                  }
                });
              }

              // Shockwave timer increment
              if (shockwaveTime >= 0.0) {
                setShockwaveTime((prev) => {
                  const next = prev + 0.016;
                  return next >= 0.8 ? -1.0 : next;
                });
              }

              // Temperature updates based on depth
              const avgDepth = (leftDepth + rightDepth) / 2;
              if (avgDepth > 0.65) {
                // Boost mode
                setReactorTemp(prev => Math.min(130, prev + 12 * dt));
                boost += 6 * dt;
              } else if (avgDepth < 0.25) {
                // Cool mode
                setReactorTemp(prev => Math.max(10, prev - 15 * dt));
              } else {
                // Ambient equilibrium
                setReactorTemp(prev => prev + (30 - prev) * 0.05);
              }

              // Apply stability updates
              setReactorStability(prev => {
                const next = Math.max(0, Math.min(100, prev + boost - decay));
                return next;
              });

              // Remove cleared glitches
              const activeGlitches = reactorGlitches.filter((g) => {
                if (g.clearedProgress >= 100) {
                  setGlitchesCleared(prev => prev + 1);
                  playTickSound();
                  return false;
                }
                return true;
              });
              if (activeGlitches.length !== reactorGlitches.length) {
                setReactorGlitches(activeGlitches);
              }

              // Draw
              drawReactorCore(ctx2, center, 72, reactorStability, reactorTemp, timeElapsed, isFieldLocked);
              drawReactorGlitches(ctx2, reactorGlitches, box, timeElapsed);

              // Victory stabilizer thumbs-up finalization or Success timer end
              if (thumbsUpActive && reactorStability > 80) {
                soundComplete();
                setGameStep('result');
                const score = Math.round(reactorStability * 60 + glitchesCleared * 220 + remainingTime * 40 - (reactorTemp > 100 ? 500 : 0));
                setFinalScore(score);
                setFinalRank('Spatial Engineer');
              } else if (remainingTime <= 0) {
                if (reactorStability >= 60) {
                  soundComplete();
                  setGameStep('result');
                  const score = Math.round(reactorStability * 60 + glitchesCleared * 220 - (reactorTemp > 100 ? 500 : 0));
                  setFinalScore(score);
                  let rank = 'Reactor Operator';
                  if (score > 9000) rank = 'Spatial Engineer';
                  else if (score > 5000) rank = 'Reactor Operator';
                  else rank = 'Field Technician';
                  setFinalRank(rank);
                } else {
                  soundFail();
                  setGameStep('result');
                  setFinalScore(0);
                  setFinalRank('System Unstable');
                }
              } else if (reactorStability <= 0) {
                soundFail();
                setGameStep('result');
                setFinalScore(0);
                setFinalRank('System Unstable');
              }
            }
            
            // ── HOLOPONG GAMEPLAY LOOP ──
            else if (currentGame === 'pong' && pongBall) {
              const box = { x: 30, y: 100, width: canvasEl.width - 60, height: canvasEl.height - 180 };

              // Paddles scale bounds
              const mapPaddleY = (attractor: Point) => {
                const screenY = attractor.y;
                return box.y + screenY * box.height;
              };

              // Map left paddle Y from hand attractor Y
              const targetLY = mapPaddleY(leftAttractor);
              setPongPaddleL(prev => ({
                ...prev,
                y: prev.y + (targetLY - prev.y) * 0.25 // smooth interpolation
              }));

              // Right paddle Y behavior (Solo AI or Right hand)
              if (pongPlayMode === 'solo' || pongPlayMode === 'judge') {
                // AI Tracks Ball
                const aiY = pongPaddleR.y;
                const diffY = pongBall.y - aiY;
                const trackingSpeed = pongPlayMode === 'judge' ? 4.5 : 3.8;
                setPongPaddleR(prev => ({
                  ...prev,
                  y: prev.y + Math.sign(diffY) * Math.min(Math.abs(diffY), trackingSpeed)
                }));
              } else {
                // Dual mode hand controls
                const targetRY = mapPaddleY(rightAttractor);
                setPongPaddleR(prev => ({
                  ...prev,
                  y: prev.y + (targetRY - prev.y) * 0.25
                }));
              }

              // Paddle Shield fist triggers
              if (isFistL) {
                setPongPaddleL(prev => ({ ...prev, shieldActive: true }));
              } else {
                setPongPaddleL(prev => ({ ...prev, shieldActive: false }));
              }
              if (isFistR && pongPlayMode === 'dual') {
                setPongPaddleR(prev => ({ ...prev, shieldActive: true }));
              } else {
                setPongPaddleR(prev => ({ ...prev, shieldActive: false }));
              }

              // Power shot pinch multiplier
              if (pinchLActive) {
                pongBall.speedMultiplier = 1.6;
              } else {
                pongBall.speedMultiplier = 1.0;
              }

              // Update Ball
              updatePongBall(
                pongBall,
                pongPaddleL,
                pongPaddleR,
                box,
                dt,
                () => {
                  soundBounce();
                  setPongRallyCount(prev => {
                    const next = prev + 1;
                    if (next > pongMaxRally) setPongMaxRally(next);
                    return next;
                  });
                  if (pinchLActive) {
                    setPongPowerShots(prev => prev + 1);
                    soundPowerShot();
                  }
                },
                (winner) => {
                  // Point scored
                  soundComplete();
                  setPongRallyCount(0);
                  setPongScore(prev => {
                    const next = { ...prev };
                    if (winner === 'player') next.player += 1;
                    else next.ai += 1;

                    // Victory target score
                    const winScore = pongPlayMode === 'judge' ? 3 : 5;
                    if (next.player >= winScore || next.ai >= winScore) {
                      setPongWinner(next.player >= winScore ? 'player' : 'ai');
                      setTimeout(() => {
                        setGameStep('result');
                        const score = Math.round(next.player * 1500 + pongMaxRally * 120 + pongPowerShots * 200 - next.ai * 500);
                        setFinalScore(score >= 0 ? score : 0);
                        setFinalRank(next.player >= winScore ? 'Spatial Engineer' : 'Reactor Operator');
                      }, 1000);
                    } else {
                      // Reset ball
                      setPongBall(initPongBall(box));
                    }
                    return next;
                  });
                }
              );

              // Draw Pong
              drawPongArena(ctx2, pongBall, pongPaddleL, pongPaddleR, box);
            }
            
            // ── RHYTHM HANDS GAMEPLAY LOOP ──
            else if (currentGame === 'rhythm') {
              const box = { x: 40, y: 100, width: canvasEl.width - 80, height: canvasEl.height - 180 };
              const hitLineY = box.height - 40;

              // Timer decrements
              const timeElapsed = (now - gameTimerRef.current) / 1000;
              const remainingTime = Math.max(0, 60 - Math.floor(timeElapsed));
              setRhythmTimer(remainingTime);

              // Notes Spawner
              const spawnInterval = rhythmDifficulty === 'easy' ? 2200 : rhythmDifficulty === 'expert' ? 1000 : 1500;
              const speed = rhythmDifficulty === 'easy' ? 160 : rhythmDifficulty === 'expert' ? 280 : 220;

              if (now - lastNoteSpawnTimeRef.current > spawnInterval) {
                lastNoteSpawnTimeRef.current = now;
                const types: RhythmNote['type'][] = ['palm', 'fist', 'pinch', 'clap', 'thumbs-up'];
                const randType = types[Math.floor(Math.random() * types.length)];
                setRhythmNotes(prev => [...prev, spawnRhythmNote(randType)]);
              }

              // Determine User Gesture Compliance
              let activeGesture: RhythmNote['type'] = 'palm';
              if (isFistL || isFistR) activeGesture = 'fist';
              else if (pinchLActive || pinchRActive) activeGesture = 'pinch';
              else if (clapDist < 0.20) activeGesture = 'clap';
              else if (isThumbsUpL || isThumbsUpR) activeGesture = 'thumbs-up';
              else if (Math.max(Math.hypot(leftVelocity.x, leftVelocity.y), Math.hypot(rightVelocity.x, rightVelocity.y)) > 1.4) {
                activeGesture = 'swipe';
              }

              // Check collisions / hits inside hit window
              rhythmNotes.forEach((n) => {
                if (n.hit || n.missed) return;

                const ny = box.y + n.y;
                const diff = Math.abs(ny - (box.y + hitLineY));

                if (diff < 40 && activeGesture === n.type) {
                  n.hit = true;
                  playTickSound();
                  
                  let points = 20;
                  let fText = 'LATE';
                  let fColor = 'text-yellow-500';

                  if (diff < 15) {
                    points = 100;
                    fText = 'PERFECT';
                    fColor = 'text-cyan-400 font-bold';
                    setRhythmHits(prev => ({ ...prev, perfect: prev.perfect + 1 }));
                  } else if (diff < 28) {
                    points = 50;
                    fText = 'GOOD';
                    fColor = 'text-green-400';
                    setRhythmHits(prev => ({ ...prev, good: prev.good + 1 }));
                  } else {
                    setRhythmHits(prev => ({ ...prev, late: prev.late + 1 }));
                  }

                  setRhythmCombo(prev => {
                    const next = prev + 1;
                    if (next > rhythmMaxCombo) setRhythmMaxCombo(next);
                    return next;
                  });

                  setRhythmScore(prev => prev + points * (1 + Math.floor(rhythmCombo / 5) * 0.5));
                  setRhythmFeedback({ text: `${fText} +${points}`, color: fColor, time: now });
                }
              });

              // Update notes and remove offscreen
              updateRhythmNotes(
                rhythmNotes,
                speed,
                dt,
                hitLineY,
                () => {
                  // missed note
                  setRhythmCombo(0);
                  setRhythmFeedback({ text: 'MISS', color: 'text-red-500 font-bold animate-pulse', time: now });
                  soundFail();
                  setRhythmHits(prev => ({ ...prev, miss: prev.miss + 1 }));
                }
              );

              // Clean notes
              const liveNotes = rhythmNotes.filter(n => !n.hit && n.y < box.height);
              if (liveNotes.length !== rhythmNotes.length) {
                setRhythmNotes(liveNotes);
              }

              // Draw
              drawRhythmGame(ctx2, rhythmNotes, hitLineY, box, timeElapsed);

              // End Condition
              if (remainingTime <= 0) {
                soundComplete();
                setGameStep('result');
                const final = Math.round(rhythmScore + rhythmMaxCombo * 150);
                setFinalScore(final);
                let rank = 'Reactor Operator';
                if (final > 8000) rank = 'Spatial Engineer';
                else if (final > 4000) rank = 'Reactor Operator';
                else rank = 'Field Technician';
                setFinalRank(rank);
              }
            }

          }
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    if (modelsReady && videoReady) {
      animationId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    modelsReady,
    videoReady,
    processFrame,
    pointsState,
    calibStep,
    isSettingsOpen,
    isThumbsUpL,
    isThumbsUpR,
    isRecording,
    leftAttractor,
    rightAttractor,
    useCase,
    clapDist,
    shockwaveTime,
    isMissionActive,
    isFieldLocked,
    hoverUseCase,
    hoverProgress,
    audioReactive,
    audioHoverProgress,
    lastAudioToggleTime,
    pinchLActive,
    pinchRActive,
    leftVelocity,
    rightVelocity,
    effectMode,
    
    // dependency updates for Arcade view states
    view,
    currentGame,
    gameStep,
    arcadeCalibStep,
    trackingLost,
    puzzlePhase,
    puzzlePieces,
    shatterFragments,
    polaroids,
    puzzleBox,
    draggedPiece,
    reactorStability,
    reactorTemp,
    reactorTimer,
    reactorGlitches,
    glitchesCleared,
    pongBall,
    pongPaddleL,
    pongPaddleR,
    pongScore,
    pongWinner,
    pongPlayMode,
    pongRallyCount,
    pongPowerShots,
    pongMaxRally,
    rhythmNotes,
    rhythmScore,
    rhythmCombo,
    rhythmMaxCombo,
    rhythmTimer,
    rhythmDifficulty,
    rhythmFeedback,
    rhythmHits
  ]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950 text-white font-sans p-6 z-30">
        <div className="w-16 h-16 border-4 border-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <span className="text-2xl font-bold text-red-500">!</span>
        </div>
        <h1 className="text-xl font-semibold tracking-wider text-red-400 mb-2">INTERFACE ERROR</h1>
        <p className="text-zinc-400 text-center max-w-md mb-8">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-950 border border-red-500 text-red-200 text-sm font-semibold rounded hover:bg-red-900 transition-all duration-300"
        >
          RELOAD INTERFACE
        </button>
      </div>
    );
  }

  const showLoading = !modelsReady || !videoReady;
  const handsTracked = pointsState.length === 4;

  const svgPoints = (handsTracked && calibStep === 'complete')
    ? `${(1.0 - pointsState[0].x) * 100},${pointsState[0].y * 100} ` +
      `${(1.0 - pointsState[1].x) * 100},${pointsState[1].y * 100} ` +
      `${(1.0 - pointsState[3].x) * 100},${pointsState[3].y * 100} ` +
      `${(1.0 - pointsState[2].x) * 100},${pointsState[2].y * 100}`
    : '';

  const screenXL = 1.0 - leftAttractor.x;
  const screenYL = leftAttractor.y;
  const screenXR = 1.0 - rightAttractor.x;
  const screenYR = rightAttractor.y;

  return (
    <div className="flex items-center justify-center w-full h-full bg-zinc-950 overflow-hidden select-none">
      <div id="layout-container" style={containerStyle} className="relative overflow-hidden bg-black z-0">
        
        {/* Hidden video node providing texture frames */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="hidden pointer-events-none"
        />

        {videoReady && videoRef.current && (
          <EffectsCanvas
            videoElement={videoRef.current}
            pointsRef={pointsRef}
            effectMode={effectMode}
            effectIndex={effectIndex}
            leftAttractor={leftAttractor}
            rightAttractor={rightAttractor}
            leftVelocity={leftVelocity}
            rightVelocity={rightVelocity}
            leftDepth={leftDepth}
            rightDepth={rightDepth}
            pinchLActive={pinchLActive}
            pinchRActive={pinchRActive}
            bloomStrength={leftDepth}
            speedMultiplier={speedMultiplier}
            grainMultiplier={grainMultiplier}
            neonMultiplier={neonMultiplier}
            useCase={useCase === 'puzzle' ? 'standard' : useCase} // puzzle cam handles 2D overlay directly
            docZoom={docZoom}
            docPan={docPan}
            shockwaveTime={shockwaveTime}
            shockwaveCenter={shockwaveCenter}
            audioReactive={audioReactive}
            isFieldLocked={isFieldLocked}
            medicalDiagramIndex={medicalDiagramIndex}
          />
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* Polaroid Shutter Shutter Flash overlay */}
        <div id="flash-overlay" className="absolute inset-0 bg-white pointer-events-none opacity-0 z-30 transition-opacity duration-75" />

        {/* Global Thumbs-Up Recording progress overlay */}
        {recordingProgress > 0 && (
          <div className="absolute top-6 left-6 z-30 flex items-center gap-3 bg-zinc-950/80 border border-red-500/35 backdrop-blur-md p-3 rounded font-mono text-[8px] text-zinc-300">
            <div className="w-5 h-5 rounded-full border border-red-500/20 flex items-center justify-center relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full bg-red-500" style={{ height: `${recordingProgress}%` }} />
            </div>
            <span>HOLD THUMBS-UP TO RECORD... ({Math.round(recordingProgress)}%)</span>
          </div>
        )}
        {isRecording && (
          <div id="recIndicator" className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-red-950/20 border border-red-500 backdrop-blur-md px-3 py-1.5 rounded font-mono text-[8px] text-red-400 font-bold animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
            <span>REC STREAM ACTIVE (5s)</span>
          </div>
        )}

        {/* ── VIEW 1: HUD INTERFACE ────────────────────────────────────────────── */}
        {view === 'hud' && (
          <>
            {useCase === 'puzzle' && cameraReleased && (
              <iframe
                src="/puzzlecam/index.html"
                className="absolute inset-0 w-full h-full border-none z-30 bg-black pointer-events-auto"
                allow="camera; microphone"
              />
            )}

            {/* Use-Case Selector Top Menu Bar */}
            {!showLoading && calibStep === 'complete' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[40] flex items-center gap-3 px-4 py-2 bg-zinc-950/75 border border-cyan-500/20 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)] font-mono text-[9px] tracking-[0.18em] text-zinc-400">
                {['standard', 'medical', 'blueprint', 'puzzle'].map((mode) => (
                  <button 
                    key={mode}
                    onClick={() => { setUseCase(mode as any); playChimeSound(); }}
                    className={`relative px-3 py-1.5 rounded-full transition-all duration-300 ${useCase === mode ? 'text-cyan-400 border border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'hover:text-white'}`}
                  >
                    <span>{mode === 'standard' ? 'HOLOGRAPHIC' : mode === 'puzzle' ? 'PUZZLE CAM' : mode.toUpperCase()}</span>
                    {hoverUseCase === mode && (
                      <span className="absolute bottom-0 left-1/4 w-1/2 h-[2px] bg-cyan-400 shadow-[0_0_5px_#22d3ee] transition-all" style={{ width: `${hoverProgress / 2}%` }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* HUD settings slide-out panel */}
            {!showLoading && calibStep === 'complete' && (
              <div className={`absolute top-0 right-0 h-full w-72 z-[40] bg-zinc-950/80 border-l border-cyan-500/25 backdrop-blur-md px-6 py-20 flex flex-col justify-start gap-8 transition-transform duration-500 font-mono ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col border-b border-cyan-500/25 pb-4">
                  <span className="text-[10px] text-cyan-400 font-bold tracking-[0.2em]">HUD SETTINGS</span>
                  <span className="text-[7px] text-zinc-500 mt-1">COLLISION SENSING MATRIX</span>
                </div>

                <div className="flex flex-col gap-2 relative">
                  <div className="flex justify-between text-[8px] text-zinc-400 tracking-wider">
                    <span>SPEED MULTIPLIER</span>
                    <span className="text-cyan-400 font-bold">{speedMultiplier.toFixed(2)}x</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_#22d3ee]" style={{ width: `${(speedMultiplier - 0.1) / 2.9 * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-2 relative">
                  <div className="flex justify-between text-[8px] text-zinc-400 tracking-wider">
                    <span>GRAIN MULTIPLIER</span>
                    <span className="text-cyan-400 font-bold">{grainMultiplier.toFixed(2)}x</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_#22d3ee]" style={{ width: `${grainMultiplier / 3.0 * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-2 relative">
                  <div className="flex justify-between text-[8px] text-zinc-400 tracking-wider">
                    <span>NEON INTENSITY</span>
                    <span className="text-cyan-400 font-bold">{neonMultiplier.toFixed(2)}x</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_#22d3ee]" style={{ width: `${neonMultiplier / 3.0 * 100}%` }} />
                  </div>
                </div>

                {/* Control Mapping Toggle (Palm vs Direct) */}
                <div className="flex flex-col gap-3 pt-4 border-t border-cyan-500/10 relative font-mono text-[8px]">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>CONTROL MAPPING</span>
                    <span className="font-bold text-cyan-400">
                      {controlMapping === 'framing' ? 'FRAMING ZOOM' : controlMapping === 'palm-zoom' ? 'PALM ZOOM' : 'DIRECT FINGERS'}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      let nextMap: 'framing' | 'palm-zoom' | 'direct';
                      if (controlMapping === 'framing') nextMap = 'palm-zoom';
                      else if (controlMapping === 'palm-zoom') nextMap = 'direct';
                      else nextMap = 'framing';
                      setControlMapping(nextMap);
                      playChimeSound();
                    }}
                    className="py-2.5 w-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded hover:text-zinc-200"
                  >
                    TOGGLE CONTROLS
                  </button>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-cyan-500/10 relative">
                  <div className="flex justify-between items-center text-[8px] text-zinc-400 tracking-wider">
                    <span>AUDIO REACTIVITY</span>
                    <span className={`font-bold ${audioReactive ? 'text-pink-500' : 'text-zinc-600'}`}>{audioReactive ? 'ACTIVE' : 'OFF'}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setAudioReactive((act) => {
                        const ns = !act;
                        if (ns) startMicrophone();
                        else stopMicrophone();
                        return ns;
                      });
                      playChimeSound();
                    }}
                    className={`relative py-3.5 w-full border font-mono text-[8px] tracking-[0.2em] rounded transition-all duration-300 ${audioReactive ? 'bg-pink-950/20 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <span>{audioReactive ? 'DISABLE MIC FEED' : 'ENABLE MIC FEED'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Puzzle Cam Status Bar and Strip Gallery Overlay */}
            {useCase === 'puzzle' && (
              <>
                <div className="absolute top-20 left-4 z-20 w-52 bg-zinc-950/80 border border-yellow-500/25 backdrop-blur-md p-4 rounded flex flex-col gap-2 font-mono text-zinc-400 text-[8px] shadow-[0_0_15px_rgba(245,197,24,0.1)]">
                  <div className="flex justify-between border-b border-zinc-800 pb-1 text-[9px] text-yellow-500 font-bold tracking-wider">
                    <span>PUZZLE CAM</span>
                    <span>{placedCount} / 9 PLACED</span>
                  </div>
                  <span>Phase: {puzzlePhase.toUpperCase()}</span>
                  <span>Snap 3 photos to complete strip.</span>
                </div>

                {/* Left side Polaroid Gallery Strip */}
                <div className="absolute left-4 bottom-24 top-36 w-32 z-20 flex flex-col gap-4 overflow-y-auto font-mono text-[8px]">
                  <span className="text-[9px] text-zinc-500 border-b border-zinc-800 pb-1 tracking-wider text-center">GALLERY ({polaroids.length}/3)</span>
                  {polaroids.length === 0 ? (
                    <span className="text-zinc-600 text-center mt-6">NO PHOTOS CAPTURED</span>
                  ) : (
                    polaroids.map((canvas, idx) => (
                      <div key={idx} className="bg-white p-1 pb-4 shadow-md rounded transform -rotate-3 hover:rotate-0 transition-transform duration-200">
                        <img src={canvas.toDataURL()} alt={`Polaroid ${idx + 1}`} className="w-full h-auto object-contain border border-zinc-150" />
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Toggle Button to enter Arcade mode */}
            {!showLoading && calibStep === 'complete' && (
              <button
                onClick={() => {
                  setView('arcade');
                  playSwitchSound();
                  setUseCase('standard');
                }}
                className="absolute bottom-6 right-6 z-20 px-5 py-2.5 border border-cyan-500 bg-cyan-950/20 text-cyan-400 font-mono text-[9px] tracking-[0.2em] rounded-full hover:bg-cyan-900 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                ENTER ARCADE
              </button>
            )}

            {/* Standard Mode boundary SVG polygon */}
            {handsTracked && useCase === 'standard' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <polygon
                  points={svgPoints}
                  fill="none"
                  stroke={isFieldLocked ? '#f59e0b' : effectMode === 'xray' ? 'cyan' : 'white'}
                  strokeWidth="2.0"
                  filter="url(#glow)"
                  className="transition-all duration-75"
                />
                <circle cx={`${screenXL * 100}%`} cy={`${screenYL * 100}%`} r="10" fill="none" stroke="cyan" strokeWidth="1" className="animate-pulse" />
                <circle cx={`${screenXL * 100}%`} cy={`${screenYL * 100}%`} r="2.5" fill="cyan" />
                <circle cx={`${screenXR * 100}%`} cy={`${screenYR * 100}%`} r="10" fill="none" stroke="cyan" strokeWidth="1" className="animate-pulse" />
                <circle cx={`${screenXR * 100}%`} cy={`${screenYR * 100}%`} r="2.5" fill="cyan" />
              </svg>
            )}

            {/* HUD Mission Mode elements */}
            {!showLoading && isMissionActive && (
              <div className="absolute top-20 left-4 z-20 w-52 bg-zinc-950/70 border border-red-500/25 backdrop-blur-md p-4 rounded flex flex-col gap-3.5 font-mono text-zinc-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <div className="flex justify-between items-center border-b border-red-500/20 pb-2">
                  <span className="text-[9px] text-red-500 font-bold tracking-[0.2em] animate-pulse">TRAINING TELEMETRY</span>
                  <span className="text-[11px] text-red-400 font-bold font-mono">{missionTimer}s</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[8px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>LENS STABILITY</span>
                    <span className={stability < 30 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-300 font-bold'}>{stability.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${stability < 30 ? 'bg-red-500' : 'bg-red-600'}`} style={{ width: `${stability}%` }} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-[8px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>GESTURE ACCURACY</span>
                    <span className="text-zinc-300 font-bold">{gestureAccuracy.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${gestureAccuracy}%` }} />
                  </div>
                </div>
              </div>
            )}

            {!showLoading && calibStep === 'complete' && !isMissionActive && !showScorecard && useCase !== 'puzzle' && (
              <button
                onClick={() => {
                  setIsMissionActive(true);
                  setMissionTimer(60);
                  setStability(50);
                  setGestureAccuracy(90);
                  playChimeSound();
                }}
                className="absolute bottom-6 left-6 z-20 px-4 py-2 border border-red-500/30 hover:border-red-500/80 bg-red-950/10 hover:bg-red-950/30 text-red-400 font-mono text-[8px] tracking-[0.2em] rounded transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
              >
                START TRAINING MISSION
              </button>
            )}

            {showScorecard && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-30 backdrop-blur-md">
                <div className="w-80 bg-zinc-950 border border-cyan-500/30 p-6 rounded shadow-[0_0_30px_rgba(6,182,212,0.25)] flex flex-col items-center text-center font-mono gap-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-cyan-400 font-bold tracking-[0.25em]">MISSION COMPLETED</span>
                    <span className="text-[7px] text-zinc-500">HOLOGRAM SCAN DEBRIEFING</span>
                  </div>
                  <div className="flex flex-col gap-1 py-4 border-y border-zinc-800 w-full">
                    <div className="text-[8px] text-zinc-500 tracking-wider">TOTAL EVALUATION SCORE</div>
                    <div className="text-3xl font-bold text-white tracking-widest">{finalScore}</div>
                    <div className="text-[9px] text-cyan-400 font-bold tracking-wider mt-1">{finalRank}</div>
                  </div>
                  <button
                    onClick={() => { setShowScorecard(false); playChimeSound(); }}
                    className="mt-2 w-full py-2.5 bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 text-[8px] tracking-[0.2em] rounded transition-all duration-300"
                  >
                    DISMISS REPORTS
                  </button>
                </div>
              </div>
            )}

            {/* Puzzle Completed 3 Photos Strip Modal popup */}
            {showStripModal && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-30 backdrop-blur-md">
                <div className="w-80 bg-zinc-950 border border-yellow-500/30 p-6 rounded shadow-[0_0_30px_rgba(245,197,24,0.25)] flex flex-col items-center text-center font-mono gap-4">
                  <span className="text-[11px] text-yellow-500 font-bold tracking-[0.25em]">PHOTOSTRIP COMPLETE</span>
                  <div className="bg-stone-100 p-2 shadow-inner border max-h-64 overflow-y-auto w-full flex justify-center">
                    {(() => {
                      const strip = buildStripCanvas(polaroids);
                      return strip ? <img src={strip.toDataURL()} alt="Strip Preview" className="w-36 h-auto" /> : null;
                    })()}
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => {
                        const strip = buildStripCanvas(polaroids);
                        if (strip) {
                          const link = document.createElement('a');
                          link.href = strip.toDataURL('image/png');
                          link.download = `arcgesture-puzzle-strip-${Date.now()}.png`;
                          link.click();
                        }
                      }}
                      className="flex-1 py-2 bg-yellow-950/20 border border-yellow-500/55 text-yellow-500 hover:text-white text-[8px] tracking-widest rounded"
                    >
                      DOWNLOAD STRIP
                    </button>
                    <button
                      onClick={() => {
                        setPolaroids([]);
                        setShowStripModal(false);
                        playChimeSound();
                      }}
                      className="px-4 py-2 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-[8px] rounded"
                    >
                      RESET
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── VIEW 2: ARCADE LANDING PAGE ──────────────────────────────────────── */}
        {view === 'arcade' && (
          <div className="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col p-8 font-mono text-zinc-400 select-none overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-4 mb-8">
              <div className="flex flex-col gap-1">
                <span className="text-[14px] text-cyan-400 font-bold tracking-[0.25em]">ARCADE MODE</span>
                <span className="text-[8px] text-zinc-500 mt-1">CAMERA-ONLY HAND GESTURE GAMES</span>
              </div>
              <button
                onClick={() => { setView('hud'); playSwitchSound(); }}
                className="px-4 py-2 border border-zinc-800 text-zinc-500 hover:border-zinc-300 text-[9px] rounded"
              >
                RETURN TO HUD
              </button>
            </div>

            {/* Pitch tagline banner */}
            <div className="bg-cyan-950/10 border border-cyan-500/10 p-3 rounded mb-8 text-[8px] text-cyan-400/80 leading-normal tracking-wide text-center">
              “ArcGesture Arcade turns the webcam into a gesture game controller. Instead of pressing keys or touching a screen, players use hand movement, pinch, clap, fist, and hand depth to control real-time WebGL games.”
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Card 1: Reactor Stabilizer */}
              <div className="bg-zinc-950 border border-cyan-500/10 hover:border-cyan-500/40 p-5 rounded flex flex-col justify-between gap-5 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.02)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-cyan-400 font-bold tracking-wider">01. REACTOR STABILIZER</span>
                  <p className="text-[8px] text-zinc-500 leading-relaxed mt-1">Stabilize a holographic core before decay spikes! Swipe index fingers, double-fist lock, or clap shockwaves.</p>
                  <div className="flex flex-col gap-1 text-[7px] text-zinc-400 mt-3 font-semibold">
                    <span>Difficulty: MEDIUM</span>
                    <span>Gestures: Spread, Pinch, Fist, Clap, Depth</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentGame('reactor');
                    setGameStep('calibration');
                    setArcadeCalibStep('raise_hands');
                    playSwitchSound();
                  }}
                  className="w-full py-2 bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 text-[8px] tracking-widest rounded transition-all duration-300"
                >
                  INITIALIZE SYSTEM
                </button>
              </div>

              {/* Card 2: HoloPong */}
              <div className="bg-zinc-950 border border-cyan-500/10 hover:border-cyan-500/40 p-5 rounded flex flex-col justify-between gap-5 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.02)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-cyan-400 font-bold tracking-wider">02. HOLOPONG</span>
                  <p className="text-[8px] text-zinc-500 leading-relaxed mt-1">Turn your hands into neon paddles. Bounce the energy ball, pinch for Power Shots, and fist-shield to defend.</p>
                  <div className="flex flex-col gap-1 text-[7px] text-zinc-400 mt-3 font-semibold">
                    <span>Difficulty: EASY</span>
                    <span>Gestures: Up/Down Y, Pinch, Fist, Clap</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPongPlayMode('solo');
                      setCurrentGame('pong');
                      setGameStep('calibration');
                      setArcadeCalibStep('raise_hands');
                      playSwitchSound();
                    }}
                    className="flex-1 py-2 bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 text-[8px] tracking-widest rounded transition-all duration-300"
                  >
                    SOLO
                  </button>
                  <button
                    onClick={() => {
                      setPongPlayMode('dual');
                      setCurrentGame('pong');
                      setGameStep('calibration');
                      setArcadeCalibStep('raise_hands');
                      playSwitchSound();
                    }}
                    className="flex-1 py-2 bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 text-[8px] tracking-widest rounded transition-all duration-300"
                  >
                    DUAL
                  </button>
                </div>
              </div>

              {/* Card 3: Rhythm Hands */}
              <div className="bg-zinc-950 border border-cyan-500/10 hover:border-cyan-500/40 p-5 rounded flex flex-col justify-between gap-5 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.02)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-cyan-400 font-bold tracking-wider">03. RHYTHM HANDS</span>
                  <p className="text-[8px] text-zinc-500 leading-relaxed mt-1">Match visual prompts on the lane to the synthesized audio beat. Flex fingers and thumbs to score perfect streaks.</p>
                  <div className="flex flex-col gap-1 text-[7px] text-zinc-400 mt-3 font-semibold">
                    <span>Difficulty: EXPERT</span>
                    <span>Gestures: Palm, Fist, Pinch, Clap, Thumbs-Up</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {['easy', 'normal', 'expert'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => {
                        setRhythmDifficulty(diff as any);
                        setCurrentGame('rhythm');
                        setGameStep('calibration');
                        setArcadeCalibStep('raise_hands');
                        playSwitchSound();
                      }}
                      className="flex-1 py-1.5 bg-cyan-950/20 border border-cyan-500/20 hover:border-cyan-500 text-cyan-400 text-[7px] font-bold rounded"
                    >
                      {diff.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 4: Puzzle Decrypt */}
              <div className="bg-zinc-950 border border-[#00f0ff]/10 hover:border-[#00f0ff]/40 p-5 rounded flex flex-col justify-between gap-5 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.02)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-[#00f0ff] font-bold tracking-wider">04. PUZZLE DECRYPT</span>
                  <p className="text-[8px] text-zinc-500 leading-relaxed mt-1">Decrypt cyber schematics or live webcam frames in a gesture-controlled sliding grid puzzle. Race for the top leaderboard score!</p>
                  <div className="flex flex-col gap-1 text-[7px] text-zinc-400 mt-3 font-semibold">
                    <span>Difficulty: EASY / INSANE</span>
                    <span>Gestures: Target Cursor, Pinch</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentGame('puzzlehands');
                    setView('game');
                    setGameStep('play');
                    playSwitchSound();
                  }}
                  className="w-full py-2 bg-cyan-950/20 border border-[#00f0ff]/30 hover:border-[#00f0ff] text-[#00f0ff] text-[8px] tracking-widest rounded transition-all duration-300 font-bold"
                >
                  INITIALIZE MATRIX
                </button>
              </div>
            </div>

            {/* Shared Sensor status Panel */}
            <div className="mt-auto border-t border-zinc-900 pt-4 flex gap-8 justify-around text-[8px] text-zinc-500">
              <span>CAMERA: Standard webcam</span>
              <span>TRACKING: MediaPipe Hands</span>
              <span>RENDERING: WebGL / Three.js</span>
              <span>AUDIO: Web Audio API</span>
              <span>CONTROLS: Hand gestures only</span>
            </div>
          </div>
        )}

        {/* ── VIEW 3: ARCADE ACTIVE GAMEPLAY VIEW ──────────────────────────────── */}
        {view === 'game' && currentGame === 'puzzlehands' && (
          <div className="absolute inset-0 bg-black z-30 pointer-events-auto overflow-hidden">
            <PuzzleHandsGame
              onExit={() => {
                setView('arcade');
                setCurrentGame(null);
                playSwitchSound();
              }}
            />
          </div>
        )}

        {view === 'game' && currentGame !== 'puzzlehands' && (
          <div className="absolute inset-0 bg-transparent pointer-events-none z-20 flex flex-col p-6 font-mono select-none">
            
            {/* Calibration Overlay */}
            {gameStep === 'calibration' && (
              <div className="absolute inset-0 bg-zinc-950/90 z-30 flex flex-col items-center justify-center text-center p-6 pointer-events-auto">
                <div className="w-12 h-12 border-2 border-t-cyan-500 border-r-cyan-500 border-zinc-800 rounded-full animate-spin mb-6" />
                <span className="text-[12px] text-cyan-400 font-bold tracking-[0.25em] mb-2">CALIBRATING HAND TRACKING</span>
                <span className="text-[8px] text-zinc-400 max-w-xs leading-normal">
                  {arcadeCalibStep === 'raise_hands'
                    ? 'RAISE BOTH HANDS INTO THE CAMERA AREA TO INITIALIZE.'
                    : arcadeCalibStep === 'spread_hands'
                    ? 'SPREAD HANDS WIDE APART (>0.42 SCALE) TO COMPLETE CALIBRATION.'
                    : 'CALIBRATION COMPLETE! PREPARING ARENA...'}
                </span>
              </div>
            )}

            {/* Tracking lost warnings */}
            {gameStep === 'play' && trackingLost && (
              <div className="absolute inset-0 bg-zinc-950/80 z-30 flex flex-col items-center justify-center text-center p-6">
                <div className="w-10 h-10 border border-red-500/40 rounded flex items-center justify-center text-red-500 font-bold text-lg animate-pulse mb-4">!</div>
                <span className="text-[10px] text-red-500 font-bold tracking-[0.2em] mb-1">TRACKING UNSTABLE</span>
                <span className="text-[8px] text-zinc-400">RAISE BOTH HANDS IN CAMERA FRAME TO RESUME GAMEPLAY</span>
              </div>
            )}

            {/* Game 1 UI: Reactor HUD */}
            {gameStep === 'play' && currentGame === 'reactor' && (
              <div className="flex justify-between items-start pointer-events-auto mt-4 w-full">
                {/* Left stats */}
                <div className="bg-zinc-950/75 border border-cyan-500/20 backdrop-blur-md p-4 rounded flex flex-col gap-3 w-52 text-[8px] text-zinc-400">
                  <div className="flex justify-between border-b border-zinc-800 pb-1 text-cyan-400 font-bold">
                    <span>REACTOR STABILIZER</span>
                    <span>{reactorTimer}s</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span>CONTAINMENT STABILITY</span>
                      <span className={reactorStability < 30 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-200'}>{reactorStability.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                      <div className={`h-full ${reactorStability < 30 ? 'bg-red-500' : 'bg-cyan-500 shadow-[0_0_5px_#06b6d4]'}`} style={{ width: `${reactorStability}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span>CORE TEMPERATURE</span>
                      <span className={reactorTemp > 100 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-200'}>{reactorTemp.toFixed(0)}°C</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                      <div className={`h-full ${reactorTemp > 100 ? 'bg-red-500' : 'bg-pink-500 shadow-[0_0_5px_#ec4899]'}`} style={{ width: `${(reactorTemp / 130) * 100}%` }} />
                    </div>
                  </div>
                  {isFieldLocked && (
                    <div className="py-1 px-2 border border-amber-500/35 bg-amber-950/20 text-amber-500 font-bold text-[7px] text-center animate-pulse">
                      CONTAINMENT FIELD LOCKED (FIST)
                    </div>
                  )}
                </div>

                {/* Quit fallback button */}
                <button
                  onClick={() => { setView('arcade'); setCurrentGame(null); playSwitchSound(); }}
                  className="px-3 py-1.5 border border-zinc-800 text-zinc-500 hover:border-zinc-300 text-[8px] rounded"
                >
                  QUIT (ESC)
                </button>
              </div>
            )}

            {/* Game 2 UI: HoloPong HUD */}
            {gameStep === 'play' && currentGame === 'pong' && (
              <div className="flex justify-between items-start pointer-events-auto mt-4 w-full">
                <div className="bg-zinc-950/75 border border-cyan-500/20 backdrop-blur-md px-4 py-2.5 rounded flex gap-6 font-bold text-[10px] text-cyan-400">
                  <span>PADDLE PONG</span>
                  <span className="text-zinc-500 border-l border-zinc-800 pl-4">PLAYER: {pongScore.player}</span>
                  <span className="text-zinc-500">AI: {pongScore.ai}</span>
                  <span className="text-zinc-500 border-l border-zinc-800 pl-4 text-[8px] font-normal">RALLY: {pongRallyCount}</span>
                </div>
                
                <button
                  onClick={() => { setView('arcade'); setCurrentGame(null); playSwitchSound(); }}
                  className="px-3 py-1.5 border border-zinc-800 text-zinc-500 hover:border-zinc-300 text-[8px] rounded"
                >
                  QUIT (ESC)
                </button>
              </div>
            )}

            {/* Game 3 UI: Rhythm Hands HUD */}
            {gameStep === 'play' && currentGame === 'rhythm' && (
              <div className="flex justify-between items-start pointer-events-auto mt-4 w-full">
                {/* Stats */}
                <div className="bg-zinc-950/75 border border-cyan-500/20 backdrop-blur-md p-4 rounded flex flex-col gap-2.5 w-48 text-[8px] text-zinc-400">
                  <div className="flex justify-between border-b border-zinc-800 pb-1 text-cyan-400 font-bold">
                    <span>RHYTHM HANDS</span>
                    <span>{rhythmTimer}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SCORE:</span>
                    <span className="font-bold text-white tracking-widest">{rhythmScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>COMBO STREAK:</span>
                    <span className="font-bold text-cyan-400 animate-pulse">{rhythmCombo}x</span>
                  </div>
                  {rhythmFeedback && performance.now() - rhythmFeedback.time < 800 && (
                    <span className={`text-center font-semibold mt-2 text-[9px] uppercase ${rhythmFeedback.color}`}>
                      {rhythmFeedback.text}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setView('arcade'); setCurrentGame(null); playSwitchSound(); }}
                  className="px-3 py-1.5 border border-zinc-800 text-zinc-500 hover:border-zinc-300 text-[8px] rounded"
                >
                  QUIT (ESC)
                </button>
              </div>
            )}

            {/* Cinematic Scorecard result screen */}
            {gameStep === 'result' && (
              <div className="absolute inset-0 bg-zinc-950/90 z-30 flex items-center justify-center p-6 pointer-events-auto">
                <div className="w-80 bg-zinc-950 border border-cyan-500/30 p-6 rounded shadow-[0_0_40px_rgba(6,182,212,0.3)] flex flex-col items-center text-center font-mono gap-5 select-none">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-cyan-400 font-bold tracking-[0.25em]">ARCADE RESULT</span>
                    <span className="text-[7px] text-zinc-500">SYSTEM PERFORMANCE SCORECARD</span>
                  </div>

                  <div className="flex flex-col gap-1 py-4 border-y border-zinc-850 w-full">
                    <span className="text-[7px] text-zinc-500 tracking-wider">EVALUATION SCORE</span>
                    <span className="text-3xl font-bold text-white tracking-widest">{finalScore}</span>
                    <span className="text-[9px] text-cyan-400 font-bold tracking-wider mt-1">{finalRank}</span>
                  </div>

                  {/* Specific statistics */}
                  <div className="flex flex-col gap-1.5 w-full text-[8px] text-zinc-400 text-left border-b border-zinc-850 pb-4">
                    {currentGame === 'reactor' && (
                      <>
                        <div className="flex justify-between">
                          <span>Glitches Cleared:</span>
                          <span className="text-zinc-200">{glitchesCleared} nodes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overheat Penalty:</span>
                          <span className="text-zinc-200">{reactorTemp > 100 ? 'YES' : 'NO'}</span>
                        </div>
                      </>
                    )}
                    {currentGame === 'pong' && (
                      <>
                        <div className="flex justify-between">
                          <span>Score Result:</span>
                          <span className="text-zinc-200">{pongScore.player} - {pongScore.ai}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Rally Count:</span>
                          <span className="text-zinc-200">{pongMaxRally} deflections</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Power Shots:</span>
                          <span className="text-zinc-200">{pongPowerShots} times</span>
                        </div>
                      </>
                    )}
                    {currentGame === 'rhythm' && (
                      <>
                        <div className="flex justify-between">
                          <span>Perfect Hits:</span>
                          <span className="text-zinc-200">{rhythmHits.perfect}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Good/Late Hits:</span>
                          <span className="text-zinc-200">{rhythmHits.good + rhythmHits.late}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Combo Streak:</span>
                          <span className="text-zinc-200">{rhythmMaxCombo}x</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => {
                        setGameStep('calibration');
                        setArcadeCalibStep('raise_hands');
                        playSwitchSound();
                      }}
                      className="flex-1 py-2.5 border border-cyan-500 bg-cyan-950/20 text-cyan-400 text-[8px] tracking-[0.2em] font-bold rounded"
                    >
                      REPLAY
                    </button>
                    <button
                      onClick={() => {
                        setView('arcade');
                        setCurrentGame(null);
                        playSwitchSound();
                      }}
                      className="flex-1 py-2.5 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-[8px] tracking-[0.2em] font-bold rounded"
                    >
                      EXIT
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30 text-white font-sans">
            <div className="w-12 h-12 border-2 border-t-cyan-500 border-r-cyan-500 border-zinc-800 rounded-full animate-spin mb-6" />
            <h2 className="text-sm font-semibold tracking-[0.2em] text-cyan-400 animate-pulse">
              {!videoReady ? 'LOADING AI MODELS & CAMERA...' : 'INITIALIZING TRACKER...'}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
