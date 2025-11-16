import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { sections } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Invalid request: sections must be an array' },
        { status: 400 }
      );
    }

    // Get section names for logging
    const sectionIds = sections.map((s: { id: string }) => s.id);
    const sectionNames = await prisma.menuSection.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(sectionNames.map(s => [s.id, s.name]));

    // Update all sections in a transaction
    await prisma.$transaction(
      sections.map((section: { id: string; displayOrder: number }) =>
        prisma.menuSection.update({
          where: { id: section.id },
          data: { displayOrder: section.displayOrder },
        })
      )
    );

    // Log activity for reordering
    await logActivity(
      user.id,
      'update',
      'menuSection',
      'multiple',
      `${sections.length} sections`,
      undefined,
      `reordered ${sections.length} menu section${sections.length === 1 ? '' : 's'}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to reorder menu sections');
  }
}

