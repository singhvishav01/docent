/**
 * speechCleanup.ts
 *
 * Prepares AI-generated text for spoken TTS delivery.
 * Strips formatting that doesn't translate to audio and forces natural spoken patterns.
 */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bit is\b/gi, "it's"],
  [/\bI am\b/g, "I'm"],
  [/\bI have\b/g, "I've"],
  [/\bI will\b/g, "I'll"],
  [/\bI would\b/g, "I'd"],
  [/\byou are\b/gi, "you're"],
  [/\byou will\b/gi, "you'll"],
  [/\byou have\b/gi, "you've"],
  [/\bwe are\b/gi, "we're"],
  [/\bwe will\b/gi, "we'll"],
  [/\bwe have\b/gi, "we've"],
  [/\bthey are\b/gi, "they're"],
  [/\bthat is\b/gi, "that's"],
  [/\bthere is\b/gi, "there's"],
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bcannot\b/gi, "can't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bwill not\b/gi, "won't"],
  [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\bhave not\b/gi, "haven't"],
  [/\bhas not\b/gi, "hasn't"],
  [/\bhad not\b/gi, "hadn't"],
  [/\blet us\b/gi, "let's"],
];

export function prepareForSpeech(text: string): string {
  let result = text;

  // Strip markdown formatting
  result = result
    .replace(/#{1,6}\s+/g, '')              // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')        // bold
    .replace(/\*(.+?)\*/g, '$1')            // italic
    .replace(/__(.+?)__/g, '$1')            // bold underscore
    .replace(/_(.+?)_/g, '$1')              // italic underscore
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')  // code (inline + block)
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // links → label only
    .replace(/^[-*+]\s+/gm, '')             // unordered list bullets
    .replace(/^\d+\.\s+/gm, '');            // ordered list numbers

  // Remove parenthetical asides — they create unnatural pauses when spoken
  result = result.replace(/\([^)]{1,60}\)/g, '');

  // Force contractions for natural speech rhythm
  for (const [pattern, replacement] of CONTRACTIONS) {
    result = result.replace(pattern, replacement);
  }

  // Normalise whitespace
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}
