#!/usr/bin/env tsx

/**
 * Documentation Update Suggestions Script
 * 
 * Analyzes feature changes and suggests documentation updates needed.
 * Combines change detection with update suggestions.
 */

import {
  detectFeatureChanges,
  loadFeatureSnapshot,
} from '../lib/feature-change-tracker';
import {
  generateDocUpdateSuggestions,
  generateDocTemplate,
} from '../lib/doc-update-suggestions';
import { shouldUpdateDocVersion } from '../lib/doc-versioning';
import fs from 'fs';
import path from 'path';

interface SuggestionsOptions {
  snapshotPath?: string;
  format?: 'json' | 'markdown' | 'console';
  reportPath?: string;
  generateTemplates?: boolean;
}

/**
 * Format suggestions for console
 */
function formatConsoleReport(suggestions: ReturnType<typeof generateDocUpdateSuggestions>): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(80));
  lines.push('Documentation Update Suggestions');
  lines.push('='.repeat(80) + '\n');

  if (suggestions.length === 0) {
    lines.push('✅ No documentation updates needed!\n');
    return lines.join('\n');
  }

  // Group by priority
  const high = suggestions.filter((s) => s.priority === 'high');
  const medium = suggestions.filter((s) => s.priority === 'medium');
  const low = suggestions.filter((s) => s.priority === 'low');

  if (high.length > 0) {
    lines.push(`🔴 High Priority (${high.length}):`);
    lines.push('-'.repeat(80));
    for (const suggestion of high) {
      lines.push(`\n  ${suggestion.action.toUpperCase()}: ${suggestion.doc.metadata.title}`);
      lines.push(`    ${suggestion.suggestion}`);
      if (suggestion.feature) {
        lines.push(`    Feature: ${suggestion.feature.name} (${suggestion.feature.route})`);
      }
      if (suggestion.details?.fieldsToUpdate) {
        lines.push(`    Fields to update: ${suggestion.details.fieldsToUpdate.join(', ')}`);
      }
      if (suggestion.details?.sectionsToReview) {
        lines.push(`    Sections to review: ${suggestion.details.sectionsToReview.join(', ')}`);
      }
    }
    lines.push('');
  }

  if (medium.length > 0) {
    lines.push(`🟡 Medium Priority (${medium.length}):`);
    lines.push('-'.repeat(80));
    for (const suggestion of medium) {
      lines.push(`\n  ${suggestion.action.toUpperCase()}: ${suggestion.doc.metadata.title}`);
      lines.push(`    ${suggestion.suggestion}`);
      if (suggestion.feature) {
        lines.push(`    Feature: ${suggestion.feature.name} (${suggestion.feature.route})`);
      }
    }
    lines.push('');
  }

  if (low.length > 0) {
    lines.push(`🟢 Low Priority (${low.length}):`);
    lines.push('-'.repeat(80));
    for (const suggestion of low) {
      lines.push(`\n  ${suggestion.action.toUpperCase()}: ${suggestion.doc.metadata.title}`);
      lines.push(`    ${suggestion.suggestion}`);
    }
    lines.push('');
  }

  // Summary
  lines.push('='.repeat(80));
  lines.push('Summary:');
  lines.push(`  - High Priority: ${high.length}`);
  lines.push(`  - Medium Priority: ${medium.length}`);
  lines.push(`  - Low Priority: ${low.length}`);
  lines.push(`  - Total Suggestions: ${suggestions.length}`);
  lines.push('='.repeat(80) + '\n');

  return lines.join('\n');
}

/**
 * Format suggestions as JSON
 */
function formatJsonReport(suggestions: ReturnType<typeof generateDocUpdateSuggestions>): string {
  return JSON.stringify(suggestions, null, 2);
}

/**
 * Format suggestions as Markdown
 */
function formatMarkdownReport(suggestions: ReturnType<typeof generateDocUpdateSuggestions>): string {
  const lines: string[] = [];

  lines.push('# Documentation Update Suggestions');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  if (suggestions.length === 0) {
    lines.push('✅ No documentation updates needed!');
    return lines.join('\n');
  }

  // Group by priority
  const high = suggestions.filter((s) => s.priority === 'high');
  const medium = suggestions.filter((s) => s.priority === 'medium');
  const low = suggestions.filter((s) => s.priority === 'low');

  if (high.length > 0) {
    lines.push('## 🔴 High Priority');
    lines.push('');
    for (const suggestion of high) {
      lines.push(`### ${suggestion.action.toUpperCase()}: ${suggestion.doc.metadata.title}`);
      lines.push('');
      lines.push(`- **Suggestion:** ${suggestion.suggestion}`);
      if (suggestion.feature) {
        lines.push(`- **Feature:** ${suggestion.feature.name} (${suggestion.feature.route})`);
      }
      if (suggestion.details?.fieldsToUpdate) {
        lines.push(`- **Fields to update:** ${suggestion.details.fieldsToUpdate.join(', ')}`);
      }
      if (suggestion.details?.sectionsToReview) {
        lines.push(`- **Sections to review:** ${suggestion.details.sectionsToReview.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (medium.length > 0) {
    lines.push('## 🟡 Medium Priority');
    lines.push('');
    for (const suggestion of medium) {
      lines.push(`### ${suggestion.action.toUpperCase()}: ${suggestion.doc.metadata.title}`);
      lines.push('');
      lines.push(`- **Suggestion:** ${suggestion.suggestion}`);
      if (suggestion.feature) {
        lines.push(`- **Feature:** ${suggestion.feature.name} (${suggestion.feature.route})`);
      }
      lines.push('');
    }
  }

  if (low.length > 0) {
    lines.push('## 🟢 Low Priority');
    lines.push('');
    for (const suggestion of low) {
      lines.push(`### ${suggestion.action.toUpperCase()}: ${suggestion.doc.metadata.title}`);
      lines.push('');
      lines.push(`- **Suggestion:** ${suggestion.suggestion}`);
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
  const options: SuggestionsOptions = {
    format: args.includes('--json')
      ? 'json'
      : args.includes('--markdown')
      ? 'markdown'
      : 'console',
    generateTemplates: args.includes('--generate-templates'),
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
  const changes = detectFeatureChanges(undefined, options.snapshotPath);

  // Generate suggestions
  const suggestions = generateDocUpdateSuggestions(changes.featureChanges);

  // Format report
  let report: string;
  switch (options.format) {
    case 'json':
      report = formatJsonReport(suggestions);
      break;
    case 'markdown':
      report = formatMarkdownReport(suggestions);
      break;
    default:
      report = formatConsoleReport(suggestions);
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

  // Generate templates if requested
  if (options.generateTemplates) {
    const templatesDir = path.join(process.cwd(), 'docs', 'help-content', 'templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    for (const suggestion of suggestions) {
      if (suggestion.action === 'create' && suggestion.feature) {
        const template = generateDocTemplate(suggestion.feature);
        const fileName = `${suggestion.feature.route.replace(/\//g, '-').replace(/^-/, '')}.md`;
        const filePath = path.join(templatesDir, fileName);
        fs.writeFileSync(filePath, template, 'utf-8');
        console.log(`\nTemplate generated: ${filePath}`);
      }
    }
  }

  // Exit with non-zero code if there are high priority suggestions
  const highPriorityCount = suggestions.filter((s) => s.priority === 'high').length;
  if (highPriorityCount > 0) {
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as suggestDocUpdatesScript };

