import type { RoutingPreset } from '../../types/map.ts';

/**
 * Curated Chandigarh landmarks for quick route testing across sectors.
 * Each preset represents a real facility or urban node present in the OSM datasets.
 */
export const ROUTING_PRESETS: RoutingPreset[] = [
  {
    id: 'sec17-plaza',
    name: 'Sector 17 City Center Plaza',
    sector: 'Sector 17',
    coordinates: [76.7862, 30.7385],
    profileAffinity: 'wheelchair',
    description: 'Central pedestrian shopping concourse and civic hub.',
  },
  {
    id: 'gmsh-sec16',
    name: 'GMSH Hospital & Trauma (Sec 16)',
    sector: 'Sector 16',
    coordinates: [76.7831, 30.7482],
    profileAffinity: 'night',
    description: 'Government Multi-Specialty Hospital with 24/7 emergency service.',
  },
  {
    id: 'rose-garden',
    name: 'Zakir Hussain Rose Garden',
    sector: 'Sector 16',
    coordinates: [76.7905, 30.7475],
    profileAffinity: 'wheelchair',
    description: 'Mapped pedestrian walkways & verified limited-access wheelchair entrance.',
  },
  {
    id: 'pgimer-pediatric',
    name: 'PGIMER Pediatric Center (Sec 12)',
    sector: 'Sector 12',
    coordinates: [76.7766, 30.7634],
    profileAffinity: 'wheelchair',
    description: 'Advanced Pediatric Center with verified explicit wheelchair:yes tag.',
  },
  {
    id: 'sukhna-lake',
    name: 'Sukhna Lake Promenade',
    sector: 'Sector 1',
    coordinates: [76.8125, 30.7428],
    profileAffinity: 'bicycle',
    description: 'Northern recreational reservoir with adjacent cycle and walking tracks.',
  },
  {
    id: 'leisure-valley',
    name: 'Sector 10 Leisure Valley',
    sector: 'Sector 10',
    coordinates: [76.7915, 30.7552],
    profileAffinity: 'bicycle',
    description: 'Linear green corridor with dedicated cycling and pedestrian paths.',
  },
  {
    id: 'sec35-market',
    name: 'Sector 35 Commercial Hub',
    sector: 'Sector 35',
    coordinates: [76.7645, 30.7225],
    profileAffinity: 'bicycle',
    description: 'Bustling South-West commercial corridor with connected cycle track corridors.',
  },
  {
    id: 'police-sec17',
    name: 'Sector 17 Central Police Station',
    sector: 'Sector 17',
    coordinates: [76.7845, 30.7412],
    profileAffinity: 'night',
    description: 'Central city law enforcement post on Jan Marg corridor.',
  },
  {
    id: 'nik-bakers-24h',
    name: "Nik Baker's (Verified 24/7)",
    sector: 'Sector 9',
    coordinates: [76.7938, 30.7472],
    profileAffinity: 'night',
    description: 'Explicitly verified opening_hours: 24/7 bakery on Madhya Marg.',
  },
];
