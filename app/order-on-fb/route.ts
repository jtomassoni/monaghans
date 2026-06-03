import { handleOrderingRedirect } from '@/lib/ordering-redirect-handler';

/** Facebook / social posts: monaghansbarandgrilldenver.com/order-on-fb */
export async function GET() {
  return handleOrderingRedirect('order-on-fb');
}
