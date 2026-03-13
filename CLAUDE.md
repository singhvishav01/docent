🏛️ DOCENT — Project Summary for Claude Code
DOCENT is an in-museum AI guide app where visitors scan QR codes next to artworks and have a natural, voice-driven conversation with an AI about what they're looking at. The inspiration is WINSTON from Dan Brown's Origin — a proactive, free-flowing AI museum docent, not a button-press Q&A bot.
Tech Stack

Next.js 14 (App Router)
PostgreSQL with Prisma ORM
OpenAI GPT-4o-mini for chat + RAG
React / Tailwind CSS
Docker for local DB
GitHub repo: sin546shav01/docent

What's Built ✅

QR code scanning (camera + manual fallback)
Artwork detail pages that load from the database
AI chat grounded in artwork context + curator notes (RAG system)
User authentication (JWT)
Admin dashboard (manage museums, artworks)
Curator dashboard (add/edit curator notes, CSV bulk upload)
CSV import tool (admin/curator only)
QR code generator page (/admin/qr-codes)
WINSTON voice mode — Web Speech API for STT + browser TTS, continuous listen → speak → listen loop, proactive greetings, artwork-aware context

Current Architecture

Database is the single source of truth (museums, artworks, curator notes)
RAG system loads artwork + curator note data at server startup, creates embeddings, answers questions semantically
Voice layer (WinstonVoiceManager.ts) sits on top of the existing chat system — it's a mode toggle, not a replacement
QR codes encode artwork IDs (numeric format like 0020001), not URLs

Known Issues / Active Work

Windows TTS bug: onstart/onend fire instantly without audio playing — a polling fix was implemented in WinstonVoiceManager.ts
QR scan on initial /scan page vs. "scan next" button — artwork ID vs URL handling was being standardized

Key Files to Know

src/components/qr/QRScanner.tsx
src/components/chat/ChatInterface.tsx
src/lib/voice/WinstonVoiceManager.ts
src/lib/rag/retrieval.ts
src/app/api/chat/route.ts
prisma/schema.prisma
.claude/agents/ — Claude Code subagents