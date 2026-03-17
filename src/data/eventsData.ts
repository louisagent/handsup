export interface FestivalEvent {
  id: string;
  name: string;
  location: string;
  country: string;
  dates: string;
  description: string;
  genre: string[];
  clipCount: number;
  attendees: string;
  image: string;
  upcoming: boolean;
}

export const festivals: FestivalEvent[] = [
  {
    id: 'e1',
    name: 'Laneway Festival',
    location: 'Melbourne',
    country: 'Australia',
    dates: 'Feb 2026',
    description: 'Australia\'s favourite boutique touring festival. Independent, intimate, iconic.',
    genre: ['Indie', 'Electronic', 'Alternative'],
    clipCount: 142,
    attendees: '15,000',
    image: 'https://picsum.photos/seed/laneway/600/300',
    upcoming: true,
  },
  {
    id: 'e2',
    name: 'Splendour in the Grass',
    location: 'Byron Bay',
    country: 'Australia',
    dates: 'Jul 2025',
    description: 'Three days of music, art and culture in the Northern Rivers of NSW.',
    genre: ['Rock', 'Electronic', 'Hip Hop'],
    clipCount: 389,
    attendees: '30,000',
    image: 'https://picsum.photos/seed/splendour/600/300',
    upcoming: false,
  },
  {
    id: 'e3',
    name: 'Glastonbury',
    location: 'Somerset',
    country: 'UK',
    dates: 'Jun 2025',
    description: 'The world\'s most famous music and performing arts festival.',
    genre: ['All genres'],
    clipCount: 2140,
    attendees: '200,000',
    image: 'https://picsum.photos/seed/glastonbury/600/300',
    upcoming: false,
  },
  {
    id: 'e4',
    name: 'Coachella',
    location: 'Indio, California',
    country: 'USA',
    dates: 'Apr 2026',
    description: 'The desert festival that defines music culture for a generation.',
    genre: ['Electronic', 'Rock', 'Hip Hop', 'Latin'],
    clipCount: 4801,
    attendees: '125,000',
    image: 'https://picsum.photos/seed/coachella/600/300',
    upcoming: true,
  },
  {
    id: 'e5',
    name: 'Field Day',
    location: 'Sydney',
    country: 'Australia',
    dates: 'Jan 2026',
    description: 'Sydney\'s premier electronic music festival. New Years Day tradition.',
    genre: ['Electronic', 'Dance'],
    clipCount: 217,
    attendees: '20,000',
    image: 'https://picsum.photos/seed/fieldday/600/300',
    upcoming: true,
  },
  {
    id: 'e6',
    name: 'Meredith Music Festival',
    location: 'Meredith, Victoria',
    country: 'Australia',
    dates: 'Dec 2025',
    description: 'No dickheads policy enforced. Three days in a paddock. Pure magic.',
    genre: ['Eclectic', 'Alternative', 'Electronic'],
    clipCount: 98,
    attendees: '10,000',
    image: 'https://picsum.photos/seed/meredith/600/300',
    upcoming: false,
  },
];
