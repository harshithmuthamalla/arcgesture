# ArcGesture Arcade HUD

ArcGesture Arcade turns the webcam into a gesture game controller. Instead of pressing keys or touching a screen, players use hand movement, pinch, clap, fist, and hand depth to control real-time WebGL games.

This project is a webcam-only hand-tracking interactive environment. It uses real-time hand-tracking technology via Google MediaPipe Hand Landmarker and WebGL (Three.js / React Three Fiber) to create a custom gesture-controlled hologram lens interface with dynamic audio and visual feedback, alongside a suite of gesture-controlled arcade mini-games.

---

## 🎮 Core Visual & Use-Case Modes (HUD View)

The hologram lens operates in four primary use-case modes, selectable via the top menu bar or keyboard shortcuts (`1`, `2`, `3`, `4`):

1. **Standard Mode** (Shortcut: `1`): hologram lens aligns its 4 corners to your hands. By default, this uses **Palm Zoom & Pan** controls (resizing and translating the quad based on palm center and distance). You can toggle back to direct fingertip mapping in the Settings panel.
2. **Medical MRI Mode** (Shortcut: `2`): reveals a spatial 3D brain model. Pinch to activate X-Ray core mode.
3. **Blueprint CAD Mode** (Shortcut: `3`): reveals a detailed 3D interlocking gear assembly rotating in opposite directions.
4. **Puzzle Cam Mode** (Shortcut: `4`): a gesture-controlled photobooth game. Pinch with both hands to snap a photo, drag B&W pieces with single pinch to solve, and make a fist to shatter the puzzle and save it to your vertical Polaroid strip gallery.

---

## 🕹️ Arcade Mode Games

Arcade Mode includes three games that use computer vision as the primary controller:

### 1. Reactor Stabilizer
* **Concept**: Stabilize a glowing, spiky reactor core before containment field decay spikes.
* **Duration**: 60 seconds.
* **Gameplay**: Spawns corrupted glitch nodes. Expand containment field (spread hands) to gain stability. Pinch-hold over glitches to scan them. Fist to lock stability decay. Clap to release shockwaves that clear all glitches in range. Push hands closer to boost stability at the cost of temperature (cooling down by moving hands away). Finalize stabilization with a thumbs-up once stability is above 80%.

### 2. HoloPong
* **Concept**: A neon Pong arcade game where the user's hands become paddles.
* **Gameplay**: Move Left/Right hand up and down to position left/right paddles. Pinch to trigger a high-velocity pink **Power Shot**. Hold a fist to activate a wider paddle **Shield**. Solo mode plays against AI, and Dual mode controls both paddles. First to 5 wins.

### 3. Rhythm Hands
* **Concept**: A musical rhythm game where gestures must be performed on beat.
* **Gameplay**: Falling target nodes (Palm, Fist, Pinch, Clap, Swipe, Thumbs-up) float down a central lane. Perform the correct gesture when they hit the target zone. Builds combo streaks for high-scoring ranks. Available in Easy, Normal, and Expert.

---

## 🖐️ Gesture Command Reference

| Gesture / Action | How to Trigger | Result / Effect |
| :--- | :--- | :--- |
| **Open Palm** | Spread fingers wide. | Default paddle state in Pong; standard hit note in Rhythm. |
| **Pinch** | Touch index finger and thumb tip together. | Drags puzzle pieces; triggers Power Shots in Pong; scans reactor glitches. |
| **Double Fist** | Form closed fists with both hands. | Freezes hologram coordinate lock; freezes stability decay in Reactor. |
| **Clap** | Bring knuckles close together (<0.20 distance). | Cycles visual shaders in HUD; triggers shockwave resets in Reactor. |
| **Thumbs Up** | Extend thumb upwards, fold other fingers. | Triggers a 5-second WebM canvas video recording and download; finalizes Reactor Stabilizer. |
| **Hands Spread** | Move hands far apart. | Calibrates tracking; zooms standard hologram quad; boosts stability in Reactor. |

---

## 🛠️ Setup & Running Locally

### 1. Clone & Install
Ensure you have Node.js installed.
```bash
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Camera Calibration Flow
Before starting any arcade game, a calibration guide will appear:
1. **Raise both hands** into the camera frame.
2. Once detected, **spread hands wide apart** (width >0.42 normalized coordinates).
3. The game starts automatically!

---

## 🎙️ Web Audio Sound Synthesis

All sound effects are synthesized in real-time using the Web Audio API (no external asset downloads):
* Reactor stabilizer bass drone reacting to hand depth.
* High-frequency beeps for the photobooth countdown.
* Sawtooth frequency slides for puzzle shatters and complete chords.
* Clean square-wave beeps for Pong bounces.

---

## 📹 Canvas Video Recording & Export

ArcGesture supports on-the-fly recording:
* Hold a **Thumbs-Up** gesture with either hand for **2 seconds**.
* A red `REC` banner appears, capturing the next **5 seconds** of your gameplay viewport.
* The recording automatically compiles and downloads as a WebM file named `arcgesture-arcade-[game-name].webm`.

---

## ⚠️ Limitations & Troubleshooting

* **Good Lighting Required**: Mediapipe tracking operates on RGB images. Ensure your face/hands are well-lit and not back-lit.
* **Estimated Depth**: Closeness (z-depth) is estimated from palm proportions, not true depth sensors. Keep hands parallel to the camera for best results.
* **Keep Hands in Frame**: If hands leave the camera viewport, the game pauses immediately showing a `TRACKING UNSTABLE` warning.
* **GPU Dependency**: WebGL rendering requires a device with decent graphics capability. Use Chrome or Edge for the best performance.
* **Keyboard Fallbacks**: In case of camera tracking loss during live presentations, use `Space` (start/pause), `Enter` (continue), `R` (restart), `Esc` (quit), and `1`/`2`/`3` to navigate safely.
