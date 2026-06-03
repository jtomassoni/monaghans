import {
  ORDERING_REDIRECT_PATHS,
  type OrderingRedirectSlug,
} from '@/lib/ordering-redirect-tracking';

/** Grubhub restaurant page — pickup only */
export const GRUBHUB_RESTAURANT_URL =
  'https://www.grubhub.com/restaurant/monaghans-bar--grill-3889-s-king-st-denver/2434939';

export type GrubhubTrackingCampaign = OrderingRedirectSlug;

/** On-site tracked redirect paths for marketing (counts clicks before Grubhub) */
export function orderingRedirectPath(slug: OrderingRedirectSlug): string {
  return ORDERING_REDIRECT_PATHS[slug];
}

export function grubhubOrderUrl(tracking?: { campaign?: GrubhubTrackingCampaign }): string {
  const url = new URL(GRUBHUB_RESTAURANT_URL);
  url.searchParams.set('orderMethod', 'pickup');
  if (tracking?.campaign) {
    url.searchParams.set('utm_source', 'monaghans');
    url.searchParams.set('utm_medium', 'website');
    url.searchParams.set('utm_campaign', tracking.campaign);
  }
  return url.toString();
}
