import Image from 'next/image';
import { barOrPubJsonLd } from '@/lib/seo';

type SportsBarSectionProps = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
};

const LOCAL_TEAMS = [
  {
    name: 'Broncos',
    fullName: 'Denver Broncos',
    logo: '/pics/teams/broncos.png',
  },
  {
    name: 'Avalanche',
    fullName: 'Colorado Avalanche',
    logo: '/pics/teams/avalanche.png',
  },
  {
    name: 'Rockies',
    fullName: 'Colorado Rockies',
    logo: '/pics/teams/rockies-mark.png',
  },
] as const;

export default function SportsBarSection({
  address,
  city,
  state,
  zip,
  phone,
}: SportsBarSectionProps) {
  const jsonLd = barOrPubJsonLd({ address, city, state, zip, phone });

  return (
    <section
      id="sports"
      aria-labelledby="sports-heading"
      className="relative overflow-hidden bg-[#002244] py-16 md:py-24 px-4 sm:px-6 lg:px-8"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(251,79,20,0.14),_transparent_50%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FB4F14]">
              Sheridan · Denver
            </p>
            <h2
              id="sports-heading"
              className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] text-white"
            >
              Game day headquarters
            </h2>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-blue-100/90">
              Monaghan&apos;s is a Sheridan neighborhood sports bar in Denver. We put
              the game on, and we put the audio on. Enough HD TVs for a good view
              from every seat, cold drinks, and a room that actually watches. Other
              national games too, if folks in the bar want them — streaming deals
              make that harder some weeks.
            </p>
          </div>

          <ul className="lg:col-span-7 grid grid-cols-3 gap-4 sm:gap-8">
            {LOCAL_TEAMS.map((team) => (
              <li key={team.fullName} className="flex flex-col items-center text-center">
                <Image
                  src={team.logo}
                  alt=""
                  width={160}
                  height={160}
                  className="h-20 w-20 object-contain sm:h-28 sm:w-28"
                />
                <h3 className="mt-3 font-serif text-lg italic leading-tight text-white sm:text-2xl">
                  {team.name}
                  <span className="sr-only"> ({team.fullName})</span>
                </h3>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
