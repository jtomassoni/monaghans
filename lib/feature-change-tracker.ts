import fs from 'fs';
import path from 'path';
import { FeatureInfo, getAllFeatures } from './feature-extractor';
import { HelpDoc, loadAllHelpDocs } from './help-content-loader';

/**
 * Feature change types
 */
export enum ChangeType {
  ADDED = 'added',
  MODIFIED = 'modified',
  REMOVED = 'removed',
}

/**
 * Feature change information
 */
export interface FeatureChange {
  type: ChangeType;
  feature: FeatureInfo;
  previousState?: FeatureInfo;
  changeDetails?: {
    routeChanged?: boolean;
    lastModified?: Date;
    metadataChanged?: boolean;
  };
}

/**
 * Documentation change information
 */
export interface DocChange {
  type: ChangeType;
  doc: HelpDoc;
  previousState?: HelpDoc;
  changeDetails?: {
    titleChanged?: boolean;
    contentChanged?: boolean;
    metadataChanged?: boolean;
    lastUpdated?: Date;
  };
}

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  featureChanges: FeatureChange[];
  docChanges: DocChange[];
  featuresNeedingDocs: FeatureInfo[];
  docsNeedingUpdates: {
    doc: HelpDoc;
    reason: string;
    relatedFeature?: FeatureInfo;
  }[];
}

/**
 * Snapshot of feature state (for comparison)
 */
export interface FeatureSnapshot {
  timestamp: string;
  features: FeatureInfo[];
  docs: Array<{
    filePath: string;
    lastModified: string;
    metadata: {
      title: string;
      feature: string;
      route?: string;
      version?: string;
      lastUpdated?: string;
    };
  }>;
}

/**
 * Save a snapshot of current feature state
 */
export function saveFeatureSnapshot(snapshotPath?: string): FeatureSnapshot {
  const defaultPath = path.join(process.cwd(), '.help-docs-snapshot.json');
  const snapshotFile = snapshotPath || defaultPath;

  const features = getAllFeatures();
  const docs = loadAllHelpDocs();

  const snapshot: FeatureSnapshot = {
    timestamp: new Date().toISOString(),
    features: features.map((f) => ({
      ...f,
      lastModified: f.lastModified || new Date(),
    })),
    docs: docs.map((d) => ({
      filePath: d.filePath,
      lastModified: fs.statSync(d.filePath).mtime.toISOString(),
      metadata: {
        title: d.metadata.title,
        feature: d.metadata.feature,
        route: d.metadata.route,
        version: d.metadata.version,
        lastUpdated: d.metadata.lastUpdated,
      },
    })),
  };

  // Save snapshot
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), 'utf-8');

  return snapshot;
}

/**
 * Load a previous snapshot
 */
export function loadFeatureSnapshot(snapshotPath?: string): FeatureSnapshot | null {
  const defaultPath = path.join(process.cwd(), '.help-docs-snapshot.json');
  const snapshotFile = snapshotPath || defaultPath;

  if (!fs.existsSync(snapshotFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(snapshotFile, 'utf-8');
    return JSON.parse(content) as FeatureSnapshot;
  } catch (error) {
    console.error(`Error loading snapshot from ${snapshotFile}:`, error);
    return null;
  }
}

/**
 * Compare current state to previous snapshot
 */
export function detectFeatureChanges(
  previousSnapshot?: FeatureSnapshot,
  snapshotPath?: string
): ChangeDetectionResult {
  const currentFeatures = getAllFeatures();
  const currentDocs = loadAllHelpDocs();

  // Load previous snapshot if not provided
  const previous = previousSnapshot || loadFeatureSnapshot(snapshotPath);

  if (!previous) {
    // No previous snapshot - all features are "new"
    return {
      featureChanges: currentFeatures.map((f) => ({
        type: ChangeType.ADDED,
        feature: f,
      })),
      docChanges: currentDocs.map((d) => ({
        type: ChangeType.ADDED,
        doc: d,
      })),
      featuresNeedingDocs: currentFeatures.filter((f) => {
        // Check if feature has corresponding doc
        const hasDoc = currentDocs.some((d) => {
          if (d.metadata.route === f.route) return true;
          // Could add more sophisticated matching here
          return false;
        });
        return !hasDoc;
      }),
      docsNeedingUpdates: [],
    };
  }

  // Compare features
  const featureChanges: FeatureChange[] = [];
  const previousFeaturesMap = new Map<string, FeatureInfo>();
  previous.features.forEach((f) => {
    previousFeaturesMap.set(f.route, f);
  });

  const currentFeaturesMap = new Map<string, FeatureInfo>();
  currentFeatures.forEach((f) => {
    currentFeaturesMap.set(f.route, f);
  });

  // Find added features
  for (const currentFeature of currentFeatures) {
    const previousFeature = previousFeaturesMap.get(currentFeature.route);
    if (!previousFeature) {
      featureChanges.push({
        type: ChangeType.ADDED,
        feature: currentFeature,
      });
    } else {
      // Check if modified
      const currentModified = currentFeature.lastModified || new Date(0);
      const previousModified = previousFeature.lastModified || new Date(0);
      
      if (currentModified > previousModified) {
        featureChanges.push({
          type: ChangeType.MODIFIED,
          feature: currentFeature,
          previousState: previousFeature,
          changeDetails: {
            lastModified: currentModified,
            routeChanged: currentFeature.route !== previousFeature.route,
          },
        });
      }
    }
  }

  // Find removed features
  for (const previousFeature of previous.features) {
    if (!currentFeaturesMap.has(previousFeature.route)) {
      featureChanges.push({
        type: ChangeType.REMOVED,
        feature: previousFeature,
        previousState: previousFeature,
      });
    }
  }

  // Compare docs
  const docChanges: DocChange[] = [];
  const previousDocsMap = new Map<string, typeof previous.docs[0]>();
  previous.docs.forEach((d) => {
    previousDocsMap.set(d.filePath, d);
  });

  for (const currentDoc of currentDocs) {
    const previousDoc = previousDocsMap.get(currentDoc.filePath);
    if (!previousDoc) {
      docChanges.push({
        type: ChangeType.ADDED,
        doc: currentDoc,
      });
    } else {
      // Check if modified
      const currentStats = fs.statSync(currentDoc.filePath);
      const currentModified = currentStats.mtime;
      const previousModified = new Date(previousDoc.lastModified);

      if (currentModified > previousModified) {
        const titleChanged = currentDoc.metadata.title !== previousDoc.metadata.title;
        const metadataChanged =
          currentDoc.metadata.route !== previousDoc.metadata.route ||
          currentDoc.metadata.version !== previousDoc.metadata.version ||
          currentDoc.metadata.lastUpdated !== previousDoc.metadata.lastUpdated;

        docChanges.push({
          type: ChangeType.MODIFIED,
          doc: currentDoc,
          previousState: {
            metadata: previousDoc.metadata as any,
            content: '', // We don't store content in snapshot
            slug: path.basename(currentDoc.filePath, '.md'),
            filePath: currentDoc.filePath,
          },
          changeDetails: {
            titleChanged,
            metadataChanged,
            lastUpdated: currentModified,
          },
        });
      }
    }
  }

  // Find removed docs
  for (const previousDoc of previous.docs) {
    if (!fs.existsSync(previousDoc.filePath)) {
      docChanges.push({
        type: ChangeType.REMOVED,
        doc: {
          metadata: previousDoc.metadata as any,
          content: '',
          slug: path.basename(previousDoc.filePath, '.md'),
          filePath: previousDoc.filePath,
        },
        previousState: {
          metadata: previousDoc.metadata as any,
          content: '',
          slug: path.basename(previousDoc.filePath, '.md'),
          filePath: previousDoc.filePath,
        },
      });
    }
  }

  // Find features needing docs
  const featuresNeedingDocs: FeatureInfo[] = [];
  for (const feature of currentFeatures) {
    const hasDoc = currentDocs.some((d) => {
      if (d.metadata.route === feature.route) return true;
      // Could add more sophisticated matching
      return false;
    });
    if (!hasDoc) {
      featuresNeedingDocs.push(feature);
    }
  }

  // Find docs needing updates
  const docsNeedingUpdates: ChangeDetectionResult['docsNeedingUpdates'] = [];
  for (const change of featureChanges) {
    if (change.type === ChangeType.ADDED || change.type === ChangeType.MODIFIED) {
      // Find related docs
      const relatedDocs = currentDocs.filter((d) => {
        if (d.metadata.route === change.feature.route) return true;
        // Could add more sophisticated matching
        return false;
      });

      for (const doc of relatedDocs) {
        const docLastUpdated = doc.metadata.lastUpdated
          ? new Date(doc.metadata.lastUpdated)
          : null;
        const featureLastModified = change.feature.lastModified || new Date();

        if (!docLastUpdated || featureLastModified > docLastUpdated) {
          docsNeedingUpdates.push({
            doc,
            reason:
              change.type === ChangeType.ADDED
                ? 'New feature added - documentation may need updates'
                : 'Feature was modified after documentation was last updated',
            relatedFeature: change.feature,
          });
        }
      }
    }
  }

  return {
    featureChanges,
    docChanges,
    featuresNeedingDocs,
    docsNeedingUpdates,
  };
}

