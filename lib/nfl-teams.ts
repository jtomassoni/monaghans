export const BRONCOS_NAVY = '#002244';
export const BRONCOS_ORANGE = '#FB4F14';

export type NflDivision =
  | 'AFC West'
  | 'AFC East'
  | 'AFC North'
  | 'AFC South'
  | 'NFC East'
  | 'NFC North'
  | 'NFC South'
  | 'NFC West';

export type NflTeam = {
  name: string;
  city: string;
  division: NflDivision;
  primary: string;
  secondary: string;
  onPrimary: string;
  aliases?: string[];
};

export const NFL_DIVISIONS: NflDivision[] = [
  'AFC West',
  'AFC East',
  'AFC North',
  'AFC South',
  'NFC East',
  'NFC North',
  'NFC South',
  'NFC West',
];

export const NFL_TEAMS: NflTeam[] = [
  {
    name: 'Chiefs',
    city: 'Kansas City',
    division: 'AFC West',
    primary: '#E31837',
    secondary: '#FFB81C',
    onPrimary: '#FFFFFF',
    aliases: ['kc'],
  },
  {
    name: 'Raiders',
    city: 'Las Vegas',
    division: 'AFC West',
    primary: '#000000',
    secondary: '#A5ACAF',
    onPrimary: '#FFFFFF',
    aliases: ['oakland', 'lv'],
  },
  {
    name: 'Chargers',
    city: 'Los Angeles',
    division: 'AFC West',
    primary: '#0080C6',
    secondary: '#FFC20E',
    onPrimary: '#FFFFFF',
    aliases: ['la chargers', 'san diego', 'san diego chargers'],
  },
  {
    name: 'Bills',
    city: 'Buffalo',
    division: 'AFC East',
    primary: '#00338D',
    secondary: '#C60C30',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Dolphins',
    city: 'Miami',
    division: 'AFC East',
    primary: '#008E97',
    secondary: '#FC4C02',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Patriots',
    city: 'New England',
    division: 'AFC East',
    primary: '#002244',
    secondary: '#C60C30',
    onPrimary: '#FFFFFF',
    aliases: ['pats'],
  },
  {
    name: 'Jets',
    city: 'New York',
    division: 'AFC East',
    primary: '#125740',
    secondary: '#FFFFFF',
    onPrimary: '#FFFFFF',
    aliases: ['ny jets', 'new york jets'],
  },
  {
    name: 'Ravens',
    city: 'Baltimore',
    division: 'AFC North',
    primary: '#241773',
    secondary: '#9E7C0C',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Bengals',
    city: 'Cincinnati',
    division: 'AFC North',
    primary: '#FB4F14',
    secondary: '#000000',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Browns',
    city: 'Cleveland',
    division: 'AFC North',
    primary: '#311D00',
    secondary: '#FF3C00',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Steelers',
    city: 'Pittsburgh',
    division: 'AFC North',
    primary: '#FFB612',
    secondary: '#101820',
    onPrimary: '#101820',
  },
  {
    name: 'Texans',
    city: 'Houston',
    division: 'AFC South',
    primary: '#03202F',
    secondary: '#A71930',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Colts',
    city: 'Indianapolis',
    division: 'AFC South',
    primary: '#002C5F',
    secondary: '#A2AAAD',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Jaguars',
    city: 'Jacksonville',
    division: 'AFC South',
    primary: '#006778',
    secondary: '#D7A22A',
    onPrimary: '#FFFFFF',
    aliases: ['jags'],
  },
  {
    name: 'Titans',
    city: 'Tennessee',
    division: 'AFC South',
    primary: '#0C2340',
    secondary: '#4B92DB',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Cowboys',
    city: 'Dallas',
    division: 'NFC East',
    primary: '#003594',
    secondary: '#869397',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Giants',
    city: 'New York',
    division: 'NFC East',
    primary: '#0B2265',
    secondary: '#A71930',
    onPrimary: '#FFFFFF',
    aliases: ['ny giants', 'new york giants'],
  },
  {
    name: 'Eagles',
    city: 'Philadelphia',
    division: 'NFC East',
    primary: '#004C54',
    secondary: '#A5ACAF',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Commanders',
    city: 'Washington',
    division: 'NFC East',
    primary: '#5A1414',
    secondary: '#FFB612',
    onPrimary: '#FFFFFF',
    aliases: ['washington football team'],
  },
  {
    name: 'Bears',
    city: 'Chicago',
    division: 'NFC North',
    primary: '#0B162A',
    secondary: '#C83803',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Lions',
    city: 'Detroit',
    division: 'NFC North',
    primary: '#0076B6',
    secondary: '#B0B7BC',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Packers',
    city: 'Green Bay',
    division: 'NFC North',
    primary: '#203731',
    secondary: '#FFB612',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Vikings',
    city: 'Minnesota',
    division: 'NFC North',
    primary: '#4F2683',
    secondary: '#FFC62F',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Falcons',
    city: 'Atlanta',
    division: 'NFC South',
    primary: '#A71930',
    secondary: '#000000',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Panthers',
    city: 'Carolina',
    division: 'NFC South',
    primary: '#0085CA',
    secondary: '#101820',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Saints',
    city: 'New Orleans',
    division: 'NFC South',
    primary: '#D3BC8D',
    secondary: '#101820',
    onPrimary: '#101820',
  },
  {
    name: 'Buccaneers',
    city: 'Tampa Bay',
    division: 'NFC South',
    primary: '#D50A0A',
    secondary: '#FF7900',
    onPrimary: '#FFFFFF',
    aliases: ['bucs', 'tampa bay bucs'],
  },
  {
    name: 'Cardinals',
    city: 'Arizona',
    division: 'NFC West',
    primary: '#97233F',
    secondary: '#000000',
    onPrimary: '#FFFFFF',
  },
  {
    name: 'Rams',
    city: 'Los Angeles',
    division: 'NFC West',
    primary: '#003594',
    secondary: '#FFA300',
    onPrimary: '#FFFFFF',
    aliases: ['la rams', 'st louis', 'st louis rams'],
  },
  {
    name: '49ers',
    city: 'San Francisco',
    division: 'NFC West',
    primary: '#AA0000',
    secondary: '#B3995D',
    onPrimary: '#FFFFFF',
    aliases: ['niners', 'forty niners'],
  },
  {
    name: 'Seahawks',
    city: 'Seattle',
    division: 'NFC West',
    primary: '#002244',
    secondary: '#69BE28',
    onPrimary: '#FFFFFF',
  },
];

function normalizeTeamKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

const TEAM_LOOKUP = new Map<string, NflTeam>();

for (const team of NFL_TEAMS) {
  const keys = [
    team.name,
    `${team.city} ${team.name}`,
    ...(team.aliases ?? []),
  ];
  for (const key of keys) {
    TEAM_LOOKUP.set(normalizeTeamKey(key), team);
  }
}

const teamsByCity = new Map<string, NflTeam[]>();
for (const team of NFL_TEAMS) {
  const city = normalizeTeamKey(team.city);
  const existing = teamsByCity.get(city) ?? [];
  existing.push(team);
  teamsByCity.set(city, existing);
}
for (const [city, teams] of teamsByCity) {
  if (teams.length === 1) TEAM_LOOKUP.set(city, teams[0]);
}

export function findNflTeam(name: string): NflTeam | undefined {
  const key = normalizeTeamKey(name);
  if (!key) return undefined;
  return TEAM_LOOKUP.get(key);
}

export function nflTeamsByDivision(): {
  division: NflDivision;
  teams: NflTeam[];
}[] {
  return NFL_DIVISIONS.map((division) => ({
    division,
    teams: NFL_TEAMS.filter((team) => team.division === division),
  }));
}

export type ColorSide = {
  background: string;
  foreground: string;
  accent: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((char) => char + char)
          .join('')
      : raw;
  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function colorLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string): number {
  const lighter = Math.max(colorLuminance(a), colorLuminance(b));
  const darker = Math.min(colorLuminance(a), colorLuminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function colorsSimilar(a: string, b: string): boolean {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  const distance = Math.hypot(
    left.r - right.r,
    left.g - right.g,
    left.b - right.b
  );
  return distance < 72;
}

function readableInk(background: string): string {
  return contrastRatio('#FFFFFF', background) >= 3 ? '#FFFFFF' : '#101820';
}

export function broncosColorSide(): ColorSide {
  return {
    background: BRONCOS_ORANGE,
    foreground: BRONCOS_NAVY,
    accent: BRONCOS_NAVY,
  };
}

export function opponentColorSide(team: NflTeam): ColorSide {
  let background = team.primary;
  let accent = team.secondary;
  const primaryIsWeakPanel =
    colorsSimilar(team.primary, BRONCOS_ORANGE) ||
    colorLuminance(team.primary) > 0.45;
  const secondaryIsStrongPanel =
    !colorsSimilar(team.secondary, BRONCOS_ORANGE) &&
    colorLuminance(team.secondary) <= 0.45;

  if (primaryIsWeakPanel && secondaryIsStrongPanel) {
    background = team.secondary;
    accent = team.primary;
  }

  if (contrastRatio(accent, background) < 1.75) {
    accent = readableInk(background);
  }

  return {
    background,
    foreground: readableInk(background),
    accent,
  };
}
