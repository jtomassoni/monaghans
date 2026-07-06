import { redirect } from 'next/navigation';

// Online ordering is handled entirely by Toast. This legacy route now
// forwards to the tracked Toast redirect so any old links/bookmarks still work.
export default function OrderPage() {
  redirect('/online-ordering');
}
