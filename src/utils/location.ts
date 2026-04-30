// ============================================================
// Location normalization utilities
// ============================================================

/**
 * Normalize a location string to a canonical format.
 * Handles cases like:
 * - "Indio California" → "Indio, California"
 * - "Indio  California  " → "Indio, California"
 * - "indio california" → "Indio, California"
 * - "Indio, CA" → "Indio, CA" (preserves existing comma format)
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';
  
  // Trim whitespace
  let normalized = location.trim();
  
  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  // If there's no comma but there are two words, add a comma
  // This handles "Indio California" → "Indio, California"
  if (!normalized.includes(',')) {
    const parts = normalized.split(' ');
    if (parts.length === 2) {
      normalized = `${parts[0]}, ${parts[1]}`;
    }
  }
  
  // Capitalize first letter of each word for consistency
  normalized = normalized
    .split(/([,\s]+)/)
    .map((part) => {
      if (part.match(/^[,\s]+$/)) return part; // preserve separators
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
  
  return normalized;
}

/**
 * Deduplicate and normalize an array of location strings.
 * Returns a sorted array of unique, normalized locations.
 */
export function deduplicateLocations(locations: string[]): string[] {
  const normalized = new Map<string, string>();
  
  for (const loc of locations) {
    const norm = normalizeLocation(loc);
    if (norm && !normalized.has(norm)) {
      normalized.set(norm, norm);
    }
  }
  
  return Array.from(normalized.values()).sort();
}
