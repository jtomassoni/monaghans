import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

/** Stored in `Setting`; never exposed via public API routes. */
export const PRIVATE_DINING_NOTIFICATION_EMAILS_KEY = 'private_dining_notification_emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseNotificationEmailsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is string => typeof e === 'string');
  } catch {
    return [];
  }
}

export async function getPrivateDiningNotificationEmails(): Promise<string[]> {
  const row = await prisma.setting.findUnique({
    where: { key: PRIVATE_DINING_NOTIFICATION_EMAILS_KEY },
  });
  return parseNotificationEmailsJson(row?.value);
}

export function normalizeEmailList(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed || !EMAIL_RE.test(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PrivateDiningLeadEmailPayload = {
  id: string;
  name: string;
  phone: string;
  email: string;
  groupSize: string;
  preferredDate: Date;
  message: string | null;
};

/**
 * Sends staff notification via Resend. Does not throw — logs errors.
 * Call after the lead is persisted.
 */
export async function sendPrivateDiningLeadNotification(lead: PrivateDiningLeadEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    console.warn(
      '[private-dining] Skipping email: set RESEND_API_KEY and RESEND_FROM (verified sender in Resend).'
    );
    return;
  }

  const recipients = normalizeEmailList(await getPrivateDiningNotificationEmails());
  if (recipients.length === 0) {
    console.warn(
      '[private-dining] No notification recipients configured. Add addresses in Admin → Private Dining Leads → Communications.'
    );
    return;
  }

  const resend = new Resend(apiKey);

  const dateStr = lead.preferredDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const siteBase = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const adminLeadUrl = siteBase ? `${siteBase}/admin/private-dining-leads/${lead.id}` : '';

  const textLines = [
    'New private dining inquiry',
    '',
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Group size: ${lead.groupSize}`,
    `Preferred date: ${dateStr}`,
    lead.message ? `Message:\n${lead.message}` : '',
    '',
    `Lead ID: ${lead.id}`,
    adminLeadUrl ? `Open in admin: ${adminLeadUrl}` : '',
  ].filter(Boolean);

  const html = `
    <h2 style="font-family:system-ui,sans-serif;font-size:18px;">New private dining inquiry</h2>
    <table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse;max-width:560px;">
      <tr><td style="padding:6px 12px 6px 0;color:#555;">Name</td><td>${escapeHtml(lead.name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;">Email</td><td><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;">Phone</td><td><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;">Group size</td><td>${escapeHtml(lead.groupSize)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top;">Preferred date</td><td>${escapeHtml(dateStr)}</td></tr>
      ${
        lead.message
          ? `<tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top;">Message</td><td>${escapeHtml(lead.message).replace(/\n/g, '<br/>')}</td></tr>`
          : ''
      }
    </table>
    ${
      adminLeadUrl
        ? `<p style="font-family:system-ui,sans-serif;font-size:14px;margin-top:16px;"><a href="${escapeHtml(adminLeadUrl)}">View lead in admin</a></p>`
        : ''
    }
  `;

  try {
    const { error } = await resend.emails.send({
      from,
      to: recipients,
      subject: `Private dining inquiry — ${lead.name}`,
      text: textLines.join('\n'),
      html,
    });

    if (error) {
      console.error('[private-dining] Resend error:', error);
    }
  } catch (err) {
    console.error('[private-dining] Failed to send notification email:', err);
  }
}
