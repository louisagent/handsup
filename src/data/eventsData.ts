export interface SetTime {
  artist: string;
  stage: string;
  startTime: string; // ISO datetime string e.g. "2026-02-01T19:30:00"
  endTime: string;
  genre?: string;
}

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
  is_partner?: boolean;
  is_private?: boolean;
  invite_code?: string;
  created_by?: string;
  lat?: number;
  lng?: number;
  lineup?: SetTime[];
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
    is_partner: true,
    lat: -37.8007,
    lng: 144.9507,
    lineup: [
      // Main Stage — 2pm to 11pm
      { artist: 'Amyl and the Sniffers', stage: 'Main Stage', startTime: '2026-02-01T14:00:00', endTime: '2026-02-01T14:50:00', genre: 'Punk' },
      { artist: 'Wet Leg',               stage: 'Main Stage', startTime: '2026-02-01T15:10:00', endTime: '2026-02-01T16:00:00', genre: 'Indie Rock' },
      { artist: 'Confidence Man',         stage: 'Main Stage', startTime: '2026-02-01T16:20:00', endTime: '2026-02-01T17:15:00', genre: 'Electronic Pop' },
      { artist: 'Turnstile',             stage: 'Main Stage', startTime: '2026-02-01T17:35:00', endTime: '2026-02-01T18:35:00', genre: 'Hardcore' },
      { artist: 'Jamie xx',              stage: 'Main Stage', startTime: '2026-02-01T18:55:00', endTime: '2026-02-01T20:10:00', genre: 'Electronic' },
      { artist: 'Bonobo',                stage: 'Main Stage', startTime: '2026-02-01T20:30:00', endTime: '2026-02-01T21:45:00', genre: 'Electronic' },
      { artist: 'Mitski',                stage: 'Main Stage', startTime: '2026-02-01T22:00:00', endTime: '2026-02-01T23:00:00', genre: 'Indie' },
      // Second Stage — 1pm to 10pm
      { artist: 'Ethel Cain',            stage: 'Second Stage', startTime: '2026-02-01T13:00:00', endTime: '2026-02-01T13:50:00', genre: 'Indie Folk' },
      { artist: 'Lime Cordiale',         stage: 'Second Stage', startTime: '2026-02-01T14:10:00', endTime: '2026-02-01T15:00:00', genre: 'Indie Pop' },
      { artist: 'Alvvays',               stage: 'Second Stage', startTime: '2026-02-01T15:20:00', endTime: '2026-02-01T16:20:00', genre: 'Dream Pop' },
      { artist: 'MUNA',                  stage: 'Second Stage', startTime: '2026-02-01T16:40:00', endTime: '2026-02-01T17:40:00', genre: 'Synth Pop' },
      { artist: 'Yard Act',              stage: 'Second Stage', startTime: '2026-02-01T18:00:00', endTime: '2026-02-01T19:00:00', genre: 'Post-Punk' },
      { artist: 'Beabadoobee',           stage: 'Second Stage', startTime: '2026-02-01T19:20:00', endTime: '2026-02-01T20:30:00', genre: 'Indie Rock' },
      // Third Stage — 12pm to 9pm
      { artist: 'Totally Mild',          stage: 'Third Stage', startTime: '2026-02-01T12:00:00', endTime: '2026-02-01T12:45:00', genre: 'Indie Pop' },
      { artist: 'Royel Otis',            stage: 'Third Stage', startTime: '2026-02-01T13:05:00', endTime: '2026-02-01T14:00:00', genre: 'Indie' },
      { artist: 'Floating Points',       stage: 'Third Stage', startTime: '2026-02-01T14:20:00', endTime: '2026-02-01T15:30:00', genre: 'Electronic' },
      { artist: 'Mall Grab',             stage: 'Third Stage', startTime: '2026-02-01T15:50:00', endTime: '2026-02-01T17:00:00', genre: 'DJ / House' },
      { artist: 'Overmono',              stage: 'Third Stage', startTime: '2026-02-01T17:20:00', endTime: '2026-02-01T18:30:00', genre: 'Electronic' },
    ],
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
    lat: -28.6516,
    lng: 153.5636,
    lineup: [
      // GW McLennan Stage (Main) — 2pm to 11pm
      { artist: 'Soccer Mommy',          stage: 'GW McLennan Stage', startTime: '2025-07-25T14:00:00', endTime: '2025-07-25T14:50:00', genre: 'Indie Rock' },
      { artist: 'Wet Leg',               stage: 'GW McLennan Stage', startTime: '2025-07-25T15:10:00', endTime: '2025-07-25T16:00:00', genre: 'Indie Rock' },
      { artist: 'Tyler, the Creator',    stage: 'GW McLennan Stage', startTime: '2025-07-25T16:30:00', endTime: '2025-07-25T17:45:00', genre: 'Hip Hop' },
      { artist: 'Lorde',                 stage: 'GW McLennan Stage', startTime: '2025-07-25T18:15:00', endTime: '2025-07-25T19:30:00', genre: 'Pop' },
      { artist: 'Tame Impala',           stage: 'GW McLennan Stage', startTime: '2025-07-25T20:00:00', endTime: '2025-07-25T21:30:00', genre: 'Psychedelic Rock' },
      { artist: 'Arctic Monkeys',        stage: 'GW McLennan Stage', startTime: '2025-07-25T22:00:00', endTime: '2025-07-25T23:30:00', genre: 'Rock' },
      // Mix Up Stage — 1pm to 10pm
      { artist: 'Peggy Gou',             stage: 'Mix Up Stage', startTime: '2025-07-25T13:00:00', endTime: '2025-07-25T14:00:00', genre: 'House' },
      { artist: 'Honey Dijon',           stage: 'Mix Up Stage', startTime: '2025-07-25T14:20:00', endTime: '2025-07-25T15:30:00', genre: 'House' },
      { artist: 'Four Tet',              stage: 'Mix Up Stage', startTime: '2025-07-25T15:50:00', endTime: '2025-07-25T17:20:00', genre: 'Electronic' },
      { artist: 'Floating Points',       stage: 'Mix Up Stage', startTime: '2025-07-25T17:45:00', endTime: '2025-07-25T19:15:00', genre: 'Electronic' },
      { artist: 'Bicep (Live)',          stage: 'Mix Up Stage', startTime: '2025-07-25T19:45:00', endTime: '2025-07-25T21:00:00', genre: 'Techno' },
      // Amphitheatre — 12pm to 9pm
      { artist: 'Phoebe Bridgers',       stage: 'Amphitheatre', startTime: '2025-07-25T12:00:00', endTime: '2025-07-25T12:50:00', genre: 'Indie Folk' },
      { artist: 'Ethel Cain',            stage: 'Amphitheatre', startTime: '2025-07-25T13:10:00', endTime: '2025-07-25T14:00:00', genre: 'Alt Country' },
      { artist: 'Mitski',                stage: 'Amphitheatre', startTime: '2025-07-25T14:20:00', endTime: '2025-07-25T15:20:00', genre: 'Indie Rock' },
      { artist: 'Japanese Breakfast',    stage: 'Amphitheatre', startTime: '2025-07-25T15:45:00', endTime: '2025-07-25T16:45:00', genre: 'Indie Pop' },
      { artist: 'Alvvays',               stage: 'Amphitheatre', startTime: '2025-07-25T17:10:00', endTime: '2025-07-25T18:15:00', genre: 'Dream Pop' },
    ],
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
    lat: 51.1536,
    lng: -2.6406,
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
    is_partner: true,
    lat: 33.6796,
    lng: -116.2376,
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
    lat: -33.8688,
    lng: 151.2093,
    lineup: [
      // Main Stage — 2pm to 11pm
      { artist: 'Peggy Gou',             stage: 'Main Stage', startTime: '2026-01-01T14:00:00', endTime: '2026-01-01T15:30:00', genre: 'House' },
      { artist: 'Honey Dijon',           stage: 'Main Stage', startTime: '2026-01-01T16:00:00', endTime: '2026-01-01T17:30:00', genre: 'House' },
      { artist: 'Four Tet',              stage: 'Main Stage', startTime: '2026-01-01T18:00:00', endTime: '2026-01-01T20:00:00', genre: 'Electronic' },
      { artist: 'Bicep (Live)',          stage: 'Main Stage', startTime: '2026-01-01T20:30:00', endTime: '2026-01-01T22:00:00', genre: 'Techno' },
      { artist: 'Caribou',               stage: 'Main Stage', startTime: '2026-01-01T22:30:00', endTime: '2026-01-01T23:59:00', genre: 'Psychedelic Electronic' },
      // Second Stage — 1pm to 10pm
      { artist: 'Mall Grab',             stage: 'Second Stage', startTime: '2026-01-01T13:00:00', endTime: '2026-01-01T14:30:00', genre: 'House / Techno' },
      { artist: 'Jayda G',               stage: 'Second Stage', startTime: '2026-01-01T15:00:00', endTime: '2026-01-01T16:30:00', genre: 'House' },
      { artist: 'Overmono',              stage: 'Second Stage', startTime: '2026-01-01T17:00:00', endTime: '2026-01-01T18:30:00', genre: 'Electronic' },
      { artist: 'Call Super',            stage: 'Second Stage', startTime: '2026-01-01T19:00:00', endTime: '2026-01-01T20:30:00', genre: 'Techno' },
      { artist: 'DJ Boring',             stage: 'Second Stage', startTime: '2026-01-01T21:00:00', endTime: '2026-01-01T22:30:00', genre: 'House' },
      // Garden Stage — 12pm to 9pm
      { artist: 'Totally Enormous Extinct Dinosaurs', stage: 'Garden Stage', startTime: '2026-01-01T12:00:00', endTime: '2026-01-01T13:30:00', genre: 'Electronic' },
      { artist: 'Bonobo (DJ Set)',       stage: 'Garden Stage', startTime: '2026-01-01T14:00:00', endTime: '2026-01-01T15:30:00', genre: 'Electronic' },
      { artist: 'Floating Points',       stage: 'Garden Stage', startTime: '2026-01-01T16:00:00', endTime: '2026-01-01T17:30:00', genre: 'Electronic' },
      { artist: 'Âme',                   stage: 'Garden Stage', startTime: '2026-01-01T18:00:00', endTime: '2026-01-01T19:30:00', genre: 'Deep House' },
    ],
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
    lat: -37.8391,
    lng: 143.9784,
  },
  {
    id: 'e7',
    name: 'Spilt Milk Festival',
    location: 'Brisbane',
    country: 'Australia',
    dates: 'Nov 2025',
    description: 'Queensland\'s biggest music party. Massive lineup, massive vibes.',
    genre: ['Electronic', 'Pop', 'Hip Hop', 'R&B'],
    clipCount: 76,
    attendees: '18,000',
    image: 'https://picsum.photos/seed/splitmilk/600/300',
    upcoming: false,
    lat: -27.4705,
    lng: 153.0260,
  },
  {
    id: 'e8',
    name: 'Wildlands Festival',
    location: 'Adelaide',
    country: 'Australia',
    dates: 'Jan 2026',
    description: 'South Australia\'s favourite summer music event.',
    genre: ['Electronic', 'Hip Hop', 'Dance'],
    clipCount: 54,
    attendees: '12,000',
    image: 'https://picsum.photos/seed/wildlands/600/300',
    upcoming: true,
    lat: -34.9285,
    lng: 138.6007,
  },
  {
    id: 'e9',
    name: 'Southbound Festival',
    location: 'Perth',
    country: 'Australia',
    dates: 'Jan 2026',
    description: 'West Coast summer festival. Three days under the stars in WA.',
    genre: ['Rock', 'Electronic', 'Indie'],
    clipCount: 43,
    attendees: '8,000',
    image: 'https://picsum.photos/seed/southbound/600/300',
    upcoming: true,
    lat: -31.9505,
    lng: 115.8605,
  },

  // ── Private events (mock data for testing the private events feature) ──────

  {
    id: 'e10',
    name: 'Secret Garden Sessions',
    location: 'Fitzroy, Melbourne',
    country: 'Australia',
    dates: 'Mar 2026',
    description: 'A very small, invite-only gathering in a Fitzroy warehouse. 200 people max. Strictly private.',
    genre: ['Electronic', 'Experimental'],
    clipCount: 14,
    attendees: '200',
    image: 'https://picsum.photos/seed/secretgarden/600/300',
    upcoming: true,
    is_private: true,
    invite_code: 'XK93PQ',
    // created_by: 'mock-user-id' — set to your test user's ID to see the invite code banner
    lat: -37.7991,
    lng: 144.9784,
  },
  {
    id: 'e11',
    name: 'Rooftop After-Dark',
    location: 'Surry Hills, Sydney',
    country: 'Australia',
    dates: 'Apr 2026',
    description: 'Rooftop DJ sets, friends only. Not listed publicly. Use the code to get in.',
    genre: ['House', 'Techno'],
    clipCount: 6,
    attendees: '80',
    image: 'https://picsum.photos/seed/rooftop/600/300',
    upcoming: true,
    is_private: true,
    invite_code: 'RT7ZBM',
    lat: -33.8855,
    lng: 151.2094,
  },
];
