# WINSTON — Acquaintance Engine Spec

## What This Is

WINSTON is an AI-powered museum docent app. The core differentiator is that WINSTON doesn't talk to visitors like a generic tour guide — he talks to them like someone who already knows them. Think of how Winston knew Robert Langdon in Dan Brown's *Origin* — that level of familiarity and personality.

This document specifies the **Acquaintance Engine** — the system that learns who a visitor is and dynamically shapes how WINSTON communicates with them. Every response WINSTON gives should feel like it comes from someone who *gets* them.

The current API is **OpenAI**. The architecture should be API-agnostic enough to swap later.

---

## Architecture Overview

The Acquaintance Engine has four layers:

```
┌─────────────────────────────────────────────┐
│  1. THE INTRODUCTION (Onboarding)           │
│     Conversational profiling — not a quiz   │
├─────────────────────────────────────────────┤
│  2. THE PROFILE (Visitor Schema)            │
│     Structured data extracted from convo    │
├─────────────────────────────────────────────┤
│  3. THE CONSTRUCTOR (Dynamic Prompt Build)  │
│     Turns profile into system prompt        │
├─────────────────────────────────────────────┤
│  4. THE LOOP (Real-Time Adaptation)         │
│     Refines profile during the visit        │
└─────────────────────────────────────────────┘
```

---

## Layer 1: The Introduction

This is the onboarding flow. It should NOT feel like a survey or a quiz. It should feel like WINSTON making small talk — charming, a bit witty, and genuinely curious.

### How It Works

- WINSTON initiates a short conversational exchange (6-10 turns max)
- Each of WINSTON's questions is designed to extract specific profile data, but they're phrased casually
- The visitor's raw responses get parsed by a separate AI call into structured profile fields
- The visitor never sees a form, never picks from dropdowns, never rates anything 1-10

### Conversation Design

Each question maps to one or more profile fields. Here's the mapping:

| WINSTON Says (example) | What It Extracts |
|---|---|
| "So what brings you here today — dragged by someone, killing time, or actually into this stuff?" | `visit_intent`, `interest_level`, `social_context` |
| "Have you been to many museums or is this more of a rare outing?" | `museum_experience`, `cultural_familiarity` |
| "When you're watching a documentary or reading something, do you want all the nerdy details or just the good stuff?" | `depth_preference`, `attention_span` |
| "What kind of stuff are you into outside of this? Could be anything — sports, cooking, gaming, whatever." | `interests`, `analogy_pool` |
| "If I start throwing around words like 'chiaroscuro' or 'Baroque period,' are you going to nod along or tell me to speak English?" | `art_knowledge`, `jargon_tolerance` |
| "Do you appreciate a bit of sarcasm or should I keep it straight?" | `humor_style`, `formality` |
| "Are you more of a 'just tell me the highlights' person or a 'I'll stand here for 20 minutes reading every plaque' person?" | `pace_preference`, `engagement_style` |
| "Anything you're specifically hoping to see today, or should I surprise you?" | `specific_interests`, `openness` |

### Important Rules

- These are EXAMPLES. WINSTON should vary the phrasing naturally — don't repeat the same script for every visitor.
- If a visitor gives a short or dismissive answer, WINSTON shouldn't push. Extract what you can and move on.
- If a visitor is clearly eager and chatty, WINSTON can extend the introduction naturally.
- The introduction should take no more than 2-3 minutes. Respect people's time.
- WINSTON's personality (witty, warm, British-accented charm) should be present from the very first message.

### Technical Implementation

The introduction uses TWO API calls per exchange:

1. **The Conversation Call** — generates WINSTON's next message based on what's been said so far and what profile fields still need filling. Uses the WINSTON personality prompt.

2. **The Extraction Call** — takes the visitor's latest response and extracts structured profile data from it. This is a separate, more clinical prompt that just returns JSON. The visitor never sees this call.

```
Visitor says something
        │
        ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Extraction Call      │     │ Conversation Call    │
│ "Parse this into     │     │ "Given what we know  │
│  profile fields"     │     │  so far, ask the     │
│                      │     │  next natural thing" │
│ Returns: JSON        │     │ Returns: WINSTON msg │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           ▼                           ▼
    Update Profile              Send to Visitor
```

---

## Layer 2: The Visitor Profile Schema

This is the structured data that defines who the visitor is. Every field should be derivable from natural conversation.

```json
{
  "visitor_id": "uuid",
  "created_at": "ISO timestamp",
  "last_updated": "ISO timestamp",

  "identity": {
    "name": null,
    "age_range": null,
    "language_preference": "en",
    "visit_group": "solo"
  },

  "communication": {
    "formality": 0.5,
    "humor_style": "dry",
    "humor_tolerance": 0.7,
    "sarcasm_appreciation": true,
    "jargon_tolerance": 0.3,
    "emoji_usage": false,
    "preferred_response_length": "medium",
    "swear_tolerance": false
  },

  "knowledge": {
    "art_history": 0.2,
    "science": 0.5,
    "history": 0.6,
    "architecture": 0.3,
    "music": 0.4,
    "literature": 0.5,
    "pop_culture": 0.8,
    "technology": 0.7
  },

  "engagement": {
    "depth_preference": "surface",
    "pace": "quick",
    "attention_span": "short",
    "learning_style": "visual",
    "engagement_style": "highlights",
    "curiosity_level": 0.6
  },

  "personality": {
    "interests": ["cooking", "gaming", "football"],
    "analogy_domains": ["food", "sports", "tech"],
    "visit_intent": "casual",
    "openness_to_new": 0.7,
    "social_context": "with_partner",
    "museum_experience": "low"
  },

  "session": {
    "pieces_viewed": [],
    "topics_engaged": [],
    "topics_disengaged": [],
    "questions_asked": [],
    "avg_response_length": 0,
    "avg_time_per_piece": 0,
    "engagement_trend": "neutral",
    "mood_indicators": []
  }
}
```

### Field Notes

- **Numeric scales (0.0 to 1.0)**: These aren't precision measurements. They're rough signals. 0.3 art knowledge means "knows Mona Lisa exists but not much else." 0.8 means "can hold a conversation about Impressionism."
- **`analogy_domains`**: This is key. If someone is into cooking, WINSTON explains color theory like mixing ingredients. If they're into gaming, art composition becomes level design. This is how WINSTON feels like he *knows* you.
- **`session` fields**: These update in real-time during the visit. They're the feedback loop data.
- **All fields are optional**. If the introduction doesn't reveal something, it stays null/default. WINSTON works with what he has.

---

## Layer 3: The Prompt Constructor

This is the engine room. Before every single message WINSTON sends, a system prompt is dynamically built from the visitor's profile.

### How It Works

```javascript
function buildSystemPrompt(profile) {
  // Base personality — this never changes
  const base = `You are WINSTON, an AI museum docent. You are warm, witty, 
  and knowledgeable with a refined British sensibility — think a charming 
  Oxford professor who also happens to be genuinely funny. You speak like 
  an acquaintance, not a tour guide. Never use bullet points. Never say 
  "that's a great question." Never be generic.`;

  // Dynamic layer — built from profile
  const dynamic = buildDynamicLayer(profile);

  // Context layer — what's happening right now
  const context = buildContextLayer(profile.session);

  return `${base}\n\n${dynamic}\n\n${context}`;
}
```

### The Dynamic Layer

This translates profile data into natural behavioral instructions:

```javascript
function buildDynamicLayer(profile) {
  const instructions = [];

  // Communication style
  if (profile.communication.formality < 0.3) {
    instructions.push("Be very casual. Use contractions, slang is fine, keep it loose.");
  } else if (profile.communication.formality > 0.7) {
    instructions.push("Maintain a more polished tone. Still warm, but articulate.");
  }

  // Humor calibration
  if (profile.communication.sarcasm_appreciation) {
    instructions.push("This visitor appreciates sarcasm and dry wit. Use it naturally — don't overdo it but don't hold back either.");
  } else {
    instructions.push("Keep humor light and straightforward. Avoid sarcasm — it won't land well.");
  }

  // Knowledge calibration
  const dominated = getDominantKnowledge(profile.knowledge);
  const weak = getWeakKnowledge(profile.knowledge);
  instructions.push(`This visitor is knowledgeable about: ${dominated.join(", ")}. They know less about: ${weak.join(", ")}. Adjust depth accordingly — don't over-explain what they already get, and don't assume knowledge they don't have.`);

  // Jargon handling
  if (profile.communication.jargon_tolerance < 0.3) {
    instructions.push("Avoid technical art terminology. If you must use a term, explain it immediately in plain language.");
  } else if (profile.communication.jargon_tolerance > 0.7) {
    instructions.push("Feel free to use proper art terminology — this visitor can handle it and might even prefer it.");
  }

  // Analogy engine — THIS IS THE SECRET SAUCE
  if (profile.personality.analogy_domains.length > 0) {
    instructions.push(`When explaining concepts, draw analogies from: ${profile.personality.analogy_domains.join(", ")}. For example, if explaining composition and they're into cooking, compare it to plating a dish — balance, focal point, negative space. This is how you make it feel personal.`);
  }

  // Depth and pacing
  if (profile.engagement.depth_preference === "surface") {
    instructions.push("Keep explanations brief — 2-3 sentences max unless they ask for more. Hit the interesting hook and move on.");
  } else if (profile.engagement.depth_preference === "deep") {
    instructions.push("This visitor wants depth. Give them layers — the history, the technique, the context, the gossip. They're here to learn.");
  }

  // Response length
  if (profile.engagement.attention_span === "short") {
    instructions.push("Keep responses under 60 words unless directly asked for more detail.");
  }

  // Social context
  if (profile.personality.social_context === "with_kids") {
    instructions.push("Visitor is with children. Include fun facts, comparisons kids would get, and keep language family-friendly. Make it an adventure, not a lecture.");
  }

  return instructions.join("\n\n");
}
```

### The Context Layer

This adds awareness of what's happening right now in the visit:

```javascript
function buildContextLayer(session) {
  const context = [];

  // What they've already seen
  if (session.pieces_viewed.length > 0) {
    context.push(`Pieces already discussed: ${session.pieces_viewed.join(", ")}. Don't repeat information about these unless asked. You can reference them for connections though.`);
  }

  // Engagement tracking
  if (session.engagement_trend === "declining") {
    context.push("The visitor seems to be losing interest. Shorten your responses, lead with the most surprising or unusual fact, and ask if they'd like to move on.");
  } else if (session.engagement_trend === "increasing") {
    context.push("The visitor is increasingly engaged. You can offer slightly more depth and detail.");
  }

  // Topics that landed vs didn't
  if (session.topics_engaged.length > 0) {
    context.push(`Topics that got strong engagement: ${session.topics_engaged.join(", ")}. Lean into similar themes.`);
  }
  if (session.topics_disengaged.length > 0) {
    context.push(`Topics that fell flat: ${session.topics_disengaged.join(", ")}. Avoid similar angles.`);
  }

  return context.join("\n\n");
}
```

### API Call Structure (OpenAI)

```javascript
async function getWinstonResponse(userMessage, profile, artworkContext) {
  const systemPrompt = buildSystemPrompt(profile);

  const messages = [
    { role: "system", content: systemPrompt },
    // Include recent conversation history for continuity
    ...getRecentHistory(profile.visitor_id, 10),
    { role: "user", content: userMessage }
  ];

  // If there's artwork context (from location detection), inject it
  if (artworkContext) {
    messages.splice(1, 0, {
      role: "system",
      content: `The visitor is currently looking at: ${artworkContext.title} by ${artworkContext.artist} (${artworkContext.year}). Key facts: ${artworkContext.description}`
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    temperature: 0.8,  // slightly creative but not unhinged
    max_tokens: 300,   // keep responses concise by default
    presence_penalty: 0.3,  // discourage repetition
    frequency_penalty: 0.2
  });

  return response.choices[0].message.content;
}
```

---

## Layer 4: The Feedback Loop

Like TikTok's algorithm, WINSTON keeps learning during the visit. This is passive — the visitor doesn't know it's happening.

### What Gets Tracked

| Signal | What It Means | Profile Update |
|---|---|---|
| Visitor asks a follow-up question | They're interested in this topic | Increase `curiosity_level`, add to `topics_engaged` |
| Visitor responds with 1-3 words | Low engagement or boredom | Flag `engagement_trend` declining |
| Visitor uses technical terms | Higher knowledge than initially assessed | Bump relevant `knowledge` field |
| Visitor says "what?" or "huh?" | Went over their head | Lower `jargon_tolerance`, simplify |
| Visitor laughs or uses "lol" / "haha" | Humor is landing | Increase `humor_tolerance` |
| Visitor asks to skip / move on | Losing interest in current topic | Add to `topics_disengaged`, increase `pace` |
| Long detailed response from visitor | High engagement | Increase `depth_preference` |
| Visitor hasn't responded in a while | May have walked away or lost interest | WINSTON can prompt gently |

### Implementation

After every visitor message, run a lightweight analysis:

```javascript
async function updateProfileFromInteraction(visitorMessage, winstonMessage, profile) {
  // Simple heuristics first (no API call needed)
  const wordCount = visitorMessage.split(' ').length;

  if (wordCount <= 3) {
    profile.session.engagement_trend = adjustTrend(profile.session.engagement_trend, "down");
  } else if (wordCount >= 20) {
    profile.session.engagement_trend = adjustTrend(profile.session.engagement_trend, "up");
  }

  // Check for follow-up indicators
  const followUpPatterns = /\b(why|how|tell me more|what about|really|interesting)\b/i;
  if (followUpPatterns.test(visitorMessage)) {
    profile.engagement.curiosity_level = Math.min(1, profile.engagement.curiosity_level + 0.05);
  }

  // Check for confusion indicators
  const confusionPatterns = /\b(what\?|huh|confused|don't get|lost me|english please)\b/i;
  if (confusionPatterns.test(visitorMessage)) {
    profile.communication.jargon_tolerance = Math.max(0, profile.communication.jargon_tolerance - 0.1);
  }

  // Check for humor response
  const humorPatterns = /\b(lol|lmao|haha|hahaha|😂|🤣|that's funny|hilarious)\b/i;
  if (humorPatterns.test(visitorMessage)) {
    profile.communication.humor_tolerance = Math.min(1, profile.communication.humor_tolerance + 0.05);
  }

  // For deeper analysis, use a periodic (every 5th message) lightweight API call
  if (profile.session.pieces_viewed.length % 5 === 0) {
    await deepProfileUpdate(profile, visitorMessage);
  }

  profile.last_updated = new Date().toISOString();
  await saveProfile(profile);
}
```

---

## File Structure

```
C:\Projects\docent\
├── src/
│   ├── acquaintance/
│   │   ├── engine.js              # Main orchestrator
│   │   ├── introduction.js        # Onboarding conversation logic
│   │   ├── profile.js             # Profile schema, CRUD, defaults
│   │   ├── promptConstructor.js   # Dynamic system prompt builder
│   │   ├── feedbackLoop.js        # Real-time profile adaptation
│   │   └── extraction.js          # Parse visitor responses into profile data
│   ├── knowledge/
│   │   └── artworks.json          # Artwork database (or API integration)
│   ├── api/
│   │   └── openai.js              # OpenAI API wrapper
│   └── utils/
│       └── history.js             # Conversation history management
├── data/
│   └── profiles/                  # Visitor profiles (or use a database)
└── tests/
    ├── introduction.test.js
    ├── promptConstructor.test.js
    └── feedbackLoop.test.js
```

---

## Key Principles (Read These)

1. **WINSTON is not a chatbot.** He's a character. Every response should feel like it comes from a specific person with opinions, humor, and warmth. If a response could come from any generic AI assistant, it's wrong.

2. **The profile is a living document.** It starts rough and gets sharper throughout the visit. Don't wait for a perfect profile before being personal — use what you have.

3. **Analogies are everything.** The single most powerful personalization tool is drawing analogies from the visitor's world. A chef understands color theory through flavor profiles. A programmer understands art movements through paradigm shifts. A sports fan understands artistic rivalry through team rivalries. This is what makes WINSTON feel like he knows you.

4. **Shorter is almost always better.** Most museum visitors don't want an essay. Lead with the hook — the surprising fact, the scandal, the human story. If they want more, they'll ask.

5. **Never be condescending.** If someone doesn't know much about art, that's fine. WINSTON treats everyone like an intelligent adult who just happens to not know this particular thing yet.

6. **The onboarding must be fast and fun.** If the introduction feels like a chore, people will abandon it. 2-3 minutes max, and it should be enjoyable in itself.

7. **Privacy matters.** Profiles should be stored locally or with clear consent. Visitors should be able to delete their profile. Don't collect more than you need.

---

## What to Build First

Priority order:

1. **Profile schema** (`profile.js`) — define the data structure, defaults, and CRUD operations
2. **Prompt constructor** (`promptConstructor.js`) — the dynamic system prompt builder
3. **Basic introduction flow** (`introduction.js`) — the onboarding conversation with extraction
4. **API wrapper** (`openai.js`) — clean interface for making calls
5. **Feedback loop** (`feedbackLoop.js`) — real-time profile updates
6. **Engine orchestrator** (`engine.js`) — ties it all together
7. **Tests** — especially for prompt constructor and feedback loop

---

## Notes for Claude Code

- Use **ES modules** (`import/export`) not CommonJS
- The project already exists at `C:\Projects\docent` — integrate into existing structure
- **OpenAI SDK**: use the `openai` npm package
- Keep functions small and composable — this system needs to be easy to tune
- Profile values are intentionally fuzzy (0.0-1.0 scales). Don't over-engineer precision.
- The prompt constructor is the most important file. Spend the most time here.
- Add JSDoc comments on all public functions
- Error handling: if the profile is empty or partially filled, WINSTON should still work — just with less personalization
