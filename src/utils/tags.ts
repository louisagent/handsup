// ============================================================
// Handsup — Hashtag / Tag Utilities
// Hashtags are extracted client-side from clip description text.
// No schema change needed — descriptions already exist in DB.
// ============================================================

/**
 * Extract hashtags from a string.
 * e.g. "great set #laneway #tamimpala" → ["#laneway", "#tamimpala"]
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g) ?? [];
  return matches.map((t) => t.toLowerCase());
}

/**
 * Returns text with hashtags highlighted (for display).
 * Actual rendering is done in the UI with purple TouchableText elements.
 */
export function formatWithHashtags(text: string): string {
  // We'll render with purple hashtags in the UI
  return text;
}

/**
 * Split text into segments: plain strings and hashtag strings.
 * e.g. "hello #world foo" → ["hello ", "#world", " foo"]
 */
export function splitByHashtags(text: string): string[] {
  return text.split(/(#[\w]+)/g).filter(Boolean);
}

/**
 * Extract @mention usernames from a string.
 * e.g. "hey @alice and @Bob!" → ["alice", "bob"]
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w]+/g) ?? [];
  return matches.map((m) => m.toLowerCase().slice(1)); // strip @
}

/**
 * Split text into segments: plain strings, hashtags, and @mention strings.
 * e.g. "hey @alice great #set" → ["hey ", "@alice", " great ", "#set"]
 */
export function splitByHashtagsAndMentions(text: string): string[] {
  return text.split(/(#[\w]+|@[\w]+)/g).filter(Boolean);
}
