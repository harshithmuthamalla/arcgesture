import { useEffect, useRef, useState } from 'react';
import { useHandTracker } from './hooks/useHandTracker';
import { EffectsCanvas } from './components/EffectsCanvas';
import {
  startBackgroundHum,
  stopBackgroundHum,
  updateBackgroundHum
} from './utils/audio';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [effectIndex, setEffectIndex] = useState(0);

  // Settings Panel States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [grainMultiplier, setGrainMultiplier] = useState(1.0);
  const [neonMultiplier, setNeonMultiplier] = useState(1.0);

  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Timer reference for panel closing auto-timeout
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
    processFrame,
    setErrorMsg
  } = useHandTracker(videoRef, canvasRef, triggerEffectSwitch);

  // Background Audio Controller (hum starts when hands are detected)
  useEffect(() => {
    if (pointsState.length === 4) {
      startBackgroundHum();
      const avgDepth = (leftDepth + rightDepth) / 2;
      updateBackgroundHum(avgDepth);
    } else {
      stopBackgroundHum();
    }
  }, [pointsState, leftDepth, rightDepth]);

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

      // Attempt to find supported MIME types
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
        a.download = `arcgesture-capture-${Date.now()}.webm`;
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

  useEffect(() => {
    let animationId: number;

    const loop = () => {
      processFrame();

      // Holographic sliding menu open trigger: finger held in the right 15% margin
      if (pointsState.length === 4) {
        const screenXL = 1.0 - leftAttractor.x;
        const screenXR = 1.0 - rightAttractor.x;
        
        if (screenXL > 0.85 || screenXR > 0.85) {
          setIsSettingsOpen(true);
          lastRightHandTimeRef.current = performance.now();
        } else {
          // Auto-close menu if no hands reside on the right for 3 seconds
          if (performance.now() - lastRightHandTimeRef.current > 3000) {
            setIsSettingsOpen(false);
          }
        }

        // Sliders Collision Detection
        if (isSettingsOpen) {
          const checkSliderHit = (att: typeof leftAttractor) => {
            const mx = 1.0 - att.x;
            const my = att.y;

            if (mx > 0.78) {
              // Normalized X position mapped to slider value 0.0 -> 1.0
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
    isSettingsOpen,
    isThumbsUpL,
    isThumbsUpR,
    isRecording,
    leftAttractor,
    rightAttractor
  ]);

  // Animated wave offset calculation for the SVG Laser path
  const [laserPath, setLaserPath] = useState('');
  useEffect(() => {
    let animFrame: number;
    
    const updateLaser = () => {
      if (pointsState.length === 4) {
        // Container-relative coords
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
  }, [modelsReady, videoReady, pointsState, leftAttractor, rightAttractor]);

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
  const showHUD = pointsState.length === 4;

  const svgPoints = showHUD
    ? `${(1.0 - pointsState[0].x) * 100},${pointsState[0].y * 100} ` +
      `${(1.0 - pointsState[1].x) * 100},${pointsState[1].y * 100} ` +
      `${(1.0 - pointsState[3].x) * 100},${pointsState[3].y * 100} ` +
      `${(1.0 - pointsState[2].x) * 100},${pointsState[2].y * 100}`
    : '';

  // Depth-reactive bloom multiplier
  const avgDepth = (leftDepth + rightDepth) / 2;

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
            bloomStrength={avgDepth}
            speedMultiplier={speedMultiplier}
            grainMultiplier={grainMultiplier}
            neonMultiplier={neonMultiplier}
          />
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* HUD Elements: SVG quadrilateral border & energy beam */}
        {showHUD && (
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
              stroke={effectMode === 'xray' ? 'cyan' : 'white'}
              strokeWidth="2"
              filter="url(#glow)"
              className="transition-all duration-75"
            />

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
          </svg>
        )}

        {/* HUD Elements: glowing marker corner squares */}
        {showHUD && pointsState.map((pt, idx) => (
          <div
            key={idx}
            style={{
              left: `${(1.0 - pt.x) * 100}%`,
              top: `${pt.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
            className={`absolute w-3 h-3 border-2 ${
              effectMode === 'xray'
                ? 'border-cyan-400 shadow-[0_0_10px_cyan]'
                : 'border-emerald-400 shadow-[0_0_10px_#34d399]'
            } bg-black pointer-events-none z-20 transition-all duration-75`}
          />
        ))}

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

        {/* Holographic Settings sliding drawer */}
        <div
          style={{ right: isSettingsOpen ? '0px' : '-320px' }}
          className="absolute top-0 bottom-0 w-80 bg-zinc-950/75 border-l border-white/10 backdrop-blur-xl transition-all duration-500 ease-out z-25 flex flex-col justify-center p-8 font-sans text-white pointer-events-auto"
        >
          <div className="mb-8 border-b border-white/10 pb-4">
            <h2 className="text-sm font-semibold tracking-[0.25em] text-cyan-400">HUD SETTINGS</h2>
            <p className="text-[10px] text-zinc-400 tracking-wider mt-1">HOVER INDEX FINGER TO ADJUST</p>
          </div>

          <div className="space-y-8 flex-1 flex flex-col justify-center">
            {/* Slider 1: Speed */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest text-zinc-300">
                <span>FX TIME SPEED</span>
                <span>{speedMultiplier.toFixed(1)}x</span>
              </div>
              <div className="relative h-6 bg-zinc-900 border border-white/5 rounded-full overflow-hidden flex items-center px-1">
                <div
                  style={{ width: `${speedPct}%` }}
                  className="h-4 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"
                />
              </div>
            </div>

            {/* Slider 2: Grain */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest text-zinc-300">
                <span>FILM GRAIN DENSITY</span>
                <span>{grainMultiplier.toFixed(1)}x</span>
              </div>
              <div className="relative h-6 bg-zinc-900 border border-white/5 rounded-full overflow-hidden flex items-center px-1">
                <div
                  style={{ width: `${grainPct}%` }}
                  className="h-4 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_#34d399]"
                />
              </div>
            </div>

            {/* Slider 3: Neon */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest text-zinc-300">
                <span>NEON EDGE GLOW</span>
                <span>{neonMultiplier.toFixed(1)}x</span>
              </div>
              <div className="relative h-6 bg-zinc-900 border border-white/5 rounded-full overflow-hidden flex items-center px-1">
                <div
                  style={{ width: `${neonPct}%` }}
                  className="h-4 bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 rounded-full shadow-[0_0_10px_#e879f9]"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex flex-col items-center">
            <span className="text-[10px] tracking-widest text-zinc-500">SYSTEM HEALTH</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
              <span className="text-xs text-zinc-400 font-mono tracking-widest">60FPS // WEBGL ACTIVE</span>
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
