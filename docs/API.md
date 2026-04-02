# Docent — API Reference

All routes are under `/api/`. Auth cookie is `auth-token` (httpOnly, set on login/signup).

---

## Auth

### `POST /api/auth/signup`
Create a new account.
```json
// Request
{ "email": "string", "password": "string", "name": "string" }

// Response 200
{ "message": "Account created", "user": { "id", "email", "name", "role" } }
// Sets auth-token cookie

// Response 400 — validation error
// Response 409 — email already exists
```

### `POST /api/auth/login`
```json
// Request
{ "email": "string", "password": "string" }

// Response 200
{ "message": "Logged in", "user": { "id", "email", "name", "role" } }
// Sets auth-token cookie

// Response 401 — invalid credentials
// Response 429 — rate limited (5 attempts per 15 min)
```

### `POST /api/auth/logout`
Clears auth-token cookie. No body required.

### `GET /api/auth/me`
Returns current user from JWT cookie.
```json
// Response 200 (authenticated)
{ "id", "email", "name", "role", "createdAt" }

// Response 401 (no cookie or invalid token)
```

---

## Chat & AI

### `POST /api/chat`
Main chat endpoint. Supports streaming for voice mode.

```json
// Request
{
  "message": "string",
  "artworkId": "string",
  "museumId": "string",
  "artworkTitle": "string",        // optional — for context
  "artworkArtist": "string",       // optional
  "visitorName": "string | null",
  "docentName": "string | null",
  "stream": true,                  // true = streaming (voice), false = full JSON
  "voice": true,                   // true = use DOCENT_VOICE_PERSONA
  "conversationHistory": [         // last 8 messages
    { "role": "user | assistant", "content": "string" }
  ],
  "visitorProfile": { ... }        // VisitorProfile object (optional)
}

// Response (stream: false)
{
  "response": "string",
  "context_used": true,
  "curator_notes_count": 2,
  "artwork": { ... },
  "actualMuseumId": "string"
}

// Response (stream: true)
// Content-Type: text/event-stream
// Streams text chunks as they arrive from OpenAI
```

### `POST /api/chat/greeting`
Generates an AI greeting for a visitor arriving at an artwork. 8s timeout, returns empty string on failure (client falls back to local generator).

```json
// Request
{
  "artworkId": "string",
  "museumId": "string",
  "visitorName": "string | null",
  "docentName": "string | null"
}

// Response 200
{ "greeting": "string" }    // empty string if error/timeout

// Response 400 — missing artworkId or museumId
// Response 404 — artwork not found
// Response 500 — AI error (client should fall back to local greeting)
```

### `POST /api/chat/transition`
Generates a bridge sentence when visitor moves to a new artwork mid-conversation.

```json
// Request
{
  "previousTitle": "string",
  "previousArtist": "string",
  "newTitle": "string",
  "newArtist": "string",
  "newYear": "number | null",
  "spokenSoFar": "string",        // what DOCENT said about the previous artwork
  "midQuestion": false,            // was visitor mid-question when they moved?
  "lastMessages": [{ "role", "content" }]
}

// Response 200
{ "bridgeText": "string" }
```

### `POST /api/tts`
Text-to-speech via OpenAI TTS-1. 10s timeout.

```json
// Request
{ "text": "string" }

// Response 200
// Content-Type: audio/mpeg
// Body: MP3 audio buffer

// Response 400
{ "error": "Missing text" }

// Response 500
{ "error": "TTS failed" }
```

---

## Artworks

### `GET /api/artworks/[id]?museum=[museumId]`
Fetch a single artwork by ID.
```json
// Response 200
{
  "artwork": {
    "id", "title", "artist", "year", "medium", "dimensions",
    "description", "imageUrl", "qrCode", "museumId", "isActive",
    "curatorNotes": [{ "id", "content", "type", "createdAt" }]
  },
  "museum": "string"  // museum name
}

// Response 404 — not found
```

### `GET /api/artworks/[id]/search?museum=[museumId]&q=[query]`
Search related artworks using RAG embeddings.
```json
// Response 200
{ "results": [{ "id", "title", "artist", "similarity" }] }
```

### `GET /api/artworks/lookup/[qrCode]`
Look up artwork by QR code value (the numeric string encoded on the physical QR code).
```json
// Response 200
{ "artwork": { ... }, "museum": "string" }

// Response 404
```

---

## Visitor Profile

### `GET /api/profile/personality`
Fetch visitor profile from DB (registered users only).
```json
// Response 200
{
  "profile": { ... VisitorProfile ... },
  "docentName": "string | null"
}

// Response 401 — not authenticated
// Response 404 — no profile yet
```

### `POST /api/profile/personality`
Save visitor profile + docent name. Also accepts sendBeacon on page unload (Content-Type: text/plain with JSON body).
```json
// Request
{
  "profile": { ... VisitorProfile ... },
  "docentName": "string | null"
}

// Response 200
{ "success": true }

// Response 401 — not authenticated
```

---

## Acquaintance (Onboarding)

### `POST /api/acquaintance/turn`
Process a single voice turn during onboarding.

```json
// Request
{
  "userMessage": "string",         // visitor's spoken response
  "conversationHistory": [{ "role", "content" }],
  "profile": { ... VisitorProfile ... },
  "docentName": "string | null",
  "visitorName": "string | null"
}

// Response 200
{
  "nextMessage": "string",         // DOCENT's next spoken response
  "updatedProfile": { ... },       // profile with any updates from this turn
  "tapScreen": "interests | vibe | null",  // signal to move to tap phase
  "isComplete": false              // true on final turn
}
```

### `POST /api/acquaintance/update`
Full profile re-analysis after every 5 turns of normal chat.

```json
// Request
{
  "profile": { ... VisitorProfile ... },
  "recentHistory": [{ "role", "content" }]  // last 8 messages
}

// Response 200
{ "updatedProfile": { ... VisitorProfile ... } }
```

---

## Museums

### `GET /api/museums`
List all active museums.
```json
// Response 200
{
  "museums": [
    { "id", "name", "description", "location", "website", "isActive" }
  ]
}
```

---

## Curator Notes

### `GET /api/curator/notes?artworkId=[id]&museumId=[id]`
Get all curator notes for an artwork.
```json
// Response 200
{ "notes": [{ "id", "content", "type", "createdAt", "curatorId" }] }
```

### `POST /api/curator/notes`
Create a curator note. Requires `curator` or `admin` role.
```json
// Request
{
  "artworkId": "string",
  "museumId": "string",
  "content": "string",
  "type": "interpretation | provenance | technical | contextual | general"
}

// Response 201
{ "note": { ... } }

// Response 401 / 403
```

### `PATCH /api/curator/notes/[id]`
Update a curator note.
```json
// Request
{ "content": "string", "type": "string" }

// Response 200
{ "note": { ... } }
```

### `DELETE /api/curator/notes/[id]`
Delete a curator note.
```json
// Response 200
{ "success": true }
```

---

## Admin (requires admin role)

### `POST /api/admin/artwork`
Create a new artwork.
```json
// Request
{
  "title", "artist", "year", "medium", "dimensions",
  "description", "imageUrl", "museumId", "qrCode"
}
// Response 201: { "artwork": { ... } }
```

### `GET /api/admin/artwork`
List all artworks (paginated).
```json
// Query: ?page=1&limit=20&museumId=xxx
// Response 200: { "artworks": [...], "total": number }
```

### `POST /api/admin/csv-upload`
Bulk import artworks from CSV. Accepts `curator` or `admin` role.
```json
// Multipart form: file (CSV), museumId
// Response 200: { "imported": number, "errors": [...] }
```

### `GET /api/admin/users`
List all users (paginated).
```json
// Query: ?page=1&limit=20
// Response 200: { "users": [...], "total": number }
```

### `PATCH /api/admin/users/[id]/role`
Change a user's role.
```json
// Request: { "role": "visitor | curator | admin" }
// Response 200: { "success": true, "user": { ... } }
```

---

## Error Format

All errors return JSON (except the TTS audio endpoint which returns `{ "error": "string" }` on failure):

```json
{ "error": "Human-readable message" }
```

HTTP status codes:
- `200` / `201` — success
- `400` — bad request / missing fields
- `401` — unauthenticated
- `403` — forbidden (wrong role)
- `404` — not found
- `429` — rate limited
- `500` — server error
