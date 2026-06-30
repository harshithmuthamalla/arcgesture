# ArcGesture (DeskOps) User Manual & Interactive Guide

Welcome to the **ArcGesture (DeskOps)** interactive environment. This system uses real-time hand-tracking technology via Google MediaPipe Hand Landmarker and WebGL (Three.js/React Three Fiber) to create a custom, gesture-controlled hologram lens interface with dynamic audio and visual feedback.

Below is the complete reference of what you can do, the interactive gestures available, how the settings work, and step-by-step usage instructions.

---

## 🎮 Core Visual & Use-Case Modes

The hologram lens operates in three primary use-case modes, selectable via the top menu bar or keyboard shortcuts (`1`, `2`, `3`):

### 1. Standard Mode (Shortcut: `1`)
The default hologram lens aligns its 4 corners directly to your fingers:
*   **Top-Left Corner**: Left index finger tip
*   **Top-Right Corner**: Right index finger tip
*   **Bottom-Left Corner**: Left thumb tip
*   **Bottom-Right Corner**: Right thumb tip

*Interaction Tip:* Opening, closing, or moving your thumbs and index fingers directly stretches, reshapes, and positions the holographic quadrilateral window in real-time.

### 2. Medical MRI Mode (Shortcut: `2`)
Reveals a glowing, procedural **3D spatial Brain model** suspended inside the lens:
*   Consists of left/right lobes, a brain stem, and a moving scanning laser ring.
*   Pinch to activate X-Ray mode to see the brain's internal energy core morph into a glowing pink sphere.

### 3. Blueprint CAD Mode (Shortcut: `3`)
Reveals a detailed, interlocking **3D Gear assembly** rotating inside the CAD draft board:
*   Features a main gear and a secondary smaller interlocking gear rotating in opposite directions.
*   Form double fists to lock the gearbox schematic in place.

---

## 🖐️ Gesture Command Reference

| Gesture / Action | How to Trigger | Result / Effect |
| :--- | :--- | :--- |
| **Open Thumb & Index** | Spread thumbs and index fingers wide. | Calibrates, shapes, and moves the holographic quad window in 3D space. |
| **Single-Hand Pinch** | Touch thumb and index finger on one hand. | Generates a liquid-like refractive ripple wave in the UV coordinates, centered at the index finger tip. |
| **Double-Hand Pinch** | Touch thumb and index fingers on *both* hands. | Blends the entire hologram window into **X-Ray Mode**. |
| **Clap Gesture** | Bring your hand knuckles close together (distance < 0.20). | **Cycles Visual Shader Effects** (7 presets available) and plays a sci-fi switch sound. |
| **Double Fist (Lock)** | Form a closed fist with *both* hands. | **Coordinate Lock**: Freezes the visual window position and 3D model in place. Bounding box turns orange. |
| **Thumbs Up** | Extend thumb upwards with either hand, keeping other fingers folded. | **Record Demo Video**: Automatically starts a **5-second capture** of the Three.js Canvas and downloads it. |
| **Portal Shockwave** | Clap hands close, then *quickly spread* them apart (velocity > 1.4). | Triggers a glowing, circular shockwave ring that ripples outward from the center of the clap. |
| **HUD Settings Menu** | Move either hand to the outer side margins of the camera view. | Slides open the **HUD Settings Slider Menu** (described below). |
| **Aim Target Cursor** | Move hands anywhere in calibration area. | Cyan reticles appear in the SVG overlay, tracing your hand attractors to help you aim. |

---

## 🧭 3D Spatial Model Viewer Controls

When in **Medical MRI** or **Blueprint CAD** mode, you can manipulate the 3D holographic wireframes in real-time:
1.  **3D Translation (Panning)**: Move your hands left, right, up, or down. The midpoint of your hands will translate the 3D model in virtual space.
2.  **3D Scaling (Zooming)**: Widen or narrow the distance between your hands. Spreading your hands zooms in, while bringing them together zooms out.
3.  **3D Rotation (Tilting)**: Tilt your wrists/hands. The angle of the line connecting your left and right hands rotates the 3D wireframe along the Z-axis.

---

## 🎛️ HUD Settings Menu & Collision Sliders

When you move a hand to the outer margin (`screenX > 0.85`), the glassmorphic HUD settings panel slides in on the right. If both hands leave this zone for more than **3.5 seconds**, the panel automatically closes.

To adjust settings, hover the tip of your index finger over the corresponding visual tracks:

1.  **Speed Multiplier** (Top Slider | Y: `0.20` to `0.28`):
    *   Controls the speed of time-based shader animations, such as contours, glitches, and ripples.
2.  **Grain Multiplier** (Middle Slider | Y: `0.35` to `0.43`):
    *   Adjusts the strength of the analog film grain noise overlay in X-Ray Mode.
3.  **Neon Intensity** (Bottom Slider | Y: `0.50` to `0.58`):
    *   Controls the glow intensity and outline brightness of the neon shader effects.
4.  **Audio Reactivity Switch** (Bottom Button | Y: `0.65` to `0.73`):
    *   Hovering your finger over the button for 0.8s toggles **Microphone Audio Reactivity**.

---

## 🎙️ Microphone Audio Reactivity

Activating the audio reactive mode connects the Web Audio API to your microphone:
*   Visual components like shader contour bands, particle sizes, scanline speeds, and neon outlines pulse and oscillate in sync with ambient sound or your voice.
*   The 3D wireframe models expand and contract dynamically based on the volume frequency.

---

## 🏆 Training Mission Mode & Scorecard

Click the **START TRAINING MISSION** button in the bottom-left corner to start a 60-second test of your spatial coordination:
*   **Lens Stability**: A gauge on the left that drains over time. Keep hands moving, pinch to scan, or expand the boundary to restabilize.
*   **Gesture Accuracy**: Measures how cleanly you trigger pins, claps, and locks when requested.
*   **Retro Debriefing Scorecard**: At the end of the 60s, a cyberpunk panel populates your scorecard, calculating your final score and awarding a rank from `TRAINEE` up to `S-CLASS HOLO OPERATOR` based on performance.

---

## 🌈 The 7 Visual Shader Presets (Clap to Cycle)

Each time you clap (or press **Spacebar** / **Enter**), the shader cycles through these presets:

1.  **Standard Particle Grid**: Stylized topographical background with animated contours and a 90x90 grid of color-cycling pixels (15 Hz cycle between magenta, yellow, and white).
2.  **Blueprint Mode**: Draft-board blue grid background overlaid with concentric technical schematics and bright cyan edge outlines.
3.  **Glow Silhouette**: A high-contrast cyan silhouette of the subject with animated edge noise.
4.  **Thermal Imaging**: A classic heat map gradient shader shifting from dark blue (cool) to red/white (hot).
5.  **Retro Pixelated**: A green matrix-style pixelation shader that lights up based on subjects.
6.  **RGB Glitch**: CRT-style horizontal distortion combined with red/blue chromatic aberration glitching.
7.  **Neon Edges**: Solid, glowing cyan-teal outline contours highlighting moving subjects.

---

## ⌨️ Keyboard Shortcuts & Fail-safes
If you are presenting a live demo or have tracking issues:
*   **Spacebar** or **Enter**: Manually cycles through the 7 visual shader presets.
*   **1**: Swap use-case to Standard.
*   **2**: Swap use-case to Medical (3D Brain).
*   **3**: Swap use-case to Blueprint (3D Gears).

---

## 🛠️ Step-by-Step Instructions on How to Use It

1.  **Launch the App**:
    *   Run `npm run dev` and open the local address in a secure (HTTPS or `localhost`) browser window.
2.  **Allow Camera Access**:
    *   Accept the browser's request for webcam permissions (necessary for MediaPipe hand tracking).
3.  **Calibrate Hand Tracking**:
    *   Raise both hands into the camera frame.
    *   Spread your hands apart (width greater than `0.42` normalized coordinate scale). You will hear a switch sound, and the white hand skeleton and lens overlay will appear.
4.  **Interact**:
    *   **Scale, Pan, & Rotate**: Switch to use-cases `2` or `3` to load 3D wireframe models, and adjust them using hand movements.
    *   **Adjust HUD Settings**: Wave your hand to the outer margin to open the settings, and slide your index finger over the sliders to change speed, grain, or neon values.
    *   **Toggle Audio Reactive**: Hover over the mic feed button in the Settings menu to toggle voice synchronization.
    *   **Start a Mission**: Click the training button to test your skills and review your final evaluation scorecard.
    *   **Record a Demo**: Put your thumb up to automatically record a 5-second video file of the live Three.js canvas.
