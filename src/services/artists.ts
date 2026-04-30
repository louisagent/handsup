import { supabase } from './supabase';

export interface Artist {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  genre_tags: string[];
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  is_verified: boolean;
  instagram_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  website_url: string | null;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getArtist(slug: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getArtistByName(name: string): Promise<Artist | null> {
  const { data } = await supabase
    .from('artists')
    .select('*')
    .ilike('name', name)
    .maybeSingle();
  return data ?? null;
}

export async function searchArtists(query: string): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .ilike('name', `%${query.trim()}%`)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function getAllArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createArtist(params: {
  name: string;
  bio?: string;
  genre_tags?: string[];
}): Promise<Artist> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const slug = generateSlug(params.name);
  if (!slug) throw new Error('Invalid artist name');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      slug,
      name: params.name.trim(),
      bio: params.bio?.trim() || null,
      genre_tags: params.genre_tags ?? [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createArtistIfNotExists(name: string): Promise<void> {
  const slug = generateSlug(name);
  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  
  if (existing) return; // Already exists
  
  await supabase
    .from('artists')
    .insert({ name, slug, bio: null, genre_tags: [], image_url: null, is_verified: false });
}
