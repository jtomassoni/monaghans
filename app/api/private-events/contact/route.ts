import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRecaptcha } from '@/lib/recaptcha-verify';

/**
 * POST /api/private-events/contact
 * Handle private events contact form submission - saves to CRM
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, groupSize, date, message, recaptchaToken } = body;

    // Verify reCAPTCHA if configured
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 400 }
        );
      }

      const verification = await verifyRecaptcha(
        recaptchaToken,
        process.env.RECAPTCHA_SECRET_KEY
      );

      if (!verification.success) {
        console.error('reCAPTCHA verification failed:', verification.error);
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 400 }
        );
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

    // Create lead in database
    const lead = await prisma.privateDiningLead.create({
      data: {
        name,
        phone,
        email,
        groupSize,
        preferredDate,
        message: message || null,
        status: 'new',
      },
    });

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

