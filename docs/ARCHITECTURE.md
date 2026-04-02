# Docent — Architecture & File Map

> Quick-reference for anyone new to the codebase. Read this first.

---

## What Is Docent?

An in-museum AI guide. Visitors scan a QR code next to an artwork, go through a short voice onboarding, and then have a continuous natural conversation with an AI about what they're looking at. Voice-first, no wake words, no buttons during conversation.

**Stack:** Next.js 14 (App Router) · TypeScript · PostgreSQL + Prisma · OpenAI GPT-4o-mini + TTS-1 · Web Speech API · Tailwind CSS

---

## Directory Map

```
src/
├── app/                        Next.js pages + API routes
│   ├── page.tsx                Landing page (slideshow + chat preview)
│   ├── scan/page.tsx           QR scan entry point
│   ├── artwork/[id]/page.tsx   Main artwork page (image + chat)
│   ├── museums/page.tsx        Museum listing
│   ├── auth/                   Login + signup pages
│   ├── admin/                  Admin dashboard (manage museums, artworks, users)
│   ├── curator/                Curator dashboard (add/edit curator notes)
│   └── api/                    All API routes (see API.md)
│
├── components/
│   ├── auth/
│   │   ├── VisitorGateModal.tsx     ← Gate modal: choice → name → docent → intro
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthGuard.tsx
│   ├── chat/
│   │   ├── PersistentChatInterface.tsx  ← Main chat UI (voice + text + transitions)
│   │   ├── ChatInterface.tsx            Read-only/admin version
│   │   ├── MessageBubble.tsx
│   │   ├── TransitionIndicator.tsx
│   │   └── FloatingChatWidget.tsx
│   ├── voice/
│   │   ├── VoiceModeIndicator.tsx
│   │   ├── VoiceTourButton.tsx
│   │   ├── NoisyEnvironmentBanner.tsx
│   │   └── EnrollmentIndicator.tsx      Voice isolation enrollment progress
│   ├── qr/
│   │   ├── QRScanner.tsx               Camera-based scanner (@zxing/browser)
│   │   ├── QRScannerModal.tsx
│   │   ├── ManualInput.tsx             Fallback: type artwork ID
│   │   └── FloatingScanButton.tsx
│   ├── onboarding/
│   │   ├── AcquaintanceIntro.tsx       4-phase voice onboarding
│   │   └── NameYourDocent.tsx          Choose docent's name
│   └── providers/
│       └── ClientProviders.tsx         Wraps VisitorProvider + SessionProvider
│
├── contexts/
│   ├── VisitorContext.tsx      Visitor identity, docent name, personality profile
│   ├── SessionProvider.tsx     Chat messages, voice tour state, inactivity
│   └── ArtworkContext.tsx      Current artwork data (avoids duplicate fetches)
│
├── hooks/
│   ├── useVisitorGate.ts       requireIdentity() — opens gate if not identified
│   ├── useTransition.ts        Artwork transition helpers
│   ├── useChat.ts              Chat send + streaming
│   └── useAuth.ts              Auth state + login/signup/logout
│
├── lib/
│   ├── auth.ts                 JWT, bcrypt, getCurrentUser(), rate limiting
│   ├── db.ts                   Prisma client singleton
│   ├── image-url.ts            resolveImageUrl() — prepends asset server base URL
│   ├── ai/
│   │   ├── openai.ts           createChatCompletion(), grounding context, history trimming
│   │   ├── docent-persona.ts   DOCENT_PERSONA + DOCENT_VOICE_PERSONA system prompts
│   │   └── greeting-generator.ts  Local fallback greeting generator (no AI)
│   ├── voice/
│   │   ├── DocentVoiceManager.ts  Voice engine (STT + TTS queue + barge-in)
│   │   └── speechCleanup.ts       Strips markdown/symbols before TTS
│   ├── rag/
│   │   ├── retrieval.ts        RAGRetrieval — loads artworks, creates embeddings
│   │   ├── embeddings.ts       EmbeddingsService — OpenAI embeddings
│   │   └── types.ts            ArtworkData, ChunkedArtwork interfaces
│   ├── acquaintance/
│   │   ├── profile.ts          VisitorProfile schema, createProfile(), mergeProfilePatch(), applyHeuristics()
│   │   └── prompt-layer.ts     buildAcquaintanceLayer() — profile → AI system prompt
│   └── tour/
│       └── TransitionManager.ts  State machine: artwork transition timing + context
│
└── voice/                      Voice isolation pipeline (NEW — task 2)
    ├── pipeline.ts             VoiceIsolationPipeline — orchestrates all layers
    ├── noiseSuppressor.ts      RNNoise WASM wrapper
    ├── echoCanceller.ts        AEC state (delegates to browser)
    ├── speakerEnrollment.ts    ECAPA-TDNN ONNX — voiceprint enrollment + verification
    └── modelCache.ts           IndexedDB cache for ONNX model (~80MB)
```

---

## Key Files — What They Do

### The main user-facing flow touches these files in order:

| File | Role |
|------|------|
| `app/artwork/[id]/page.tsx` | Loads artwork, runs gate check, renders everything |
| `contexts/VisitorContext.tsx` | Holds visitor identity + profile throughout session |
| `components/auth/VisitorGateModal.tsx` | Intercepts unauthenticated/new visitors |
| `components/onboarding/AcquaintanceIntro.tsx` | 4-phase onboarding (voice Q&A → interests → vibe → handoff) |
| `components/chat/PersistentChatInterface.tsx` | Main chat UI — handles text, voice, transitions, streaming |
| `lib/voice/DocentVoiceManager.ts` | Voice engine — STT via Web Speech API, TTS via /api/tts |
| `app/api/chat/route.ts` | Chat endpoint — RAG grounding, OpenAI call, streaming |
| `app/api/tts/route.ts` | TTS endpoint — OpenAI TTS-1, returns MP3 |

---

## Database Schema (Quick Reference)

| Model | Purpose |
|-------|---------|
| `Museum` | Museum metadata (name, location, isActive) |
| `Artwork` | Artworks — belongs to Museum, has qrCode (unique) |
| `CuratorNote` | Curator-written context per artwork (interpretation, provenance, etc.) |
| `ArtworkEmbedding` | pgvector embeddings for RAG (one row per chunk per artwork) |
| `User` | Registered users (email, password hash, role: visitor/curator/admin) |
| `VisitorPersonality` | 1:1 with User — stores VisitorProfile JSON + docentName |
| `ChatSession` | Conversation thread (artworkId + museumId) |
| `Message` | Individual messages in a session |

**QR codes** encode the artwork's numeric ID (e.g. `0020001`), not a URL.

---

## Visitor Profile (VisitorProfile)

The core data model that personalises the AI's behaviour. Lives in `src/lib/acquaintance/profile.ts`.

```ts
{
  id: string
  createdAt: string
  identity: {
    name: string | null
    visit_group: 'solo' | 'couple' | 'family' | 'group'
    age_bracket: 'teen' | 'young_adult' | 'adult' | 'senior' | null
    is_local: boolean | null
  }
  personality: {
    formality: number           // 0 = very casual, 1 = very formal
    humor_tolerance: number     // 0–1
    sarcasm_appreciation: boolean
    humor_style: 'dry' | 'warm' | 'none'
    interests: string[]         // ['sports', 'film', 'tech', ...]
    analogy_domains: string[]   // same as interests — used for analogies
    jargon_tolerance: number    // 0 = avoid art terms, 1 = welcome them
  }
  engagement: {
    depth_preference: number    // 0 = brief, 1 = deep dives
    curiosity: number           // 0–1
    engagement_trend: number    // -1 = declining, +1 = building
  }
  interaction: {
    response_style: 'concise' | 'moderate' | 'elaborate'
    preferred_question_style: 'open' | 'direct' | 'rhetorical' | 'none'
    proactivity_preference: number  // 0 = reactive, 1 = proactive
  }
  intro_complete: boolean       // Gate: has the visitor finished onboarding?
}
```

Profile is built during onboarding and refined on every chat turn via `applyHeuristics()`.

---

## Auth: Guest vs Registered

| | Guest | Registered |
|---|-------|-----------|
| Signup required | No | Yes |
| Profile stored | localStorage only | DB + localStorage |
| Admin/curator access | No | Only with role |
| Profile persists across devices | No | Yes |
| Docent name remembered | localStorage | DB |

**JWT** is set as an httpOnly cookie (`auth-token`). Guest visitors have no cookie.

---

## Design System

| Token | Value | Used For |
|-------|-------|---------|
| Warm Black | `#0D0A07` | Page background |
| Aged Gold | `#C9A84C` | Accents, highlights, CTAs |
| Parchment | `#F2E8D5` | Primary text |
| Dusty Rose | `#A67B6B` | Secondary accent, errors |
| Cormorant Garamond | Google Font | Display / headings |
| Cinzel | Google Font | Labels, eyebrows, badges |
| Raleway | Google Font | Body text, UI |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes | Direct connection (for Prisma migrations) |
| `JWT_SECRET` | Yes | Signs auth tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `7d`) |
| `OPENAI_API_KEY` | Yes | GPT-4o-mini chat + TTS-1 + embeddings |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | Yes | Asset server base URL (e.g. `http://localhost:3001`) |
| `USE_DATABASE_RAG` | No | `"true"` = use DB for RAG, otherwise file-based |
| `AUTH_RATE_LIMIT_MAX` | No | Max login attempts (default: `5`) |
| `AUTH_RATE_LIMIT_WINDOW` | No | Rate limit window in minutes (default: `15`) |

---

## Dev Commands

```bash
npm run dev:full      # Next.js + image asset server (port 3001) together
npm run dev           # Next.js only
npm run serve:images  # Image asset server only
npm run move-images   # Migrate images to ../docent-assets/
npx prisma studio     # Visual DB browser
npx prisma migrate dev # Run DB migrations
```

Database runs on **port 5433** (not default 5432) via Docker.
