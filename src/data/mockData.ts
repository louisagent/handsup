export interface VideoClip {
  id: string;
  artist: string;
  festival: string;
  location: string;
  date: string;
  description: string;
  uploader: string;
  views: number;
  downloads: number;
  duration: string;
  thumbnail: string;
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
    downloads: 841,
    duration: '3:42',
    thumbnail: 'https://picsum.photos/seed/tame/400/225',
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
    downloads: 1204,
    duration: '2:58',
    thumbnail: 'https://picsum.photos/seed/flume/400/225',
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
    downloads: 2300,
    duration: '4:15',
    thumbnail: 'https://picsum.photos/seed/fred/400/225',
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
    downloads: 3100,
    duration: '3:30',
    thumbnail: 'https://picsum.photos/seed/disclosure/400/225',
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
    downloads: 1800,
    duration: '2:45',
    thumbnail: 'https://picsum.photos/seed/caribou/400/225',
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
    downloads: 590,
    duration: '5:01',
    thumbnail: 'https://picsum.photos/seed/fourtet/400/225',
  },
];
