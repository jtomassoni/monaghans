import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

/** Legacy `Setting` key — migrated to `PrivateDiningNotificationRecipient`; kept for public API filtering. */
export const PRIVATE_DINING_NOTIFICATION_EMAILS_KEY = 'private_dining_notification_emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_VALID_DAYS = 7;

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

function getSiteBase(): string {
  return (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
}

function getResend(): { resend: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return null;
  return { resend: new Resend(apiKey), from };
}

export type StaffRecipientRow = {
  email: string;
  status: 'verified' | 'pending';
  active: boolean;
};

/**
 * One-time import from legacy Setting into rows (verified) so existing installs keep receiving mail.
 */
export async function migrateLegacyNotificationRecipientsIfNeeded(): Promise<void> {
  const existing = await prisma.privateDiningNotificationRecipient.count();
  if (existing > 0) return;

  const row = await prisma.setting.findUnique({
    where: { key: PRIVATE_DINING_NOTIFICATION_EMAILS_KEY },
  });
  const rawEmails = parseNotificationEmailsJson(row?.value);
  const emails = normalizeEmailList(rawEmails);
  if (emails.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const email of emails) {
      await tx.privateDiningNotificationRecipient.create({
        data: {
          email,
          active: true,
          verifiedAt: new Date(),
        },
      });
    }
    if (row) {
      await tx.setting.delete({ where: { key: PRIVATE_DINING_NOTIFICATION_EMAILS_KEY } });
    }
  });
}

export async function listStaffRecipientsForAdmin(): Promise<StaffRecipientRow[]> {
  await migrateLegacyNotificationRecipientsIfNeeded();
  const rows = await prisma.privateDiningNotificationRecipient.findMany({
    orderBy: { email: 'asc' },
  });
  return rows.map((r) => ({
    email: r.email,
    status: r.verifiedAt ? 'verified' : 'pending',
    active: r.active,
  }));
}

function newVerificationExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + VERIFICATION_VALID_DAYS);
  return d;
}

function generateVerificationToken(): string {
  return randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
}

async function sendEmailOrLog(
  to: string[],
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  const cfg = getResend();
  if (!cfg) {
    console.warn('[private-dining] Resend not configured; skipping email.');
    return false;
  }
  try {
    const { error } = await cfg.resend.emails.send({
      from: cfg.from,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[private-dining] Resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[private-dining] Failed to send email:', err);
    return false;
  }
}

async function sendStaffVerificationEmail(email: string, token: string): Promise<void> {
  const siteBase = getSiteBase();
  const verifyUrl = siteBase
    ? `${siteBase}/api/private-dining/verify-recipient?token=${encodeURIComponent(token)}`
    : '';

  const text = [
    "You've been added to receive private dining and event rental lead notifications at Monaghan's.",
    '',
    'Confirm your email by opening this link (expires in a few days):',
    verifyUrl || '(configure NEXTAUTH_URL for a working link)',
    '',
    "If you didn't expect this, you can ignore this message or call the bar.",
  ].join('\n');

  const html = `
    <p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111;">
      You've been added to receive <strong>private dining and event rental</strong> lead notifications at Monaghan's.
    </p>
    <p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111;">
      Confirm your email using the button below. This link expires in ${VERIFICATION_VALID_DAYS} days.
    </p>
    ${
      verifyUrl
        ? `<p style="margin:24px 0;">
            <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;">
              Verify my email
            </a>
          </p>
          <p style="font-family:system-ui,sans-serif;font-size:13px;color:#555;word-break:break-all;">${escapeHtml(verifyUrl)}</p>`
        : '<p style="color:#b45309;">Server URL is not configured; ask an admin to set NEXTAUTH_URL.</p>'
    }
    <p style="font-family:system-ui,sans-serif;font-size:14px;color:#555;">
      If you didn't expect this message, you can ignore it or call the bar.
    </p>
  `;

  await sendEmailOrLog(
    [email],
    "Confirm your email — Monaghan's private dining notifications",
    html,
    text
  );
}

/** After verification — no customer PII; drives staff to the admin app. */
async function sendStaffWelcomeEmail(email: string): Promise<void> {
  const siteBase = getSiteBase();
  const leadsSectionUrl = siteBase ? `${siteBase}/admin/private-dining-leads` : '';

  const textLines = [
    "You're verified to receive private dining lead notifications at Monaghan's.",
    '',
    "Open the admin app to view and manage inquiries — full contact details stay in the app only.",
    '',
    leadsSectionUrl ? `Private dining leads: ${leadsSectionUrl}` : '',
  ].filter(Boolean);

  const html = `
    <h2 style="font-family:system-ui,sans-serif;font-size:18px;">You're all set</h2>
    <p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111;">
      Your email is verified. You'll get a short notice when new inquiries arrive — open the admin app for full details.
    </p>
    ${
      leadsSectionUrl
        ? `<p style="margin:24px 0;">
            <a href="${escapeHtml(leadsSectionUrl)}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;">
              Open private dining leads
            </a>
          </p>
          <p style="font-family:system-ui,sans-serif;font-size:13px;color:#555;">
            Sign in to the dashboard if prompted. Customer contact information is not included in email alerts.
          </p>`
        : '<p style="color:#b45309;">Ask an admin to set NEXTAUTH_URL so links work.</p>'
    }
  `;

  await sendEmailOrLog(
    [email],
    "Welcome — Monaghan's private dining notifications",
    html,
    textLines.join('\n')
  );
}

/**
 * Apply desired email list: remove stragglers, add pending with verification email, refresh expired tokens.
 */
export async function syncStaffRecipientsFromDesiredList(desiredEmails: string[]): Promise<StaffRecipientRow[]> {
  await migrateLegacyNotificationRecipientsIfNeeded();

  const desired = normalizeEmailList(desiredEmails);
  const desiredSet = new Set(desired);

  const snapshot = await prisma.privateDiningNotificationRecipient.findMany();
  const toRemove = snapshot.filter((r) => !desiredSet.has(r.email)).map((r) => r.id);
  if (toRemove.length > 0) {
    await prisma.privateDiningNotificationRecipient.deleteMany({
      where: { id: { in: toRemove } },
    });
  }

  const existingByEmail = new Map(
    (await prisma.privateDiningNotificationRecipient.findMany()).map((r) => [r.email, r])
  );

  const now = new Date();

  for (const email of desired) {
    const row = existingByEmail.get(email);

    if (!row) {
      const token = generateVerificationToken();
      await prisma.privateDiningNotificationRecipient.create({
        data: {
          email,
          active: true,
          verificationToken: token,
          verificationExpiresAt: newVerificationExpiry(),
        },
      });
      await sendStaffVerificationEmail(email, token);
      continue;
    }

    if (row.verifiedAt) {
      continue;
    }

    const expired =
      !row.verificationExpiresAt || row.verificationExpiresAt.getTime() < now.getTime();
    if (expired || !row.verificationToken) {
      const token = generateVerificationToken();
      await prisma.privateDiningNotificationRecipient.update({
        where: { id: row.id },
        data: {
          verificationToken: token,
          verificationExpiresAt: newVerificationExpiry(),
        },
      });
      if (row.active) {
        await sendStaffVerificationEmail(email, token);
      }
    }
  }

  return listStaffRecipientsForAdmin();
}

export async function getVerifiedStaffNotificationEmails(): Promise<string[]> {
  await migrateLegacyNotificationRecipientsIfNeeded();
  const rows = await prisma.privateDiningNotificationRecipient.findMany({
    where: { verifiedAt: { not: null }, active: true },
    select: { email: true },
  });
  return rows.map((r) => r.email);
}

/**
 * Turn email alerts on/off for a recipient. Reactivating a pending address may resend verification.
 */
export async function updateStaffRecipientActive(
  rawEmail: string,
  active: boolean
): Promise<StaffRecipientRow[] | null> {
  await migrateLegacyNotificationRecipientsIfNeeded();
  const emails = normalizeEmailList([rawEmail]);
  const email = emails[0];
  if (!email) return null;

  const existing = await prisma.privateDiningNotificationRecipient.findUnique({
    where: { email },
  });
  if (!existing) return null;

  await prisma.privateDiningNotificationRecipient.update({
    where: { email },
    data: { active },
  });

  if (active && !existing.verifiedAt) {
    const now = new Date();
    const expired =
      !existing.verificationExpiresAt ||
      existing.verificationExpiresAt.getTime() < now.getTime() ||
      !existing.verificationToken;
    if (expired) {
      const token = generateVerificationToken();
      await prisma.privateDiningNotificationRecipient.update({
        where: { email },
        data: {
          verificationToken: token,
          verificationExpiresAt: newVerificationExpiry(),
        },
      });
      await sendStaffVerificationEmail(email, token);
    }
  }

  return listStaffRecipientsForAdmin();
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

export async function sendPrivateDiningLeadNotification(lead: PrivateDiningLeadEmailPayload): Promise<void> {
  const recipients = normalizeEmailList(await getVerifiedStaffNotificationEmails());
  if (recipients.length === 0) {
    console.warn(
      '[private-dining] No verified recipients with email alerts on. Add or re-enable addresses in Admin → Private Dining Leads → Communications.'
    );
    return;
  }

  const cfg = getResend();
  if (!cfg) {
    console.warn(
      '[private-dining] Skipping email: set RESEND_API_KEY and RESEND_FROM (verified sender in Resend).'
    );
    return;
  }

  const dateStr = lead.preferredDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const siteBase = getSiteBase();
  const adminLeadUrl = siteBase ? `${siteBase}/admin/private-dining-leads/${lead.id}` : '';

  const textLines = [
    `You have a new private dining inquiry from ${lead.name} for ${dateStr}.`,
    '',
    'Open the admin app for full contact details and notes — they are not included in this email.',
    '',
    adminLeadUrl ? `More details: ${adminLeadUrl}` : '',
  ].filter(Boolean);

  const html = `
    <p style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.55;color:#111;">
      You have a <strong>new private dining inquiry</strong> from ${escapeHtml(lead.name)} for <strong>${escapeHtml(dateStr)}</strong>.
    </p>
    ${
      adminLeadUrl
        ? `<p style="margin:28px 0;">
            <a href="${escapeHtml(adminLeadUrl)}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;font-size:14px;">
              Open in admin for details
            </a>
          </p>
          <p style="font-family:system-ui,sans-serif;font-size:13px;color:#555;word-break:break-all;">${escapeHtml(adminLeadUrl)}</p>`
        : '<p style="color:#b45309;">Configure NEXTAUTH_URL so the admin link works.</p>'
    }
    <p style="font-family:system-ui,sans-serif;font-size:13px;color:#555;">
      Phone, email, and messages are available only in the app after you sign in.
    </p>
  `;

  try {
    const { error } = await cfg.resend.emails.send({
      from: cfg.from,
      to: recipients,
      subject: `New private dining inquiry`,
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

/**
 * Complete verification from email link; sends a minimal welcome email (app link only).
 * @returns ok, or reason for failure
 */
export async function verifyStaffRecipientAndWelcome(
  token: string
): Promise<'ok' | 'invalid' | 'expired'> {
  const trimmed = token.trim();
  if (!trimmed) return 'invalid';

  const row = await prisma.privateDiningNotificationRecipient.findFirst({
    where: { verificationToken: trimmed },
  });

  if (!row) return 'invalid';

  const now = new Date();
  if (!row.verificationExpiresAt || row.verificationExpiresAt.getTime() < now.getTime()) {
    return 'expired';
  }

  await prisma.privateDiningNotificationRecipient.update({
    where: { id: row.id },
    data: {
      verifiedAt: now,
      verificationToken: null,
      verificationExpiresAt: null,
    },
  });

  if (row.active) {
    await sendStaffWelcomeEmail(row.email);
  }
  return 'ok';
}
