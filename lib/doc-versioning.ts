import fs from 'fs';
import path from 'path';
import { HelpDoc, loadAllHelpDocs } from './help-content-loader';

/**
 * Documentation version information
 */
export interface DocVersion {
  version: string;
  date: string;
  changes: string[];
  author?: string;
}

/**
 * Documentation changelog entry
 */
export interface DocChangelogEntry {
  doc: HelpDoc;
  versions: DocVersion[];
  lastVersion?: string;
  lastUpdated?: string;
}

/**
 * Changelog for all documentation
 */
export interface DocChangelog {
  timestamp: string;
  entries: DocChangelogEntry[];
}

/**
 * Parse version string (semver format: major.minor.patch)
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Increment version number
 */
export function incrementVersion(
  currentVersion: string,
  type: 'major' | 'minor' | 'patch' = 'patch'
): string {
  const parsed = parseVersion(currentVersion);
  if (!parsed) {
    // Default version if parsing fails
    return type === 'major' ? '1.0.0' : type === 'minor' ? '0.1.0' : '0.0.1';
  }

  if (type === 'major') {
    return `${parsed.major + 1}.0.0`;
  } else if (type === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  } else {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
}

/**
 * Get current version of a documentation file
 */
export function getDocVersion(doc: HelpDoc): string {
  return doc.metadata.version || '0.0.0';
}

/**
 * Update documentation version
 */
export function updateDocVersion(
  docPath: string,
  newVersion: string,
  changes: string[] = []
): boolean {
  try {
    if (!fs.existsSync(docPath)) {
      console.error(`Documentation file not found: ${docPath}`);
      return false;
    }

    const content = fs.readFileSync(docPath, 'utf-8');
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      console.error(`Invalid frontmatter in: ${docPath}`);
      return false;
    }

    const frontmatterText = match[1];
    const body = match[2];

    // Parse and update frontmatter
    const lines = frontmatterText.split('\n');
    const updatedLines: string[] = [];
    let versionFound = false;
    let lastUpdatedFound = false;

    for (const line of lines) {
      if (line.startsWith('version:')) {
        updatedLines.push(`version: "${newVersion}"`);
        versionFound = true;
      } else if (line.startsWith('lastUpdated:')) {
        updatedLines.push(`lastUpdated: "${new Date().toISOString().split('T')[0]}"`);
        lastUpdatedFound = true;
      } else {
        updatedLines.push(line);
      }
    }

    // Add version if not found
    if (!versionFound) {
      updatedLines.push(`version: "${newVersion}"`);
    }

    // Add lastUpdated if not found
    if (!lastUpdatedFound) {
      updatedLines.push(`lastUpdated: "${new Date().toISOString().split('T')[0]}"`);
    }

    // Reconstruct file
    const newFrontmatter = updatedLines.join('\n');
    const newContent = `---\n${newFrontmatter}\n---\n${body}`;

    fs.writeFileSync(docPath, newContent, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error updating version in ${docPath}:`, error);
    return false;
  }
}

/**
 * Generate changelog for all documentation
 */
export function generateDocChangelog(): DocChangelog {
  const allDocs = loadAllHelpDocs();
  const entries: DocChangelogEntry[] = [];

  for (const doc of allDocs) {
    const versions: DocVersion[] = [];

    // Extract version information
    if (doc.metadata.version) {
      versions.push({
        version: doc.metadata.version,
        date: doc.metadata.lastUpdated || new Date().toISOString().split('T')[0],
        changes: ['Current version'],
      });
    }

    entries.push({
      doc,
      versions,
      lastVersion: doc.metadata.version,
      lastUpdated: doc.metadata.lastUpdated,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    entries,
  };
}

/**
 * Save changelog to file
 */
export function saveDocChangelog(changelog: DocChangelog, changelogPath?: string): void {
  const defaultPath = path.join(process.cwd(), 'docs', 'help-content', 'CHANGELOG.json');
  const filePath = changelogPath || defaultPath;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(changelog, null, 2), 'utf-8');
}

/**
 * Load changelog from file
 */
export function loadDocChangelog(changelogPath?: string): DocChangelog | null {
  const defaultPath = path.join(process.cwd(), 'docs', 'help-content', 'CHANGELOG.json');
  const filePath = changelogPath || defaultPath;

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as DocChangelog;
  } catch (error) {
    console.error(`Error loading changelog from ${filePath}:`, error);
    return null;
  }
}

/**
 * Compare two versions and determine if update is needed
 */
export function shouldUpdateDocVersion(
  currentVersion: string,
  featureLastModified: Date,
  docLastUpdated?: string
): { shouldUpdate: boolean; suggestedVersion: string; reason: string } {
  const docDate = docLastUpdated ? new Date(docLastUpdated) : new Date(0);
  const featureDate = featureLastModified;

  // If feature was modified after doc was updated, suggest version bump
  if (featureDate > docDate) {
    const parsed = parseVersion(currentVersion);
    if (parsed) {
      // Determine version bump type based on time difference
      const daysDiff = (featureDate.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 30) {
        // Major change if more than 30 days
        return {
          shouldUpdate: true,
          suggestedVersion: incrementVersion(currentVersion, 'major'),
          reason: 'Feature modified significantly after documentation (30+ days)',
        };
      } else if (daysDiff > 7) {
        // Minor change if more than 7 days
        return {
          shouldUpdate: true,
          suggestedVersion: incrementVersion(currentVersion, 'minor'),
          reason: 'Feature modified after documentation (7+ days)',
        };
      } else {
        // Patch for recent changes
        return {
          shouldUpdate: true,
          suggestedVersion: incrementVersion(currentVersion, 'patch'),
          reason: 'Feature modified recently after documentation',
        };
      }
    }
  }

  return {
    shouldUpdate: false,
    suggestedVersion: currentVersion,
    reason: 'Documentation is up to date',
  };
}

