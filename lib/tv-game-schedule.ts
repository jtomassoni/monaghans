import { parseEventTags } from '@/lib/football-games';

export const TV_GAME_TAG = 'tv-game';
export const TV_GAME_TEAM_TAG_PREFIX = 'tv-game-team:';
export const ESPN_GAME_TAG_PREFIX = 'espn-game:';

export type TvGameTeamKey = 'avalanche' | 'nuggets';

export type TvGameTeam = {
  key: TvGameTeamKey;
  label: string;
  shortName: string;
  sportPath: 'hockey/nhl' | 'basketball/nba';
  espnSlug: string;
  /** Approximate game length used when ESPN has no end time */
  durationMs: number;
};

export const TV_GAME_TEAMS: Record<TvGameTeamKey, TvGameTeam> = {
  avalanche: {
    key: 'avalanche',
    label: 'Colorado Avalanche',
    shortName: 'Avalanche',
    sportPath: 'hockey/nhl',
    espnSlug: 'col',
    durationMs: 3 * 60 * 60 * 1000,
  },
  nuggets: {
    key: 'nuggets',
    label: 'Denver Nuggets',
    shortName: 'Nuggets',
    sportPath: 'basketball/nba',
    espnSlug: 'den',
    durationMs: 2.5 * 60 * 60 * 1000,
  },
};

export const TV_GAME_TEAM_KEYS = Object.keys(TV_GAME_TEAMS) as TvGameTeamKey[];

export type ExternalTvGame = {
  espnGameId: string;
  teamKey: TvGameTeamKey;
  startDateTime: Date;
  endDateTime: Date;
  title: string;
  description: string;
  opponentName: string;
  homeAway: 'home' | 'away' | 'unknown';
  seasonLabel: string;
};

export type TvGamePatternMeta = {
  source: 'espn-tv-game';
  teamKey: TvGameTeamKey;
  espnGameId: string;
  syncedTitle: string;
  syncedDescription: string;
  syncedStartIso: string;
  syncedEndIso: string;
  lastSyncedAt: string;
  seasonLabel?: string;
};

type EspnCompetitor = {
  homeAway?: string;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    name?: string;
  };
};

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  season?: { year?: number; displayName?: string; type?: number };
  competitions?: Array<{
    date?: string;
    competitors?: EspnCompetitor[];
    status?: { type?: { state?: string; completed?: boolean } };
  }>;
};

function opponentShortName(competitor: EspnCompetitor | undefined): string {
  if (!competitor?.team) return 'Opponent';
  return (
    competitor.team.shortDisplayName ||
    competitor.team.name ||
    competitor.team.displayName ||
    competitor.team.abbreviation ||
    'Opponent'
  );
}

export function tvGameTeamTag(teamKey: TvGameTeamKey): string {
  return `${TV_GAME_TEAM_TAG_PREFIX}${teamKey}`;
}

export function espnGameTag(espnGameId: string): string {
  return `${ESPN_GAME_TAG_PREFIX}${espnGameId}`;
}

export function isTvGameEvent(event: { tags?: unknown }): boolean {
  return parseEventTags(event.tags).includes(TV_GAME_TAG);
}

export function tvGameTeamFromEvent(event: { tags?: unknown }): TvGameTeamKey | null {
  const tag = parseEventTags(event.tags).find((t) =>
    t.toLowerCase().startsWith(TV_GAME_TEAM_TAG_PREFIX)
  );
  if (!tag) return null;
  const key = tag.slice(TV_GAME_TEAM_TAG_PREFIX.length).toLowerCase();
  return key in TV_GAME_TEAMS ? (key as TvGameTeamKey) : null;
}

export function espnGameIdFromEvent(event: { tags?: unknown }): string | null {
  const tag = parseEventTags(event.tags).find((t) =>
    t.toLowerCase().startsWith(ESPN_GAME_TAG_PREFIX)
  );
  if (!tag) return null;
  const id = tag.slice(ESPN_GAME_TAG_PREFIX.length).trim();
  return id || null;
}

export function withTvGameTags(tags: unknown, teamKey: TvGameTeamKey, espnGameId: string): string[] {
  const next = parseEventTags(tags).filter(
    (tag) =>
      tag !== TV_GAME_TAG &&
      !tag.toLowerCase().startsWith(TV_GAME_TEAM_TAG_PREFIX) &&
      !tag.toLowerCase().startsWith(ESPN_GAME_TAG_PREFIX)
  );
  next.unshift(TV_GAME_TAG, tvGameTeamTag(teamKey), espnGameTag(espnGameId));
  return next;
}

export function tvGameTitle(team: TvGameTeam, opponentName: string): string {
  return `${team.shortName} vs. ${opponentName}`;
}

export function tvGameDescription(team: TvGameTeam): string {
  return `We'll have this ${team.shortName} game on at Monaghan's — Sheridan neighborhood sports bar in Denver. HD TVs, cold drinks, and a room that watches.`;
}

export function parseTvGamePatternMeta(raw: unknown): TvGamePatternMeta | null {
  if (!raw) return null;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.source !== 'espn-tv-game') return null;
  const teamKey = obj.teamKey;
  if (typeof teamKey !== 'string' || !(teamKey in TV_GAME_TEAMS)) return null;
  if (typeof obj.espnGameId !== 'string' || !obj.espnGameId) return null;
  if (typeof obj.syncedTitle !== 'string') return null;
  if (typeof obj.syncedDescription !== 'string') return null;
  if (typeof obj.syncedStartIso !== 'string') return null;
  if (typeof obj.syncedEndIso !== 'string') return null;
  return {
    source: 'espn-tv-game',
    teamKey: teamKey as TvGameTeamKey,
    espnGameId: obj.espnGameId,
    syncedTitle: obj.syncedTitle,
    syncedDescription: obj.syncedDescription,
    syncedStartIso: obj.syncedStartIso,
    syncedEndIso: obj.syncedEndIso,
    lastSyncedAt: typeof obj.lastSyncedAt === 'string' ? obj.lastSyncedAt : new Date(0).toISOString(),
    seasonLabel: typeof obj.seasonLabel === 'string' ? obj.seasonLabel : undefined,
  };
}

export function buildTvGamePatternMeta(game: ExternalTvGame, now = new Date()): TvGamePatternMeta {
  return {
    source: 'espn-tv-game',
    teamKey: game.teamKey,
    espnGameId: game.espnGameId,
    syncedTitle: game.title,
    syncedDescription: game.description,
    syncedStartIso: game.startDateTime.toISOString(),
    syncedEndIso: game.endDateTime.toISOString(),
    lastSyncedAt: now.toISOString(),
    seasonLabel: game.seasonLabel,
  };
}

export function mergePatternMetadata(
  existingRaw: unknown,
  patternFromDates: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const existing =
    typeof existingRaw === 'string'
      ? (() => {
          try {
            return JSON.parse(existingRaw) as Record<string, unknown>;
          } catch {
            return {};
          }
        })()
      : existingRaw && typeof existingRaw === 'object'
        ? { ...(existingRaw as Record<string, unknown>) }
        : {};

  const tvMeta = parseTvGamePatternMeta(existing);
  const merged: Record<string, unknown> = {
    ...existing,
    ...(patternFromDates || {}),
  };

  // Always keep ESPN sync fingerprint so refreshes can detect manual edits
  // even after recurrence pattern fields are rewritten on drag/edit.
  if (tvMeta) {
    merged.source = tvMeta.source;
    merged.teamKey = tvMeta.teamKey;
    merged.espnGameId = tvMeta.espnGameId;
    merged.syncedTitle = tvMeta.syncedTitle;
    merged.syncedDescription = tvMeta.syncedDescription;
    merged.syncedStartIso = tvMeta.syncedStartIso;
    merged.syncedEndIso = tvMeta.syncedEndIso;
    merged.lastSyncedAt = tvMeta.lastSyncedAt;
    if (tvMeta.seasonLabel) merged.seasonLabel = tvMeta.seasonLabel;
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

function isoMatches(a: Date | string | null | undefined, bIso: string, skewMs = 60_000): boolean {
  if (!a) return false;
  const aMs = new Date(a).getTime();
  const bMs = new Date(bIso).getTime();
  if (Number.isNaN(aMs) || Number.isNaN(bMs)) return false;
  return Math.abs(aMs - bMs) <= skewMs;
}

/** True when the stored event still matches the last ESPN-synced snapshot. */
export function isTvGameStillSynced(event: {
  title?: string | null;
  description?: string | null;
  startDateTime?: Date | string | null;
  endDateTime?: Date | string | null;
  patternMetadata?: unknown;
}): boolean {
  const meta = parseTvGamePatternMeta(event.patternMetadata);
  if (!meta) return false;
  if ((event.title || '').trim() !== meta.syncedTitle.trim()) return false;
  if ((event.description || '').trim() !== meta.syncedDescription.trim()) return false;
  if (!isoMatches(event.startDateTime, meta.syncedStartIso)) return false;
  if (!isoMatches(event.endDateTime, meta.syncedEndIso)) return false;
  return true;
}

async function fetchEspnSchedulePage(team: TvGameTeam, seasontype: number): Promise<EspnEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sportPath}/teams/${team.espnSlug}/schedule?seasontype=${seasontype}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`ESPN schedule request failed (${res.status}) for ${team.shortName}`);
  }
  const data = (await res.json()) as { events?: EspnEvent[] };
  return Array.isArray(data.events) ? data.events : [];
}

function mapEspnEvent(team: TvGameTeam, event: EspnEvent): ExternalTvGame | null {
  const espnGameId = event.id?.trim();
  const startIso = event.competitions?.[0]?.date || event.date;
  if (!espnGameId || !startIso) return null;

  const status = event.competitions?.[0]?.status?.type;
  if (status?.state === 'post' || status?.completed) return null;

  const competitors = event.competitions?.[0]?.competitors || [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');

  const isHome = home?.team?.abbreviation?.toLowerCase() === team.espnSlug ||
    home?.team?.displayName?.toLowerCase().includes(team.shortName.toLowerCase());
  const opponent = isHome ? away : home;
  const homeAway: ExternalTvGame['homeAway'] = isHome ? 'home' : away ? 'away' : 'unknown';
  const opponentName = opponentShortName(opponent);

  const startDateTime = new Date(startIso);
  if (Number.isNaN(startDateTime.getTime())) return null;

  // Skip games that already ended relative to wall clock (status can lag)
  if (startDateTime.getTime() + team.durationMs < Date.now() - 6 * 60 * 60 * 1000) {
    return null;
  }

  const seasonLabel =
    event.season?.displayName ||
    (event.season?.year ? String(event.season.year) : undefined) ||
    '';

  return {
    espnGameId,
    teamKey: team.key,
    startDateTime,
    endDateTime: new Date(startDateTime.getTime() + team.durationMs),
    title: tvGameTitle(team, opponentName),
    description: tvGameDescription(team),
    opponentName,
    homeAway,
    seasonLabel,
  };
}

/** Fetch upcoming ESPN schedule games for a local TV team (preseason + regular + postseason). */
export async function fetchExternalTvGames(teamKey: TvGameTeamKey): Promise<ExternalTvGame[]> {
  const team = TV_GAME_TEAMS[teamKey];
  const pages = await Promise.all([1, 2, 3].map((seasontype) => fetchEspnSchedulePage(team, seasontype)));
  const byId = new Map<string, ExternalTvGame>();

  for (const page of pages) {
    for (const event of page) {
      const mapped = mapEspnEvent(team, event);
      if (!mapped) continue;
      byId.set(mapped.espnGameId, mapped);
    }
  }

  return [...byId.values()].sort(
    (a, b) => a.startDateTime.getTime() - b.startDateTime.getTime()
  );
}

export function tvGamePublicDescription(event: {
  tags?: unknown;
  description?: string | null;
}): string {
  const teamKey = tvGameTeamFromEvent(event);
  if (teamKey) {
    const custom = (event.description || '').trim();
    if (custom) return custom;
    return tvGameDescription(TV_GAME_TEAMS[teamKey]);
  }
  return (event.description || '').trim();
}
