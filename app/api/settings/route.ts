import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import { PRIVATE_DINING_NOTIFICATION_EMAILS_KEY } from '@/lib/private-dining-notifications';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

const SENSITIVE_SETTING_KEYS = new Set([PRIVATE_DINING_NOTIFICATION_EMAILS_KEY]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const session = await getServerSession(authOptions);
    const isAdmin = Boolean(session?.user && getPermissions(session.user.role).canAccessAdmin);

    if (key) {
      if (SENSITIVE_SETTING_KEYS.has(key) && !isAdmin) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const setting = await prisma.setting.findUnique({
        where: { key },
      });
      return NextResponse.json(setting);
    }

    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });

    const visible = isAdmin
      ? settings
      : settings.filter((s) => !SENSITIVE_SETTING_KEYS.has(s.key));

    return NextResponse.json(visible);
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

    if (body.key === PRIVATE_DINING_NOTIFICATION_EMAILS_KEY) {
      return NextResponse.json(
        {
          error:
            'This setting is managed in Admin → Private Dining Leads → Email alerts (or PUT /api/admin/private-dining-notifications).',
        },
        { status: 400 }
      );
    }

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

