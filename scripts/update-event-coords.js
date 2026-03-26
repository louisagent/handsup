#!/usr/bin/env node
/**
 * update-event-coords.js
 * ======================
 * Patches latitude/longitude for all known festival events in Supabase.
 *
 * PREREQUISITES
 * -------------
 * 1. First run the ALTER TABLE migration in the Supabase SQL editor:
 *
 *    ALTER TABLE events
 *      ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
 *      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
 *
 * 2. Then run this script:
 *
 *    node scripts/update-event-coords.js
 *
 * The script uses the service role key so it bypasses RLS.
 * No npm install required — uses Node.js built-in fetch (Node 18+).
 */

const SUPABASE_URL = 'https://ulvhjkkyxzybahcqcvaf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdmhqa2t5eHp5YmFoY3FjdmFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc4MDA0NSwiZXhwIjoyMDg5MzU2MDQ1fQ.kE5oTfChgRgTp9UE05XVbhuB7Q4djPDZyxO0pL-EPtA';

// Coords keyed by exact event name as stored in Supabase
const EVENT_COORDS = [
  { name: 'Laneway Festival',       latitude: -37.8007, longitude: 144.9507 },
  { name: 'Splendour in the Grass', latitude: -28.5167, longitude: 153.4333 },
  { name: 'Field Day',              latitude: -33.8688, longitude: 151.2093 },
  { name: 'Coachella',              latitude:  33.6831, longitude: -116.2370 },
  { name: 'Glastonbury',            latitude:  51.1536, longitude:  -2.5906  },
  { name: 'Meredith Music Festival',latitude: -37.8494, longitude: 144.0736 },
  { name: 'Beyond the Valley',      latitude: -38.5000, longitude: 146.6500 },
  { name: 'Strawberry Fields',      latitude: -35.8333, longitude: 145.5667 },
  { name: 'Falls Festival (Lorne)', latitude: -38.5407, longitude: 143.9800 },
  { name: 'Spilt Milk Festival',    latitude: -35.2809, longitude: 149.1300 },
  { name: 'Wildlands Festival',     latitude: -27.4698, longitude: 153.0251 },
];

async function patchEvent(name, latitude, longitude) {
  const url = `${SUPABASE_URL}/rest/v1/events?name=eq.${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ latitude, longitude }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ❌ ${name}: HTTP ${res.status} — ${text}`);
    return false;
  }
  console.log(`  ✅ ${name}: lat=${latitude}, lng=${longitude}`);
  return true;
}

async function main() {
  console.log('🌍 Patching event coordinates in Supabase...\n');
  console.log('⚠️  Make sure you have run the ALTER TABLE migration first!\n');

  let ok = 0;
  let fail = 0;

  for (const { name, latitude, longitude } of EVENT_COORDS) {
    const success = await patchEvent(name, latitude, longitude);
    if (success) ok++; else fail++;
  }

  console.log(`\nDone. ${ok} patched, ${fail} failed.`);
  if (fail > 0) {
    console.log('\nTip: If you see "column latitude does not exist", run the ALTER TABLE migration first.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
