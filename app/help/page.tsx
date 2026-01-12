import { redirect } from 'next/navigation';

interface HelpPageProps {
  searchParams: Promise<{
    section?: string;
    feature?: string;
    slug?: string;
    q?: string;
  }>;
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const params = await searchParams;
  const { section, feature, slug, q } = params;
  
  // Build redirect URL with query params
  const queryParams = new URLSearchParams();
  if (section) queryParams.set('section', section);
  if (feature) queryParams.set('feature', feature);
  if (slug) queryParams.set('slug', slug);
  if (q) queryParams.set('q', q);
  
  const queryString = queryParams.toString();
  const redirectUrl = `/admin/help${queryString ? `?${queryString}` : ''}`;
  
  redirect(redirectUrl);
}
