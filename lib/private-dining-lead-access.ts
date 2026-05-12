import { NextResponse } from 'next/server';

/** Owners cannot read or mutate leads that were soft-hidden. Admins can. */
export function leadBlockedForOwner(role: string | null | undefined, hiddenAt: Date | null): boolean {
  return role === 'owner' && hiddenAt != null;
}

export function leadNotFoundResponse(): NextResponse {
  return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
}
