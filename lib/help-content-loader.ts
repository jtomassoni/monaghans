import fs from 'fs';
import path from 'path';
import { FeatureKey } from './help-keywords';

/**
 * Help Documentation Metadata
 */
export interface HelpDocMetadata {
  title: string;
  feature: FeatureKey;
  route?: string;
  keywords?: string[];
  aliases?: string[];
  relatedFeatures?: FeatureKey[];
  version?: string;
  lastUpdated?: string;
}

/**
 * Help Documentation Content
 */
export interface HelpDoc {
  metadata: HelpDocMetadata;
  content: string;
  slug: string;
  filePath: string;
}

/**
 * Simple YAML frontmatter parser
 * Parses markdown files with YAML frontmatter (---\n...\n---)
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];

  // Simple YAML parser for basic key-value pairs
  const frontmatter: Record<string, any> = {};
  const lines = frontmatterText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Handle arrays (simple format: - item1, - item2 or [item1, item2])
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      frontmatter[key] = arrayContent
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter((item) => item.length > 0);
    } else if (value.startsWith('-')) {
      // Multi-line array format
      const arrayItems: string[] = [];
      let currentLine = line;
      let lineIndex = lines.indexOf(line);
      
      while (lineIndex < lines.length && lines[lineIndex].trim().startsWith('-')) {
        const item = lines[lineIndex].trim().substring(1).trim().replace(/^["']|["']$/g, '');
        if (item) arrayItems.push(item);
        lineIndex++;
      }
      
      if (arrayItems.length > 0) {
        frontmatter[key] = arrayItems;
        continue;
      }
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Load a single help documentation file
 */
export function loadHelpDoc(filePath: string): HelpDoc | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // Extract slug from filename
    const fileName = path.basename(filePath, '.md');
    const slug = fileName;

    // Validate required fields
    if (!frontmatter.title || !frontmatter.feature) {
      console.warn(`Help doc ${filePath} is missing required fields (title, feature)`);
      return null;
    }

    const metadata: HelpDocMetadata = {
      title: frontmatter.title,
      feature: frontmatter.feature as FeatureKey,
      route: frontmatter.route,
      keywords: frontmatter.keywords || [],
      aliases: frontmatter.aliases || [],
      relatedFeatures: frontmatter.relatedFeatures || [],
      version: frontmatter.version,
      lastUpdated: frontmatter.lastUpdated,
    };

    return {
      metadata,
      content: body.trim(),
      slug,
      filePath,
    };
  } catch (error) {
    console.error(`Error loading help doc ${filePath}:`, error);
    return null;
  }
}

/**
 * Load all help documentation files from a directory
 */
export function loadHelpDocsFromDirectory(dirPath: string): HelpDoc[] {
  const docs: HelpDoc[] = [];

  try {
    if (!fs.existsSync(dirPath)) {
      return docs;
    }

    const files = fs.readdirSync(dirPath);
    const mdFiles = files.filter((file) => file.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      const doc = loadHelpDoc(filePath);
      if (doc) {
        docs.push(doc);
      }
    }
  } catch (error) {
    console.error(`Error loading help docs from ${dirPath}:`, error);
  }

  return docs;
}

/**
 * Load all help documentation files
 */
export function loadAllHelpDocs(): HelpDoc[] {
  const baseDir = path.join(process.cwd(), 'docs', 'help-content');
  const allDocs: HelpDoc[] = [];

  // Load docs from all feature directories
  const featureDirs = ['events', 'menu', 'specials', 'announcements', 'homepage', 'signage', 'settings'];

  for (const featureDir of featureDirs) {
    const dirPath = path.join(baseDir, featureDir);
    const docs = loadHelpDocsFromDirectory(dirPath);
    allDocs.push(...docs);
  }

  return allDocs;
}

/**
 * Find help docs by feature
 */
export function findHelpDocsByFeature(feature: FeatureKey): HelpDoc[] {
  const allDocs = loadAllHelpDocs();
  return allDocs.filter((doc) => doc.metadata.feature === feature);
}

/**
 * Find help doc by slug
 */
export function findHelpDocBySlug(slug: string, feature?: FeatureKey): HelpDoc | null {
  const allDocs = loadAllHelpDocs();
  
  if (feature) {
    return allDocs.find((doc) => doc.slug === slug && doc.metadata.feature === feature) || null;
  }
  
  return allDocs.find((doc) => doc.slug === slug) || null;
}

/**
 * Search help docs by query (searches title, content, keywords, aliases)
 */
export function searchHelpDocs(query: string): HelpDoc[] {
  const normalizedQuery = query.toLowerCase().trim();
  const allDocs = loadAllHelpDocs();
  const matchingDocs: HelpDoc[] = [];

  for (const doc of allDocs) {
    const searchableText = [
      doc.metadata.title,
      doc.content,
      ...(doc.metadata.keywords || []),
      ...(doc.metadata.aliases || []),
      doc.slug,
    ]
      .join(' ')
      .toLowerCase();

    // Check for exact match or partial match
    if (
      searchableText.includes(normalizedQuery) ||
      normalizedQuery.split(' ').some((word) => searchableText.includes(word))
    ) {
      matchingDocs.push(doc);
    }
  }

  // Sort by relevance (exact matches first, then partial matches)
  matchingDocs.sort((a, b) => {
    const aTitle = a.metadata.title.toLowerCase();
    const bTitle = b.metadata.title.toLowerCase();
    
    const aExact = aTitle === normalizedQuery;
    const bExact = bTitle === normalizedQuery;
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    const aStarts = aTitle.startsWith(normalizedQuery);
    const bStarts = bTitle.startsWith(normalizedQuery);
    
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    return 0;
  });

  return matchingDocs;
}

