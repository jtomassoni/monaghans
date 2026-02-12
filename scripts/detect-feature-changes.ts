#!/usr/bin/env tsx

/**
 * Feature Change Detection Script
 * 
 * Detects changes in features and suggests documentation updates needed.
 * This script compares the current codebase state to a previous snapshot.
 */

import {
  detectFeatureChanges,
  saveFeatureSnapshot,
  loadFeatureSnapshot,
  ChangeType,
} from '../lib/feature-change-tracker';
import fs from 'fs';
import path from 'path';

interface ChangeDetectionOptions {
  snapshotPath?: string;
  saveSnapshot?: boolean;
  format?: 'json' | 'markdown' | 'console';
  reportPath?: string;
}

/**
 * Format change detection result for console
 */
function formatConsoleReport(result: ReturnType<typeof detectFeatureChanges>): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(80));
  lines.push('Feature Change Detection Report');
  lines.push('='.repeat(80) + '\n');

  // Feature changes
  if (result.featureChanges.length > 0) {
    lines.push(`📊 Feature Changes (${result.featureChanges.length}):`);
    lines.push('-'.repeat(80));

    const added = result.featureChanges.filter((c) => c.type === ChangeType.ADDED);
    const modified = result.featureChanges.filter((c) => c.type === ChangeType.MODIFIED);
    const removed = result.featureChanges.filter((c) => c.type === ChangeType.REMOVED);

    if (added.length > 0) {
      lines.push(`\n  ➕ Added Features (${added.length}):`);
      for (const change of added) {
        lines.push(`    - ${change.feature.name} (${change.feature.route})`);
        lines.push(`      Type: ${change.feature.type}`);
        if (change.feature.lastModified) {
          lines.push(`      Last Modified: ${change.feature.lastModified.toISOString()}`);
        }
      }
    }

    if (modified.length > 0) {
      lines.push(`\n  ✏️  Modified Features (${modified.length}):`);
      for (const change of modified) {
        lines.push(`    - ${change.feature.name} (${change.feature.route})`);
        if (change.changeDetails?.lastModified) {
          lines.push(`      Last Modified: ${change.changeDetails.lastModified.toISOString()}`);
        }
      }
    }

    if (removed.length > 0) {
      lines.push(`\n  ❌ Removed Features (${removed.length}):`);
      for (const change of removed) {
        lines.push(`    - ${change.feature.name} (${change.feature.route})`);
      }
    }
    lines.push('');
  } else {
    lines.push('✅ No feature changes detected\n');
  }

  // Documentation changes
  if (result.docChanges.length > 0) {
    lines.push(`📝 Documentation Changes (${result.docChanges.length}):`);
    lines.push('-'.repeat(80));

    const added = result.docChanges.filter((c) => c.type === ChangeType.ADDED);
    const modified = result.docChanges.filter((c) => c.type === ChangeType.MODIFIED);
    const removed = result.docChanges.filter((c) => c.type === ChangeType.REMOVED);

    if (added.length > 0) {
      lines.push(`\n  ➕ Added Docs (${added.length}):`);
      for (const change of added) {
        lines.push(`    - ${change.doc.metadata.title}`);
        lines.push(`      File: ${change.doc.filePath}`);
      }
    }

    if (modified.length > 0) {
      lines.push(`\n  ✏️  Modified Docs (${modified.length}):`);
      for (const change of modified) {
        lines.push(`    - ${change.doc.metadata.title}`);
        if (change.changeDetails?.titleChanged) {
          lines.push(`      Title changed`);
        }
        if (change.changeDetails?.metadataChanged) {
          lines.push(`      Metadata changed`);
        }
      }
    }

    if (removed.length > 0) {
      lines.push(`\n  ❌ Removed Docs (${removed.length}):`);
      for (const change of removed) {
        lines.push(`    - ${change.doc.filePath}`);
      }
    }
    lines.push('');
  }

  // Features needing docs
  if (result.featuresNeedingDocs.length > 0) {
    lines.push(`⚠️  Features Needing Documentation (${result.featuresNeedingDocs.length}):`);
    lines.push('-'.repeat(80));
    for (const feature of result.featuresNeedingDocs) {
      lines.push(`  - ${feature.name} (${feature.route})`);
      lines.push(`    Type: ${feature.type}`);
    }
    lines.push('');
  }

  // Docs needing updates
  if (result.docsNeedingUpdates.length > 0) {
    lines.push(`📋 Documentation Needing Updates (${result.docsNeedingUpdates.length}):`);
    lines.push('-'.repeat(80));
    for (const item of result.docsNeedingUpdates) {
      lines.push(`  - ${item.doc.metadata.title}`);
      lines.push(`    Reason: ${item.reason}`);
      if (item.relatedFeature) {
        lines.push(`    Related Feature: ${item.relatedFeature.name} (${item.relatedFeature.route})`);
      }
    }
    lines.push('');
  }

  // Summary
  lines.push('='.repeat(80));
  lines.push('Summary:');
  lines.push(`  - Feature Changes: ${result.featureChanges.length}`);
  lines.push(`  - Documentation Changes: ${result.docChanges.length}`);
  lines.push(`  - Features Needing Docs: ${result.featuresNeedingDocs.length}`);
  lines.push(`  - Docs Needing Updates: ${result.docsNeedingUpdates.length}`);
  lines.push('='.repeat(80) + '\n');

  return lines.join('\n');
}

/**
 * Format change detection result as JSON
 */
function formatJsonReport(result: ReturnType<typeof detectFeatureChanges>): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format change detection result as Markdown
 */
function formatMarkdownReport(result: ReturnType<typeof detectFeatureChanges>): string {
  const lines: string[] = [];

  lines.push('# Feature Change Detection Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // Feature changes
  if (result.featureChanges.length > 0) {
    lines.push('## Feature Changes');
    lines.push('');

    const added = result.featureChanges.filter((c) => c.type === ChangeType.ADDED);
    const modified = result.featureChanges.filter((c) => c.type === ChangeType.MODIFIED);
    const removed = result.featureChanges.filter((c) => c.type === ChangeType.REMOVED);

    if (added.length > 0) {
      lines.push('### ➕ Added Features');
      lines.push('');
      for (const change of added) {
        lines.push(`- **${change.feature.name}** (${change.feature.route})`);
        lines.push(`  - Type: ${change.feature.type}`);
        if (change.feature.lastModified) {
          lines.push(`  - Last Modified: ${change.feature.lastModified.toISOString()}`);
        }
        lines.push('');
      }
    }

    if (modified.length > 0) {
      lines.push('### ✏️ Modified Features');
      lines.push('');
      for (const change of modified) {
        lines.push(`- **${change.feature.name}** (${change.feature.route})`);
        if (change.changeDetails?.lastModified) {
          lines.push(`  - Last Modified: ${change.changeDetails.lastModified.toISOString()}`);
        }
        lines.push('');
      }
    }

    if (removed.length > 0) {
      lines.push('### ❌ Removed Features');
      lines.push('');
      for (const change of removed) {
        lines.push(`- **${change.feature.name}** (${change.feature.route})`);
        lines.push('');
      }
    }
  }

  // Features needing docs
  if (result.featuresNeedingDocs.length > 0) {
    lines.push('## ⚠️ Features Needing Documentation');
    lines.push('');
    for (const feature of result.featuresNeedingDocs) {
      lines.push(`- **${feature.name}** (${feature.route})`);
      lines.push(`  - Type: ${feature.type}`);
      lines.push('');
    }
  }

  // Docs needing updates
  if (result.docsNeedingUpdates.length > 0) {
    lines.push('## 📋 Documentation Needing Updates');
    lines.push('');
    for (const item of result.docsNeedingUpdates) {
      lines.push(`- **${item.doc.metadata.title}**`);
      lines.push(`  - Reason: ${item.reason}`);
      if (item.relatedFeature) {
        lines.push(`  - Related Feature: ${item.relatedFeature.name} (${item.relatedFeature.route})`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const options: ChangeDetectionOptions = {
    format: args.includes('--json')
      ? 'json'
      : args.includes('--markdown')
      ? 'markdown'
      : 'console',
    saveSnapshot: args.includes('--save') || args.includes('--save-snapshot'),
  };

  // Get snapshot path if specified
  const snapshotIndex = args.indexOf('--snapshot');
  if (snapshotIndex !== -1 && args[snapshotIndex + 1]) {
    options.snapshotPath = args[snapshotIndex + 1];
  }

  // Get report path if specified
  const reportIndex = args.indexOf('--report');
  if (reportIndex !== -1 && args[reportIndex + 1]) {
    options.reportPath = args[reportIndex + 1];
  }

  // Detect changes
  const result = detectFeatureChanges(undefined, options.snapshotPath);

  // Format report
  let report: string;
  switch (options.format) {
    case 'json':
      report = formatJsonReport(result);
      break;
    case 'markdown':
      report = formatMarkdownReport(result);
      break;
    default:
      report = formatConsoleReport(result);
  }

  // Output report
  console.log(report);

  // Save report if path specified
  if (options.reportPath) {
    const reportDir = path.dirname(options.reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(options.reportPath, report, 'utf-8');
    console.log(`\nReport saved to: ${options.reportPath}`);
  }

  // Save snapshot if requested
  if (options.saveSnapshot) {
    const snapshot = saveFeatureSnapshot(options.snapshotPath);
    console.log(`\nSnapshot saved: ${snapshot.timestamp}`);
  }

  // Exit with non-zero code if there are features needing docs or docs needing updates
  if (result.featuresNeedingDocs.length > 0 || result.docsNeedingUpdates.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as detectFeatureChangesScript };

