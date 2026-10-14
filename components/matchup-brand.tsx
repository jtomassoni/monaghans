import type { NflTeam } from '@/lib/nfl-teams';
import {
  BRONCOS_HELMET_SRC,
  broncosColorSide,
  opponentColorSide,
  opponentHelmetSrc,
} from '@/lib/nfl-teams';
import Image from 'next/image';

export function MatchupSplit({ team }: { team: NflTeam }) {
  const home = broncosColorSide();
  const away = opponentColorSide(team);
  const awayHelmet = opponentHelmetSrc(team);

  return (
    <div
      className="relative flex overflow-hidden rounded-xl shadow-sm"
      role="group"
      aria-label={`Broncos versus ${team.city} ${team.name}`}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/25"
        aria-hidden="true"
      />
      <div
        className="flex w-1/2 flex-col items-center px-2 pb-2.5 pt-2"
        style={{ backgroundColor: home.background }}
      >
        <Image
          src={BRONCOS_HELMET_SRC}
          alt=""
          width={351}
          height={321}
          className="h-[4.5rem] w-auto"
        />
        <span
          className="mt-0.5 text-center text-[11px] font-extrabold uppercase leading-none tracking-[0.12em] sm:text-xs"
          style={{ color: home.foreground }}
        >
          Broncos
        </span>
      </div>
      <div
        className="flex w-1/2 flex-col items-center px-2 pb-2.5 pt-2"
        style={{ backgroundColor: away.background }}
      >
        {awayHelmet && (
          <Image
            src={awayHelmet}
            alt=""
            width={350}
            height={320}
            className="h-[4.5rem] w-auto"
          />
        )}
        <span
          className="mt-0.5 px-1 text-center text-[11px] font-extrabold uppercase leading-tight tracking-[0.06em] sm:text-xs"
          style={{ color: away.accent }}
        >
          {team.name}
        </span>
      </div>
    </div>
  );
}
