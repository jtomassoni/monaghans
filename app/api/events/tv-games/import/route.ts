import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { parseEventTags } from '@/lib/football-games';
import {
  TV_GAME_TAG,
  TV_GAME_TEAM_KEYS,
  TV_GAME_TEAMS,
  buildTvGamePatternMeta,
  espnGameIdFromEvent,
  fetchExternalTvGames,
  isTvGameStillSynced,
  parseTvGamePatternMeta,
  type TvGameTeamKey,
  withTvGameTags,
} from '@/lib/tv-game-schedule';

export const dynamic = 'force-dynamic';

type ImportBody = {
  team?: string;
  /** When true, also deactivate local TV-game events whose ESPN id is no longer on the schedule. */
  removeMissing?: boolean;
};

function isTeamKey(value: string): value is TvGameTeamKey {
  return (TV_GAME_TEAM_KEYS as string[]).includes(value);
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ImportBody;
    const teamRaw = (body.team || '').toLowerCase().trim();
    if (!isTeamKey(teamRaw)) {
      return NextResponse.json(
        { error: `team must be one of: ${TV_GAME_TEAM_KEYS.join(', ')}` },
        { status: 400 }
      );
    }
    const teamKey = teamRaw;
    const team = TV_GAME_TEAMS[teamKey];
    const removeMissing = body.removeMissing === true;

    const externalGames = await fetchExternalTvGames(teamKey);

    const existingEvents = await prisma.event.findMany({
      where: {
        tags: { contains: TV_GAME_TAG },
      },
    });

    const teamEvents = existingEvents.filter((event) => {
      const tags = parseEventTags(event.tags);
      return tags.includes(`tv-game-team:${teamKey}`) || parseTvGamePatternMeta(event.patternMetadata)?.teamKey === teamKey;
    });

    const byEspnId = new Map<string, (typeof teamEvents)[number]>();
    for (const event of teamEvents) {
      const id =
        espnGameIdFromEvent(event) || parseTvGamePatternMeta(event.patternMetadata)?.espnGameId;
      if (id) byEspnId.set(id, event);
    }

    let created = 0;
    let updated = 0;
    let skippedManual = 0;
    let unchanged = 0;
    let deactivated = 0;
    const createdEvents: unknown[] = [];
    const updatedEvents: unknown[] = [];

    for (const game of externalGames) {
      const existing = byEspnId.get(game.espnGameId);
      const meta = buildTvGamePatternMeta(game);
      const tags = withTvGameTags(existing?.tags, teamKey, game.espnGameId);

      if (!existing) {
        const event = await prisma.event.create({
          data: {
            title: game.title,
            description: game.description,
            startDateTime: game.startDateTime,
            endDateTime: game.endDateTime,
            venueArea: 'bar',
            isAllDay: false,
            tags: JSON.stringify(tags),
            isActive: true,
            patternMetadata: JSON.stringify(meta),
          } as any,
        });
        created += 1;
        createdEvents.push(event);
        continue;
      }

      byEspnId.delete(game.espnGameId);

      const stillSynced = isTvGameStillSynced(existing);
      if (!stillSynced) {
        skippedManual += 1;
        continue;
      }

      const startSame = existing.startDateTime.getTime() === game.startDateTime.getTime();
      const endSame =
        (existing.endDateTime?.getTime() ?? null) === game.endDateTime.getTime();
      const titleSame = existing.title === game.title;
      const descSame = (existing.description || '') === game.description;
      const activeSame = existing.isActive === true;

      if (startSame && endSame && titleSame && descSame && activeSame) {
        // Refresh fingerprint timestamp only
        await prisma.event.update({
          where: { id: existing.id },
          data: {
            patternMetadata: JSON.stringify(meta),
            tags: JSON.stringify(tags),
          } as any,
        });
        unchanged += 1;
        continue;
      }

      const event = await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: game.title,
          description: game.description,
          startDateTime: game.startDateTime,
          endDateTime: game.endDateTime,
          tags: JSON.stringify(tags),
          isActive: true,
          patternMetadata: JSON.stringify(meta),
        } as any,
      });
      updated += 1;
      updatedEvents.push(event);
    }

    if (removeMissing) {
      for (const leftover of byEspnId.values()) {
        if (!leftover.isActive) continue;
        if (!isTvGameStillSynced(leftover)) {
          skippedManual += 1;
          continue;
        }
        await prisma.event.update({
          where: { id: leftover.id },
          data: { isActive: false },
        });
        deactivated += 1;
      }
    }

    await logActivity(
      user.id,
      'create',
      'event',
      teamKey,
      `${team.shortName} TV schedule`,
      undefined,
      `imported/refreshed ${team.shortName} TV games (created ${created}, updated ${updated}, skipped manual ${skippedManual}, unchanged ${unchanged}, deactivated ${deactivated})`
    );

    return NextResponse.json({
      team: teamKey,
      seasonLabel: externalGames[0]?.seasonLabel || null,
      fetched: externalGames.length,
      created,
      updated,
      skippedManual,
      unchanged,
      deactivated,
      events: [...createdEvents, ...updatedEvents],
    });
  } catch (error) {
    return handleError(error, 'Failed to import TV game schedule');
  }
}
