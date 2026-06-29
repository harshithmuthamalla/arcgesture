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
  const [calibStep, setCalibStep] = useState<'none' | 'raise_hands' | 'spread_hands' | 'complete'>('complete');

  // Settings Panel States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [grainMultiplier, setGrainMultiplier] = useState(1.0);
  const [neonMultiplier, setNeonMultiplier] = useState(1.0);
  
  // Use Case Modes ('standard' | 'medical' | 'blueprint')
  const useCase = 'standard';
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

  // Recording States
  const [isRecording, setIsRecording] = useState(false);
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
            
            // Scorecard bypassed
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
          startRecording();
        }
      } else {
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

        {/* HUD Elements: Bounding border polygon (Clean and plain boundary) */}
        {handsTracked && (
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
          </svg>
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
