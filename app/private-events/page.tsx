import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import CollapsibleSection from '@/components/collapsible-section';
import PrivateEventsPageClient from './private-events-page-client';

export const metadata: Metadata = {
  title: "Private Events & Private Dining | Christmas Parties, Corporate Events, Post-Wedding Celebrations | Monaghan's Bar Denver",
  description: 'Host your Christmas party, corporate event, private dining, post-wedding celebration, birthday, anniversary, or memorial service at Monaghan\'s Bar in Denver. Perfect venue for private events near wedding venues. Contact us to reserve our space for your special occasion.',
  keywords: [
    'private dining Denver',
    'Christmas party venue Denver',
    'corporate event space Denver',
    'private event venue Denver',
    'post-wedding celebration Denver',
    'wedding reception after party Denver',
    'birthday party venue Denver',
    'anniversary celebration Denver',
    'funeral reception Denver',
    'memorial service Denver',
    'private party space Denver',
    'event space near wedding venue',
    'late night snacks and drinks',
    'private dining room Denver',
    'corporate holiday party Denver',
    'office party venue Denver',
    'team building event Denver',
    'company celebration Denver',
    'holiday party venue Denver',
    'Christmas celebration Denver',
    'private space rental Denver',
    'event catering Denver',
    'group dining Denver',
    'special occasion venue Denver',
    'Monaghan\'s private events',
    'Denver bar private dining',
    'Sheridan neighborhood events',
  ].join(', '),
  openGraph: {
    title: "Private Events & Private Dining at Monaghan's Bar Denver",
    description: 'Host your Christmas party, corporate event, private dining, post-wedding celebration, or special occasion at Monaghan\'s Bar. Perfect venue for private events in Denver.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Private Events & Private Dining at Monaghan's Bar Denver",
    description: 'Host your Christmas party, corporate event, private dining, post-wedding celebration, or special occasion at Monaghan\'s Bar.',
  },
};

export default async function PrivateEventsPage() {
  const contactSetting = await prisma.setting.findUnique({
    where: { key: 'contact' },
  });

  let contact: any = {};
  try {
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
  } catch {}

  return <PrivateEventsPageClient contact={contact} />;
}
