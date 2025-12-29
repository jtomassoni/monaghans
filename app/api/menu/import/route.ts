import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { importMenu, ImportPlatform } from '@/lib/menu-import-adapters';
import { isFeatureEnabled } from '@/lib/feature-flags';

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  // Check feature flag
  const isEnabled = await isFeatureEnabled('menu_import');
  if (!isEnabled) {
    return NextResponse.json(
      { error: 'Menu import feature is not enabled' },
      { status: 403 }
    );
  }

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as ImportPlatform;
    const importMode = formData.get('importMode') as 'create' | 'update' | 'merge' || 'create';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({ error: 'No platform specified' }, { status: 400 });
    }

    // Read file content
    const content = await file.text();
    const mimeType = file.type;

    // Parse the menu
    const result = importMenu(content, platform, mimeType);

    if (result.errors.length > 0 && result.sections.length === 0) {
      return NextResponse.json(
        { 
          error: 'Import failed',
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 400 }
      );
    }

    // Import sections and items
    const importedSections: string[] = [];
    const importedItems: string[] = [];
    const errors: string[] = [...result.errors];

    for (const sectionData of result.sections) {
      try {
        // Find or create section
        let section = await prisma.menuSection.findFirst({
          where: { name: sectionData.name },
        });

        if (!section) {
          section = await prisma.menuSection.create({
            data: {
              name: sectionData.name,
              description: sectionData.description || null,
              menuType: sectionData.menuType || 'dinner',
              displayOrder: sectionData.displayOrder ?? 0,
              isActive: true,
            },
          });
          importedSections.push(section.id);
        } else if (importMode === 'update' || importMode === 'merge') {
          // Update existing section
          section = await prisma.menuSection.update({
            where: { id: section.id },
            data: {
              description: sectionData.description || section.description,
              menuType: sectionData.menuType || section.menuType,
            },
          });
        }

        // Import items
        for (const itemData of sectionData.items) {
          try {
            if (importMode === 'create') {
              // Only create if doesn't exist
              const existing = await prisma.menuItem.findFirst({
                where: {
                  sectionId: section.id,
                  name: itemData.name,
                },
              });

              if (existing) {
                continue; // Skip existing items in create mode
              }
            }

            const item = await prisma.menuItem.create({
              data: {
                sectionId: section.id,
                name: itemData.name,
                description: itemData.description || null,
                price: itemData.price || null,
                priceNotes: itemData.priceNotes || null,
                modifiers: itemData.modifiers || null,
                isAvailable: itemData.isAvailable !== false,
                displayOrder: importedItems.length,
                prepTimeMin: itemData.prepTimeMin || null,
              },
            });
            importedItems.push(item.id);
          } catch (err) {
            errors.push(`Failed to import item "${itemData.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      } catch (err) {
        errors.push(`Failed to import section "${sectionData.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Log activity - use menuItem as entity type since we're creating menu items
    await logActivity(
      user.id,
      'create',
      'menuItem',
      'import',
      `Imported ${importedSections.length} sections and ${importedItems.length} items from ${platform}`,
      undefined,
      `Menu import from ${platform}: ${importedSections.length} sections, ${importedItems.length} items`
    );

    return NextResponse.json({
      success: true,
      imported: {
        sections: importedSections.length,
        items: importedItems.length,
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    });
  } catch (error) {
    return handleError(error, 'Failed to import menu');
  }
}

