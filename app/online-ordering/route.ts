import { handleOrderingRedirect } from '@/lib/ordering-redirect-handler';

/** General site & email: monaghansbarandgrilldenver.com/online-ordering */
export async function GET() {
  return handleOrderingRedirect('online-ordering');
}
