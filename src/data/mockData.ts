export interface VideoClip {
  id: string;
  artist: string;
  festival: string;
  location: string;
  date: string;
  description: string;
  uploader: string;
  views: number;          // total views (including partial)
  full_views: number;     // full video completions
  downloads: number;
  likes: number;
  comments: Comment[];
  duration: string;
  thumbnail: string;
  created_at: string; // ISO timestamp for heat score
}

export interface Comment {
  id: string;
  username: string;
  avatar: string;       // emoji
  text: string;
  created_at: string;
  likes: number;
}

export const mockVideos: VideoClip[] = [
  {
    id: '1',
    artist: 'Tame Impala',
    festival: 'Laneway Festival',
    location: 'Melbourne',
    date: '2025-02-01',
    description: 'Incredible opener with the full light show. Lost My Mind into Let It Happen 🔥',
    uploader: 'jess_m',
    views: 3200,
    full_views: 1800,
    downloads: 841,
    likes: 412,
    comments: [
      { id: 'c1', username: 'wave_rider', avatar: '🌊', text: 'The light show sync was insane at this point 🔥', created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), likes: 24 },
      { id: 'c2', username: 'tom_d', avatar: '🎸', text: 'I was right at the front, this doesn\'t do it justice 😭', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), likes: 18 },
      { id: 'c3', username: 'neon_nights', avatar: '🌃', text: 'This is the clip I was looking for!! Thank you 🙏', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), likes: 9 },
    ],
    duration: '3:42',
    thumbnail: 'https://picsum.photos/seed/tame/400/225',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    artist: 'Flume',
    festival: 'Splendour in the Grass',
    location: 'Byron Bay',
    date: '2025-07-26',
    description: 'Main stage closing set. The drop at 2:10 was absolutely unreal.',
    uploader: 'wave_rider',
    views: 5100,
    full_views: 2900,
    downloads: 1204,
    likes: 630,
    comments: [
      { id: 'c4', username: 'jess_m', avatar: '💜', text: 'I\'ve watched this 10 times already', created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), likes: 41 },
      { id: 'c5', username: 'desert_vibes', avatar: '🌵', text: 'That crowd energy at 2:10 😤', created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), likes: 28 },
    ],
    duration: '2:58',
    thumbnail: 'https://picsum.photos/seed/flume/400/225',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    artist: 'Fred again..',
    festival: 'Field Day',
    location: 'Sydney',
    date: '2025-01-01',
    description: 'New Years midnight set. When he played Danielle I cried honestly.',
    uploader: 'tom_d',
    views: 8900,
    full_views: 5600,
    downloads: 2300,
    likes: 1140,
    comments: [
      { id: 'c6', username: 'meredith_fan', avatar: '🌅', text: 'The Danielle moment hit different at midnight 😭', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), likes: 87 },
      { id: 'c7', username: 'pit_life', avatar: '🎤', text: 'Best New Year I\'ve ever had', created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), likes: 63 },
      { id: 'c8', username: 'uk_crew', avatar: '🇬🇧', text: 'Flew over from London for this. Worth every cent.', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), likes: 52 },
      { id: 'c9', username: 'wave_rider', avatar: '🌊', text: 'The crowd singing along 🥺', created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(), likes: 38 },
    ],
    duration: '4:15',
    thumbnail: 'https://picsum.photos/seed/fred/400/225',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    artist: 'Disclosure',
    festival: 'Glastonbury',
    location: 'London',
    date: '2025-06-28',
    description: 'Late night tent vibes. White Noise encore had everyone losing it.',
    uploader: 'uk_crew',
    views: 12400,
    full_views: 7200,
    downloads: 3100,
    likes: 1870,
    comments: [
      { id: 'c10', username: 'tom_d', avatar: '🎸', text: 'The tent was absolutely packed', created_at: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(), likes: 44 },
      { id: 'c11', username: 'neon_nights', avatar: '🌃', text: 'White Noise at 2am in that tent is religious', created_at: new Date(Date.now() - 17 * 60 * 60 * 1000).toISOString(), likes: 31 },
    ],
    duration: '3:30',
    thumbnail: 'https://picsum.photos/seed/disclosure/400/225',
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    artist: 'Caribou',
    festival: 'Coachella',
    location: 'Los Angeles',
    date: '2025-04-12',
    description: 'Desert sunset set. Sun playing during golden hour — can\'t make this up.',
    uploader: 'desert_vibes',
    views: 6700,
    full_views: 3900,
    downloads: 1800,
    likes: 920,
    comments: [
      { id: 'c12', username: 'jess_m', avatar: '💜', text: 'The golden hour light in this is unreal', created_at: new Date(Date.now() - 34 * 60 * 60 * 1000).toISOString(), likes: 56 },
    ],
    duration: '2:45',
    thumbnail: 'https://picsum.photos/seed/caribou/400/225',
    created_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    artist: 'Four Tet',
    festival: 'Meredith Music Festival',
    location: 'Meredith',
    date: '2025-12-07',
    description: 'Sunrise set Saturday morning. Pure magic from start to finish.',
    uploader: 'meredith_fan',
    views: 2200,
    full_views: 1600,
    downloads: 590,
    likes: 310,
    comments: [
      { id: 'c13', username: 'pit_life', avatar: '🎤', text: 'Nothing beats a Meredith sunrise', created_at: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(), likes: 19 },
      { id: 'c14', username: 'desert_vibes', avatar: '🌵', text: 'I was there!! Can\'t believe someone caught this', created_at: new Date(Date.now() - 71 * 60 * 60 * 1000).toISOString(), likes: 14 },
    ],
    duration: '5:01',
    thumbnail: 'https://picsum.photos/seed/fourtet/400/225',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];
