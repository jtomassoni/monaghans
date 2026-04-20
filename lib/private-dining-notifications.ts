import fs from 'node:fs';
import path from 'node:path';
import type { Attachment } from 'resend';
import { Resend } from 'resend';
import { IntegrationConfigError } from '@/lib/integration-config-error';
import { prisma } from '@/lib/prisma';

const RESEND_FROM_FORMAT_SUMMARY = 'RESEND_FROM is invalid.';

/** Legacy `Setting` key — migrated to `PrivateDiningNotificationRecipient`; kept for public API filtering. */
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

/**
 * CID used in HTML and on the inline attachment. Remote image URLs fail for localhost in Gmail
 * (Google's servers cannot reach your machine). Inline attachments work locally, on Vercel preview, and in prod.
 */
const EMAIL_FAVICON_CID = 'monaghans-pd-email-logo';

/** Inline bytes — Resend rejects local `path` unless it is https:// (see invalid_attachment). */
function loadFaviconInlineAttachment(): Attachment | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'favicon.ico'),
    path.join(process.cwd(), 'public', 'pics', 'favicon.ico'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const content = fs.readFileSync(p);
      return {
        filename: 'favicon.ico',
        content,
        contentId: EMAIL_FAVICON_CID,
        contentType: 'image/x-icon',
      };
    } catch {
      return null;
    }
  }
  return null;
}

/** Table-based HTML shell for staff private-dining emails. Prefer logoMode `inline` (CID attachment). */
function wrapPrivateDiningEmailHtml(innerHtml: string, logoMode: 'inline' | 'fallback'): string {
  const accent = '#dc2626';
  const gold = '#d4af37';

  const headerLogo =
    logoMode === 'inline'
      ? `<img src="cid:${EMAIL_FAVICON_CID}" width="56" height="56" alt="Monaghan's" style="display:block;border-radius:12px;border:1px solid #e5e7eb;background:#fff;" />`
      : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;border-radius:12px;background:${accent};color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;">M</td></tr></table>`;

  const footerMark =
    logoMode === 'inline'
      ? `<div style="margin-bottom:12px;"><img src="cid:${EMAIL_FAVICON_CID}" width="32" height="32" alt="" style="display:inline-block;border-radius:8px;opacity:0.95;" /></div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e5e7eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e5e7eb;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d1d5db;">
          <tr><td style="height:6px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:26px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="68" valign="top" style="padding-right:14px;">${headerLogo}</td>
                  <td valign="middle" style="font-family:Georgia,'Times New Roman',serif;">
                    <div style="font-size:22px;font-weight:bold;color:#111827;line-height:1.2;">Monaghan's</div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#6b7280;letter-spacing:0.07em;text-transform:uppercase;margin-top:6px;">Dive Bar · Denver</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr><td style="height:2px;background:${gold};border-radius:1px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;font-size:15px;line-height:1.6;color:#374151;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              ${footerMark}
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9ca3af;line-height:1.5;">Cold drinks, warm people.</div>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#d1d5db;margin-top:6px;">Private dining &amp; event notifications</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildBrandedPrivateDiningEmail(innerHtml: string): { html: string; attachments: Attachment[] } {
  const att = loadFaviconInlineAttachment();
  const logoMode = att ? 'inline' : 'fallback';
  const html = wrapPrivateDiningEmailHtml(innerHtml, logoMode);
  return { html, attachments: att ? [att] : [] };
}

/**
 * Canonical site URL for links in emails (verify, admin). Must be absolute https for production.
 *
 * - **Production:** set `NEXTAUTH_URL` to your live site (e.g. `https://www.monaghans.com`).
 * - **Vercel Preview / staging:** `VERCEL_URL` is set automatically (`*.vercel.app`). If `NEXTAUTH_URL` is
 *   unset, we use `https://` + `VERCEL_URL` so links match the deployment (preview or prod).
 * - **Local:** set `NEXTAUTH_URL=http://localhost:3000` so links work on your machine (images use CID, not this URL).
 */
function getSiteBase(): string {
  const explicit = (process.env.NEXTAUTH_URL || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}`;
  }

  return '';
}

/**
 * Validates `RESEND_FROM` when using the optional `Name <email@domain>` form.
 * Display name must be plain text (letters, numbers, spaces, apostrophe, hyphen, period, & only) — no `@`, quotes, commas, or angle brackets.
 */
function assertValidResendFrom(raw: string): void {
  const s = raw.trim();
  if (!s) {
    throw new IntegrationConfigError(
      RESEND_FROM_FORMAT_SUMMARY,
      'RESEND_FROM is empty while RESEND_API_KEY is set.'
    );
  }

  const open = s.indexOf('<');
  const close = s.indexOf('>');
  if (open !== -1 || close !== -1) {
    if (open === -1 || close === -1 || open >= close || s.indexOf('<', open + 1) !== -1) {
      throw new IntegrationConfigError(
        RESEND_FROM_FORMAT_SUMMARY,
        'Use exactly one pair of angle brackets, e.g. Monaghans <noreply@yourdomain.com>.'
      );
    }
    const display = s.slice(0, open).trim();
    const email = s.slice(open + 1, close).trim();
    const after = s.slice(close + 1).trim();
    if (after.length > 0) {
      throw new IntegrationConfigError(
        RESEND_FROM_FORMAT_SUMMARY,
        'Nothing may appear after the closing >.'
      );
    }
    if (!display) {
      throw new IntegrationConfigError(
        RESEND_FROM_FORMAT_SUMMARY,
        'Put a short name before <…>, e.g. Monaghans <noreply@yourdomain.com>.'
      );
    }
    if (!/^[\p{L}\p{N}\s'.&-]+$/u.test(display)) {
      throw new IntegrationConfigError(
        RESEND_FROM_FORMAT_SUMMARY,
        'Display name may only contain letters, numbers, spaces, hyphens, apostrophes, periods, and &. Do not use @ in the name (say “at” instead), and avoid quotes or commas.'
      );
    }
    if (!EMAIL_RE.test(email)) {
      throw new IntegrationConfigError(
        RESEND_FROM_FORMAT_SUMMARY,
        'The part inside <…> must be one valid email address.'
      );
    }
    return;
  }

  if (!EMAIL_RE.test(s)) {
    throw new IntegrationConfigError(
      RESEND_FROM_FORMAT_SUMMARY,
      'Use either a bare email (noreply@domain.com) or: Display Name <noreply@domain.com> with a plain display name (no special characters).'
    );
  }
}

/**
 * When both Resend env vars are set, ensures RESEND_FROM is parseable. Call from API routes so bad config fails fast.
 */
export function assertResendFromEnvIfConfigured(): void {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return;
  assertValidResendFrom(from);
}

function getResend(): { resend: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return null;
  assertValidResendFrom(from);
  return { resend: new Resend(apiKey), from };
}

/** Optional Reply-To (e.g. owner’s Gmail) when using noreply@ for From. */
function getResendReplyTo(): string | undefined {
  const raw = process.env.RESEND_REPLY_TO?.trim();
  if (!raw || !EMAIL_RE.test(raw)) return undefined;
  return raw.toLowerCase();
}

export type StaffRecipientRow = {
  email: string;
  status: 'verified' | 'pending';
  active: boolean;
  /** ISO string or null — from Resend open tracking webhook (pending only meaningful before verify). */
  verificationEmailOpenedAt: string | null;
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
    status: 'verified',
    active: r.active,
    verificationEmailOpenedAt: r.verificationEmailOpenedAt
      ? r.verificationEmailOpenedAt.toISOString()
      : null,
  }));
}

/** Tags let Resend webhooks (e.g. email.opened) match this row — name must be ASCII [a-zA-Z0-9_-]. */
export const RESEND_TAG_PD_RECIPIENT = 'pd_recipient';

type SendEmailResult = { ok: true } | { ok: false; detail: string };

function resendFailureDetail(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function enhanceResendDetail(detail: string): string {
  const d = detail.trim();
  if (/domain is not verified|not verified.*resend\.com/i.test(d)) {
    return (
      `${d} Use RESEND_FROM with a sender on a domain you verify at https://resend.com/domains ` +
      '(for example events@yourrestaurant.com). You cannot send from free-mail domains like @gmail.com as the From address.'
    );
  }
  return d;
}

async function sendEmailOrLog(
  to: string[],
  subject: string,
  html: string,
  text: string,
  opts?: {
    tags?: { name: string; value: string }[];
    attachments?: Attachment[];
  }
): Promise<SendEmailResult> {
  let cfg: ReturnType<typeof getResend>;
  try {
    cfg = getResend();
  } catch (err) {
    if (err instanceof IntegrationConfigError) {
      return { ok: false, detail: `${err.summary} ${err.message}`.trim() };
    }
    throw err;
  }
  if (!cfg) {
    console.warn('[private-dining] Resend not configured; skipping email.');
    return {
      ok: false,
      detail: 'Resend is not configured. Set RESEND_API_KEY and RESEND_FROM in the server environment.',
    };
  }
  const replyTo = getResendReplyTo();
  try {
    const { error } = await cfg.resend.emails.send({
      from: cfg.from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
      ...(opts?.tags && opts.tags.length > 0 ? { tags: opts.tags } : {}),
      ...(opts?.attachments && opts.attachments.length > 0 ? { attachments: opts.attachments } : {}),
    });
    if (error) {
      console.error('[private-dining] Resend error:', error);
      return { ok: false, detail: enhanceResendDetail(resendFailureDetail(error)) };
    }
    return { ok: true };
  } catch (err) {
    console.error('[private-dining] Failed to send email:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: enhanceResendDetail(msg) };
  }
}

/** Subject line for the one-time staff added/notice email (Resend). */
export const STAFF_VERIFICATION_EMAIL_SUBJECT = "You've been added — Monaghan's private dining notifications";

const RESEND_FROM_SETUP_SUMMARY =
  'Could not send email (Resend). Fix RESEND_FROM format or verify your domain in Resend; see server logs for details.';

async function sendStaffVerificationEmail(email: string, recipientRowId: string): Promise<SendEmailResult> {
  const text = [
    "You've been added to receive private dining and event rental lead notifications at Monaghan's.",
    '',
    'You will start receiving lead notification emails right away.',
    "If this was a mistake, please contact the bar and we'll remove this address.",
  ].join('\n');

  const innerHtml = `
    <p style="margin:0 0 16px;">
      You've been added to receive <strong style="color:#111827;">private dining and event rental</strong> lead notifications at Monaghan's.
    </p>
    <p style="margin:0 0 16px;">
      You'll start receiving lead notification emails right away.
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      If you didn't expect this message, please contact the bar and we'll remove this address.
    </p>
  `;
  const { html, attachments } = buildBrandedPrivateDiningEmail(innerHtml);

  return sendEmailOrLog(
    [email],
    STAFF_VERIFICATION_EMAIL_SUBJECT,
    html,
    text,
    {
      tags: [{ name: RESEND_TAG_PD_RECIPIENT, value: recipientRowId }],
      attachments,
    }
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

  const innerHtml = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">You're all set</p>
    <p style="margin:0 0 20px;">
      Your email is verified. You'll get a short notice when new inquiries arrive — open the admin app for full details.
    </p>
    ${
      leadsSectionUrl
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td>
            <a href="${escapeHtml(leadsSectionUrl)}" style="display:inline-block;background:#dc2626;color:#ffffff !important;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 2px 6px rgba(220,38,38,0.35);">
              Open private dining leads
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:13px;color:#6b7280;">
            Sign in to the dashboard if prompted. Customer contact information is not included in email alerts.
          </p>`
        : '<p style="margin:0;color:#b45309;">Ask an admin to set NEXTAUTH_URL so links work.</p>'
    }
  `;
  const { html, attachments } = buildBrandedPrivateDiningEmail(innerHtml);

  const welcome = await sendEmailOrLog(
    [email],
    "Welcome — Monaghan's private dining notifications",
    html,
    textLines.join('\n'),
    { attachments }
  );
  if (!welcome.ok) {
    console.warn('[private-dining] Welcome email failed:', welcome.detail);
  }
}

/**
 * Apply desired email list: remove stragglers, add active recipients, send one-time "you were added" notice.
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
      const created = await prisma.privateDiningNotificationRecipient.create({
        data: {
          email,
          active: true,
          verifiedAt: now,
        },
      });
      const sent = await sendStaffVerificationEmail(email, created.id);
      if (!sent.ok) {
        await prisma.privateDiningNotificationRecipient.delete({ where: { id: created.id } });
        throw new IntegrationConfigError(
          RESEND_FROM_SETUP_SUMMARY,
          `${sent.detail} Subject line for this message: ${STAFF_VERIFICATION_EMAIL_SUBJECT}`
        );
      }
      continue;
    }

    // Backfill old pending rows so alerts no longer depend on inbox verification.
    if (!row.verifiedAt) {
      await prisma.privateDiningNotificationRecipient.update({
        where: { id: row.id },
        data: {
          verifiedAt: now,
          verificationToken: null,
          verificationExpiresAt: null,
          verificationEmailOpenedAt: null,
        },
      });
    }
  }

  return listStaffRecipientsForAdmin();
}

export async function getVerifiedStaffNotificationEmails(): Promise<string[]> {
  await migrateLegacyNotificationRecipientsIfNeeded();
  const rows = await prisma.privateDiningNotificationRecipient.findMany({
    where: { active: true },
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
    data: {
      active,
      ...(existing.verifiedAt
        ? {}
        : {
            verifiedAt: new Date(),
            verificationToken: null,
            verificationExpiresAt: null,
            verificationEmailOpenedAt: null,
          }),
    },
  });

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
      '[private-dining] No active recipients with email alerts on. Add or re-enable addresses under Admin → Private Dining Leads → Email alerts.'
    );
    return;
  }

  let cfg: ReturnType<typeof getResend>;
  try {
    cfg = getResend();
  } catch (err) {
    if (err instanceof IntegrationConfigError) {
      console.error('[private-dining] RESEND_FROM invalid:', err.summary, err.message);
      return;
    }
    throw err;
  }
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
  const messageText = lead.message?.trim() || '(No message provided)';

  const textLines = [
    `You have a new private dining inquiry from ${lead.name} for ${dateStr}.`,
    '',
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Group size: ${lead.groupSize}`,
    `Preferred date: ${dateStr}`,
    `Message: ${messageText}`,
    '',
    adminLeadUrl ? `Open in admin: ${adminLeadUrl}` : '',
  ].filter(Boolean);

  const innerHtml = `
    <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#dc2626;">New inquiry</p>
    <p style="margin:0 0 18px;font-size:17px;line-height:1.45;color:#111827;">
      You have a <strong>new private dining inquiry</strong> from ${escapeHtml(lead.name)} for <strong>${escapeHtml(dateStr)}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;border-collapse:separate;border-spacing:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:12px 14px;font-size:13px;color:#374151;line-height:1.55;">
          <div><strong style="color:#111827;">Name:</strong> ${escapeHtml(lead.name)}</div>
          <div><strong style="color:#111827;">Phone:</strong> ${escapeHtml(lead.phone)}</div>
          <div><strong style="color:#111827;">Email:</strong> <a href="mailto:${escapeHtml(lead.email)}" style="color:#dc2626;text-decoration:none;">${escapeHtml(lead.email)}</a></div>
          <div><strong style="color:#111827;">Group size:</strong> ${escapeHtml(lead.groupSize)}</div>
          <div><strong style="color:#111827;">Preferred date:</strong> ${escapeHtml(dateStr)}</div>
          <div style="margin-top:8px;"><strong style="color:#111827;">Message:</strong></div>
          <div style="white-space:pre-wrap;color:#111827;">${escapeHtml(messageText)}</div>
        </td>
      </tr>
    </table>
    ${
      adminLeadUrl
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td>
            <a href="${escapeHtml(adminLeadUrl)}" style="display:inline-block;background:#dc2626;color:#ffffff !important;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 2px 6px rgba(220,38,38,0.35);">
              Open in admin
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;line-height:1.45;">${escapeHtml(adminLeadUrl)}</p>`
        : '<p style="margin:0;color:#b45309;">Configure NEXTAUTH_URL so the admin link works.</p>'
    }
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      You can review and update status, notes, and contacts in the admin app.
    </p>
  `;
  const { html, attachments } = buildBrandedPrivateDiningEmail(innerHtml);

  const replyTo = getResendReplyTo();
  try {
    const { error } = await cfg.resend.emails.send({
      from: cfg.from,
      to: recipients,
      subject: `New private dining inquiry`,
      text: textLines.join('\n'),
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
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
