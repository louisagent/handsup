// ============================================================
// Handsup — Supabase Client
// Add your keys to .env before using:
//   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
