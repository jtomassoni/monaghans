import type { NflTeam } from '@/lib/nfl-teams';
import { broncosColorSide, opponentColorSide } from '@/lib/nfl-teams';

export function MatchupSplit({ team }: { team: NflTeam }) {
  const home = broncosColorSide();
  const away = opponentColorSide(team);

  return (
    <div
      className="flex h-[4.5rem] overflow-hidden rounded-xl shadow-sm"
      role="group"
      aria-label={`Broncos versus ${team.city} ${team.name}`}
    >
      <div
        className="flex w-1/2 flex-col"
        style={{ backgroundColor: home.background }}
      >
        <div
          className="flex flex-1 items-center justify-center px-2 text-center text-sm font-extrabold uppercase tracking-[0.14em] sm:text-base"
          style={{ color: home.foreground }}
        >
          Broncos
        </div>
        <div className="h-1.5" style={{ backgroundColor: home.accent }} />
      </div>
      <div
        className="flex w-1/2 flex-col"
        style={{ backgroundColor: away.background }}
      >
        <div
          className="flex flex-1 items-center justify-center px-2 text-center text-sm font-extrabold uppercase leading-tight tracking-[0.08em] sm:text-base sm:tracking-[0.12em]"
          style={{ color: away.accent }}
        >
          {team.name}
        </div>
        <div className="h-1.5" style={{ backgroundColor: away.accent }} />
      </div>
    </div>
  );
}
