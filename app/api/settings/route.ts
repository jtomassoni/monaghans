import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key) {
      const setting = await prisma.setting.findUnique({
        where: { key },
      });
      return NextResponse.json(setting);
    }

    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return handleError(error, 'Failed to fetch settings');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    
    // Get existing setting to track changes
    const existingSetting = await prisma.setting.findUnique({
      where: { key: body.key },
    });

    const newValue = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
    const oldValue = existingSetting?.value || null;

    const setting = await prisma.setting.upsert({
      where: { key: body.key },
      update: {
        value: newValue,
        description: body.description,
      },
      create: {
        key: body.key,
        value: newValue,
        description: body.description,
      },
    });

    // Log activity for setting updates
    const action = existingSetting ? 'update' : 'create';
    const entityName = getSettingDisplayName(body.key);
    
    // Track changes for contact info specifically
    let changes: Record<string, { before: any; after: any }> | undefined;
    let description: string | undefined;

    if (body.key === 'contact' && oldValue) {
      try {
        const oldContact = JSON.parse(oldValue);
        const newContact = body.value;
        
        // Track individual field changes
        const contactFields = ['address', 'city', 'state', 'zip', 'phone', 'email'];
        changes = {};
        
        for (const field of contactFields) {
          const oldVal = oldContact[field] || '';
          const newVal = newContact[field] || '';
          if (oldVal !== newVal) {
            changes[field] = { before: oldVal || '(empty)', after: newVal || '(empty)' };
          }
        }

        if (Object.keys(changes).length > 0) {
          const changedFields = Object.keys(changes);
          description = `Updated contact info: ${changedFields.join(', ')}`;
        } else {
          description = 'Updated contact information';
        }
      } catch (e) {
        // If parsing fails, use generic description
        description = 'Updated contact information';
      }
    } else if (action === 'update') {
      // For other settings, create a generic update description
      description = `Updated ${entityName}`;
    } else {
      description = `Created ${entityName}`;
    }

    await logActivity(
      user.id,
      action,
      'setting',
      setting.id,
      entityName,
      changes,
      description
    );

    return NextResponse.json(setting, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create/update setting');
  }
}

function getSettingDisplayName(key: string): string {
  const displayNames: Record<string, string> = {
    contact: 'Contact Information',
    hours: 'Business Hours',
    social: 'Social Media Links',
    happyHour: 'Happy Hour Information',
    mapEmbed: 'Google Maps Embed',
  };
  return displayNames[key] || key;
}

