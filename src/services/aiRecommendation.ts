import type { UserProfile } from '../types/map.ts';

export type RecommendationProfile = UserProfile | 'tourist';

export interface MappedFeatureHighlight {
  icon: string;
  label: string;
  detail: string;
  type: 'positive' | 'warning' | 'info';
}

export interface AIRecommendation {
  profile: RecommendationProfile;
  destinationName: string;
  sector: string;
  badge: string;
  badgeColor: string;
  headline: string;
  verdict: 'suitable' | 'caution' | 'recommended' | 'advisory';
  recommendationText: string;
  mappedFeatures: MappedFeatureHighlight[];
  limitationsDisclaimer: string;
  networkSummary: string;
}

export interface RecommendationDestination {
  id: string;
  name: string;
  sector: string;
  coordinates: [number, number];
  popularFor: string;
}

export const POPULAR_RECOMMENDATION_DESTINATIONS: RecommendationDestination[] = [
  {
    id: 'sec17-plaza',
    name: 'Sector 17 City Center Plaza',
    sector: 'Sector 17',
    coordinates: [76.7862, 30.7385],
    popularFor: 'Civic plaza, pedestrian concourses, shopping hub',
  },
  {
    id: 'rose-garden',
    name: 'Zakir Hussain Rose Garden',
    sector: 'Sector 16',
    coordinates: [76.7905, 30.7475],
    popularFor: 'Botanical garden, walking trails, limited-access ramp entrance',
  },
  {
    id: 'gmsh-hospital',
    name: 'GMSH Hospital & Trauma Center',
    sector: 'Sector 16',
    coordinates: [76.7831, 30.7482],
    popularFor: '24/7 emergency medical trauma facility, Madhya Marg access',
  },
  {
    id: 'sukhna-lake',
    name: 'Sukhna Lake Promenade',
    sector: 'Sector 1',
    coordinates: [76.8125, 30.7428],
    popularFor: 'Scenic lakeside path, Uttar Marg cycle track, bird sanctuary',
  },
  {
    id: 'capitol-complex',
    name: 'Capitol Complex & Open Hand',
    sector: 'Sector 1',
    coordinates: [76.805, 30.758],
    popularFor: 'UNESCO World Heritage modernist site, Le Corbusier architecture',
  },
  {
    id: 'leisure-valley',
    name: 'Sector 10 Leisure Valley & Museum',
    sector: 'Sector 10',
    coordinates: [76.7915, 30.7552],
    popularFor: 'Linear parkland, Government Museum & Art Gallery, cycleway',
  },
  {
    id: 'pgimer-pediatric',
    name: 'PGIMER Pediatric Center',
    sector: 'Sector 12',
    coordinates: [76.7766, 30.7634],
    popularFor: 'Verified wheelchair-accessible entrance (wheelchair:yes in OSM)',
  },
  {
    id: 'sec35-market',
    name: 'Sector 35 Commercial Hub',
    sector: 'Sector 35',
    coordinates: [76.7645, 30.7225],
    popularFor: 'Culinary dining, V3/V4 corridor cycle tracks, active market',
  },
  {
    id: 'nik-bakers-24h',
    name: "Nik Baker's (Verified 24/7)",
    sector: 'Sector 9',
    coordinates: [76.7938, 30.7472],
    popularFor: 'Verified 24/7 convenience & bakery, lit Madhya Marg corridor',
  },
  {
    id: 'police-sec17',
    name: 'Sector 17 Central Police Station',
    sector: 'Sector 17',
    coordinates: [76.7845, 30.7412],
    popularFor: 'Civic law enforcement station, illuminated Jan Marg link',
  },
];

/**
 * Hardcoded contextual recommendation knowledge base mapped by profile and sector/destination.
 */
const RECOMMENDATION_MATRIX: Record<
  RecommendationProfile,
  Record<
    string,
    {
      headline: string;
      verdict: 'suitable' | 'caution' | 'recommended' | 'advisory';
      recommendationText: string;
      features: MappedFeatureHighlight[];
      disclaimer: string;
    }
  >
> = {
  // -------------------------------------------------------------------------
  // WHEELCHAIR PROFILE
  // -------------------------------------------------------------------------
  wheelchair: {
    'Sector 17': {
      headline: 'Suitable pedestrian concourse; curb transitions unrecorded',
      verdict: 'suitable',
      recommendationText:
        'Your wheelchair trip to Sector 17 Plaza benefits from vehicle-free central pedestrian avenues with 745 footways mapped in the city network. The internal shopping plazas are wide and level; however, transition ramps at surrounding parking lots and Jan Marg curbs are unrecorded in OpenStreetMap. 30 stair barriers exist in the wider city dataset, but primary plazas remain step-free.',
      features: [
        {
          icon: '🚶',
          label: 'Pedestrian Concourse',
          detail: '745 mapped walkways across the city; wide vehicle-free central grid in Sector 17',
          type: 'positive',
        },
        {
          icon: '⚠️',
          label: 'Curb Cuts & Ramps',
          detail: '0 kerb/ramp tags recorded at parking boundaries; manual curb assistance may be required',
          type: 'warning',
        },
        {
          icon: '🚫',
          label: 'Stairs Avoidance',
          detail: 'Underground pedestrian subways carry stairs; surface crossings recommended',
          type: 'info',
        },
      ],
      disclaimer:
        'Curb ramp tags are unrecorded in OpenStreetMap for Chandigarh. Unknown accessibility is unrated, not guaranteed barrier-free.',
    },
    'Sector 16': {
      headline: 'Mapped limited wheelchair access at Rose Garden perimeter',
      verdict: 'caution',
      recommendationText:
        'Visiting Sector 16 by wheelchair accesses the Zakir Hussain Rose Garden, which has an explicit verified wheelchair:limited entrance tag in OSM. Perimeter asphalt paths are mapped and navigable, but internal lawn walkways lack verified surface smoothness. If heading toward GMSH Hospital nearby, access the main entrance ramp from Madhya Marg.',
      features: [
        {
          icon: '♿',
          label: 'Verified OSM Tag',
          detail: 'wheelchair:limited explicitly mapped at Zakir Hussain Rose Garden entrance',
          type: 'positive',
        },
        {
          icon: '🌱',
          label: 'Surface Conditions',
          detail: 'Paved perimeter walkway is flat; unpaved lawn links are unsuitable for manual wheelchairs',
          type: 'warning',
        },
        {
          icon: '🏥',
          label: 'Medical Access',
          detail: 'GMSH Sector 16 features wide ground-floor access corridors',
          type: 'info',
        },
      ],
      disclaimer:
        'Limited accessibility indicates some physical obstacles or slope constraints exist at secondary entrances.',
    },
    'Sector 12': {
      headline: 'Verified accessible entrance at PGIMER Advanced Pediatric Center',
      verdict: 'recommended',
      recommendationText:
        'Your wheelchair destination to Sector 12 reaches the Advanced Pediatric Center at PGIMER—one of only 3 facilities in Chandigarh with an explicit wheelchair:yes tag in OpenStreetMap. Direct ramp access and wide automated doors are mapped. Bounded footways along Madhya Marg are connected to the facility entrance.',
      features: [
        {
          icon: '♿',
          label: 'wheelchair:yes Verified',
          detail: 'Explicitly verified accessible entrance at PGIMER Pediatric Center',
          type: 'positive',
        },
        {
          icon: '🏥',
          label: 'Medical Ramp Access',
          detail: 'Designated hospital drop-off ramps and level thresholds present',
          type: 'positive',
        },
        {
          icon: '⚠️',
          label: 'Internal Walkways',
          detail: 'Older hospital wings have unmapped curb heights; use primary clinical pavilion',
          type: 'info',
        },
      ],
      disclaimer:
        'Surrounding campus access routes outside the clinical pavilion contain unrated sidewalk transitions.',
    },
    'Sector 1': {
      headline: 'Scenic promenade with level paving; long transit distance',
      verdict: 'suitable',
      recommendationText:
        'Sukhna Lake Promenade in Sector 1 offers a broad, level paved walking track with smooth flagstone paving along the reservoir. Footways are free of vehicular traffic; however, the pedestrian link from the parking lot features a mild gradient. The Capitol Complex to the west contains extensive open plazas, but security barriers and long distances between pavilions require planning.',
      features: [
        {
          icon: '🌊',
          label: 'Lakeside Flat Paving',
          detail: 'Smooth, wide pedestrian promenade with no stairs along the main shoreline track',
          type: 'positive',
        },
        {
          icon: '📐',
          label: 'Approach Slope',
          detail: 'Mild incline from south parking lot to promenade crest',
          type: 'info',
        },
        {
          icon: '⚠️',
          label: 'Rock Garden Notice',
          detail: 'Neighboring Rock Garden contains narrow passages and step barriers; unsuited for wheelchairs',
          type: 'warning',
        },
      ],
      disclaimer:
        'Tactile paving and dedicated accessibility shuttle data are absent from the open municipal dataset.',
    },
  },

  // -------------------------------------------------------------------------
  // BICYCLE PROFILE
  // -------------------------------------------------------------------------
  bicycle: {
    'Sector 17': {
      headline: 'Suitable cycling destination via mapped corridor tracks & parking',
      verdict: 'suitable',
      recommendationText:
        'Your cycling trip to Sector 17 looks suitable based on the mapped bicycle infrastructure nearby. The sector is bordered by Jan Marg and Himalaya Marg, which carry dedicated roadside cycle tracks (part of 784 mapped corridor cycle tracks). Verified bicycle parking stands are recorded near the central plaza. Routing favors these segregated corridors over mixed motorways.',
      features: [
        {
          icon: '🚲',
          label: 'Corridor Cycle Tracks',
          detail: 'Segregated cycle tracks mapped on Jan Marg and Himalaya Marg flanks',
          type: 'positive',
        },
        {
          icon: '🅿️',
          label: 'Bicycle Parking',
          detail: 'Verified bicycle stands mapped near Sector 17 commercial blocks',
          type: 'positive',
        },
        {
          icon: '⚠️',
          label: 'Plaza Restriction',
          detail: 'Bicycles must be dismounted inside the pedestrian-only inner plaza zone',
          type: 'info',
        },
      ],
      disclaimer:
        'Observe one-way cycleway flow along Jan Marg; road-side tracks follow strict directional flow in OSM.',
    },
    'Sector 10': {
      headline: 'Optimal cycling corridor connecting Leisure Valley dedicated paths',
      verdict: 'recommended',
      recommendationText:
        'Your cycling trip to Sector 10 is highly recommended. The sector is home to Leisure Valley, which features dedicated off-street cycleways (part of 12 verified dedicated paths in Chandigarh) running north-south through uninterrupted greenery. Jan Marg provides segregated cycle tracks along the eastern edge with safe buffer zones.',
      features: [
        {
          icon: '🌳',
          label: 'Dedicated Cycleway',
          detail: '12 dedicated cycleways in Chandigarh; Leisure Valley trail is fully off-street',
          type: 'positive',
        },
        {
          icon: '🚲',
          label: 'Corridor Tracks',
          detail: 'Jan Marg corridor cycle tracks provide wide, segregated lanes',
          type: 'positive',
        },
        {
          icon: '🏛️',
          label: 'Museum Access',
          detail: 'Direct cycling approach to Government Museum with low traffic exposure',
          type: 'positive',
        },
      ],
      disclaimer:
        'Nighttime lighting is sparse inside Leisure Valley greenways; carry front and rear bicycle lights.',
    },
    'Sector 1': {
      headline: 'Scenic cycling route via Uttar Marg segregated cycle tracks',
      verdict: 'suitable',
      recommendationText:
        'Cycling toward Sukhna Lake in Sector 1 connects via Uttar Marg and Vigyan Path. Roadside cycle tracks provide segregation from high-speed vehicular traffic heading toward the foothills. Dedicated cycling is permitted on the approach avenue, though bikes are not allowed on the pedestrian-only lake promenade.',
      features: [
        {
          icon: '🛣️',
          label: 'Uttar Marg Cycleway',
          detail: 'Mapped segregated corridor tracks flanking Uttar Marg avenue',
          type: 'positive',
        },
        {
          icon: '🚫',
          label: 'Promenade Restriction',
          detail: 'Bicycles prohibited on the waterside promenade itself; lock at designated lots',
          type: 'warning',
        },
        {
          icon: '🅿️',
          label: 'Parking Availability',
          detail: 'Lockers/stands available at the entrance plaza parking lot',
          type: 'info',
        },
      ],
      disclaimer:
        'Weekend congestion near the lake entrance can cause vehicle spillover onto roadside cycle tracks.',
    },
    'Sector 35': {
      headline: 'Accessible via Dakshin Marg & Jan Marg cycle corridors',
      verdict: 'suitable',
      recommendationText:
        'Cycling to Sector 35 utilizes V3 arterial cycle tracks along Dakshin Marg and Jan Marg. 784 corridor cycle tracks are mapped in the network, allowing the routing engine to avoid high-stress mixed traffic lanes. Local V4 commercial bazaar streets have low vehicle speeds suitable for shared cycling.',
      features: [
        {
          icon: '🚲',
          label: 'V3 Corridor Tracks',
          detail: 'Dakshin Marg and Jan Marg cycle tracks provide arterial connectivity',
          type: 'positive',
        },
        {
          icon: '🛍️',
          label: 'V4 Bazaar Calm Traffic',
          detail: 'Sector 35 inner market street has 20-30 km/h traffic suitable for cyclists',
          type: 'positive',
        },
        {
          icon: '🅿️',
          label: 'Parking Notice',
          detail: 'Bicycle parking stands are informal in Sector 35 market; lock to sturdy fixtures',
          type: 'info',
        },
      ],
      disclaimer:
        'Watch for vehicle turning maneuvers across roadside cycle tracks at sector roundabouts.',
    },
  },

  // -------------------------------------------------------------------------
  // NIGHT PROFILE
  // -------------------------------------------------------------------------
  night: {
    'Sector 17': {
      headline: 'Central corridor near police station and lit arterial avenues',
      verdict: 'advisory',
      recommendationText:
        'Your nighttime travel to Sector 17 passes near the Sector 17 Central Police Station and connects through corridors with verified street lighting (part of 126 lit segments mapped in OSM). While commercial activity winds down after 22:00, Jan Marg is an active municipal transit spine. Proximity to police facilities and lighting does not guarantee personal safety; stay along primary illuminated avenues.',
      features: [
        {
          icon: '👮',
          label: 'Police Presence',
          detail: 'Sector 17 Central Police Station located on Jan Marg corridor (1 of 8 police stations)',
          type: 'positive',
        },
        {
          icon: '💡',
          label: 'Street Lighting',
          detail: 'Jan Marg and Madhya Marg carry explicit lit=yes tags in OSM network',
          type: 'positive',
        },
        {
          icon: '⚠️',
          label: 'Safety Disclaimer',
          detail: 'Commercial arcades are quiet late at night; keep to illuminated main roads',
          type: 'warning',
        },
      ],
      disclaimer:
        'Proximity to police stations and mapped lighting is an urban feature proxy, not a guarantee of safety.',
    },
    'Sector 16': {
      headline: 'High service proximity near GMSH 24/7 Trauma Emergency',
      verdict: 'advisory',
      recommendationText:
        'Traveling to Sector 16 at night places you in immediate proximity to Government Multi-Specialty Hospital (GMSH), which operates a verified 24/7 trauma emergency department (1 of only 4 verified emergency:yes facilities in Chandigarh). Madhya Marg is well-illuminated and sees continuous emergency vehicle circulation. Note: medical facility presence does not prove personal route safety.',
      features: [
        {
          icon: '🏥',
          label: '24/7 Emergency Hospital',
          detail: 'GMSH Sector 16 emergency:yes tag mapped; round-the-clock ambulance access',
          type: 'positive',
        },
        {
          icon: '💡',
          label: 'Lit Madhya Marg',
          detail: 'Multi-lane illuminated arterial road with continuous night visibility',
          type: 'positive',
        },
        {
          icon: '🌳',
          label: 'Garden Notice',
          detail: 'Rose Garden park interior is unlit and closed after sunset; do not enter',
          type: 'warning',
        },
      ],
      disclaimer:
        'Hospital proximity indicates municipal activity and emergency services, not personal security.',
    },
    'Sector 9': {
      headline: 'Near verified 24/7 convenience and illuminated Madhya Marg',
      verdict: 'advisory',
      recommendationText:
        'Your night trip toward Sector 9 is located near Nik Baker’s—one of only 3 explicitly verified opening_hours: 24/7 establishments in Chandigarh OSM. Madhya Marg provides continuous lighting and late-night activity. Avoid unlit inner residential lanes (V5/V6 streets) when navigating on foot during late hours.',
      features: [
        {
          icon: '🏪',
          label: 'Verified 24/7 Store',
          detail: "Nik Baker's on Madhya Marg verified opening_hours: 24/7 in dataset",
          type: 'positive',
        },
        {
          icon: '💡',
          label: 'Arterial Lighting',
          detail: 'Madhya Marg segment mapped with lit=yes street infrastructure',
          type: 'positive',
        },
        {
          icon: '⚠️',
          label: 'Inner Sector Caution',
          detail: 'Residential streets lack explicit lighting tags; prefer perimeter avenues',
          type: 'warning',
        },
      ],
      disclaimer:
        'Never assume a route is safe purely due to nearby 24-hour retail or streetlights.',
    },
    'Sector 12': {
      headline: 'Continuous medical transit activity near PGIMER Medical Institute',
      verdict: 'advisory',
      recommendationText:
        'Sector 12 at night experiences constant emergency ambulance and medical staff transit due to the PGIMER institute campus. Madhya Marg leading to the campus is well-illuminated. Internal hospital ring roads are active throughout the night, though pedestrians should watch for ambulance traffic at campus gates.',
      features: [
        {
          icon: '🏥',
          label: 'Emergency Trauma Hub',
          detail: 'PGIMER advanced trauma center operates 24 hours daily',
          type: 'positive',
        },
        {
          icon: '💡',
          label: 'Transit Spine',
          detail: 'Madhya Marg arterial route active and illuminated with street lighting',
          type: 'positive',
        },
        {
          icon: '⚠️',
          label: 'Traffic Warning',
          detail: 'Frequent emergency vehicle transit near Sector 11/12 roundabout',
          type: 'info',
        },
      ],
      disclaimer:
        'Hospital corridors maintain public activity, but personal safety depends on standard precautions.',
    },
  },

  // -------------------------------------------------------------------------
  // TOURIST PROFILE
  // -------------------------------------------------------------------------
  tourist: {
    'Sector 1': {
      headline: 'Chandigarh’s premier UNESCO architectural & natural landmarks',
      verdict: 'recommended',
      recommendationText:
        'A visit to Sector 1 showcases the crown jewel of Chandigarh’s Le Corbusier heritage. The UNESCO World Heritage Capitol Complex features the iconic Open Hand Monument, the Secretariat, the Legislative Assembly, and the High Court. Immediately to the east lies the scenic Sukhna Lake Promenade and nearby Nek Chand Rock Garden, offering an extraordinary blend of modernist civic planning and folk sculpture.',
      features: [
        {
          icon: '🏛️',
          label: 'UNESCO Capitol Complex',
          detail: 'Le Corbusier modernist monuments: Open Hand, Palace of Assembly, High Court',
          type: 'positive',
        },
        {
          icon: '🌊',
          label: 'Sukhna Lake Promenade',
          detail: '3 km paved promenade, boating club, and sunset views over Shivalik foothills',
          type: 'positive',
        },
        {
          icon: '🗿',
          label: 'Rock Garden',
          detail: 'Renowned 40-acre sculpture garden crafted from recycled urban industrial waste',
          type: 'positive',
        },
      ],
      disclaimer:
        'Capitol Complex visits require prior online e-visitor permits through Chandigarh Tourism.',
    },
    'Sector 16': {
      headline: 'Asia’s largest botanical rose sanctuary and serene greenway',
      verdict: 'recommended',
      recommendationText:
        'Zakir Hussain Rose Garden in Sector 16 is Asia’s largest botanical rose sanctuary, spanning 30 acres with over 50,000 rose bushes and 1,600 varieties. Mapped pedestrian pathways loop around musical fountains and landscaped lawns. The garden connects directly across Jan Marg to the Shanti Kunj green corridor in Sector 16.',
      features: [
        {
          icon: '🌹',
          label: 'Zakir Hussain Rose Garden',
          detail: '30-acre botanical sanctuary, musical fountain, annual Rose Festival venue',
          type: 'positive',
        },
        {
          icon: '🌳',
          label: 'Shanti Kunj Greenery',
          detail: 'Adjacent quiet meditation park with medicinal plants and natural stream',
          type: 'positive',
        },
        {
          icon: '🚶',
          label: 'Strolling Paths',
          detail: 'Well-maintained paved walking trails linked to Sector 17 pedestrian underpasses',
          type: 'positive',
        },
      ],
      disclaimer:
        'Prime floral blooming season runs from December through March.',
    },
    'Sector 17': {
      headline: 'Iconic open-air brutalist plaza and municipal shopping heart',
      verdict: 'recommended',
      recommendationText:
        'Sector 17 is Chandigarh’s world-famous pedestrian City Center Plaza, conceived by Le Corbusier as the commercial and cultural core of the city. Notable for its monumental exposed-concrete brutalist architecture, central musical fountain, sunken amphitheaters, and sprawling open-air shopping avenues completely closed to automobile traffic.',
      features: [
        {
          icon: '⛲',
          label: 'Central Musical Fountain',
          detail: 'Evening illuminated water and light show at the central plaza concourse',
          type: 'positive',
        },
        {
          icon: '🏢',
          label: 'Brutalist Architecture',
          detail: 'Pioneering mid-century modern civic buildings, bridges, and covered colonnades',
          type: 'positive',
        },
        {
          icon: '🛍️',
          label: 'Handicraft & Boutiques',
          detail: 'State government emporiums (Phulkari, Black Partridge) featuring regional crafts',
          type: 'positive',
        },
      ],
      disclaimer:
        'Vibrant afternoon and evening atmosphere; shops generally open between 11:00 and 20:30.',
    },
    'Sector 10': {
      headline: 'Cultural district with Government Museum, Art Gallery & Leisure Valley',
      verdict: 'recommended',
      recommendationText:
        'Visiting Sector 10 is essential for art and history travelers. It houses the Government Museum & Art Gallery—one of only three museums in the world designed by Le Corbusier—housing world-renowned Gandhara Buddhist sculptures and Pahari miniature paintings. It is framed by the linear Leisure Valley green belt and adjacent National Gallery of Portraits.',
      features: [
        {
          icon: '🎨',
          label: 'Government Museum & Art Gallery',
          detail: 'Designed by Le Corbusier; houses ancient Gandharan sculptures & miniature art',
          type: 'positive',
        },
        {
          icon: '🌿',
          label: 'Leisure Valley Parkland',
          detail: 'Continuous green belt ideal for morning strolls, bird watching, and cycling',
          type: 'positive',
        },
        {
          icon: '☕',
          label: 'Sector 10 Cafe Promenade',
          detail: 'Trendy outdoor cafes and artisan eateries along the western sector edge',
          type: 'positive',
        },
      ],
      disclaimer:
        'Government museums are closed on Mondays and national holidays.',
    },
  },
};

/**
 * Fallback generator for general sectors or custom coordinates.
 */
function generateFallbackRecommendation(
  profile: RecommendationProfile,
  destinationName: string,
  sector: string
): {
  headline: string;
  verdict: 'suitable' | 'caution' | 'recommended' | 'advisory';
  recommendationText: string;
  features: MappedFeatureHighlight[];
  disclaimer: string;
} {
  switch (profile) {
    case 'wheelchair':
      return {
        headline: `Cautious navigation advised in ${sector}; curb cuts unverified in OSM`,
        verdict: 'caution',
        recommendationText: `Your wheelchair route to ${destinationName} (${sector}) connects via local street sidewalks and footways. While 745 pedestrian paths are mapped across Chandigarh, explicit wheelchair accessibility tags (wheelchair:yes/no) and ramp/curb infrastructure are sparsely recorded in this sector's OpenStreetMap data. 30 stair barriers exist in the city dataset; navigate along primary avenues and confirm ramp status upon arrival.`,
        features: [
          {
            icon: '🚶',
            label: 'Pedestrian Footways',
            detail: '745 mapped walkways across Chandigarh grid network',
            type: 'positive',
          },
          {
            icon: '⚠️',
            label: 'Unrecorded Kerbs',
            detail: 'Curb-cut transitions at sector intersections are unverified in OSM',
            type: 'warning',
          },
          {
            icon: '🚫',
            label: 'Stairs Penalty',
            detail: 'Routing engine automatically penalizes mapped stairs by 500x',
            type: 'info',
          },
        ],
        disclaimer:
          'OpenStreetMap data for Chandigarh currently lacks verified kerb ramp coverage. Unknown accessibility is unrated, not guaranteed barrier-free.',
      };

    case 'bicycle':
      return {
        headline: `Connected cycling corridor to ${sector} via arterial cycleways`,
        verdict: 'suitable',
        recommendationText: `Your cycling trip to ${destinationName} in ${sector} connects through Chandigarh's grid-iron road network. The city features 784 mapped corridor cycle tracks along V3/V4 avenues and 12 dedicated off-street cycleways. Routing steers toward these designated corridors to avoid heavy arterial motor vehicle traffic. Watch for cross-traffic at sector roundabouts.`,
        features: [
          {
            icon: '🚲',
            label: 'Corridor Tracks',
            detail: '784 roadside cycleway tags mapped across Chandigarh avenues',
            type: 'positive',
          },
          {
            icon: '🧭',
            label: 'Roundabout Navigation',
            detail: 'Roundabout junctions have mixed vehicle flow; exercise lane discipline',
            type: 'info',
          },
          {
            icon: '🅿️',
            label: 'Bicycle Parking',
            detail: 'Informal parking at sector commercial centers; lock to secure posts',
            type: 'info',
          },
        ],
        disclaimer:
          'One-way cycling directionality is enforced where mapped; follow local traffic regulations.',
      };

    case 'night':
      return {
        headline: `Night travel advisory for ${sector}; maintain main illuminated corridors`,
        verdict: 'advisory',
        recommendationText: `Traveling toward ${destinationName} in ${sector} during late hours utilizes municipal street routes. Chandigarh has 126 mapped lit street segments, 67 hospitals, and 8 police stations in the city dataset. For night travel, stick to primary V2/V3 avenues rather than unlit interior residential V5/V6 streets. Note: proximity to lighting or services does not guarantee personal safety.`,
        features: [
          {
            icon: '💡',
            label: 'Mapped Street Lights',
            detail: '126 street segments carrying explicit lit=yes in OpenStreetMap',
            type: 'positive',
          },
          {
            icon: '🏥',
            label: 'Emergency Network',
            detail: '67 hospitals & 8 police stations distributed across Chandigarh',
            type: 'info',
          },
          {
            icon: '⚠️',
            label: 'Safety Advisory',
            detail: 'Inner sector streets may be quiet after 22:00; travel with companions',
            type: 'warning',
          },
        ],
        disclaimer:
          'Proximity to 24/7 services and lighting is an urban feature proxy, not a real-time safety index.',
      };

    case 'tourist':
      return {
        headline: `Exploring ${sector}: Le Corbusier modernism & local sector market`,
        verdict: 'recommended',
        recommendationText: `A visit to ${destinationName} in ${sector} offers an authentic glimpse of Chandigarh's iconic sector concept. Each sector was designed by Le Corbusier and Pierre Jeanneret as a self-contained neighborhood unit complete with green corridors, V4 commercial bazaar streets, and distinctive exposed-brick/concrete modernist architecture.`,
        features: [
          {
            icon: '🏛️',
            label: 'Modernist Grid Plan',
            detail: 'Self-sufficient sector layout designed by Le Corbusier & team in the 1950s',
            type: 'positive',
          },
          {
            icon: '🛍️',
            label: 'Local V4 Bazaars',
            detail: 'Pedestrian-friendly market streets with regional Punjabi cuisine & local shops',
            type: 'positive',
          },
          {
            icon: '🌿',
            label: 'Sector Green Belts',
            detail: 'Continuous linear open spaces connecting residential areas to civic centers',
            type: 'positive',
          },
        ],
        disclaimer:
          'Local sector markets are liveliest between 16:30 and 21:00 on weekdays and weekends.',
      };
  }
}

/**
 * Main AI recommendation generator.
 */
export function generateAIRecommendation(
  profile: RecommendationProfile,
  destinationName: string,
  sectorOrCoords?: string | [number, number]
): AIRecommendation {
  // Normalize sector
  let sector = 'Sector 17';
  if (typeof sectorOrCoords === 'string' && sectorOrCoords.trim()) {
    sector = sectorOrCoords.trim();
  } else if (destinationName.includes('Sector')) {
    const match = destinationName.match(/Sector\s+\d+/i);
    if (match) sector = match[0];
  }

  // Check matching recommendation in matrix
  const profileMatrix = RECOMMENDATION_MATRIX[profile] || {};
  let template = profileMatrix[sector];

  if (!template) {
    // Try matching by substring in destination name
    for (const key of Object.keys(profileMatrix)) {
      if (destinationName.toLowerCase().includes(key.toLowerCase()) || sector.toLowerCase().includes(key.toLowerCase())) {
        template = profileMatrix[key];
        break;
      }
    }
  }

  if (!template) {
    template = generateFallbackRecommendation(profile, destinationName, sector);
  }

  const profileColors: Record<RecommendationProfile, { badge: string; color: string }> = {
    wheelchair: { badge: 'Wheelchair Insights', color: '#00c49f' },
    bicycle: { badge: 'Cycling Insights', color: '#f59e0b' },
    night: { badge: 'Night Transit Insights', color: '#a855f7' },
    tourist: { badge: 'Tourist Insights', color: '#38bdf8' },
  };

  const meta = profileColors[profile] || profileColors.tourist;

  return {
    profile,
    destinationName,
    sector,
    badge: meta.badge,
    badgeColor: meta.color,
    headline: template.headline,
    verdict: template.verdict,
    recommendationText: template.recommendationText,
    mappedFeatures: template.features,
    limitationsDisclaimer: template.disclaimer,
    networkSummary: `Based on verified OpenStreetMap layers, 4,433 blocks, and Chandigarh network graph.`,
  };
}
