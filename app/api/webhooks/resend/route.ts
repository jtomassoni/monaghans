import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { RESEND_TAG_PD_RECIPIENT } from '@/lib/private-dining-notifications';

export const runtime = 'nodejs';

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

  let event: { type: string; created_at: string; data: { tags?: Record<string, string> } };
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

  if (event.type !== 'email.opened') {
    return NextResponse.json({ ok: true });
  }

  const recipientId = event.data.tags?.[RESEND_TAG_PD_RECIPIENT];
  if (!recipientId) {
    return NextResponse.json({ ok: true });
  }

  const openedAt = new Date(event.created_at);

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
