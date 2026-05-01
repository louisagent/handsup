# New Features Added — May 1, 2026

## 🎉 Features Implemented

### 1. Instagram Sharing Integration
**Status:** ✅ Complete  
**Priority:** High (from roadmap)

**What it does:**
- Share clips directly to Instagram Stories
- Share clips to Instagram Feed/Reels
- Auto-downloads video locally before sharing
- Adds "Shot on Handsup 🙌" attribution

**Files created:**
- `src/screens/InstagramShareScreen.tsx` — Modal screen with share options
- `src/services/instagram.ts` — Instagram sharing service with Story & Feed support

**How to use:**
Navigate to the screen with:
```typescript
navigation.navigate('InstagramShare', { clip: clipObject })
```

---

### 2. Collaborative Playlists
**Status:** ✅ Complete  
**Priority:** High (from roadmap)

**What it does:**
- Create custom playlists to organize clips
- Make playlists collaborative — invite friends to add clips
- Download entire playlists as packs
- Auto-updating playlist thumbnails (uses first clip)
- Track who added each clip

**Files created:**
- `src/screens/PlaylistScreen.tsx` — Browse all playlists
- `src/screens/PlaylistDetailScreen.tsx` — View/edit a single playlist
- `src/services/playlists.ts` — Full CRUD operations for playlists
- `supabase/playlists_schema.sql` — Database schema with RLS policies

**Database tables:**
- `playlists` — Playlist metadata, owner, collaborators
- `playlist_clips` — Junction table for clips in playlists

**How to use:**
```typescript
// Navigate to playlists
navigation.navigate('Playlists')

// View a specific playlist
navigation.navigate('PlaylistDetail', { playlist: playlistObject })
```

**Key features:**
- Toggle collaborative mode on/off
- Add collaborators by username
- Remove clips from playlist (long-press)
- Delete playlists
- Share playlist links

---

### 3. Download Packs
**Status:** ✅ Complete  
**Priority:** High (from roadmap)

**What it does:**
- Bulk download all clips from a group, event, or playlist
- Progress tracking during multi-clip downloads
- Saves directly to camera roll
- Analytics tracking for pack downloads
- Success/failure reporting

**Files created:**
- `src/screens/DownloadPackScreen.tsx` — Download pack modal with progress
- `src/services/downloads.ts` — Download pack utilities

**Functions available:**
```typescript
// Download all clips from a group
await downloadGroupPack(groupId, groupName)

// Download all clips from an event
await downloadEventPack(eventId, eventName)

// Download all clips from a playlist
await downloadPlaylistPack(playlistId, playlistName)
```

**How to use:**
```typescript
navigation.navigate('DownloadPack', {
  type: 'group' | 'event' | 'playlist',
  id: 'uuid',
  name: 'Festival Name',
  clipCount: 42
})
```

---

## 📦 Dependencies

All required packages already in `package.json`:
- ✅ `expo-sharing` — Share to Instagram
- ✅ `expo-file-system` — Download videos (bundled with Expo)
- ✅ `expo-media-library` — Save to camera roll

No new dependencies needed.

---

## 🗄️ Database Migration Required

Run this SQL in Supabase SQL Editor:

```bash
# In Supabase dashboard → SQL Editor
supabase/playlists_schema.sql
```

This creates:
- `playlists` table
- `playlist_clips` junction table
- RLS policies for playlist access control
- Trigger to auto-update playlist thumbnails

---

## 🔗 Navigation Updates

Added to `App.tsx`:
- `InstagramShare` screen (modal)
- `Playlists` screen
- `PlaylistDetail` screen
- `DownloadPack` screen (modal)

---

## 📝 Type Updates

Added to `src/types/index.ts`:
```typescript
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  thumbnail_url?: string;
  is_collaborative: boolean;
  collaborators?: string[];
  clip_count?: number;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface PlaylistClip {
  id: string;
  playlist_id: string;
  clip_id: string;
  added_by?: string;
  added_at: string;
  clip?: Clip;
  adder?: Profile;
}
```

---

## 🚀 Next Steps

### Integrate into existing screens:

1. **VideoDetailScreen** — Add "Share to Instagram" button
2. **VideoDetailScreen** — Add "Add to Playlist" button
3. **GroupDetailScreen** — Add "Download Pack" button
4. **EventDetailScreen** — Add "Download Pack" button
5. **ProfileScreen** — Add "Playlists" tab or button
6. **SearchScreen** — Add playlist search support

### Testing checklist:
- [ ] Create a playlist
- [ ] Make it collaborative
- [ ] Add clips to playlist
- [ ] Invite collaborator (by username)
- [ ] Share to Instagram Story
- [ ] Share to Instagram Feed
- [ ] Download a pack (group/event/playlist)
- [ ] Verify camera roll saves
- [ ] Test RLS policies (can't edit others' playlists)

---

## 📊 Analytics Events

New events tracked:
- `pack_downloaded` — When a pack download completes
  - `pack_name`
  - `clip_count`
  - `success_count`
  - `failed_count`

Existing events enhanced:
- `clip_downloaded` — Now includes pack context when applicable

---

## 🎨 UI/UX Notes

### Instagram Share
- Modal presentation (swipe to dismiss)
- Two big buttons: Story vs Feed
- Shows clip thumbnail preview
- Loading state during share

### Playlists
- Create with Alert.prompt (native iOS dialog)
- Purple accent for collaborative badge
- Long-press to remove clips
- Share link format: `handsuplive.com/playlist/{id}`

### Download Packs
- Modal with progress bar
- Shows "X / Y" clip count during download
- Can't dismiss while downloading (safety)
- Success/failure summary alert

---

*Generated: May 1, 2026 23:36 GMT+10*
