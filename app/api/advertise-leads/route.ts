import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

/**
 * POST /api/advertise-leads
 * Public endpoint for capturing advertising lead inquiries
 * No auth required, but consider rate limiting in production
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, businessName, message, adType } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Create lead record
    const lead = await prisma.advertiseLead.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        businessName: businessName?.trim() || null,
        message: message?.trim() || null,
        adType: adType || null,
        status: 'new',
      },
    });

    // TODO: Send notification email if email system exists
    // For now, we'll just log it
    console.log('New advertising lead created:', {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      adType: lead.adType,
    });

    return NextResponse.json(
      { success: true, id: lead.id },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error, 'Failed to create advertising lead');
  }
}

