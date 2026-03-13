// src/lib/greeting-generator.ts
//
// Combinatorial greeting generator for WINSTON.
// ~100 fragments across 5 slots — no API calls, no repeats, always fresh.
// Tone: warm like Joey, sharp like Harvey, crafted like The Bear.

// ─── Fragment Banks ────────────────────────────────────────────────────────────

const OPENERS_WITH_NAME: string[] = [
  'Hey {name} —',
  'Welcome in, {name}.',
  '{name}. Good to have you here.',
  'Ah, {name} — glad you made it.',
  'There you are, {name}.',
  'Well, {name} — you picked a good one.',
  '{name}, you\'re just in time.',
  'Hello, {name}. I\'ve been waiting.',
  '{name} — I had a feeling you\'d show up today.',
  'Come in, {name}. Leave the outside world at the door.',
  '{name}. I see you found your way here.',
  'So, {name} — curious type, are we?',
  'Perfect timing, {name}.',
  'Ah. {name}. The gallery\'s been quiet without you.',
  'Good eye, {name}. This room is worth the detour.',
  '{name} — you\'ve stopped at exactly the right place.',
  'Hello, {name}. This one\'s been waiting for the right visitor.',
  'Welcome, {name}. I think you\'re going to like this.',
  '{name}. I\'m glad it\'s you standing here.',
  'Right on time, {name}.',
  'Ah, {name}. Something told me you\'d find this one.',
  '{name} — step a little closer. This is worth it.',
  'There\'s no rush, {name}. This one deserves your full attention.',
  'Hello, {name}. I\'m WINSTON. Let\'s talk about what you\'re looking at.',
  '{name}, you\'ve chosen well.',
];

const OPENERS_ANONYMOUS: string[] = [
  'Welcome.',
  'You\'ve stopped at exactly the right place.',
  'Glad you\'re here.',
  'Step a little closer — this one rewards attention.',
  'This room doesn\'t get enough visitors. I\'m glad you\'re here.',
  'Welcome in. Leave the outside world at the door.',
  'Good eye. This is worth a moment.',
  'I\'m WINSTON. You\'ve found something special.',
  'Not everyone stops here. I\'m glad you did.',
  'You have good instincts.',
  'Take your time. This one\'s worth it.',
];

const ARTWORK_REACTIONS: string[] = [
  'Now this is a piece that stops people.',
  'This one\'s worth slowing down for.',
  'People walk past this every day without really seeing it.',
  'There\'s more going on here than meets the eye.',
  'I\'ve introduced many people to this painting. It\'s never the same conversation twice.',
  'You chose well.',
  'This piece has a story most people never hear.',
  'Look at it for ten seconds before we talk.',
  'Most people spend thirty seconds here. That\'s not nearly enough.',
  'This one has layers.',
  'There\'s a reason this piece has lasted as long as it has.',
  'I never get tired of standing in front of this.',
  'Every detail here was a decision.',
  'What you\'re looking at took years to make — and it shows.',
  'This work carries more weight than it lets on.',
  'I\'ve answered a lot of questions about this one. All of them were worth asking.',
  'The more you look, the more you see.',
  'This piece has survived a lot to get to this room. Worth acknowledging.',
  'Something about this work changes depending on the day you see it.',
];

const ARTWORK_INTROS: string[] = [
  '"{title}" — {artist}, {year}.',
  '{artist} made this in {year}. It\'s called "{title}".',
  '"{title}", {year}. {artist} at the height of their powers.',
  '{artist}. "{title}". {year}.',
  'The work in front of you is "{title}" — {artist}, {year}.',
  '{year}. {artist} made this — "{title}".',
  '"{title}" — {year}, by {artist}. One of the defining works of its time.',
  '{artist} spent time on this. "{title}", {year}.',
  '"{title}" — {artist}. The year was {year}.',
  '"{title}" by {artist}. {year}. There is a lot happening here.',
  '{artist} finished this in {year}. "{title}".',
  'The piece: "{title}". {artist}, {year}. Worth your full attention.',
];

const ARTWORK_INTROS_NO_DETAIL: string[] = [
  'This is the piece you\'re standing in front of.',
  'Take a moment with what\'s in front of you.',
  'This is the work.',
];

const INVITATIONS: string[] = [
  'What catches your eye first?',
  'Where should we start?',
  'Want the story behind it?',
  'Ask me anything.',
  'What do you want to know?',
  'What\'s pulling you in?',
  'Anything jumping out at you?',
  'Tell me what you\'re seeing.',
  'I\'m all yours.',
  'Ask something — there are no wrong questions here.',
  'What\'s the first thing you noticed?',
  'I could talk about this for hours. Where would you like to begin?',
  'What would you like to know?',
  'Where do you want to start?',
  'I\'m here. Ask away.',
  'What\'s on your mind?',
  'What do you see?',
  'Take a beat. Then ask me anything.',
  'What do you want to understand about it?',
  'The floor is yours.',
  'Something catch your attention?',
];

const CONNECTORS: string[] = [
  'So —',
  'Here\'s the thing —',
  'And honestly?',
  'Real talk —',
  'Here\'s what most people miss —',
  'Between you and me —',
  'Now —',
  'Right —',
  'Let me tell you something —',
  'Worth knowing —',
  'Here\'s the short version —',
  'The thing is —',
];

// ─── Anti-repeat ring buffer ───────────────────────────────────────────────────

const RING_SIZE = 5;
const recentPicks: Map<string, number[]> = new Map();

function pickRandom<T>(items: T[], slotKey: string): T {
  const recent = recentPicks.get(slotKey) ?? [];
  const available = items
    .map((item, i) => i)
    .filter(i => !recent.includes(i));

  // If all have been used recently (small bank), reset
  const pool = available.length > 0 ? available : items.map((_, i) => i);
  const idx = pool[Math.floor(Math.random() * pool.length)];

  const updated = [...recent, idx].slice(-RING_SIZE);
  recentPicks.set(slotKey, updated);

  return items[idx];
}

// ─── Interpolation ─────────────────────────────────────────────────────────────

function interpolate(
  template: string,
  vars: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

// ─── Main generators ──────────────────────────────────────────────────────────

export function generateGreeting(
  visitorName: string | null,
  artworkTitle: string,
  artist?: string,
  year?: string | number
): string {
  const name = visitorName?.trim() || null;

  // Opener
  let opener: string;
  if (name) {
    opener = interpolate(pickRandom(OPENERS_WITH_NAME, 'opener_named'), { name });
  } else {
    opener = pickRandom(OPENERS_ANONYMOUS, 'opener_anon');
  }

  // Artwork reaction (50% chance to include, keeps things varied)
  const includeReaction = Math.random() > 0.4;
  const reaction = includeReaction
    ? pickRandom(ARTWORK_REACTIONS, 'reaction')
    : null;

  // Artwork intro
  let artworkIntro: string;
  if (artist && year) {
    artworkIntro = interpolate(pickRandom(ARTWORK_INTROS, 'intro'), {
      title: artworkTitle,
      artist,
      year,
    });
  } else if (artist) {
    artworkIntro = interpolate(pickRandom(ARTWORK_INTROS, 'intro'), {
      title: artworkTitle,
      artist,
      year: '',
    }).replace(/,\s*\.$/, '.').replace(/\s{2,}/g, ' ');
  } else {
    artworkIntro = interpolate(pickRandom(ARTWORK_INTROS_NO_DETAIL, 'intro_bare'), {
      title: artworkTitle,
    });
  }

  // Connector (40% chance, only if reaction is included)
  const connector =
    includeReaction && Math.random() > 0.6
      ? pickRandom(CONNECTORS, 'connector')
      : null;

  // Invitation
  const invitation = pickRandom(INVITATIONS, 'invitation');

  // Assemble
  const parts = [opener];
  if (reaction) parts.push(reaction);
  if (connector) parts.push(connector);
  parts.push(artworkIntro);
  parts.push(invitation);

  return parts.join(' ');
}

// Voice-friendly artwork context lines — evocative, not tour-guide recitation
const VOICE_ARTWORK_LINES: string[] = [
  '{title} by {artist}. {year}. Take a moment with it.',
  'This is {title}. {artist} made this in {year}.',
  '{artist}. {title}. {year}. One of the defining works of its era.',
  '{title} — {artist}, {year}. There is a lot going on in this piece.',
  '{artist} finished this in {year}. It is called {title}.',
  'The work in front of you — {title} by {artist}, {year}.',
  '{year}. {artist}. {title}. And it still stops people today.',
  '{title}. {artist} poured something real into this.',
  'We are standing with {title} by {artist}.',
  '{artist} spent real time on this. {title}, from {year}.',
];

const VOICE_ARTWORK_LINES_NO_YEAR: string[] = [
  '{title} by {artist}. Take a moment with it.',
  'This is {title} by {artist}.',
  '{artist} made {title}. Have a good look.',
  'The work in front of you — {title} by {artist}.',
  '{artist} poured something real into {title}.',
];

const VOICE_ARTWORK_LINES_BARE: string[] = [
  'Take a moment with what is in front of you.',
  'This is the piece. Have a good look.',
  'Have a look. Then ask me anything.',
];

// Voice-friendly version — shorter, no em-dashes, no quote marks, natural spoken rhythm
export function generateVoiceGreeting(
  visitorName: string | null,
  artworkTitle: string,
  artist?: string,
  year?: string | number
): string {
  const name = visitorName?.trim() || null;

  const opener = name
    ? interpolate(pickRandom(OPENERS_WITH_NAME, 'v_opener_named'), { name })
        .replace(/—/g, ',')
        .replace(/\./g, '')
        .replace(/"/g, '')
    : pickRandom(OPENERS_ANONYMOUS, 'v_opener_anon')
        .replace(/\./g, '')
        .replace(/"/g, '');

  let artworkLine: string;
  if (artist && year) {
    artworkLine = interpolate(pickRandom(VOICE_ARTWORK_LINES, 'v_artwork'), {
      title: artworkTitle,
      artist,
      year,
    });
  } else if (artist) {
    artworkLine = interpolate(pickRandom(VOICE_ARTWORK_LINES_NO_YEAR, 'v_artwork_ny'), {
      title: artworkTitle,
      artist,
    });
  } else {
    artworkLine = pickRandom(VOICE_ARTWORK_LINES_BARE, 'v_artwork_bare');
  }

  const invitation = pickRandom(INVITATIONS, 'v_invitation');

  return `${opener}. ${artworkLine} ${invitation}`;
}
