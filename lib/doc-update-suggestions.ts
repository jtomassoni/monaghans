import { FeatureInfo } from './feature-extractor';
import { HelpDoc, loadAllHelpDocs } from './help-content-loader';
import { FeatureChange, ChangeType } from './feature-change-tracker';
import { routeToFeatureKey } from './feature-extractor';
import { FeatureKey } from './help-keywords';

/**
 * Suggestion for documentation update
 */
export interface DocUpdateSuggestion {
  doc: HelpDoc;
  feature?: FeatureInfo;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  action: 'update' | 'create' | 'review';
  details?: {
    fieldsToUpdate?: string[];
    sectionsToReview?: string[];
    newContentNeeded?: boolean;
  };
}

/**
 * Generate documentation update suggestions based on feature changes
 */
export function generateDocUpdateSuggestions(
  featureChanges: FeatureChange[]
): DocUpdateSuggestion[] {
  const suggestions: DocUpdateSuggestion[] = [];
  const allDocs = loadAllHelpDocs();

  for (const change of featureChanges) {
    if (change.type === ChangeType.ADDED) {
      // New feature - check if doc exists
      const relatedDocs = findRelatedDocs(change.feature, allDocs);
      
      if (relatedDocs.length === 0) {
        // No doc exists - suggest creating one
        suggestions.push({
          doc: createPlaceholderDoc(change.feature),
          feature: change.feature,
          suggestion: `Create new help documentation for ${change.feature.name}`,
          priority: 'high',
          action: 'create',
          details: {
            newContentNeeded: true,
          },
        });
      } else {
        // Doc exists but may need updates
        for (const doc of relatedDocs) {
          suggestions.push({
            doc,
            feature: change.feature,
            suggestion: `Review documentation for ${change.feature.name} - feature was recently added`,
            priority: 'medium',
            action: 'review',
            details: {
              sectionsToReview: ['overview', 'getting-started'],
            },
          });
        }
      }
    } else if (change.type === ChangeType.MODIFIED) {
      // Modified feature - suggest updating related docs
      const relatedDocs = findRelatedDocs(change.feature, allDocs);
      
      for (const doc of relatedDocs) {
        const docLastUpdated = doc.metadata.lastUpdated
          ? new Date(doc.metadata.lastUpdated)
          : null;
        const featureLastModified = change.feature.lastModified || new Date();

        if (!docLastUpdated || featureLastModified > docLastUpdated) {
          suggestions.push({
            doc,
            feature: change.feature,
            suggestion: `Update documentation for ${change.feature.name} - feature was modified`,
            priority: 'high',
            action: 'update',
            details: {
              fieldsToUpdate: ['lastUpdated'],
              sectionsToReview: ['features', 'usage', 'examples'],
            },
          });
        }
      }
    } else if (change.type === ChangeType.REMOVED) {
      // Removed feature - suggest archiving or removing docs
      const relatedDocs = findRelatedDocs(change.feature, allDocs);
      
      for (const doc of relatedDocs) {
        suggestions.push({
          doc,
          feature: change.feature,
          suggestion: `Review documentation for ${change.feature.name} - feature was removed`,
          priority: 'medium',
          action: 'review',
          details: {
            sectionsToReview: ['all'],
          },
        });
      }
    }
  }

  return suggestions;
}

/**
 * Find documentation related to a feature
 */
function findRelatedDocs(feature: FeatureInfo, allDocs: HelpDoc[]): HelpDoc[] {
  const related: HelpDoc[] = [];

  // Match by route
  const routeMatch = allDocs.filter((d) => d.metadata.route === feature.route);
  related.push(...routeMatch);

  // Match by feature key
  const featureKey = routeToFeatureKey(feature.route);
  if (featureKey) {
    const featureMatch = allDocs.filter(
      (d) => d.metadata.feature === (featureKey as FeatureKey)
    );
    related.push(...featureMatch);
  }

  // Match by name (fuzzy)
  const nameMatch = allDocs.filter((d) => {
    const docTitle = d.metadata.title.toLowerCase();
    const featureName = feature.name.toLowerCase();
    return docTitle.includes(featureName) || featureName.includes(docTitle);
  });
  related.push(...nameMatch);

  // Deduplicate
  const unique = new Map<string, HelpDoc>();
  for (const doc of related) {
    if (!unique.has(doc.filePath)) {
      unique.set(doc.filePath, doc);
    }
  }

  return Array.from(unique.values());
}

/**
 * Create a placeholder doc for a new feature
 */
function createPlaceholderDoc(feature: FeatureInfo): HelpDoc {
  const featureKey = routeToFeatureKey(feature.route) || 'settings';
  const slug = feature.route.replace(/\//g, '-').replace(/^-/, '');

  return {
    metadata: {
      title: feature.name,
      feature: featureKey as FeatureKey,
      route: feature.route,
      version: '1.0.0',
      lastUpdated: new Date().toISOString().split('T')[0],
    },
    content: `# ${feature.name}\n\nDocumentation for ${feature.name} feature.\n\n## Overview\n\n[Add overview here]\n\n## Getting Started\n\n[Add getting started instructions here]`,
    slug,
    filePath: `docs/help-content/${featureKey}/${slug}.md`,
  };
}

/**
 * Generate template for new feature documentation
 */
export function generateDocTemplate(feature: FeatureInfo): string {
  const featureKey = routeToFeatureKey(feature.route) || 'settings';
  const today = new Date().toISOString().split('T')[0];

  return `---
title: "${feature.name}"
feature: ${featureKey}
route: "${feature.route}"
version: "1.0.0"
lastUpdated: "${today}"
keywords: []
aliases: []
relatedFeatures: []
---

# ${feature.name}

## Overview

[Describe what this feature does and why users would use it]

## Getting Started

[Step-by-step instructions for basic usage]

## Features

[Describe key features and capabilities]

## Usage Examples

[Provide examples of common use cases]

## Troubleshooting

[Common issues and solutions]

## Related Features

[Links to related help documentation]
`;
}

/**
 * Suggest specific sections that need updates based on feature changes
 */
export function suggestDocSectionsToUpdate(
  feature: FeatureInfo,
  doc: HelpDoc
): string[] {
  const sections: string[] = [];

  // Basic suggestions based on feature type
  if (feature.type === 'api') {
    sections.push('API Reference', 'Endpoints', 'Request/Response Examples');
  } else if (feature.type === 'page') {
    sections.push('Getting Started', 'Usage', 'Features');
  } else if (feature.type === 'component') {
    sections.push('Component Usage', 'Props', 'Examples');
  }

  // Check if doc content mentions outdated information
  const content = doc.content.toLowerCase();
  if (content.includes('deprecated') || content.includes('old')) {
    sections.push('Overview', 'Features');
  }

  return sections;
}

