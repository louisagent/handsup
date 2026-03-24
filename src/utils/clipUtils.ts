// ============================================================
// Handsup — Clip Utility Functions
// ============================================================

/**
 * Returns true if the given expiry date is within the threshold (default 7 days).
 */
export function isExpiringSoon(
  expiresAt: string | number | Date,
  daysThreshold = 7
): boolean {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  if (isNaN(expiryDate.getTime())) return false;
  const msThreshold = daysThreshold * 24 * 60 * 60 * 1000;
  const msUntilExpiry = expiryDate.getTime() - now.getTime();
  return msUntilExpiry > 0 && msUntilExpiry <= msThreshold;
}

/**
 * Returns a human-readable label describing when the clip expires.
 * e.g. "Expires today", "Expires tomorrow", "Expires in 3 days"
 */
export function getExpiryLabel(expiresAt: string | number | Date): string {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  if (isNaN(expiryDate.getTime())) return 'Expiry unknown';

  const msUntilExpiry = expiryDate.getTime() - now.getTime();
  if (msUntilExpiry <= 0) return 'Link expired';

  const hoursUntilExpiry = msUntilExpiry / (1000 * 60 * 60);
  if (hoursUntilExpiry < 24) return 'Expires today';

  const daysUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry === 1) return 'Expires tomorrow';
  return `Expires in ${daysUntilExpiry} days`;
}
