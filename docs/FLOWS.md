# Docent — How Things Work (Data Flows)

> Read this to understand how the major features work end-to-end.

---

## 1. First Visit — Gate + Onboarding

A visitor arrives at `/artwork/[id]`. Here's exactly what happens:

```
artwork/[id]/page.tsx
  └── useVisitorGate().requireIdentity()
        │
        ├── If identified + intro_complete === true → resolve immediately, show artwork
        │
        └── Otherwise → open VisitorGateModal
              │
              ├── Step: 'choice'     → "Guest" or "Sign In"
              ├── Step: 'name'       → Enter name (or "Skip" for anonymous)
              ├── Step: 'docent-name'→ Pick DOCENT's name (NameYourDocent.tsx)
              └── Step: 'acquaintance'→ AcquaintanceIntro.tsx
                    │
                    ├── Phase 1: voice-qa (3 turns)
                    │     DOCENT speaks (TTS) → visitor speaks (STT) → /api/acquaintance/turn → repeat
                    │
                    ├── Phase 2: tap-interests
                    │     14 tiles — visitor selects what they're into
                    │
                    ├── Phase 3: tap-vibe
                    │     "Keep it real" / "In the middle" / "Keep it classy"
                    │
                    └── Phase 4: complete
                          onComplete(profile) → VisitorContext.setVisitorProfile()
                          → saves to localStorage
                          → flushes to DB if registered
                          → gate resolves → artwork page loads
```

**Profile is stored in:**
- `localStorage['docent_visitor_profile']` — always
- `VisitorPersonality` DB table — only for registered users

---

## 2. Chat Message Flow (Text)

```
User types message → sendMessage()
  │
  ├── Adds user message to SessionContext
  ├── setIsLoading(true)
  │
  └── POST /api/chat
        {message, artworkId, museumId, visitorName, docentName,
         conversationHistory, visitorProfile, stream: false}
        │
        ├── getCurrentUser() — optional auth
        ├── db.artwork.findFirst() — load artwork + curator notes
        ├── Build grounding chunks (description + curator notes)
        ├── trimChatHistory() — keeps last 8 messages, fits context window
        ├── buildAcquaintanceLayer(visitorProfile) — profile → system instructions
        ├── createChatCompletion() → OpenAI GPT-4o-mini
        │     System: DOCENT_PERSONA + artwork context + visitor profile
        │     Model: gpt-4o-mini, max_tokens: 500, temperature: 0.8
        │
        └── Return: {response, artwork, context_used, curator_notes_count}

  → Add assistant message to SessionContext
  → applyHeuristics(profile, userMessage) — lightweight profile update
  → updateVisitorProfile(patch) — debounced DB write (30s)
  → triggerDeepUpdateIfNeeded() — every 5 turns, full profile re-analysis
```

---

## 3. Chat Message Flow (Voice / Streaming)

```
Voice input detected → handleVoiceInput(transcript)
  │
  ├── voiceManager.beginNewVoiceResponse() → returns generation token
  │
  └── POST /api/chat
        {... stream: true, voice: true}
        │
        ├── Same RAG + persona setup as text chat
        ├── createChatCompletion({stream: true})
        │     Returns: ReadableStream of text chunks
        │
        └── Client reads stream chunk by chunk:
              - Accumulates text into sentences
              - Each complete sentence → voiceManager.enqueueSentence(text, generation)
              - voiceManager.finalizeQueue() when stream ends

voiceManager.runSentenceQueue():
  │
  ├── For each sentence in queue:
  │     POST /api/tts {text}
  │       → prepareForSpeech(text) — strip markdown, symbols
  │       → addFillers() — natural speech ("Mm, ", "Well, ")
  │       → OpenAI TTS-1, voice: onyx, speed: 0.95
  │       → returns MP3 buffer
  │     Pre-fetches next sentence in parallel (no gap between sentences)
  │     Plays audio via <Audio> element
  │     Waits for onended
  │
  └── Queue empty + finalized → resumeListening()
```

**Generation token** prevents overlap: if user interrupts mid-response, `responseGeneration` is bumped, old queue loop exits immediately and drops any pre-fetched audio.

---

## 4. Voice Mode State Machine

```
Modes: dormant → listening → thinking → speaking → listening → ...

dormant     App loaded, voice not started
listening   Web Speech API active, waiting for visitor speech
thinking    Transcript received, waiting for AI response
speaking    TTS audio playing (sentence queue running)

Transitions:
  startTour()              dormant → speaking (greeting plays) → listening
  user speaks (final)      listening → thinking
  beginNewVoiceResponse()  thinking → speaking
  queue finalized + empty  speaking → listening
  stopTour()               any → dormant

Barge-in (interruption):
  User speaks while mode === 'speaking'
  → responseGeneration++ (kills old queue)
  → stopSpeaking() (pauses audio)
  → sentenceQueue cleared
  → isProcessingQueue = false
  → if transcript is final → thinking (process new question)
  → if interim only → wait for final
```

**Barge-in is separate from normal recognition.** During speaking mode, a temporary `bargeinOnResult` handler is swapped in. It triggers `handleInterruption()` on any speech > 2 chars.

---

## 5. Artwork Transition Flow

When the visitor scans a new QR code while already in conversation:

```
QRScanner detects new artworkId
  → onQRCodeDetected(id)
  → navigate to /artwork/[id]
  → ArtworkContext.setCurrentArtwork() — updates context with new artwork
  → TransitionManager.requestTransition({newArtworkId, newTitle, ...})

TransitionManager state machine:
  IDLE → DWELL_WAIT (waits 2s to confirm visitor is staying)
       → WRAPPING_UP (if voice active: finish current sentence)
       → BRIDGING (fetch bridge text from /api/chat/transition)
       → COMPLETE

/api/chat/transition:
  POST {previousArtworkId, newArtworkId, spokenSoFar, midQuestion, lastMessages}
  → GPT-4o-mini generates natural bridge sentence
  → "We were just looking at Monet's use of light — this Vermeer takes a completely different approach..."
  → voiceManager plays bridge text
  → PersistentChatInterface resets for new artwork
  → New greeting fires for new artwork
```

If user speaks while transition is in progress → aborts transition, treats as question about new artwork.

---

## 6. Voice Isolation Pipeline (Background)

Runs in parallel with SpeechRecognition. Does not replace it — gates its output.

```
getUserMedia (separate stream from SpeechRecognition)
  → AudioContext (48kHz)
  → ScriptProcessorNode (480 samples = 10ms frames)
  → Each frame:
       1. EchoCanceller: skip if DOCENT is currently speaking (prevents self-triggering)
       2. NoiseSuppressor: RNNoise WASM → cleaned audio + voiceProbability
       3. If voiceProbability < 0.5 → skip (not speech)
       4. Accumulate in rolling 3-second buffer
       5. Every 500ms → SpeakerEnrollment.verify(buffer)
          → ECAPA-TDNN ONNX → embedding → cosine similarity vs voiceprint
          → verdict: accept | reject | pending

SpeechRecognition.onresult:
  If pipeline.isEnrolled() && verdict === 'reject' → discard transcript silently
  Otherwise → process normally
```

**Enrollment** happens during acquaintance onboarding. After each of the visitor's 3+ voice responses, `pipeline.addEnrollmentSample()` is called. After 3 samples, voiceprint is built silently.

**Voiceprint adapts** during the tour (small weighted average per accepted utterance), so accuracy improves over time.

---

## 7. Auth Flow

### Guest
```
"Guest" button → clearVisitorProfile() (wipes stale intro_complete)
  → Enter name → setVisitorIdentity(name, 'guest')
  → localStorage only — no cookie, no DB
  → Gate resolves
```

### Registered (Sign Up)
```
POST /api/auth/signup {email, password, name}
  → bcrypt.hash(password) → db.user.create()
  → generateToken(userId, role) → JWT
  → setAuthCookie(token) → httpOnly cookie
  → VisitorContext detects cookie on next mount
  → /api/auth/me → verifies JWT → returns user
  → /api/profile/personality → loads profile from DB
```

### Return Visit (Registered)
```
Page load → VisitorContext.useEffect (mount)
  1. Read localStorage (fast) → set identity
  2. GET /api/auth/me → if JWT valid → set registered identity
  3. GET /api/profile/personality → DB profile overrides localStorage
  4. setIsProfileLoading(false)

useVisitorGate().requireIdentity():
  → isIdentified && intro_complete === true → resolve immediately
  → No modal shown for returning registered users
```

---

## 8. RAG (Retrieval-Augmented Generation)

How the AI knows what it's talking about:

```
On server startup (or first request):
  RAGRetrieval.initialize()
    → Load artworks from DB (or JSON files if USE_DATABASE_RAG=false)
    → For each artwork: chunk into description, curator_notes, technical_details, provenance
    → Generate OpenAI text-embedding-3-small embeddings for each chunk
    → Cache in memory (Map<artworkId, ChunkedArtwork[]>)

On each /api/chat request:
  1. Load chunks for current artworkId from cache
  2. Sort by chunk type priority (curator_notes > description > technical_details)
  3. buildCompactGroundingContext(chunks, maxTokens: 800)
     → trim to fit within token budget
  4. Inject into system prompt as "ARTWORK CONTEXT:"
  5. GPT-4o-mini grounded to actual artwork data

Curator notes are highest priority — curators can steer what the AI emphasises.
```

---

## 9. Profile Heuristics (Live Updates)

After every chat turn, `applyHeuristics(profile, userMessage)` runs on the client:

| Signal in message | Profile update |
|-------------------|----------------|
| Long message (> 30 words) | `engagement.curiosity` +0.03 |
| Short message (< 5 words) | `engagement.depth_preference` -0.02 |
| "why", "how", "explain", "tell me more" | `engagement.curiosity` +0.05 |
| "confused", "don't understand", "what do you mean" | `personality.jargon_tolerance` -0.03 |
| "haha", "lol", "funny" | `personality.humor_tolerance` +0.03 |
| "boring", "next", "skip", "whatever" | `engagement.engagement_trend` -0.1 |
| Multiple "?"s | `engagement.curiosity` +0.04 |

All deltas clamped to [0, 1]. Writes are debounced 30 seconds to DB.

Every 5 assistant turns, a full profile re-analysis runs via `/api/acquaintance/update`.
