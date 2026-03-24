import { supabase } from './supabase';

export interface ArtistClaim {
  id: string;
  user_id: string;
  artist_name: string;
  bio: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  website_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export async function getArtistClaim(artistName: string): Promise<ArtistClaim | null> {
  const { data } = await supabase
    .from('artist_claims')
    .select('*')
    .eq('artist_name', artistName)
    .eq('status', 'approved')
    .maybeSingle();
  return data;
}

export async function submitArtistClaim(claim: {
  artistName: string;
  bio?: string;
  instagramUrl?: string;
  spotifyUrl?: string;
  soundcloudUrl?: string;
  websiteUrl?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('artist_claims')
    .upsert({
      user_id: user.id,
      artist_name: claim.artistName,
      bio: claim.bio?.trim() || null,
      instagram_url: claim.instagramUrl?.trim() || null,
      spotify_url: claim.spotifyUrl?.trim() || null,
      soundcloud_url: claim.soundcloudUrl?.trim() || null,
      website_url: claim.websiteUrl?.trim() || null,
      status: 'pending',
    });
  if (error) throw error;
}

export async function getMyArtistClaim(artistName: string): Promise<ArtistClaim | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('artist_claims')
    .select('*')
    .eq('user_id', user.id)
    .eq('artist_name', artistName)
    .maybeSingle();
  return data;
}
