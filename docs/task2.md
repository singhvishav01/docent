# docent — Voice Isolation Spec

## The Problem

In a museum environment, docent picks up voices and sounds that aren't the visitor: other visitors talking, tour groups, staff announcements, echoes, kids yelling. docent can't distinguish between its visitor and background noise, so it sometimes responds to things other people said or gets confused by overlapping speech.

The conversation must stay continuous — no wake words, no push-to-talk buttons. The visitor just talks naturally and docent only listens to THEM.

---

## The Solution: Two Layers

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: NOISE SUPPRESSION                          │
│  Kill ambient noise, echoes, distant voices           │
│  Runs on every audio frame before anything else       │
├──────────────────────────────────────────────────────┤
│  Layer 2: VOICE ENROLLMENT (Speaker Verification)    │
│  Match incoming speech against the visitor's voice    │
│  Built invisibly during the acquaintance onboarding   │
└──────────────────────────────────────────────────────┘
```

Audio flows through both layers before reaching STT:

```
Microphone → Noise Suppression → Speaker Verification → STT → Acquaintance Engine
                  │                      │
                  │                      ├─ MATCH → process normally
                  │                      └─ NO MATCH → discard audio, keep listening
                  │
                  └─ Kills: room echo, HVAC, footsteps, distant chatter, announcements
```

---

## Layer 1: Noise Suppression

This is the first pass — it removes non-speech audio before speaker verification even runs. This reduces false positives from the speaker verification model (a cough or a door slam shouldn't trigger anything).

### What It Handles

| Noise Type | Common in Museums | How It's Handled |
|---|---|---|
| Room reverb / echo | High ceilings, marble floors | Echo cancellation |
| HVAC / air handling | Constant background hum | Spectral subtraction |
| Footsteps, doors | Movement noise | Transient suppression |
| Distant chatter | Other visitors far away | Noise gating by energy level |
| PA announcements | "The museum closes in 30 minutes" | Speaker verification catches this (Layer 2) |
| Nearby conversations | Someone talking right next to visitor | Speaker verification catches this (Layer 2) |

### Implementation

Use a pre-trained noise suppression model. Don't build this from scratch — there are good lightweight models that run in real-time.

**Recommended: RNNoise**
- Open source, Mozilla-backed
- Runs in real-time on CPU (no GPU needed)
- Designed for speech — preserves voice quality while killing background noise
- Tiny footprint — works on mobile
- npm package available: `rnnoise-wasm`

```javascript
import { RNNoise } from 'rnnoise-wasm';

class NoiseSuppressor {
  constructor() {
    this.rnnoise = null;
    this.initialized = false;
  }

  async initialize() {
    this.rnnoise = await RNNoise.create();
    this.initialized = true;
  }

  /**
   * Process a raw audio frame and return cleaned audio.
   * @param {Float32Array} frame - raw audio (480 samples at 48kHz = 10ms)
   * @returns {{ cleanedAudio: Float32Array, voiceProbability: number }}
   */
  process(frame) {
    if (!this.initialized) throw new Error('NoiseSuppressor not initialized');

    // RNNoise returns voice probability (0-1) alongside cleaned audio
    const voiceProbability = this.rnnoise.processFrame(frame);

    return {
      cleanedAudio: frame, // RNNoise modifies in-place
      voiceProbability,     // useful — if < 0.5, probably not speech at all
    };
  }

  /**
   * Quick check: is this frame likely speech?
   * Use this to skip speaker verification on non-speech frames (saves CPU).
   */
  isSpeech(frame) {
    const { voiceProbability } = this.process(frame);
    return voiceProbability > 0.5;
  }

  destroy() {
    if (this.rnnoise) this.rnnoise.destroy();
  }
}
```

### Echo Cancellation

If the visitor is using the phone speaker (not earbuds), docent's own voice will feed back into the microphone. This needs acoustic echo cancellation (AEC).

```javascript
class EchoCanceller {
  constructor() {
    this.referenceBuffer = []; // what docent is currently playing
  }

  /**
   * Feed docent's TTS output as the reference signal.
   * Call this whenever docent starts speaking.
   */
  setReference(ttsAudioChunk) {
    this.referenceBuffer.push(ttsAudioChunk);
  }

  /**
   * Remove docent's own voice from the microphone input.
   * @param {Float32Array} micFrame - raw microphone audio
   * @returns {Float32Array} - cleaned audio with echo removed
   */
  cancelEcho(micFrame) {
    if (this.referenceBuffer.length === 0) return micFrame;

    // Use WebAudio API's built-in AEC if available (browser)
    // For native: use Speex AEC or WebRTC AEC module
    // Implementation depends on platform (browser vs React Native vs native)
    return processAEC(micFrame, this.referenceBuffer);
  }

  clearReference() {
    this.referenceBuffer = [];
  }
}
```

**Platform notes:**
- **Browser (Web Audio API)**: Most browsers have built-in AEC via `getUserMedia` constraints: `{ echoCancellation: true, noiseSuppression: true }`
- **React Native**: Use `react-native-webrtc` or `react-native-audio-api` which include AEC
- **Native iOS/Android**: Use platform audio session APIs which have AEC built in

For development, lean on the browser/platform built-in AEC first. Only build custom if it's not good enough.

---

## Layer 2: Voice Enrollment (Speaker Verification)

This is the key layer. It creates a voiceprint of the visitor during the acquaintance onboarding and then uses it to verify that incoming speech belongs to them.

### How It Works

#### During Onboarding (Enrollment)

The acquaintance introduction is a ~2 minute voice conversation. That's plenty of audio to build a voiceprint. The enrollment happens invisibly in the background — the visitor never knows.

```
Acquaintance Onboarding
        │
        │ visitor speaks ~6-8 times
        │
        ├──── Each response ────▶ Normal flow (STT → extraction → next question)
        │                    │
        │                    └──▶ ALSO: feed audio to enrollment model (background)
        │
        ▼
  Voiceprint ready by end of onboarding
  (stored locally on device)
```

```javascript
class SpeakerEnrollment {
  constructor() {
    this.model = null;         // speaker embedding model
    this.enrollmentSamples = []; // audio clips collected during onboarding
    this.voiceprint = null;    // the final embedding
    this.isEnrolled = false;
  }

  async initialize() {
    // Load a pre-trained speaker verification model
    // Recommended: SpeechBrain's ECAPA-TDNN or Resemblyzer
    // These produce a fixed-size embedding (vector) from any audio clip
    this.model = await loadSpeakerModel();
  }

  /**
   * Collect a speech sample during onboarding.
   * Call this every time the visitor finishes speaking during the introduction.
   * @param {Float32Array} audioClip - the visitor's spoken response (already noise-suppressed)
   */
  addSample(audioClip) {
    // Only use clips with enough speech (at least 1 second)
    if (getAudioDuration(audioClip) < 1.0) return;

    this.enrollmentSamples.push(audioClip);

    // If we have enough samples, build the voiceprint
    // 3+ samples is usually sufficient, but more is better
    if (this.enrollmentSamples.length >= 3) {
      this.buildVoiceprint();
    }
  }

  /**
   * Build the voiceprint by averaging embeddings from all samples.
   * Called automatically once enough samples are collected.
   */
  async buildVoiceprint() {
    const embeddings = await Promise.all(
      this.enrollmentSamples.map(sample => this.model.getEmbedding(sample))
    );

    // Average all embeddings to create a robust voiceprint
    // This reduces the effect of any single noisy sample
    this.voiceprint = averageEmbeddings(embeddings);
    this.isEnrolled = true;
  }

  /**
   * Verify if an audio clip matches the enrolled visitor.
   * @param {Float32Array} audioClip - incoming audio to verify
   * @returns {{ isMatch: boolean, confidence: number }}
   */
  async verify(audioClip) {
    if (!this.isEnrolled) {
      // Not enrolled yet (still in early onboarding) — accept all speech
      return { isMatch: true, confidence: 0 };
    }

    const embedding = await this.model.getEmbedding(audioClip);
    const similarity = cosineSimilarity(embedding, this.voiceprint);

    return {
      isMatch: similarity >= this.getThreshold(),
      confidence: similarity,
    };
  }

  /**
   * Dynamic threshold based on environment.
   * Can be adjusted if false rejections are too high.
   */
  getThreshold() {
    // 0.75 is a good starting point for speaker verification
    // Lower = more permissive (fewer false rejections, more false accepts)
    // Higher = more strict (more false rejections, fewer false accepts)
    return 0.75;
  }

  /**
   * Update voiceprint with new speech during the tour.
   * This improves accuracy over time as we hear more of their voice.
   */
  async adaptVoiceprint(audioClip) {
    if (!this.isEnrolled) return;

    const newEmbedding = await this.model.getEmbedding(audioClip);

    // Weighted average — existing voiceprint has more weight than new sample
    // This prevents drift but allows gradual adaptation
    this.voiceprint = weightedAverage(this.voiceprint, newEmbedding, 0.95, 0.05);
  }
}

/**
 * Cosine similarity between two embedding vectors.
 * Returns 0-1 where 1 = identical.
 */
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### Speaker Verification Model Options

| Model | Size | Runs On-Device | Quality | Notes |
|---|---|---|---|---|
| **Resemblyzer** | ~50MB | Yes (Python) | Good | Easy to use, well documented. Python-only. |
| **SpeechBrain ECAPA-TDNN** | ~80MB | Yes (ONNX export) | Excellent | State-of-the-art. Can export to ONNX for JS runtime. |
| **pyannote.audio** | ~70MB | Yes (ONNX export) | Excellent | Also does diarization (separating multiple speakers). |
| **Silero VAD + custom** | ~2MB | Yes (JS/ONNX) | Basic VAD only | Just VAD, no speaker ID. Pair with another model. |
| **WebRTC VAD** | Built-in | Yes | Basic VAD only | Cheapest option but no speaker verification. |

**Recommendation for docent:** Use **SpeechBrain ECAPA-TDNN** exported to ONNX format. It's the best balance of accuracy and size, and ONNX runs in JavaScript via `onnxruntime-web` (browser) or `onnxruntime-node` (server).

If running on-device is too heavy, an alternative is to run speaker verification server-side — send the audio to your backend, verify, and only forward to STT if it matches. This adds ~100ms latency but keeps the phone lightweight.

---

## Integrating Into the Voice Pipeline

The existing pipeline gets two new steps inserted before STT:

```javascript
class VoicePipeline {
  constructor(profile) {
    this.profile = profile;
    this.noiseSuppressor = new NoiseSuppressor();
    this.echoCanceller = new EchoCanceller();
    this.speakerEnrollment = new SpeakerEnrollment();
    this.vad = new SmartVAD();
    this.mode = 'introduction';
  }

  async initialize() {
    await this.noiseSuppressor.initialize();
    await this.speakerEnrollment.initialize();
  }

  /**
   * Process a raw microphone audio frame.
   * This is the main entry point — called for every frame from the mic.
   */
  async processAudioFrame(rawFrame) {
    // STEP 1: Echo cancellation (remove docent's own voice)
    const echoFree = this.echoCanceller.cancelEcho(rawFrame);

    // STEP 2: Noise suppression (remove ambient noise)
    const { cleanedAudio, voiceProbability } = this.noiseSuppressor.process(echoFree);

    // STEP 3: Quick check — is this even speech?
    if (voiceProbability < 0.5) {
      // Not speech — skip everything, save CPU
      return;
    }

    // STEP 4: Speaker verification — is this OUR visitor?
    if (this.speakerEnrollment.isEnrolled) {
      const { isMatch, confidence } = await this.speakerEnrollment.verify(cleanedAudio);

      if (!isMatch) {
        // Someone else is talking — ignore completely
        // Don't even pass to VAD or STT
        return;
      }
    }

    // STEP 5: VAD — are they done speaking?
    const { isDone } = this.vad.processFrame(cleanedAudio);

    // STEP 6: Feed to STT (accumulating transcript)
    this.stt.feedFrame(cleanedAudio);

    if (isDone) {
      const transcript = this.stt.getTranscript();
      this.stt.reset();

      // During onboarding, also feed audio to enrollment
      if (this.mode === 'introduction') {
        this.speakerEnrollment.addSample(this.currentAudioBuffer);
      } else {
        // During tour, adapt voiceprint slightly (improves over time)
        this.speakerEnrollment.adaptVoiceprint(this.currentAudioBuffer);
      }

      // Process the transcript through the acquaintance engine
      await this.handleTranscript(transcript);
    }
  }

  /**
   * Called when docent starts speaking — set echo reference.
   */
  onDocentSpeaking(ttsAudio) {
    this.echoCanceller.setReference(ttsAudio);
  }

  /**
   * Called when docent stops speaking — clear echo reference.
   */
  onDocentSilent() {
    this.echoCanceller.clearReference();
  }
}
```

---

## Handling Edge Cases

### Early onboarding (voiceprint not ready yet)

During the first 1-2 exchanges of the acquaintance introduction, the voiceprint isn't built yet. During this period, the app accepts all speech that passes noise suppression. This is fine because:
- The visitor is typically the closest person to the mic
- They just opened the app and are directly engaged with it
- Noise suppression handles most ambient sound

After 3+ spoken responses, the voiceprint is built and verification kicks in.

```javascript
// In speakerEnrollment.verify():
if (!this.isEnrolled) {
  // Not enrolled yet — accept all speech, enrollment is still building
  return { isMatch: true, confidence: 0 };
}
```

### Visitor with a companion

If the visitor is with someone (friend, partner, kid), they might want docent to respond to both of them. Two options:

**Option A: Enroll both speakers**
If `profile.identity.visit_group` indicates they're not solo, offer to enroll the companion too:

> **docent:** "Oh you're here together — nice. [Companion's name], say something too so I know your voice as well."

Then store two voiceprints and accept either.

```javascript
class MultiSpeakerEnrollment extends SpeakerEnrollment {
  constructor() {
    super();
    this.voiceprints = []; // array of { name, voiceprint }
  }

  async verify(audioClip) {
    // Check against all enrolled speakers
    for (const speaker of this.voiceprints) {
      const embedding = await this.model.getEmbedding(audioClip);
      const similarity = cosineSimilarity(embedding, speaker.voiceprint);
      if (similarity >= this.getThreshold()) {
        return { isMatch: true, confidence: similarity, speaker: speaker.name };
      }
    }
    return { isMatch: false, confidence: 0, speaker: null };
  }
}
```

**Option B: Lower the threshold**
If the visitor mentions they're with someone, simply lower the verification threshold so it's more permissive. Cruder but simpler.

### False rejections (visitor's voice not recognized)

If the visitor speaks and keeps getting ignored (false rejections), the experience is terrible. Build in a safety net:

```javascript
class SpeakerEnrollment {
  constructor() {
    // ...existing fields...
    this.consecutiveRejections = 0;
    this.MAX_REJECTIONS_BEFORE_RESET = 5;
  }

  async verify(audioClip) {
    // ...existing verification...

    if (!isMatch) {
      this.consecutiveRejections++;

      // If we keep rejecting, something's wrong — maybe their voice changed
      // (cleared throat, started whispering, got a cold)
      // Lower the threshold temporarily
      if (this.consecutiveRejections >= 3) {
        // Use a more permissive threshold
        isMatch = similarity >= this.getThreshold() - 0.1;
      }

      // If still rejecting after many attempts, re-enroll from recent audio
      if (this.consecutiveRejections >= this.MAX_REJECTIONS_BEFORE_RESET) {
        this.softReset(audioClip);
      }
    } else {
      this.consecutiveRejections = 0;
    }

    return { isMatch, confidence: similarity };
  }

  /**
   * Soft reset — blend new audio into voiceprint to adapt.
   * Used when repeated rejections suggest the voiceprint has drifted.
   */
  async softReset(recentAudio) {
    const newEmbedding = await this.model.getEmbedding(recentAudio);
    // Heavier adaptation weight than normal
    this.voiceprint = weightedAverage(this.voiceprint, newEmbedding, 0.7, 0.3);
    this.consecutiveRejections = 0;
  }
}
```

### Noisy environment fallback

If the environment is extremely loud (concert hall setup, school field trip, crowded opening night), even voice verification might struggle. In this case, the app can subtly suggest earbuds:

```javascript
function checkEnvironmentNoise(noiseSuppressor, recentFrames) {
  // Calculate average noise level over last 5 seconds
  const avgNoise = recentFrames.reduce((sum, frame) => {
    return sum + (1 - noiseSuppressor.process(frame).voiceProbability);
  }, 0) / recentFrames.length;

  // If background noise is consistently high
  if (avgNoise > 0.7) {
    // docent can mention it naturally (once, not repeatedly)
    return {
      isNoisy: true,
      suggestion: "It's getting a bit loud in here — if you've got earbuds, they'd help me hear you better."
    };
  }

  return { isNoisy: false };
}
```

This keeps the continuous conversation intact — no wake words, no buttons — but gently nudges the visitor toward a setup that works better.

---

## File Changes

```
src/voice/
├── noiseSuppressor.js       # NEW — RNNoise wrapper, noise gate, speech probability
├── echoCanceller.js         # NEW — AEC for when visitor uses phone speaker
├── speakerEnrollment.js     # NEW — voiceprint enrollment, verification, adaptation
├── pipeline.js              # MODIFIED — insert noise suppression + speaker verification
└── vad.js                   # UNCHANGED (runs after noise suppression + verification)

src/acquaintance/
├── introduction.js          # MODIFIED — feed audio samples to enrollment during onboarding
└── profile.js               # MODIFIED — add visit_group handling for companion enrollment
```

### Dependencies

```
rnnoise-wasm          — noise suppression (or rnnoise-node for server-side)
onnxruntime-web       — run ECAPA-TDNN speaker model in browser
onnxruntime-node      — run ECAPA-TDNN speaker model on server (alternative)
```

---

## Summary

Two layers, invisible to the visitor:

1. **Noise suppression (RNNoise)** strips out ambient museum sounds — echoes, HVAC, footsteps, distant chatter. Runs on every audio frame, lightweight.

2. **Speaker verification (ECAPA-TDNN)** builds a voiceprint during the acquaintance onboarding for free — visitor never knows it happened. After onboarding, only audio matching the visitor's voice gets through to STT. Everything else is silently discarded.

The conversation stays fully continuous. No wake words. No buttons. The visitor just talks.