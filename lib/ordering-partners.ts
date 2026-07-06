import {
  ORDERING_REDIRECT_PATHS,
  type OrderingRedirectSlug,
} from '@/lib/ordering-redirect-tracking';

/** Toast online ordering page — pickup */
export const TOAST_ORDER_URL =
  'https://www.toasttab.com/local/order/monaghans-bar-and-grill-em-3889-south-king-street';

export type OrderingTrackingCampaign = OrderingRedirectSlug;

/** On-site tracked redirect paths for marketing (counts clicks before Toast) */
export function orderingRedirectPath(slug: OrderingRedirectSlug): string {
  return ORDERING_REDIRECT_PATHS[slug];
}

export function toastOrderUrl(tracking?: { campaign?: OrderingTrackingCampaign }): string {
  const url = new URL(TOAST_ORDER_URL);
  if (tracking?.campaign) {
    url.searchParams.set('utm_source', 'monaghans');
    url.searchParams.set('utm_medium', 'website');
    url.searchParams.set('utm_campaign', tracking.campaign);
  }
  return url.toString();
}
