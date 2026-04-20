import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import {
  buildBrandedPrivateDiningEmail,
  buildCustomerConversationEmailHtml,
  getResendReplyTo,
} from '@/lib/private-dining-notifications';
import { getUserIdForLeadNote } from '@/lib/private-dining-lead-timeline';

async function requireAdminAccess() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin or Owner access required' }, { status: 403 });
  }
  return { session };
}

function getFromAddress() {
  const from = process.env.RESEND_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** Comma/semicolon-separated list, or JSON array from client */
function parseRecipientsInput(raw: unknown): string[] | null {
  if (raw == null || raw === '') return null;
  if (Array.isArray(raw)) {
    const list = raw.map((x) => String(x).trim()).filter(Boolean);
    return list.length ? list : null;
  }
  const s = String(raw).trim();
  if (!s) return null;
  const parts = s.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

type Params = { params: Promise<{ id: string }> };

async function createFallbackEmailNote(input: {
  leadId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  createdBy?: string | null;
}) {
  await prisma.leadNote.create({
    data: {
      leadId: input.leadId,
      createdBy: input.createdBy ?? null,
      content: [
        'Email sent from CRM (timeline fallback).',
        `From: ${input.from}`,
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        '',
        input.text,
      ].join('\n'),
    },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireAdminAccess();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;
  const noteUserId = await getUserIdForLeadNote(session);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getFromAddress();
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: 'Email not configured. Set RESEND_API_KEY and RESEND_FROM.' },
      { status: 500 }
    );
  }

  const { id } = await params;
  const lead = await prisma.privateDiningLead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const pdLeadEmail = (
    prisma as unknown as {
      privateDiningLeadEmail?: {
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      };
    }
  ).privateDiningLeadEmail;

  let body: { subject?: string; text?: string; to?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const subject = (body.subject ?? '').trim();
  const text = (body.text ?? '').trim();
  if (!subject || !text) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  const explicit = parseRecipientsInput(body.to);
  const fallback = (lead.email ?? '').trim();
  let recipients: string[];
  if (explicit?.length) {
    recipients = explicit;
  } else if (fallback) {
    recipients = [fallback];
  } else {
    return NextResponse.json(
      { error: 'Add at least one recipient (To) or save an email on the lead.' },
      { status: 400 }
    );
  }

  const invalid = recipients.filter((r) => !isLikelyEmail(r));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Invalid email address(es): ${invalid.join(', ')}` },
      { status: 400 }
    );
  }

  recipients = [...new Set(recipients.map((r) => r.trim()))];
  const toDisplay = recipients.join(', ');

  const resend = new Resend(apiKey);
  let sentMessageId: string | undefined;
  try {
    const { html, attachments } = buildBrandedPrivateDiningEmail(
      buildCustomerConversationEmailHtml(text)
    );
    const replyTo = getResendReplyTo();
    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject,
      text,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
    });
    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to send email.' }, { status: 500 });
    }
    sentMessageId = data?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!pdLeadEmail?.create) {
    await createFallbackEmailNote({
      leadId: lead.id,
      from,
      to: toDisplay,
      subject,
      text,
      createdBy: noteUserId,
    });
    return NextResponse.json({
      ok: true,
      warning:
        'Email sent. Stored as a timeline note because the email activity model is unavailable.',
      messageId: sentMessageId ?? null,
    });
  }

  try {
    const created = await pdLeadEmail.create({
      data: {
        leadId: lead.id,
        direction: 'outbound',
        from,
        to: toDisplay,
        subject,
        bodyText: text,
        messageId: sentMessageId,
      },
    });

    return NextResponse.json({ message: created });
  } catch (error) {
    // Keep email sending operational while DB migrations catch up.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      await createFallbackEmailNote({
        leadId: lead.id,
        from,
        to: toDisplay,
        subject,
        text,
        createdBy: noteUserId,
      });
      return NextResponse.json({
        ok: true,
        warning:
          'Email sent. Stored as a timeline note because the email activity table is missing.',
        messageId: sentMessageId ?? null,
      });
    }
    throw error;
  }
}
