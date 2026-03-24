import { supabase } from './supabase';

type EventName =
  | 'app_open'
  | 'clip_view'
  | 'clip_download'
  | 'clip_like'
  | 'clip_share'
  | 'clip_upload'
  | 'user_signup'
  | 'user_login'
  | 'search_query'
  | 'profile_view'
  | 'feed_switch' // for_you vs following
  | 'vertical_feed_open'
  | 'clip_repost';

interface EventProperties {
  clip_id?: string;
  artist?: string;
  festival?: string;
  query?: string;
  user_id?: string;
  [key: string]: string | number | boolean | undefined;
}

export async function trackEvent(
  name: EventName,
  properties?: EventProperties
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('analytics_events').insert({
      event_name: name,
      user_id: user?.id ?? null,
      properties: properties ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Analytics should never crash the app
  }
}
