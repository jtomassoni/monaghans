import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { verifyRecaptcha } from '@/lib/recaptcha-verify';
import {
  buildBrandedPrivateDiningEmail,
  getResendReplyTo,
  sendPrivateDiningLeadNotification,
} from '@/lib/private-dining-notifications';

async function sendCustomerConfirmationEmail(input: {
  name: string;
  email: string;
  preferredDate: Date;
  groupSize: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    console.warn('[private-events/contact] Skipping confirmation email: RESEND_API_KEY/RESEND_FROM not configured.');
    return;
  }

  const resend = new Resend(apiKey);
  const replyTo = getResendReplyTo();
  const dateStr = input.preferredDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = "We received your private event inquiry";
  const text = [
    `Hi ${input.name},`,
    '',
    "Thanks for reaching out to Monaghan's. We received your private event inquiry and our team will follow up soon.",
    '',
    `Preferred date: ${dateStr}`,
    `Group size: ${input.groupSize}`,
    '',
    'Reply directly to this email if you want to add details or update your request.',
    '',
    "Monaghan's Private Events Team",
  ].join('\n');

  const innerHtml = `
    <p style="margin:0 0 14px;color:#111827;">Hi ${input.name},</p>
    <p style="margin:0 0 14px;color:#374151;">
      Thanks for reaching out to Monaghan's. We received your private event inquiry and our team will follow up soon.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-left:4px solid #dc2626;border-radius:10px;">
      <tr>
        <td style="padding:12px 14px;font-size:14px;line-height:1.6;color:#111827;">
          <div><strong>Preferred date:</strong> ${dateStr}</div>
          <div><strong>Group size:</strong> ${input.groupSize}</div>
        </td>
      </tr>
    </table>
    <p style="margin:0;padding:12px 14px;border:1px solid #f3d7bf;background:#fff7ed;border-radius:10px;font-size:14px;line-height:1.55;color:#9a3412;">
      <strong style="color:#7c2d12;">Reply directly to this email</strong> if you want to add details or update your request.
    </p>
    <p style="margin:16px 0 0;color:#374151;">Monaghan's Private Events Team</p>
  `;
  const { html, attachments } = buildBrandedPrivateDiningEmail(innerHtml);

  const { error } = await resend.emails.send({
    from,
    to: [input.email],
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
  });

  if (error) {
    console.warn('[private-events/contact] Confirmation email send failed:', error.message);
  }
}

function shouldSendCustomerConfirmationEmail(): boolean {
  const raw = process.env.PRIVATE_DINING_SEND_CUSTOMER_CONFIRMATION?.trim().toLowerCase();
  // Default to enabled unless explicitly set false/off/0/no.
  if (!raw) return true;
  return !['false', '0', 'off', 'no'].includes(raw);
}

/**
 * POST /api/private-events/contact
 * Handle private events contact form submission - saves to CRM
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, groupSize, date, message, recaptchaToken } = body;

    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY?.trim();
    const isProduction = process.env.NODE_ENV === 'production';

    if (recaptchaSecret) {
      if (!recaptchaToken) {
        if (isProduction) {
          return NextResponse.json(
            { error: 'Security verification failed. Please try again.' },
            { status: 400 }
          );
        }
        console.warn('[private-events/contact] Missing reCAPTCHA token in non-production; allowing submission.');
      } else {
        const verification = await verifyRecaptcha(recaptchaToken, recaptchaSecret);

        if (!verification.success) {
          if (isProduction) {
            console.error('reCAPTCHA verification failed:', verification.error);
            return NextResponse.json(
              { error: 'Security verification failed. Please try again.' },
              { status: 400 }
            );
          }
          console.warn(
            '[private-events/contact] reCAPTCHA verification failed in non-production; allowing submission:',
            verification.error
          );
        }
      }
    }

    // Validate required fields
    if (!name || !phone || !email || !groupSize || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse the date
    const preferredDate = new Date(date);
    if (isNaN(preferredDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).replace(/\D/g, '');

    // Upsert behavior:
    // - If same person submits multiple forms, append a new submission note to existing lead
    // - Reset status to `new` on each new public submission
    const lead = await prisma.$transaction(async (tx) => {
      const existingByEmail = await tx.privateDiningLead.findFirst({
        where: { email: normalizedEmail },
      });

      let existingLead = existingByEmail;
      if (!existingLead && normalizedPhone.length >= 7) {
        const candidates = await tx.privateDiningLead.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 100,
        });
        existingLead =
          candidates.find((l) => String(l.phone ?? '').replace(/\D/g, '') === normalizedPhone) ?? null;
      }

      const detailsLines = [
        existingLead
          ? 'New online form submission received.'
          : 'Lead created from online form submission.',
        'Submission channel: Private Events form',
        `Submitted at: ${new Date().toISOString()}`,
        `Preferred date: ${preferredDate.toISOString()}`,
        `Group size: ${groupSize}`,
        ...(message?.trim() ? [`Submitted message: ${message.trim()}`] : []),
      ];

      if (existingLead) {
        const updatedLead = await tx.privateDiningLead.update({
          where: { id: existingLead.id },
          data: {
            name,
            phone,
            email: normalizedEmail,
            groupSize,
            preferredDate,
            message: message || null,
            status: 'new',
          },
        });

        await tx.leadNote.create({
          data: {
            leadId: updatedLead.id,
            content: detailsLines.join('\n'),
            createdBy: null,
          },
        });

        return updatedLead;
      }

      const createdLead = await tx.privateDiningLead.create({
        data: {
          name,
          phone,
          email: normalizedEmail,
          groupSize,
          preferredDate,
          message: message || null,
          status: 'new',
        },
      });

      await tx.leadNote.create({
        data: {
          leadId: createdLead.id,
          content: detailsLines.join('\n'),
          createdBy: null,
        },
      });

      return createdLead;
    });

    await sendPrivateDiningLeadNotification({
      id: lead.id,
      name,
      phone,
      email,
      groupSize,
      preferredDate,
      message: message || null,
    });

    if (shouldSendCustomerConfirmationEmail()) {
      await sendCustomerConfirmationEmail({
        name,
        email: normalizedEmail,
        preferredDate,
        groupSize,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Your inquiry has been submitted successfully. We\'ll be in touch soon!',
      leadId: lead.id,
    });
  } catch (error) {
    console.error('Error processing private events contact form:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again later.' },
      { status: 500 }
    );
  }
}

