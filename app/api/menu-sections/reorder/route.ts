import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { sections } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Invalid request: sections must be an array' },
        { status: 400 }
      );
    }

    // Update all sections in a transaction
    await prisma.$transaction(
      sections.map((section: { id: string; displayOrder: number }) =>
        prisma.menuSection.update({
          where: { id: section.id },
          data: { displayOrder: section.displayOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to reorder menu sections');
  }
}

