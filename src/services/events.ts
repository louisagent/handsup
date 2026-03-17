// ============================================================
// Handsup — Events Service
// Festival/event API calls
// ============================================================

import { supabase } from './supabase';
import { Event } from '../types';

// Get all events
export async function getEvents(filter?: {
  upcoming?: boolean;
  country?: string;
  partner?: boolean;
}): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });

  if (filter?.upcoming) {
    query = query.eq('is_upcoming', true);
  }

  if (filter?.country) {
    query = query.eq('country', filter.country);
  }

  if (filter?.partner) {
    query = query.eq('is_partner', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Get single event by slug
export async function getEvent(slug: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

// Search events
export async function searchEvents(query: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .or(`name.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%`)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
