# ArcGesture: Webcam-Only Spatial Computing Interface
### Technical Specification, Architecture & User Guide

---

## 1. Executive Summary

**ArcGesture** is an interactive spatial computing overlay that transforms a standard 2D RGB webcam into a real-time, gesture-controlled HUD interface. Using on-device machine learning (MediaPipe Hands) and GPU-accelerated graphics (Three.js & custom GLSL shaders), ArcGesture projects a hand-anchored, bilinearly deformed visual canvas that follows your hand rotations, translations, depth displacement, and specific gesture combinations.

### Core Value Proposition
- **Zero-Hardware Dependency**: Runs at 60 FPS on any consumer laptop webcam, bypassing the need for dedicated depth sensors (LiDAR, Leap Motion, or headsets).
- **Spatial Anchoring**: The UI is physically anchored to your hands in 3D space, translating on the Z-axis (pseudo-depth) and warping to match tilt and span.
- **Fail-Safe Robustness**: Integrated calibration sequencing, 600ms tracking grace buffers, and keyboard fail-safe backups guarantee demo reliability.

---

## 2. Interactive Gesture & Action Guide

Perform the following sequences to interact with the spatial interface:

| Action / Gesture | Physical Movement | Visual HUD Response |
| :--- | :--- | :--- |
| **Harness Calibration** | Raise both hands and move them apart ($>42\%$ screen width) | Initializes the tracking boundary, transitioning from the startup sequence to the active play area. |
| **Effect Cycling** | Bring knuckles close together ($<20\%$ width) or press **Spacebar/Enter** | Plays a frequency swoop sound and cycles through the 7 WebGL shader modes. |
| **Grid Warp** | Hover index fingers inside the active quad (Effect 0) | Warps the twinkling particle flow field away from your fingertips. |
| **Pseudo-Depth Hum** | Push hands closer to camera / pull them back | Adjusts continuous sawtooth drone pitch (110Hz to 55Hz) and flares the neon edge bloom. |
| **Holographic Zoom** | Spread hands wide / bring them closer (in Use Case mode) | Zooms in/out on the Medical MRI brain scan or mechanical Blueprint drawing. |
| **Holographic Panning** | Shift both hands left, right, up, or down | Scrolls/pans the document texture inside the hand-anchored window. |
| **Fist-Lock Field** | Fold both hands into a tight fist | Freezes the lens coordinates in 3D space. Open hands to release. |
| **Portal Shockwave** | Tap hands (clap) and pull them apart very fast ($>1.4$ speed) | Generates a global expanding refractive ripple ring. |
| **Thumbs-Up Export** | Hold thumbs-up on either hand for 2 seconds | Blinks a red `REC` indicator, records 5 seconds of the canvas stream, and exports a WebM video. |

---

## 3. Shader Effects Suite

1. **Twinkling Particle Grid**: A 90x90 matrix of grid squares that twinkle, with grid particle sizes scaling dynamically based on hand Z-depth.
2. **Technical Blueprint**: Projects a cyan mechanical grid (`#021544`) with circular schematics and Sobel outlines of your hands drawing on top.
3. **Glow Silhouette**: High-contrast outline core with depth-reactive edge-bloom cyan halos.
4. **Thermal Heatmap**: Volumetric heat mapping ranging from cold blue to hot green, yellow, and red.
5. **Pixelated Dot-Matrix**: Downsampled 80x80 green circle matrix showing camera contours.
6. **Glitch Aberration**: High-frequency horizontal noise lines combined with red/blue chromatic aberration.
7. **Neon Edges**: High-contrast Sobel edge extraction rendering lines in cyber cyan/green.
8. **X-Ray Scanner (Dual Pinch)**: Collapses the quad to a 15% height scanline strip displaying cyan bones and Hash grain.

---

## 4. Engineering Architecture & Mathematics

### Bilinear Mesh Interpolation
The 32x32 plane is deformed in 3D to match a 4-point quadrilateral defined by the left index ($Q_{tl}$), right index ($Q_{tr}$), left thumb ($Q_{bl}$), and right thumb ($Q_{br}$).
$$V(u,v) = (1-u)(1-v)Q_{bl} + u(1-v)Q_{br} + (1-u)v\,Q_{tl} + uv\,Q_{tr}$$
We dynamically translate the Z vertex coordinates based on hand depth:
$$V_z = -0.15 + \text{avgDepth} \times 0.3$$

### WebGL Fluid Curl-Noise Warp
Index fingertip velocities are mapped to GPU vector displacement, warping the UV texture coordinates:
$$\vec{F}_{swirl} = \begin{bmatrix}-dy\\dx\end{bmatrix} \times (1.0 - \text{dist} / 0.28) \times 0.045$$

### Fast-Spread Shockwave Ripple
The combo gesture triggers a refraction wave calculated in GLSL:
$$\text{Ripple} = \sin(\text{dist} \times 45.0 - \text{time} \times 15.0) \times 0.016 \times \exp(-\text{time} \times 1.25)$$

---

## 5. Live Demo Presentation Script

1. **Startup (0:00 - 0:10)**: Boot the app. Show judges the **Calibration Screen**. Raise hands and move them apart to calibrate.
2. **Proof of Concept (0:10 - 0:25)**: Point to the bottom-left **Sensor Proof Panel** proving there are no depth sensors active.
3. **Interactive Warping (0:25 - 0:40)**: Hover fingers inside the Particle Grid. Sweep index fingers to trigger the fluid curl swirls.
4. **Volumetric Depth (0:40 - 0:55)**: Push hands close to the camera. The audio hum drops to a heavy bass rumble and the neon bloom flares up.
5. **Mission Mode (0:55 - 1:15)**: Click "Start Field Stabilization". Keep stability high by moving fingers, scanning, and expanding. Complete the mission and show your spatial operator rank scorecard.
6. **Use Cases (1:15 - 1:30)**: Slide in the settings panel by hovering in the right margin. Toggle **Medical** or **Draft** modes. Spread hands to zoom in on the brain scan/blueprint. Move hands to pan.
7. **Fist-Lock (1:30 - 1:40)**: Fold both hands into a fist to lock the frame. Explain the static blueprint drawing while moving your hands. Open hands to release.
8. **Thumbs-up Record (1:40 - 2:00)**: Hold a thumbs-up for 2 seconds. Record a 5-second WebM clip and download the video to show judges.
