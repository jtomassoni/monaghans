import { NextResponse, type NextRequest } from 'next/server';
import {
  applyFacebookFoodSpecialImport,
  dismissFacebookFoodSpecialImport,
} from '@/lib/facebook-food-special-import';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get('token') || '');
  const intent = String(form.get('intent') || 'apply');
  const pageUrl = new URL(`/food-specials/import/${encodeURIComponent(token)}`, req.url);

  const result =
    intent === 'dismiss'
      ? await dismissFacebookFoodSpecialImport(token)
      : await applyFacebookFoodSpecialImport({
          token,
          title: String(form.get('title') || ''),
          description: String(form.get('description') || ''),
          priceNotes: String(form.get('priceNotes') || ''),
        });

  if (!result.ok) {
    pageUrl.searchParams.set('error', result.error);
  }

  return NextResponse.redirect(pageUrl, 303);
}
