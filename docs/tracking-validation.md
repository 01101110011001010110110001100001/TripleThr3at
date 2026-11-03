# TRI-7 — Tracking Library & Technique Measurement Validation

**Owner:** Nela · **Status:** In Review · **Due:** 2026-11-03
**Linear:** [TRI-7](https://linear.app/triplethr3at/issue/TRI-7/validate-tracking-libraries-and-technique-measurements)

Evaluates computer-vision options for StickSmart's camera-supported training mode:
head-up (awareness) detection, puck-width estimation, performance under
indoor/outdoor conditions, and child/adult calibration — with a path to
Python/C++ interop (coordinate with **Kemuel**, TRI-15/TRI-21/TRI-22).

> **Reuse check (per ticket):** no existing tracking/vision code in the repo as
> of this branch — the only matches for "camera/tracking" are simulated-feature
> UI copy in `frontend/js/*`. This is greenfield. The DB side already defines the
> *outputs* the vision layer must produce (see "What the app needs measured").

> **Evidence status:** the **recommendation, roles, limitations, and proposed
> thresholds** below are engineering judgment grounded in each library's
> documented capabilities and our metric needs. Cells marked **`MEASURE`** are
> deliberately empty until the test protocol (§6) is run on real clips — I will
> not fill them with numbers we haven't measured. That run needs the libraries
> installed + sample footage (and, for interop timing, Kemuel's pipeline).

---

## 1. Recommendation (short)

**Use MediaPipe as the primary landmark engine, OpenCV as the supporting
image-processing/puck layer. Do the per-frame inference in Python for the MVP;
reserve C++ only for a later hot path if profiling shows we need it.**

- **MediaPipe Pose (BlazePose, 33 body landmarks)** → head-up/awareness angle and
  rep segmentation from body motion. Ships a solid pretrained model, runs
  real-time on CPU, gives normalized 2D+depth landmarks with per-point visibility.
- **MediaPipe Hands (21 hand landmarks)** → hand-speed and fine puck-control reps
  where wrist/stick motion matters more than whole-body pose.
- **OpenCV** → frame capture, pre-processing (resize, color-space, CLAHE for
  lighting), and **puck detection / width** (contour or Hough on a thresholded
  mask), plus drawing overlays. OpenCV is the right tool for the puck because the
  puck is a rigid object, not something MediaPipe has a model for.
- **Interop:** MediaPipe's Python API wraps a C++ core already, so we get native
  speed without writing C++. Keep the app/session logic in Python (matches
  Ethan's backend + our stack). Only push a module to C++ if §6 timing misses the
  real-time threshold on target hardware — decision to be made **with Kemuel**.

Rationale: fastest path to a working, calibratable pipeline with the least
custom ML. OpenCV-only would mean hand-rolling pose estimation (expensive, worse);
MediaPipe-only can't reliably measure the puck.

---

## 2. What the app needs measured (from the DB contract)

From `TT3database/TT3database.sql`, the vision layer must ultimately emit:

| DB field | Vision responsibility |
|---|---|
| `repetitions.rep_number` | Count discrete reps (motion segmentation) |
| `repetitions.quality_score` (DECIMAL 5,2) | Per-rep technique score (e.g. head-up %, path consistency) |
| `performance.successful_reps` / `error_count` | Classify each rep pass/fail against the drill target |
| `performance.accuracy_percentage` | Aggregate success rate |
| `performance.avg_speed` | Hand/puck speed (px/s → normalized units) |
| `performance.avg_time_per_rep` | Timing from rep segmentation |
| Skill = **Awareness** | Head-up detection (the headline technique signal) |
| Skill = Puck Control / Coordination / Speed | Puck path, lateral coordination, hand rate |

So "technique measurement" concretely = **head-up angle**, **puck position/width**,
**rep events**, and a **per-rep quality score** — those are what §4 sets thresholds for.

---

## 3. Candidate comparison

| Dimension | MediaPipe Pose/Hands | OpenCV (classic CV) |
|---|---|---|
| Body/hand landmarks | ✅ pretrained, real-time, 33/21 pts | ❌ would need custom model |
| Puck (rigid object) | ❌ no model | ✅ contour/Hough/bg-subtraction |
| Head-up angle | ✅ from nose/ears/shoulders | ⚠️ only via custom geometry |
| CPU real-time | ✅ designed for it | ✅ cheap ops |
| Lighting robustness | ⚠️ degrades in low/harsh light | ⚠️ tunable (CLAHE, adaptive thresh) |
| Calibration hooks | ✅ normalized coords (scale-free) | ⚠️ manual |
| Interop | C++ core, Python API | C++ & Python bindings |

**Conclusion:** complementary, not either/or. MediaPipe for the person, OpenCV
for the puck and the pixels.

---

## 4. Measurable quality thresholds (proposed)

Pass/fail bars the pipeline must clear to be "good enough" for guided training.
Numbers are **targets to validate**, chosen to be strict enough that feedback is
trustworthy but achievable on consumer webcams.

| Metric | Proposed threshold | Why |
|---|---|---|
| Landmark frame rate | **≥ 20 FPS** @ 640×480 on a mid webcam | smooth live feedback |
| End-to-end latency | **≤ 150 ms** capture→feedback | feels real-time |
| Head-up classification accuracy | **≥ 90%** vs hand-labeled frames | it's the headline signal |
| Head-up angle error | **≤ 10°** vs manual protractor | separates "eyes up" from "eyes down" |
| Rep count accuracy | **≥ 95%** (±1 rep over a 60s set) | reps drive the whole scoreboard |
| Puck detection rate | **≥ 85%** of frames puck is visible | enough for path/width |
| Puck width error | **≤ 15%** vs known puck (76 mm) at 1–3 m | calibration sanity |
| False "error" rate | **≤ 5%** on clean reps | don't nag good technique |
| Min usable light | document lux floor | set honest indoor/outdoor support |

Head-up method: angle between the nose→mid-shoulder vector and vertical (or
nose-below-ear-line heuristic), smoothed over N frames to avoid flicker.
Puck-width method: detect puck contour, convert px→mm using a calibration frame
(known puck diameter 76 mm / 25 mm height) to get a per-session scale factor.

---

## 5. Calibration & conditions

- **Child vs adult:** never use absolute pixel distances — **normalize by body
  scale** (shoulder width or torso length from Pose). A one-time calibration pose
  (stand straight, puck flat in frame) sets the px→mm factor and per-user
  neutral head angle. This makes head-up/rep logic body-size independent.
- **Indoor vs outdoor:** outdoor = high dynamic range + shadows; indoor = often
  dim/uneven. Plan: OpenCV **CLAHE** + white-balance normalization before
  inference; document a **lux floor** below which we fall back to Timer-Only mode
  (ties into the app's existing "camera-supported *option*" framing).
- **Camera placement:** define a supported range (height, distance 1–3 m, angle)
  and surface a quick "frame yourself" check (feeds TRI-15 camera-readiness).

---

## 6. Test protocol (to produce the `MEASURE` evidence)

Run once the libs are installed + clips recorded; results drop into §4 and §7.

1. **Environment:** `pip install mediapipe opencv-python`; pin versions; note CPU/GPU.
2. **Footage:** 8–12 short clips — {indoor, outdoor} × {child, adult} × {eyes-up,
   eyes-down} + 2 puck-only clips with a ruler for scale. ~60s each.
3. **Ground truth:** hand-label head-up frames and true rep counts; measure real
   puck distance for the scale check.
4. **Measure:** FPS, latency, head-up accuracy/angle error, rep accuracy, puck
   detection rate + width error, false-error rate, lux at failure.
5. **Record:** fill §4 "measured" column + §7 example I/O; note every failure mode.
6. **Interop check (w/ Kemuel):** confirm the chosen module hits the FPS/latency
   bar inside his pipeline; decide Python-only vs a C++ hot path.

| Example run | Input | Output (`MEASURE`) |
|---|---|---|
| Head-up, adult, indoor | clip A | head-up %, angle err, FPS = `MEASURE` |
| Head-up, child, outdoor | clip B | head-up %, angle err, FPS = `MEASURE` |
| Rep count, puck control | clip C | counted vs true reps = `MEASURE` |
| Puck width w/ ruler | clip D | measured vs 76 mm = `MEASURE` |

---

## 7. Limitations (current + expected)

- **Not yet measured on real footage** — §4/§6 numbers are targets pending the run.
- MediaPipe accuracy **drops in low light, motion blur, and occlusion** (stick/body
  hiding the puck or hands); fast hand drills may blur on cheap webcams.
- Single RGB camera gives only **monocular depth** — depth-dependent metrics
  (true 3D speed) are approximate; mitigate with the px→mm calibration.
- Puck detection via classic CV is **sensitive to surface contrast** (dark puck on
  dark ice/asphalt is the worst case) — may need a contrasting mat or color cue.
- Outdoor sunlight/shadows remain the hardest condition; expect to **cap supported
  conditions** and fall back to Timer-Only rather than give wrong feedback.
- Child calibration assumes they can hold the one-time calibration pose.

---

## 8. Open items / coordination

- [ ] **Kemuel** — Python/C++ interop + where vision runs in the session pipeline (TRI-15/21/22)
- [ ] Run §6 protocol; fill §4 + §7 with measured numbers
- [ ] Record 8–12 calibration/test clips (indoor/outdoor, child/adult)
- [ ] Confirm px→mm calibration UX with the app shell (TRI-15 camera-readiness)
- [ ] Peer review (definition of done)
