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
      className="flex h-28 overflow-hidden rounded-xl shadow-sm"
      role="group"
      aria-label={`Broncos versus ${team.city} ${team.name}`}
    >
      <div
        className="flex w-1/2 items-center justify-center gap-2 px-2"
        style={{ backgroundColor: home.background }}
      >
        <Image
          src={BRONCOS_HELMET_SRC}
          alt=""
          width={351}
          height={321}
          className="h-20 w-auto shrink-0"
        />
        <span
          className="text-sm font-extrabold uppercase tracking-[0.12em]"
          style={{ color: home.foreground }}
        >
          Broncos
        </span>
      </div>
      <div
        className="flex w-1/2 items-center justify-center gap-2 px-2"
        style={{ backgroundColor: away.background }}
      >
        <span
          className="text-center text-sm font-extrabold uppercase leading-tight tracking-[0.08em]"
          style={{ color: away.accent }}
        >
          {team.name}
        </span>
        {awayHelmet && (
          <Image
            src={awayHelmet}
            alt=""
            width={350}
            height={320}
            className="h-20 w-auto shrink-0"
          />
        )}
      </div>
    </div>
  );
}
