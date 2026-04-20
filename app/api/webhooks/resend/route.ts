import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { RESEND_TAG_PD_RECIPIENT } from '@/lib/private-dining-notifications';

export const runtime = 'nodejs';

function extractEmailAddress(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

/** Resend inbound webhooks do not include body text — fetch full email by id. */
function plainTextFromHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type ReceivedEmailApi = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string | null;
  html: string | null;
  message_id?: string | null;
};

async function fetchReceivedEmailById(emailId: string): Promise<ReceivedEmailApi | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[resend-webhook] GET /emails/receiving failed:', res.status, errText);
    return null;
  }
  return (await res.json()) as ReceivedEmailApi;
}

/**
 * Resend webhook (Svix-signed). Configure in Resend dashboard → Webhooks:
 * URL: https://<your-domain>/api/webhooks/resend
 * Events: at least `email.opened`
 * Signing secret → RESEND_WEBHOOK_SECRET in your environment.
 *
 * When open tracking is enabled for your domain, `email.opened` fires and we
 * record `verificationEmailOpenedAt` for staff verification emails (tagged with pd_recipient).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET is not set; ignoring webhook');
    return NextResponse.json({ ok: true, skipped: true });
  }

  const rawBody = await req.text();
  const id = req.headers.get('svix-id') ?? '';
  const timestamp = req.headers.get('svix-timestamp') ?? '';
  const signature = req.headers.get('svix-signature') ?? '';

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error('[resend-webhook] RESEND_API_KEY missing');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  let event: {
    type: string;
    created_at?: string;
    data?: {
      tags?: Record<string, string>;
      email_id?: string;
      from?: string;
      to?: string | string[];
      subject?: string;
      text?: string;
      html?: string;
      message_id?: string;
    };
  };
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      webhookSecret: secret,
      headers: { id, timestamp, signature },
    }) as typeof event;
  } catch (e) {
    console.error('[resend-webhook] Signature verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (event.type === 'email.opened') {
    const recipientId = event.data?.tags?.[RESEND_TAG_PD_RECIPIENT];
    if (!recipientId) {
      return NextResponse.json({ ok: true });
    }

    const openedAt = new Date(event.created_at ?? new Date().toISOString());

    await prisma.privateDiningNotificationRecipient.updateMany({
      where: {
        id: recipientId,
        verificationEmailOpenedAt: null,
      },
      data: {
        verificationEmailOpenedAt: openedAt,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Inbound: Resend `email.received` includes metadata only — body must be fetched via API.
  // Dashboard: Domain → enable Receiving (MX) · Webhooks → add `email.received` → this URL.
  if (event.type === 'email.received') {
    const meta = event.data;
    const emailId = meta?.email_id?.trim();
    let from = extractEmailAddress(meta?.from);
    let toList: string[] = Array.isArray(meta?.to)
      ? meta.to
      : meta?.to
        ? [meta.to]
        : [];
    let subject = (meta?.subject ?? '').trim() || '(no subject)';
    let bodyHtml: string | null = meta?.html ?? null;
    let bodyText = (meta?.text ?? '').trim();
    let messageId = meta?.message_id ?? null;

    if (emailId) {
      const full = await fetchReceivedEmailById(emailId);
      if (full) {
        from = extractEmailAddress(full.from) || from;
        toList = full.to?.length ? full.to : toList;
        subject = (full.subject ?? '').trim() || subject;
        bodyHtml = full.html ?? bodyHtml;
        const textPart = (full.text ?? '').trim();
        bodyText =
          textPart ||
          (full.html ? plainTextFromHtml(full.html) : '') ||
          bodyText;
        messageId = full.message_id ?? messageId;
      }
    } else if (!bodyText && meta?.html) {
      bodyText = plainTextFromHtml(meta.html);
    }

    const to = toList.join(', ');

    if (!from) {
      return NextResponse.json({ ok: true, skipped: 'missing_from' });
    }
    if (!bodyText) {
      return NextResponse.json({ ok: true, skipped: 'missing_body_after_fetch' });
    }

    const lead = await prisma.privateDiningLead.findFirst({
      where: { email: from },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ ok: true, skipped: 'no_matching_lead' });
    }

    if (messageId) {
      const existing = await prisma.privateDiningLeadEmail.findFirst({
        where: { leadId: lead.id, messageId },
      });
      if (existing) {
        return NextResponse.json({ ok: true, deduped: true });
      }
    }

    try {
      await prisma.privateDiningLeadEmail.create({
        data: {
          leadId: lead.id,
          direction: 'inbound',
          from,
          to: to || '—',
          subject,
          bodyText,
          bodyHtml,
          messageId: messageId ?? undefined,
        },
      });
    } catch (error) {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          createdBy: null,
          content: [
            'Inbound email received (timeline fallback).',
            `From: ${from}`,
            `To: ${to || '—'}`,
            `Subject: ${subject}`,
            '',
            bodyText,
          ].join('\n'),
        },
      });
      console.warn('[resend-webhook] Failed to create PrivateDiningLeadEmail, wrote LeadNote fallback:', error);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
