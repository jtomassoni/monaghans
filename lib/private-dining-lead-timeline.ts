import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';

/** Resolve DB user id for LeadNote.createdBy (same pattern as manual notes). */
export async function getUserIdForLeadNote(session: Session | null): Promise<string | null> {
  if (!session?.user) return null;
  if (session.user.id) {
    const byId = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (byId) return byId.id;
  }
  const email = session.user.email;
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }
  return null;
}

function clipOneLine(s: string, max = 220): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function formatLeadDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normMsg(m: string | null | undefined): string {
  const t = (m ?? '').trim();
  return t || '(none)';
}

type LeadSnapshot = {
  name: string;
  phone: string;
  email: string;
  groupSize: string;
  preferredDate: Date;
  message: string | null;
  status: string;
};

type LeadPatchBody = {
  name?: string;
  phone?: string;
  email?: string;
  groupSize?: string;
  preferredDate?: string;
  message?: string;
  status?: string;
};

/** Human-readable timeline note for primary lead field edits; null if nothing changed. */
export function buildLeadProfileChangeNote(before: LeadSnapshot, body: LeadPatchBody): string | null {
  const lines: string[] = [];

  if (body.name !== undefined && body.name !== before.name) {
    lines.push(`• Name: "${clipOneLine(before.name, 80)}" → "${clipOneLine(body.name, 80)}"`);
  }
  if (body.phone !== undefined && body.phone !== before.phone) {
    lines.push(`• Phone: "${before.phone}" → "${body.phone}"`);
  }
  if (body.email !== undefined && body.email !== before.email) {
    lines.push(`• Email: "${before.email}" → "${body.email}"`);
  }
  if (body.groupSize !== undefined && body.groupSize !== before.groupSize) {
    lines.push(`• Group size: "${before.groupSize}" → "${body.groupSize}"`);
  }
  if (body.preferredDate !== undefined) {
    const next = new Date(body.preferredDate);
    if (!isNaN(next.getTime()) && next.getTime() !== before.preferredDate.getTime()) {
      lines.push(`• Preferred date: ${formatLeadDate(before.preferredDate)} → ${formatLeadDate(next)}`);
    }
  }
  if (body.message !== undefined && normMsg(body.message) !== normMsg(before.message)) {
    lines.push(`• Message / details: "${clipOneLine(normMsg(before.message))}" → "${clipOneLine(normMsg(body.message))}"`);
  }
  if (body.status !== undefined && body.status !== before.status) {
    lines.push(`• Status: ${before.status} → ${body.status}`);
  }

  if (lines.length === 0) return null;
  return ['Profile updated:', ...lines].join('\n');
}

type ContactSnapshot = {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  notes: string | null;
};

export function buildContactAddedNote(contact: ContactSnapshot): string {
  const bits = [`Contact added: ${contact.name}`];
  if (contact.role?.trim()) bits.push(`Role: ${contact.role.trim()}`);
  if (contact.email?.trim()) bits.push(`Email: ${contact.email.trim()}`);
  if (contact.phone?.trim()) bits.push(`Phone: ${contact.phone.trim()}`);
  return bits.join('\n');
}

export function buildContactChangeNote(before: ContactSnapshot, after: ContactSnapshot): string | null {
  const lines: string[] = [];
  if (after.name !== before.name) {
    lines.push(`• Name: "${before.name}" → "${after.name}"`);
  }
  if ((after.email ?? '') !== (before.email ?? '')) {
    lines.push(`• Email: "${before.email ?? '—'}" → "${after.email ?? '—'}"`);
  }
  if ((after.phone ?? '') !== (before.phone ?? '')) {
    lines.push(`• Phone: "${before.phone ?? '—'}" → "${after.phone ?? '—'}"`);
  }
  if ((after.role ?? '') !== (before.role ?? '')) {
    lines.push(`• Role: "${before.role ?? '—'}" → "${after.role ?? '—'}"`);
  }
  if ((after.notes ?? '') !== (before.notes ?? '')) {
    lines.push(
      `• Notes: "${clipOneLine(normMsg(before.notes))}" → "${clipOneLine(normMsg(after.notes))}"`
    );
  }
  if (lines.length === 0) return null;
  return [`Contact updated (${after.name}):`, ...lines].join('\n');
}

export function buildContactRemovedNote(contact: ContactSnapshot): string {
  const bits = [`Contact removed: ${contact.name}`];
  if (contact.role?.trim()) bits.push(`Role was: ${contact.role.trim()}`);
  return bits.join('\n');
}

/** Timeline note when staff creates a calendar event from this lead (links lead + sets booked). */
export function buildCalendarEventCreatedFromLeadNote(params: {
  title: string;
  description: string | null;
  startDateTime: Date;
  endDateTime: Date | null;
  venueArea: string;
}): string {
  const fmt = (d: Date) =>
    d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const lines = [
    'Calendar event created from this lead.',
    `Title: ${clipOneLine(params.title, 200)}`,
    `Starts: ${fmt(params.startDateTime)}`,
    params.endDateTime ? `Ends: ${fmt(params.endDateTime)}` : 'Ends: —',
    `Venue area: ${params.venueArea}`,
  ];
  if (params.description?.trim()) {
    lines.push('', `Description: ${clipOneLine(params.description.trim(), 500)}`);
  }
  lines.push('', 'Lead status was set to booked and linked to this event.');
  return lines.join('\n');
}
