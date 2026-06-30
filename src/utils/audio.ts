let audioCtx: AudioContext | null = null;
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;

let micStream: MediaStream | null = null;
let micSource: MediaStreamAudioSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: any = null;

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

export const playChimeSound = () => {
  try {
    initCtx();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.15); // C6

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
};

export const playTickSound = () => {
  try {
    initCtx();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
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

// Microphone access for audio reactivity
export const startMicrophone = async (): Promise<boolean> => {
  try {
    initCtx();
    if (!audioCtx) return false;

    if (micStream) return true; // Already active

    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micSource = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // Low FFT size for fast responsive visual volume tracking

    micSource.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    return true;
  } catch (err) {
    console.warn('Microphone access denied or error:', err);
    return false;
  }
};

export const stopMicrophone = () => {
  try {
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (micSource) {
      micSource.disconnect();
      micSource = null;
    }
    if (analyser) {
      analyser.disconnect();
      analyser = null;
    }
    dataArray = null;
  } catch (e) {
    console.warn('Failed to stop microphone:', e);
  }
};

export const getAudioPulse = (): number => {
  try {
    if (!analyser || !dataArray) return 0;
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length / 255; // Normalized value 0.0 -> 1.0
  } catch {
    return 0;
  }
};

export const playTone = ({
  freq = 440,
  type = 'sine' as OscillatorType,
  gain = 0.18,
  attack = 0.005,
  decay = 0.12,
  duration = 0.15
} = {}) => {
  try {
    initCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);
    osc.connect(env);
    env.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.warn('playTone failed:', e);
  }
};

export const playNoise = ({
  gain = 0.25,
  duration = 0.18,
  freq = 800
} = {}) => {
  try {
    initCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const bufSize = audioCtx.sampleRate * duration;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter);
    filter.connect(env);
    env.connect(audioCtx.destination);
    src.start(now);
    src.stop(now + duration);
  } catch (e) {
    console.warn('playNoise failed:', e);
  }
};

export const soundCountdownBeep = (number: number) => {
  const freqs: Record<number, number> = { 3: 660, 2: 880, 1: 1100 };
  playTone({ freq: freqs[number] || 660, gain: 0.22, decay: 0.18, duration: 0.22 });
};

export const soundSnap = () => {
  playTone({ freq: 1400, type: 'square', gain: 0.08, attack: 0.001, decay: 0.06, duration: 0.08 });
};

export const soundShatter = () => {
  playNoise({ gain: 0.35, duration: 0.25, freq: 400 });
  playTone({ freq: 90, type: 'sawtooth', gain: 0.3, attack: 0.001, decay: 0.22, duration: 0.25 });
};

export const soundComplete = () => {
  try {
    initCtx();
    if (!audioCtx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const now = audioCtx!.currentTime + i * 0.1;
      const osc = audioCtx!.createOscillator();
      const env = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.15, now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(env);
      env.connect(audioCtx!.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  } catch (e) {
    console.warn('soundComplete failed:', e);
  }
};

export const soundSaved = () => {
  playTone({ freq: 880, gain: 0.12, decay: 0.3, duration: 0.32 });
};

export const soundFail = () => {
  playTone({ freq: 180, type: 'sawtooth', gain: 0.25, attack: 0.01, decay: 0.4, duration: 0.45 });
};

export const soundBounce = () => {
  playTone({ freq: 440, type: 'triangle', gain: 0.15, attack: 0.002, decay: 0.08, duration: 0.1 });
};

export const soundPowerShot = () => {
  playTone({ freq: 900, type: 'sawtooth', gain: 0.2, attack: 0.005, decay: 0.25, duration: 0.28 });
};
