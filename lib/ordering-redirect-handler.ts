import { NextResponse } from 'next/server';
import {
  recordOrderingRedirectClick,
  type OrderingRedirectSlug,
} from '@/lib/ordering-redirect-tracking';
import { toastOrderUrl } from '@/lib/ordering-partners';

export async function handleOrderingRedirect(slug: OrderingRedirectSlug): Promise<NextResponse> {
  try {
    await recordOrderingRedirectClick(slug);
  } catch (error) {
    console.error(`Failed to record ordering redirect click (${slug}):`, error);
  }

  return NextResponse.redirect(toastOrderUrl({ campaign: slug }), 302);
}
