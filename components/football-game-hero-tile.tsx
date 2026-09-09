import { FaFootball } from 'react-icons/fa6';
import {
  POTLUCK_BRING_LINE,
  footballGameBadge,
  opponentFromFootballTitle,
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  });
  const kickoffTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Denver',
  });
  const badge = footballGameBadge(start, now);
  const opponent = opponentFromFootballTitle(title);

  return (
    <div className="max-w-6xl mx-auto w-full mb-3 sm:mb-6">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border-l-4 border-[#FB4F14] shadow-xl shadow-orange-950/40">
        <div className="absolute inset-0 bg-[#002244]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#002244] via-[#0a3a66] to-[#00172e]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-10 right-6 h-40 w-40 rounded-full bg-[#FB4F14] blur-3xl" />
          <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-orange-400/40 blur-2xl" />
        </div>

        <div className="relative p-3 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 rounded-xl bg-[#FB4F14] p-2.5 sm:p-3 shadow-lg ring-2 ring-orange-200/40">
              <FaFootball className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] sm:text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
                {badge}
              </span>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-orange-200/90">
                Broncos vs.
              </p>
              <h3 className="text-xl sm:text-3xl font-black leading-tight text-white drop-shadow-sm break-words">
                {opponent || title}
              </h3>
            </div>
            <div className="flex flex-col items-end text-right flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                Kickoff
              </span>
              <span className="text-lg sm:text-xl font-black text-white tabular-nums">{kickoffTime}</span>
              <span className="text-[11px] sm:text-xs font-medium text-orange-100">{kickoffDate}</span>
            </div>
          </div>

          {houseMeal ? (
            <div className="mt-3 sm:mt-4 rounded-lg bg-white/10 px-3 py-2.5 text-orange-50">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-300">
                House pot luck buffet
              </p>
              <p className="text-sm sm:text-lg font-black text-white leading-tight">
                {houseMeal}
              </p>
              <p className="text-[11px] sm:text-sm text-orange-100/90 leading-snug">
                {POTLUCK_BRING_LINE}
              </p>
            </div>
          ) : (
            <div className="mt-3 sm:mt-4 rounded-lg bg-white/10 px-3 py-2.5 text-orange-50 text-[11px] sm:text-sm leading-snug">
              World famous pot luck — {POTLUCK_BRING_LINE.toLowerCase()}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
