import {
  opponentFromFootballTitle,
  POTLUCK_BRING_LINE,
  POTLUCK_LABEL,
} from '@/lib/football-games';
import {
  BRONCOS_NAVY,
  broncosColorSide,
  findNflTeam,
  opponentColorSide,
  type ColorSide,
} from '@/lib/nfl-teams';

type FootballGameHeroTileProps = {
  title: string;
  startDateTime: Date | string;
  now: Date;
  houseMeal?: string;
};

const TEXT_SHADOW = '0 1px 2px rgba(0,0,0,0.75), 0 2px 12px rgba(0,0,0,0.45)';

export default function FootballGameHeroTile({
  title,
  startDateTime,
  now,
  houseMeal,
}: FootballGameHeroTileProps) {
  const start = new Date(startDateTime);
  const kickoffDate = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  });
  const kickoffTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Denver',
  });
  const opponent = opponentFromFootballTitle(title);
  const opponentTeam = findNflTeam(opponent);
  const mealLabel = houseMeal?.trim() || POTLUCK_LABEL;
  const isLive = start.getTime() <= now.getTime();
  const opponentLabel = opponentTeam?.name || opponent;
  const matchup = !opponentLabel
    ? 'Broncos'
    : /^broncos\b/i.test(opponentLabel)
      ? opponentLabel
      : `Broncos vs ${opponentLabel}`;
  const home = broncosColorSide();
  const away: ColorSide = opponentTeam
    ? opponentColorSide(opponentTeam)
    : {
        background: BRONCOS_NAVY,
        foreground: '#FFFFFF',
        accent: '#FFFFFF',
      };

  return (
    <div className="mx-auto mb-3 w-full max-w-xl sm:mb-6">
      <div
        className="relative overflow-hidden rounded-2xl shadow-xl"
        role="region"
        aria-label={`${POTLUCK_LABEL}, ${mealLabel}, ${POTLUCK_BRING_LINE}, ${kickoffDate} at ${kickoffTime}, ${matchup}`}
      >
        <div className="absolute inset-0 flex" aria-hidden="true">
          <div className="w-1/2" style={{ backgroundColor: home.background }} />
          <div className="w-1/2" style={{ backgroundColor: away.background }} />
        </div>

        <div className="relative px-4 py-5 text-center sm:px-6 sm:py-6">
          {isLive && (
            <p
              className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
              style={{ textShadow: TEXT_SHADOW }}
            >
              Happening now
            </p>
          )}

          <time
            dateTime={start.toISOString()}
            className="block text-sm font-semibold text-white sm:text-base"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {kickoffDate} at {kickoffTime}
          </time>

          <p
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white sm:text-xs"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {POTLUCK_LABEL}
          </p>

          <h3
            className="mt-1.5 font-serif text-4xl italic leading-tight text-white break-words sm:text-5xl"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {mealLabel}
          </h3>

          <p
            className="mt-2.5 text-sm leading-snug text-white sm:text-base"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {POTLUCK_BRING_LINE}
          </p>

          <div className="mt-5 flex items-center">
            <p
              className="w-1/2 px-1 text-center text-sm font-extrabold uppercase leading-none tracking-[0.12em] sm:text-xl sm:tracking-[0.16em]"
              style={{ color: home.foreground }}
            >
              Broncos
            </p>
            <p
              className="w-1/2 px-1 text-center text-sm font-extrabold uppercase leading-none tracking-[0.08em] sm:text-xl sm:tracking-[0.14em]"
              style={{ color: away.accent }}
            >
              {opponentLabel || 'Opponent'}
            </p>
          </div>
        </div>

        <div className="relative flex h-2" aria-hidden="true">
          <div className="w-1/2" style={{ backgroundColor: home.accent }} />
          <div className="w-1/2" style={{ backgroundColor: away.accent }} />
        </div>
      </div>
    </div>
  );
}
