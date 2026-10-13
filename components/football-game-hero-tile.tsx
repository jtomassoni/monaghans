import {
  opponentFromFootballTitle,
  POTLUCK_BRING_LINE,
  POTLUCK_LABEL,
} from '@/lib/football-games';
import {
  BRONCOS_HELMET_SRC,
  BRONCOS_NAVY,
  broncosColorSide,
  findNflTeam,
  opponentColorSide,
  opponentHelmetSrc,
  type ColorSide,
} from '@/lib/nfl-teams';
import Image from 'next/image';

type FootballGameHeroTileProps = {
  title: string;
  startDateTime: Date | string;
  now: Date;
  houseMeal?: string;
};

function deepen(hex: string): string {
  const raw = hex.replace('#', '');
  const value = parseInt(raw, 16);
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 255) * 0.72);
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

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
  const awayHelmet = opponentTeam ? opponentHelmetSrc(opponentTeam) : null;

  return (
    <div className="mx-auto mb-3 w-full max-w-xl sm:mb-6">
      <div
        className="relative overflow-hidden rounded-2xl shadow-xl"
        role="region"
        aria-label={`${POTLUCK_LABEL}, ${mealLabel}, ${POTLUCK_BRING_LINE}, ${kickoffDate} at ${kickoffTime}, ${matchup}`}
      >
        <div className="absolute inset-0 flex" aria-hidden="true">
          <div
            className="w-1/2"
            style={{
              background: `linear-gradient(165deg, ${home.background} 0%, ${deepen(home.background)} 100%)`,
            }}
          />
          <div
            className="w-1/2"
            style={{
              background: `linear-gradient(195deg, ${away.background} 0%, ${deepen(away.background)} 100%)`,
            }}
          />
        </div>
        <div className="relative flex">
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/25"
            aria-hidden="true"
          />
          <div className="flex w-1/2 flex-col items-center px-3 pb-2 pt-4 sm:px-5 sm:pt-5">
            <Image
              src={BRONCOS_HELMET_SRC}
              alt=""
              width={351}
              height={321}
              priority
              className="h-28 w-auto drop-shadow-[0_10px_12px_rgba(0,0,0,0.35)] sm:h-36"
            />
            <p
              className="mt-1 text-center text-xs font-extrabold uppercase leading-none tracking-[0.14em] sm:text-base"
              style={{ color: home.foreground }}
            >
              Broncos
            </p>
          </div>
          <div className="flex w-1/2 flex-col items-center px-3 pb-2 pt-4 sm:px-5 sm:pt-5">
            {awayHelmet && (
              <Image
                src={awayHelmet}
                alt=""
                width={350}
                height={320}
                priority
                className="h-28 w-auto drop-shadow-[0_10px_12px_rgba(0,0,0,0.35)] sm:h-36"
              />
            )}
            <p
              className="mt-1 px-1 text-center text-xs font-extrabold uppercase leading-none tracking-[0.08em] sm:text-base sm:tracking-[0.12em]"
              style={{ color: away.accent }}
            >
              {opponentLabel || 'Opponent'}
            </p>
          </div>
        </div>

        <div className="relative border-t border-black/10 bg-[#fff6ee] px-4 py-4 text-center sm:px-6 sm:py-5">
          {isLive && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84312] sm:text-xs">
              Happening now
            </p>
          )}
          <time
            dateTime={start.toISOString()}
            className="block text-sm font-semibold text-[#2c211c] sm:text-base"
          >
            {kickoffDate} at {kickoffTime}
          </time>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84312] sm:text-xs">
            {POTLUCK_LABEL}
          </p>
          <h3 className="mt-1 font-serif text-4xl italic leading-none break-words text-[#1a120e] sm:text-5xl">
            {mealLabel}
          </h3>
          <p className="mt-2 text-sm font-medium leading-snug text-[#3f342e] sm:text-base">
            {POTLUCK_BRING_LINE}
          </p>
        </div>
      </div>
    </div>
  );
}
