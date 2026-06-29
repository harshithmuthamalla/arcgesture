import { useEffect, useRef, useState } from 'react';
import { useHandTracker } from './hooks/useHandTracker';
import { EffectsCanvas } from './components/EffectsCanvas';
import {
  startBackgroundHum,
  stopBackgroundHum,
  updateBackgroundHum,
  playSwitchSound
} from './utils/audio';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [effectIndex, setEffectIndex] = useState(0);

  // Calibration Steps ('none' | 'raise_hands' | 'spread_hands' | 'complete')
  const [calibStep, setCalibStep] = useState<'none' | 'raise_hands' | 'spread_hands' | 'complete'>('raise_hands');

  // Settings Panel States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [grainMultiplier, setGrainMultiplier] = useState(1.0);
  const [neonMultiplier, setNeonMultiplier] = useState(1.0);
  
  // Use Case Modes ('standard' | 'medical' | 'blueprint')
  const [useCase, setUseCase] = useState<'standard' | 'medical' | 'blueprint'>('standard');
  const [docZoom, setDocZoom] = useState(1.0);
  const [docPan, setDocPan] = useState({ x: 0, y: 0 });

  // Shockwave Gesture Combo States
  const [shockwaveTime, setShockwaveTime] = useState(-1.0);
  const [shockwaveCenter, setShockwaveCenter] = useState({ x: 0.5, y: 0.5 });
  const lastClapTimeRef = useRef<number>(0);
  const lastClapDistRef = useRef<number>(1.0);

  // Mission Mode Game Loop States
  const [isMissionActive, setIsMissionActive] = useState(false);
  const [missionTimer, setMissionTimer] = useState(60);
  const [stability, setStability] = useState(50);
  const [gestureAccuracy, setGestureAccuracy] = useState(90);
  const [missionScorecard, setMissionScorecard] = useState<{
    stability: number;
    accuracy: number;
    time: number;
    rank: string;
  } | null>(null);

  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Timer reference for settings panel auto-closing
  const lastRightHandTimeRef = useRef<number>(0);

  // Aspect ratio state styling
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties>({
    width: '100%',
    height: '100%'
  });
  const videoAspect = 16 / 9;

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

  const triggerEffectSwitch = () => {
    setEffectIndex((prev) => (prev + 1) % 7);
  };

  // Keyboard Spacebar / Enter key fail-safe for mode switching during live demos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        playSwitchSound();
        triggerEffectSwitch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    isFieldLocked,
    clapDist,
    processFrame,
    setErrorMsg
  } = useHandTracker(videoRef, canvasRef, triggerEffectSwitch);

  // Background Audio Controller (hum starts when hands are detected & calibrated)
  useEffect(() => {
    if (pointsState.length === 4 && calibStep === 'complete') {
      startBackgroundHum();
      const avgDepth = (leftDepth + rightDepth) / 2;
      updateBackgroundHum(avgDepth);
    } else {
      stopBackgroundHum();
    }
  }, [pointsState, leftDepth, rightDepth, calibStep]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupCamera = async () => {
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

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setVideoReady(true);
            });
          };
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Webcam access denied.');
      }
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      stopBackgroundHum();
    };
  }, [setErrorMsg]);

  // Video recording capture trigger
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

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `arcgesture-demo-${Date.now()}.webm`;
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

  // Mission Mode Timer Hook
  useEffect(() => {
    let timerId: number;
    if (isMissionActive && missionTimer > 0) {
      timerId = window.setInterval(() => {
        setMissionTimer((prev) => {
          if (prev <= 1) {
            // End Mission and generate scorecard
            setIsMissionActive(false);
            
            // Calculate final Rank based on stability
            let rank = 'Signal Repairman';
            if (stability >= 85) rank = 'Spatial Operator';
            else if (stability >= 70) rank = 'Senior Engineer';
            else if (stability >= 50) rank = 'Tech Cadet';

            setMissionScorecard({
              stability: Math.round(stability),
              accuracy: gestureAccuracy,
              time: 60,
              rank
            });
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

    const loop = () => {
      processFrame();

      const handsPresent = pointsState.length === 4;

      // --- CALIBRATION MACHINE SEQUENCE ---
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
        // Checks if hands clapped very recently and then spread apart quickly
        const now = performance.now();
        if (clapDist < 0.20) {
          lastClapTimeRef.current = now;
          lastClapDistRef.current = clapDist;
        } else if (now - lastClapTimeRef.current < 450) {
          const expansionSpeed = (clapDist - lastClapDistRef.current) / ((now - lastClapTimeRef.current) / 1000);
          if (expansionSpeed > 1.4 && shockwaveTime < 0.0) {
            // Trigger shockwave ring
            setShockwaveTime(0.0);
            setShockwaveCenter({
              x: (1.0 - leftAttractor.x + (1.0 - rightAttractor.x)) / 2,
              y: (leftAttractor.y + rightAttractor.y) / 2
            });
            playSwitchSound();
          }
        }

        // Increment shockwave animation timer
        if (shockwaveTime >= 0.0) {
          setShockwaveTime((prev) => {
            const next = prev + 0.016;
            return next >= 0.8 ? -1.0 : next;
          });
        }

        // --- DYNAMIC DOCUMENT ZOOM & PANNING (MRI / BLUEPRINT) ---
        if (useCase !== 'standard') {
          // Map distance between hands to zoom scale
          const targetZoom = Math.max(0.2, Math.min(3.0, 1.6 - (clapDist - 0.2) * 1.8));
          setDocZoom(targetZoom);

          // Map hand midpoint to pan coordinate offsets
          const midX = (leftAttractor.x + rightAttractor.x) / 2;
          const midY = (leftAttractor.y + rightAttractor.y) / 2;
          setDocPan({
            x: (midX - 0.5) * 1.3,
            y: (midY - 0.5) * 1.3
          });
        }

        // --- MISSION MODE OPERATIONAL DRAIN / RECOVERY ---
        if (isMissionActive) {
          setStability((prev) => {
            // Base drift decay
            let next = prev - 0.08;

            // 1. Spreading hands to expand field (recovery)
            if (clapDist > 0.45) next += 0.12;

            // 2. Pinching to scan (recovery)
            if (pinchLActive || pinchRActive) next += 0.08;

            // 3. Move fingers rapidly to clear noise
            const speedL = Math.sqrt(leftVelocity.x * leftVelocity.x + leftVelocity.y * leftVelocity.y);
            const speedR = Math.sqrt(rightVelocity.x * rightVelocity.x + rightVelocity.y * rightVelocity.y);
            if (speedL > 1.0 || speedR > 1.0) next += 0.15;

            // Penalize stability if field is locked
            if (isFieldLocked) next -= 0.1;

            return Math.max(0, Math.min(100, next));
          });

          // Check if user is triggering combinations during game to boost accuracy scores
          if (pinchLActive && pinchRActive && effectMode === 'xray') {
            setGestureAccuracy((prev) => Math.min(100, prev + 0.05));
          }
        }

        // --- HUD SETTINGS PANEL TRIGGER ---
        const screenXL = 1.0 - leftAttractor.x;
        const screenXR = 1.0 - rightAttractor.x;
        
        if (screenXL > 0.85 || screenXR > 0.85) {
          setIsSettingsOpen(true);
          lastRightHandTimeRef.current = performance.now();
        } else {
          // Auto-close settings menu if hands leave the right section for 3.5 seconds
          if (performance.now() - lastRightHandTimeRef.current > 3500) {
            setIsSettingsOpen(false);
          }
        }

        // Settings Sliders Collision Detection
        if (isSettingsOpen) {
          const checkSliderHit = (att: typeof leftAttractor) => {
            const mx = 1.0 - att.x;
            const my = att.y;

            if (mx > 0.78) {
              const val = Math.max(0.0, Math.min(1.0, (mx - 0.80) / 0.16));
              
              if (my >= 0.20 && my <= 0.28) {
                setSpeedMultiplier(0.1 + val * 2.9);
              } else if (my >= 0.35 && my <= 0.43) {
                setGrainMultiplier(val * 3.0);
              } else if (my >= 0.50 && my <= 0.58) {
                setNeonMultiplier(val * 3.0);
              }
            }
          };

          checkSliderHit(leftAttractor);
          checkSliderHit(rightAttractor);
        }

        // Recording Thumbs-up trigger
        if ((isThumbsUpL || isThumbsUpR) && !isRecording) {
          setRecordProgress((prev) => {
            const next = prev + 1.5;
            if (next >= 100) {
              startRecording();
              return 0;
            }
            return next;
          });
        } else {
          setRecordProgress((prev) => Math.max(0, prev - 2));
        }
      } else {
        setRecordProgress(0);
        setIsSettingsOpen(false);
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
    isFieldLocked
  ]);

  // Animated wave offset calculation for the SVG Laser path
  const [laserPath, setLaserPath] = useState('');
  useEffect(() => {
    let animFrame: number;
    
    const updateLaser = () => {
      if (pointsState.length === 4 && calibStep === 'complete') {
        const container = document.getElementById('layout-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const cxL = (1.0 - leftAttractor.x) * rect.width;
          const cyL = leftAttractor.y * rect.height;
          const cxR = (1.0 - rightAttractor.x) * rect.width;
          const cyR = rightAttractor.y * rect.height;

          // Midpoint
          const midX = (cxL + cxR) / 2;
          const midY = (cyL + cyR) / 2;

          // Add animated high-voltage electrical jitter
          const time = performance.now() * 0.05;
          const offset = Math.sin(time) * 15 + Math.cos(time * 2.3) * 5;

          // Quadratic Bezier curve
          setLaserPath(`M ${cxL},${cyL} Q ${midX},${midY - 40 + offset} ${cxR},${cyR}`);
        }
      }
      animFrame = requestAnimationFrame(updateLaser);
    };

    if (modelsReady && videoReady) {
      animFrame = requestAnimationFrame(updateLaser);
    }

    return () => cancelAnimationFrame(animFrame);
  }, [modelsReady, videoReady, pointsState, leftAttractor, rightAttractor, calibStep]);

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

  // Slider progress percentages
  const speedPct = ((speedMultiplier - 0.1) / 2.9) * 100;
  const grainPct = (grainMultiplier / 3.0) * 100;
  const neonPct = (neonMultiplier / 3.0) * 100;

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

        {videoReady && videoRef.current && calibStep === 'complete' && (
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
            useCase={useCase}
            docZoom={docZoom}
            docPan={docPan}
            shockwaveTime={shockwaveTime}
            shockwaveCenter={shockwaveCenter}
          />
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* HUD Elements: Bounding border & laser energy beam */}
        {handsTracked && calibStep === 'complete' && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="laser-glow">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
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
              strokeWidth="2.5"
              filter="url(#glow)"
              className="transition-all duration-75"
            />

            {/* Do not render beam when field is locked */}
            {!isFieldLocked && (
              <>
                <path
                  d={laserPath}
                  fill="none"
                  stroke={effectMode === 'xray' ? '#22d3ee' : '#34d399'}
                  strokeWidth="3.5"
                  strokeDasharray="6, 4"
                  filter="url(#laser-glow)"
                  className="opacity-90"
                />
                <path
                  d={laserPath}
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  className="opacity-100"
                />
              </>
            )}
          </svg>
        )}

        {/* HUD Elements: Corner bounding marker squares */}
        {handsTracked && calibStep === 'complete' && pointsState.map((pt, idx) => (
          <div
            key={idx}
            style={{
              left: `${(1.0 - pt.x) * 100}%`,
              top: `${pt.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
            className={`absolute w-3 h-3 border-2 ${
              isFieldLocked
                ? 'border-amber-500 shadow-[0_0_10px_#f59e0b]'
                : effectMode === 'xray'
                ? 'border-cyan-400 shadow-[0_0_10px_cyan]'
                : 'border-emerald-400 shadow-[0_0_10px_#34d399]'
            } bg-black pointer-events-none z-20 transition-all duration-75`}
          />
        ))}

        {/* Dynamic Field-Locked HUD Alert Banner */}
        {isFieldLocked && handsTracked && calibStep === 'complete' && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-amber-950/75 border border-amber-500/30 text-amber-400 text-xs font-mono tracking-[0.25em] px-4 py-2 rounded shadow-[0_0_15px_rgba(245,158,11,0.2)] z-20 animate-pulse">
            FIELD LOCK ACTIVE // FIST LOCKED
          </div>
        )}

        {/* Dynamic Recording Progress / Active REC Overlay */}
        {isRecording && (
          <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/60 border border-red-500/30 px-3 py-1.5 rounded-full z-20 font-mono text-xs text-red-500 animate-pulse">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            <span>REC CAPTURING (5s WebM)</span>
          </div>
        )}

        {recordProgress > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-black/75 border border-emerald-500/20 text-emerald-400 font-mono text-sm">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - recordProgress / 100)}`}
                  className="text-emerald-400 transition-all duration-75"
                />
              </svg>
              <span>{Math.round(recordProgress)}%</span>
            </div>
          </div>
        )}

        {/* Interactive Calibration Screen overlays */}
        {calibStep !== 'complete' && !showLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-20 text-white font-mono p-8 text-center">
            <div className="w-16 h-16 border border-cyan-500/30 rounded-full flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(34,211,238,0.15)] animate-pulse">
              <span className="text-xl font-bold text-cyan-400">[C]</span>
            </div>
            
            {calibStep === 'raise_hands' && (
              <>
                <h1 className="text-lg tracking-[0.25em] text-cyan-400 mb-2">INITIALIZE SPATIAL HARNESS</h1>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mb-6">PLEASE RAISE BOTH HANDS INTO CAMERA FEED</p>
                <div className="w-48 h-1 bg-zinc-900 rounded overflow-hidden">
                  <div className="w-1/3 h-full bg-cyan-500 animate-pulse" />
                </div>
              </>
            )}

            {calibStep === 'spread_hands' && (
              <>
                <h1 className="text-lg tracking-[0.25em] text-cyan-400 mb-2">CALIBRATING SPATIAL GRID</h1>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mb-6">MOVE HANDS APART TO EXPAND THE HARNESS</p>
                <div className="w-48 h-1 bg-zinc-900 rounded overflow-hidden">
                  <div className="w-2/3 h-full bg-cyan-500 animate-pulse" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Failure-Safe Hologram Frame waiting panel */}
        {!handsTracked && calibStep === 'complete' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/40 z-10 text-white font-mono pointer-events-none">
            {/* Pulsing wireframe window mock */}
            <div className="w-72 h-44 border border-dashed border-red-500/25 rounded bg-red-950/5 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.05)] animate-pulse">
              <span className="text-[10px] text-red-500 tracking-[0.2em] mb-1">TRACKING OFFLINE</span>
              <span className="text-[9px] text-zinc-500 tracking-wider">WAITING FOR OPERATOR HANDS...</span>
            </div>
          </div>
        )}

        {/* Mission Mode Header status bar */}
        {isMissionActive && calibStep === 'complete' && (
          <div className="absolute top-6 right-6 left-6 flex justify-between gap-6 z-20 font-mono text-white text-xs select-none">
            <div className="flex flex-col gap-1.5 bg-black/60 border border-white/5 p-3 rounded">
              <span className="text-zinc-500 tracking-widest">MISSION TIME</span>
              <span className="text-cyan-400 text-sm">{missionTimer} SEC</span>
            </div>

            <div className="flex-1 max-w-xs flex flex-col gap-1.5 bg-black/60 border border-white/5 p-3 rounded">
              <div className="flex justify-between tracking-widest text-zinc-500">
                <span>FIELD STABILITY</span>
                <span className={`${stability < 30 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {Math.round(stability)}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-900 border border-white/5 rounded overflow-hidden mt-1">
                <div
                  style={{ width: `${stability}%` }}
                  className={`h-full transition-all duration-75 ${
                    stability < 30 ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_5px_#10b981]'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mission Mode Scorecard Dialog Popup */}
        {missionScorecard && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/85 z-30 font-mono text-white p-6">
            <div className="w-full max-w-sm bg-zinc-900 border border-cyan-500/20 p-8 rounded shadow-[0_0_30px_rgba(34,211,238,0.1)] text-center">
              <div className="w-12 h-12 border border-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-lg font-bold text-cyan-400">✓</span>
              </div>
              <h2 className="text-sm font-bold tracking-[0.25em] text-cyan-400 mb-2">FIELD SYNCHRONIZATION COMPLETE</h2>
              <p className="text-[10px] text-zinc-500 mb-6">MISSION OPERATIONAL PARAMETERS REPORT</p>

              <div className="space-y-3.5 border-t border-b border-white/5 py-4 mb-6 text-left text-xs tracking-widest text-zinc-300">
                <div className="flex justify-between">
                  <span>STABILITY INDEX</span>
                  <span className="text-white">{missionScorecard.stability}%</span>
                </div>
                <div className="flex justify-between">
                  <span>ACCURACY SCORE</span>
                  <span className="text-white">{missionScorecard.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span>ELAPSED TIME</span>
                  <span className="text-white">{missionScorecard.time} SEC</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span>ASSIGNED RANK</span>
                  <span className="text-cyan-400 font-bold">{missionScorecard.rank}</span>
                </div>
              </div>

              <button
                onClick={() => setMissionScorecard(null)}
                className="w-full py-2.5 bg-cyan-950 border border-cyan-500/30 text-cyan-200 text-xs font-semibold rounded hover:bg-cyan-900 transition-all duration-300 tracking-widest"
              >
                DISMISS REPORT
              </button>
            </div>
          </div>
        )}

        {/* Webcam-Only Proof HUD Panel (bottom-left) */}
        {calibStep === 'complete' && (
          <div className="absolute bottom-6 left-6 bg-black/60 border border-white/5 px-4 py-3 rounded z-20 font-mono text-[9px] tracking-wider text-zinc-500 select-none">
            <div className="text-[10px] font-bold text-zinc-300 tracking-widest border-b border-white/5 pb-1.5 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
              <span>SENSOR PROOF DIALOG</span>
            </div>
            <div className="space-y-1">
              <div>CAMERA: <span className="text-zinc-400">Standard RGB webcam</span></div>
              <div>DEPTH SENSOR: <span className="text-red-400 font-bold">None (Relative depth)</span></div>
              <div>TRACKER: <span className="text-zinc-400">MediaPipe Hands GPU</span></div>
              <div>RENDERING: <span className="text-zinc-400">WebGL / Three.js</span></div>
              <div>AUDIO ENGINE: <span className="text-zinc-400">Web Audio API synth</span></div>
              <div>EXPORT ENCODER: <span className="text-zinc-400">MediaRecorder WebM</span></div>
            </div>
          </div>
        )}

        {/* Holographic Settings sliding drawer */}
        <div
          style={{ right: isSettingsOpen ? '0px' : '-320px' }}
          className="absolute top-0 bottom-0 w-80 bg-zinc-950/75 border-l border-white/10 backdrop-blur-xl transition-all duration-500 ease-out z-25 flex flex-col justify-center p-8 font-sans text-white pointer-events-auto"
        >
          <div className="mb-6 border-b border-white/10 pb-4">
            <h2 className="text-sm font-semibold tracking-[0.25em] text-cyan-400">HUD CONTROLS</h2>
            <p className="text-[10px] text-zinc-400 tracking-wider mt-1">HOVER FINGER TO ADJUST</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-center">
            {/* Use Case Toggle Buttons (Non-hover click toggles) */}
            <div className="space-y-2 border-b border-white/5 pb-4">
              <span className="text-[10px] tracking-widest text-zinc-400 font-mono">ACTIVE USE CASE</span>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5 font-mono text-[9px] tracking-widest">
                <button
                  onClick={() => { setUseCase('standard'); playSwitchSound(); }}
                  className={`py-1.5 border rounded ${useCase === 'standard' ? 'bg-cyan-950 border-cyan-400 text-cyan-200' : 'bg-transparent border-white/5 text-zinc-400'}`}
                >
                  STANDARD
                </button>
                <button
                  onClick={() => { setUseCase('medical'); playSwitchSound(); }}
                  className={`py-1.5 border rounded ${useCase === 'medical' ? 'bg-cyan-950 border-cyan-400 text-cyan-200' : 'bg-transparent border-white/5 text-zinc-400'}`}
                >
                  MEDICAL
                </button>
                <button
                  onClick={() => { setUseCase('blueprint'); playSwitchSound(); }}
                  className={`py-1.5 border rounded ${useCase === 'blueprint' ? 'bg-cyan-950 border-cyan-400 text-cyan-200' : 'bg-transparent border-white/5 text-zinc-400'}`}
                >
                  DRAFT
                </button>
              </div>
            </div>

            {/* Slider 1: Speed */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono tracking-widest text-zinc-400">
                <span>FX TIME SPEED</span>
                <span>{speedMultiplier.toFixed(1)}x</span>
              </div>
              <div className="relative h-5 bg-zinc-900 border border-white/5 rounded-full overflow-hidden flex items-center px-1">
                <div
                  style={{ width: `${speedPct}%` }}
                  className="h-3 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"
                />
              </div>
            </div>

            {/* Slider 2: Grain */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono tracking-widest text-zinc-400">
                <span>FILM GRAIN DENSITY</span>
                <span>{grainMultiplier.toFixed(1)}x</span>
              </div>
              <div className="relative h-5 bg-zinc-900 border border-white/5 rounded-full overflow-hidden flex items-center px-1">
                <div
                  style={{ width: `${grainPct}%` }}
                  className="h-3 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_#34d399]"
                />
              </div>
            </div>

            {/* Slider 3: Neon */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono tracking-widest text-zinc-400">
                <span>NEON EDGE GLOW</span>
                <span>{neonMultiplier.toFixed(1)}x</span>
              </div>
              <div className="relative h-5 bg-zinc-900 border border-white/5 rounded-full overflow-hidden flex items-center px-1">
                <div
                  style={{ width: `${neonPct}%` }}
                  className="h-3 bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 rounded-full shadow-[0_0_10px_#e879f9]"
                />
              </div>
            </div>

            {/* Mission Mode Switch */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <span className="text-[10px] tracking-widest text-zinc-400 font-mono">MISSION TARGETS</span>
              <button
                onClick={() => {
                  if (!isMissionActive) {
                    setMissionTimer(60);
                    setStability(50);
                    setGestureAccuracy(90);
                    setMissionScorecard(null);
                  }
                  setIsMissionActive(!isMissionActive);
                  playSwitchSound();
                }}
                className={`w-full py-2 border rounded font-mono text-[10px] tracking-widest mt-1.5 transition-all duration-300 ${
                  isMissionActive ? 'bg-red-950 border-red-500 text-red-200' : 'bg-transparent border-white/5 text-zinc-400 hover:border-white/20'
                }`}
              >
                {isMissionActive ? 'ABORT STABILIZATION' : 'START FIELD STABILIZATION'}
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex flex-col items-center">
            <span className="text-[9px] tracking-widest text-zinc-500 font-mono">SYSTEM HEALTH</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest">60FPS // WEBGL ACTIVE</span>
            </div>
          </div>
        </div>

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
