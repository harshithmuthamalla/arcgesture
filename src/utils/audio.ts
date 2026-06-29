let audioCtx: AudioContext | null = null;
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;

const initCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playSwitchSound = () => {
  try {
    initCtx();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
};

// Continuous background sci-fi hum
export const startBackgroundHum = () => {
  try {
    initCtx();
    if (!audioCtx || humOsc) return;

    humOsc = audioCtx.createOscillator();
    humGain = audioCtx.createGain();

    humOsc.type = 'sawtooth'; // Gives a richer sci-fi drone
    humOsc.frequency.setValueAtTime(100, audioCtx.currentTime);

    // Filter to cut off harsh high frequencies, keeping only low rumble
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, audioCtx.currentTime);

    humOsc.connect(filter);
    filter.connect(humGain);
    humGain.connect(audioCtx.destination);

    humGain.gain.setValueAtTime(0.02, audioCtx.currentTime);

    humOsc.start();
  } catch (e) {
    console.warn('Failed to start hum:', e);
  }
};

export const stopBackgroundHum = () => {
  try {
    if (humOsc) {
      humOsc.stop();
      humOsc.disconnect();
      humOsc = null;
    }
    if (humGain) {
      humGain.disconnect();
      humGain = null;
    }
  } catch (e) {
    console.warn('Failed to stop hum:', e);
  }
};

export const updateBackgroundHum = (depth: number) => {
  try {
    if (!audioCtx || !humOsc || !humGain) return;

    // Map depth (0.0 -> 1.0) to pitch drop (110Hz -> 55Hz)
    const targetFreq = 110 - depth * 55;
    humOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);

    // Map depth to volume swell (far = quiet 0.02, close = heavy 0.08)
    const targetGain = 0.02 + depth * 0.06;
    humGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
  } catch (e) {
    console.warn('Failed to update hum:', e);
  }
};
