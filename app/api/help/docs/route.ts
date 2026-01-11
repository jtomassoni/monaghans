import { NextRequest, NextResponse } from 'next/server';
import { findHelpDocBySlug, findHelpDocsByFeature, loadAllHelpDocs, searchHelpDocs } from '@/lib/help-content-loader';
import { FeatureKey } from '@/lib/help-keywords';

/**
 * GET /api/help/docs
 * Fetch help documentation
 * 
 * Query params:
 * - feature: Feature key to filter by
 * - slug: Specific doc slug
 * - search: Search query
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const feature = searchParams.get('feature') as FeatureKey | null;
    const slug = searchParams.get('slug');
    const search = searchParams.get('search');

    if (search) {
      // Search mode
      const results = searchHelpDocs(search);
      return NextResponse.json({ docs: results });
    }

    if (slug && feature) {
      // Get specific doc
      const doc = findHelpDocBySlug(slug, feature);
      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json({ doc });
    }

    if (feature) {
      // Get all docs for feature
      const docs = findHelpDocsByFeature(feature);
      return NextResponse.json({ docs });
    }

    // Get all docs
    const docs = loadAllHelpDocs();
    return NextResponse.json({ docs });
  } catch (error) {
    console.error('Error fetching help docs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch help documentation' },
      { status: 500 }
    );
  }
}

