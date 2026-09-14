import type { Metadata } from 'next';
import { eventPublicDescription } from '@/lib/football-games';

export const SITE_URL = process.env.NEXTAUTH_URL || 'https://monaghans.com';
export const BRAND_NAME = "Monaghan's";
export const BRAND_NAME_FULL = "Monaghan's Bar and Grill";

export const DEFAULT_DESCRIPTION =
  "Daily happy hour, drink specials, and live events at Monaghan's — Sheridan neighborhood sports bar in Denver. Poker, pool tournaments, and a great place to watch the game.";

export const HOME_TITLE =
  "Monaghan's | Daily Happy Hour, Drink Specials & Events | Denver Sports Bar";

export const HOME_DESCRIPTION =
  "Daily happy hour and drink specials at Monaghan's in Denver. Watch Broncos, Avalanche, and Rockies games. Poker, pool tournaments, and live events. Denver's second-oldest bar since 1892.";

export const HOME_KEYWORDS = [
  'Denver happy hour',
  'daily happy hour Denver',
  'Denver drink specials',
  'daily drink specials',
  'Denver sports bar',
  'Sheridan sports bar',
  'poker night Denver',
  'pool tournament Denver',
  'Broncos game audio',
  'Avalanche game audio',
  'Rockies games',
  'Monday Night Football',
  'Thursday Night Football',
  "Monaghan's",
];

export const EVENTS_TITLE =
  "Events | Poker, Pool Tournaments & Live Entertainment | Monaghan's Denver";

export const EVENTS_DESCRIPTION =
  "Upcoming events at Monaghan's in Sheridan, Denver — poker nights, pool tournaments, sports watch parties, and live entertainment. Daily happy hour and drink specials every day.";

export const EVENTS_KEYWORDS = [
  'poker night Denver',
  'pool tournament Denver',
  'Denver bar events',
  'sports watch party Denver',
  'Sheridan bar events',
  'daily happy hour Denver',
  'Denver drink specials',
  "Monaghan's events",
];

export const MENU_TITLE = "Menu | Daily Food Specials & Happy Hour | Monaghan's Denver";

export const MENU_DESCRIPTION =
  "Monaghan's Denver menu with daily food specials. Daily happy hour and drink specials at our Sheridan sports bar, plus poker, pool, and live events.";

export const CONTACT_TITLE = "Contact | Monaghan's Denver Sports Bar";

export const CONTACT_DESCRIPTION =
  "Find Monaghan's in Sheridan, Denver — daily happy hour, drink specials, live events, and a great place to watch the game. Hours, address, and phone.";

export const FOOD_GALLERY_TITLE = "Food Specials | Daily Specials at Monaghan's Denver";

export const FOOD_GALLERY_DESCRIPTION =
  "Daily food specials at Monaghan's in Denver, plus happy hour, drink specials, and live events at our Sheridan sports bar.";

export const BAR_AMENITY_FEATURES = [
  'Daily happy hour',
  'Daily drink specials',
  'Daily food specials',
  'Poker nights',
  'Pool tournaments',
  'Live events',
  'Broncos games',
  'Avalanche games',
  'Rockies games',
  'Monday Night Football',
  'Thursday Night Football',
  'National games with audio on request',
  'HD TVs with a view from every seat',
] as const;

export type SeoContact = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
};

function postalAddress(contact?: SeoContact) {
  if (!contact?.address || !contact.city || !contact.state) return undefined;
  return {
    '@type': 'PostalAddress',
    streetAddress: contact.address,
    addressLocality: contact.city,
    addressRegion: contact.state,
    postalCode: contact.zip || undefined,
    addressCountry: 'US',
  };
}

function locationNode(contact?: SeoContact) {
  const location: Record<string, unknown> = {
    '@type': 'BarOrPub',
    name: BRAND_NAME_FULL,
    url: SITE_URL,
  };
  const address = postalAddress(contact);
  if (address) location.address = address;
  if (contact?.phone) location.telephone = contact.phone;
  return location;
}

export function publicPageMetadata({
  title,
  description,
  keywords,
  path,
}: {
  title: string;
  description: string;
  keywords?: string[];
  path?: string;
}): Metadata {
  const url = path ? `${SITE_URL}${path}` : SITE_URL;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        {
          url: '/pics/hero.png',
          width: 1200,
          height: 630,
          alt: BRAND_NAME_FULL,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/pics/hero.png'],
    },
  };
}

export function barOrPubJsonLd(contact?: SeoContact, description = HOME_DESCRIPTION) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BarOrPub',
    name: BRAND_NAME_FULL,
    description,
    url: SITE_URL,
    amenityFeature: BAR_AMENITY_FEATURES.map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    })),
    makesOffer: [
      {
        '@type': 'Offer',
        name: 'Daily Happy Hour',
        description: 'Happy hour every day at Monaghan\'s.',
      },
      {
        '@type': 'Offer',
        name: 'Daily Drink Specials',
        description: 'Rotating drink specials every day.',
      },
      {
        '@type': 'Offer',
        name: 'Daily Food Specials',
        description: 'Rotating food specials every day.',
      },
    ],
  };

  const address = postalAddress(contact);
  if (address) jsonLd.address = address;
  if (contact?.phone) jsonLd.telephone = contact.phone;

  return jsonLd;
}

export function eventsJsonLd(
  events: Array<{
    title: string;
    description?: string | null;
    startDateTime: string | Date;
    endDateTime?: string | Date | null;
    tags?: unknown;
  }>,
  contact?: SeoContact
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming events at Monaghan\'s',
    description: EVENTS_DESCRIPTION,
    itemListElement: events.map((event, index) => {
      const item: Record<string, unknown> = {
        '@type': 'Event',
        name: event.title,
        description: eventPublicDescription(event) || EVENTS_DESCRIPTION,
        startDate: new Date(event.startDateTime).toISOString(),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: locationNode(contact),
        organizer: {
          '@type': 'BarOrPub',
          name: BRAND_NAME_FULL,
          url: SITE_URL,
        },
      };
      if (event.endDateTime) {
        item.endDate = new Date(event.endDateTime).toISOString();
      }
      return {
        '@type': 'ListItem',
        position: index + 1,
        item,
      };
    }),
  };
}
