import {
  opponentFromFootballTitle,
  POTLUCK_BRING_LINE,
  POTLUCK_LABEL,
} from '@/lib/football-games';

type FootballGameHeroTileProps = {
  title: string;
  startDateTime: Date | string;
  now: Date;
  houseMeal?: string;
};

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
  const mealLabel = houseMeal?.trim() || POTLUCK_LABEL;
  const isLive = start.getTime() <= now.getTime();
  const matchup = !opponent
    ? 'Broncos'
    : /^broncos\b/i.test(opponent)
      ? opponent
      : `Broncos vs ${opponent}`;

  return (
    <div className="mx-auto mb-3 w-full max-w-xl sm:mb-6">
      <div
        className="rounded-2xl border border-white/10 bg-[#002244]/80 px-6 py-5 text-center shadow-[inset_0_2px_0_0_#FB4F14] backdrop-blur-md sm:px-8 sm:py-6"
        role="region"
        aria-label={`${POTLUCK_LABEL}, ${mealLabel}, ${POTLUCK_BRING_LINE}, ${kickoffDate} at ${kickoffTime}, ${matchup}`}
      >
        {isLive && (
          <p className="mb-1.5 text-xs font-medium text-orange-200">Happening now</p>
        )}

        <time
          dateTime={start.toISOString()}
          className="block text-sm text-[#FB4F14] sm:text-base"
        >
          {kickoffDate} at {kickoffTime}
        </time>

        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200/90 sm:text-xs">
          {POTLUCK_LABEL}
        </p>

        <h3 className="mt-1.5 font-serif text-4xl italic leading-tight text-white sm:text-5xl break-words">
          {mealLabel}
        </h3>

        <p className="mt-2.5 text-sm leading-snug text-white/90 sm:text-base">
          {POTLUCK_BRING_LINE}
        </p>

        <p className="mt-3 text-base text-orange-100/90 sm:text-lg">
          {matchup}
        </p>
      </div>
    </div>
  );
}
