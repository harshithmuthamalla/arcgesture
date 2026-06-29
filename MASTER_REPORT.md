# ArcGesture: Master Technical & Presentation Report
## Webcam-Only Spatial Computing Interface

---

## 1. Project Overview & Core Concept
**ArcGesture** is a hardware-free spatial computing HUD (Heads-Up Display) application designed to demonstrate the power of browser-based computer vision and GPU rendering. The project transforms any standard consumer 2D RGB webcam into an interactive, depth-aware spatial interface.

```
                  +-----------------------------------+
                  |         Webcam Video Feed         |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |      MediaPipe Hand Tracking      |
                  |     (21 Skeleton Landmarks)       |
                  +-----------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  Gesture Classifiers  |                       |  Spatial Geometry     |
|  - Thumbs-up (Rec)    |                       |  - Bilinear Warp      |
|  - Fist (Lock Field)  |                       |  - Hand Separation    |
|  - Knuckle-Clap       |                       |  - Wrist-MCP Depth    |
+-----------------------+                       +-----------------------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |       Three.js & WebGL GPU        |
                  |     - Custom GLSL Shaders         |
                  |     - Dynamic CanvasTextures      |
                  |     - Audio Synth Frequencies     |
                  +-----------------------------------+
```

### What It Does
When the user places their hands in front of the camera, ArcGesture locks onto key landmarks (specifically the index finger and thumb tips of both hands). It maps these four coordinates to draw a **dynamic holographic lens** that floats between the user's hands.
*   **Volumetric Warping**: The lens is not a flat overlay; it tilts in 3D and moves forward or backward on the Z-axis (simulating depth) based on the user's physical proximity to the camera.
*   **Fingertip Interaction**: The user can "draw" or warp elements inside the lens using their fingertips, inducing visual waves.
*   **Practical Tools**: The lens can display interactive diagrams (blueprints) or medical scans (MRI slices) which pan and zoom dynamically based on hand distance and midpoint translations.

---

## 2. Completed Feature Set

The system implements 12 standout features designed to deliver a premium user experience and robust demo flow:

### 1. Startup Calibration Sequence
To ensure optimal camera placement and lightning settings, the app boots into a calibration step-machine:
*   **Step 1 (Raise Hands)**: Prompts the user to place both hands in frame.
*   **Step 2 (Spread Hands)**: Prompts the user to separate their hands wide ($>42\%$ screen width). Once done, the active play HUD fades in with audio feedback.

### 2. Failure-Safe Hologram Frame
If hand tracking is temporarily lost, the screen displays a pulsing, retro-cybernetic dashed wireframe in the center with the warning: `TRACKING OFFLINE // SENSOR SCANNING FOR ACTIVE OPERATORS`. This keeps the canvas visually active and clean.

### 3. Bounding Quad & Bilinear Mesh
An interactive 3D quad geometry is built inside Three.js using 32x32 segments. A bilinear interpolation algorithm runs on the CPU, deforming the grid vertices to fit the 4 corners of the hands in real-time, matching tilt, stretch, and skew.

### 4. Volumetric Pseudo-Depth mapping
By measuring the distance between the wrist and knuckles, the system calculates a relative depth value:
*   Pushing hands closer to the webcam deepens the synthesizer hum (lowers the frequency) and increases the visual glow bloom.
*   Pulling hands back raises the audio frequency pitch and dims the glow.

### 5. Fist-Lock (Field Freeze Combo)
If the user tightens both hands into fists, the quad corners freeze in place, displaying a `FIELD LOCK ACTIVE` alert. The presenter can drop their hands or point inside the lens to highlight features. Spreading the hands open instantly unlocks the coordinates.

### 6. Portal Shockwave Ripple
Tapping knuckles together (clapping) and rapidly spreading the hands apart triggers an expanding refractive glass shockwave ripple. The GPU shader warps UV coordinates outward from the midpoint of the hands.

### 7. Active Use Case Document Inspector
The settings drawer allows selecting three practical modes:
*   **Standard**: Displays the visual shader effects.
*   **Medical MRI Scan**: Draws a dynamic axial brain scan slice inside the lens.
*   **Drafting Blueprint**: Projects a mechanical hydraulic pump schematic.
*   **Zooming**: Spreading hands zooms in on the document; pulling hands close zooms out.
*   **Panning**: Moving hands pans/scrolls the image in 2D.

### 8. Mission Mode Stabilization Challenge
A 60-second interactive game. Stability decays due to simulated solar wind glitches. The user must pinch to scan, spread hands to expand the field, and move fingers quickly to clean screen noise. Surviving the timer displays a holographic scorecard and awards spatial ranks (e.g. *Spatial Operator*).

### 9. Thumbs-Up Recording Export
Holding a thumbs-up gesture for 2 seconds triggers a circular progress bar. Once filled, a red `REC` banner blinks and records 5 seconds of the canvas stream using the browser's `MediaRecorder` API, downloading an `arcgesture-demo.webm` video file.

### 10. Web-Audio Interactive Synthesizer
A real-time synthesizer built on the Web Audio API runs continuously. It plays a dual sawtooth wave hum that reacts dynamically to hand movements and generates frequency swoops during claps, calibration events, and shockwaves.

### 11. Sliding HUD Settings Drawer
Hovering a hand in the right 15% margin of the camera feed slides in a cyberpunk control menu. Presenters can adjust Speed, Film Grain density, and Neon Edge glow by hovering their hands over slider coordinates.

### 12. Fail-Safe Mode Cycling Keyboard Listeners
To ensure 100% reliability during live stages where lighting might affect hand detection, pressing the **Spacebar** or **Enter** key instantly cycles the shader filter modes.

---

## 3. Technical Architecture & Mathematical Models

### A. Bilinear Mesh Interpolation
To map a 2D plane onto the deformed quadrilateral boundaries defined by the Left Index ($Q_{tl}$), Right Index ($Q_{tr}$), Left Thumb ($Q_{bl}$), and Right Thumb ($Q_{br}$), the vertex positions are calculated dynamically using:
$$V(u,v) = (1-u)(1-v)Q_{bl} + u(1-v)Q_{br} + (1-u)v\,Q_{tl} + uv\,Q_{tr}$$
The Z-depth coordinate is calculated based on knuckle-to-wrist separation:
$$V_z = -0.15 + \text{avgDepth} \times 0.3$$

### B. GPU Curl Fluid Noise & Shockwave Refraction
Fingertip movements generate swirl vectors in the fragment shader to warp the texture UV coordinates:
$$\vec{F}_{swirl} = \begin{bmatrix}-dy\\dx\end{bmatrix} \times (1.0 - \text{dist} / 0.28) \times 0.045$$
The shockwave ring projects a refraction ripple on the warped UV coordinates:
$$\text{Ripple} = \sin(\text{dist} \times 45.0 - \text{time} \times 15.0) \times 0.016 \times \exp(-\text{time} \times 1.25)$$

---

## 4. Real-World Use Cases

The core interface developed for ArcGesture has significant utility in multiple domains:

### 1. Sterile Surgical & Medical Environments
Surgeons in sterile operating rooms can view, pan, and zoom axial MRI/CT scans or patient charts without touching physical keyboards or touchscreens. They control the diagnostic displays hands-free, preventing cross-contamination.

### 2. Hands-Free Industrial & Field Maintenance
Maintenance mechanics working on high-voltage systems or complex gearboxes can inspect internal blueprint drawings while their hands are holding grease guns or wrenches. Using a simple fist lock, they can freeze the blueprint on the HUD and work.

### 3. Pathogen-Free Contactless Kiosks
Public information kiosks at airports, train stations, and hospitals can display interactive maps and check-in pages controlled entirely by gestures, eliminating the spread of contact-transmissible viruses.

### 4. Musical Performance & Media Control
Stage performers and DJs can map hand position, separation, and speed to control synthesizer volumes, audio filter thresholds, and visual particle displays concurrently.

---

## 5. Live Demo Presentation Script

Here is the step-by-step demo script to pitch the project to judges in under 2 minutes:

```
[Calibration Step]  -->  [Proof Concept HUD]  -->  [Depth/Sound Demo]  -->  [Medical Zoom/Pan]  -->  [Export Video]
   (Spread hands)           (Proof Panel)           (Bass Rumble)           (Fist Lock Scan)         (Thumbs-up WebM)
```

| Time | Presenter Action | Visual Feedback | Presentation Script |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:15** | Raise both hands and move them apart wide. | HUD advances past **Calibration** into Play mode; synth hum initializes. | *"As I raise my hands and spread them apart, the spatial harness calibrates itself to my camera feed. The application starts up instantly with zero external markers."* |
| **0:15 - 0:30** | Point to the bottom-left of the screen. | **Sensor Proof Panel** lists standard RGB camera, WebGL, and Web Audio. | *"Note the Sensor Proof Panel in the corner. We are achieving 3D coordinate mapping and depth translation using a standard 2D laptop webcam—no LiDAR, no infrared depth cameras needed."* |
| **0:30 - 0:45** | Sweep index fingers inside the lens. | Particles swirl and distort behind your fingertips. | *"As I move my index fingers inside this bounding box, a WebGL curl-fluid shader calculates the velocities of my fingertips, creating a reactive electromagnetic ripple."* |
| **0:45 - 1:00** | Push hands close to the camera, then pull them back. | The audio hum drops to a heavy bass rumble, and the neon borders flare. | *"Moving closer to the lens increases our relative depth multiplier, which deepens our synthesizer tone and flares our neon border glow."* |
| **1:00 - 1:15** | Hover hand near the right edge, toggle **Medical** mode. | Settings panel slides out. MRI brain slice projects inside the lens. | *"By hovering my hand on the right edge, our controls slide open. I can switch our HUD to a sterile Medical MRI scanner. Spreading my hands zooms in, and moving them pans the view."* |
| **1:15 - 1:30** | Make a fist with both hands. | Coordinates freeze, and a amber **FIELD LOCK** warning flashes. | *"If I make a fist with both hands, I trigger a Fist-Lock. The lens freezes in place in 3D, allowing me to move my hands freely to point details out to surgeons."* |
| **1:30 - 1:45** | Clap hands together and pull them apart very fast. | Swoop sound plays; filter cycles, and a portal shockwave ripple expands. | *"Clapping cycles through our shader filters, and spreading them fast triggers a portal shockwave ripple distorting the entire environment."* |
| **1:45 - 2:00** | Hold a thumbs-up gesture for 2 seconds. | Progress ring fills to 100%, REC flashes, and the WebM video downloads. | *"Finally, holding a thumbs-up records a 5-second WebM video clip of my live spatial session and downloads it directly to my desktop. This is ArcGesture."* |
