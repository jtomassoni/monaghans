#!/usr/bin/env tsx

/**
 * Help Documentation Validation Script
 * 
 * Validates that help documentation exists for all features and is accurate.
 * This script is run during the build process to ensure documentation stays in sync.
 */

import { validateHelpDocs, ValidationResult } from '../lib/help-doc-validator';
import fs from 'fs';
import path from 'path';

interface ValidationOptions {
  strict?: boolean; // If true, warnings are treated as errors
  reportPath?: string; // Path to save validation report
  format?: 'json' | 'markdown' | 'console';
}

/**
 * Format validation result for console output
 */
function formatConsoleReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(80));
  lines.push('Help Documentation Validation Report');
  lines.push('='.repeat(80) + '\n');

  // Coverage
  lines.push(`Coverage: ${result.coverage.documentedRoutes}/${result.coverage.totalRoutes} routes documented (${result.coverage.coveragePercent}%)`);
  lines.push('');

  // Errors
  if (result.errors.length > 0) {
    lines.push(`❌ ERRORS (${result.errors.length}):`);
    lines.push('-'.repeat(80));
    for (const error of result.errors) {
      lines.push(`  [${error.type}] ${error.message}`);
      if (error.route) lines.push(`    Route: ${error.route}`);
      if (error.feature) lines.push(`    Feature: ${error.feature}`);
      if (error.doc) lines.push(`    Doc: ${error.doc.metadata.title}`);
      lines.push('');
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(`⚠️  WARNINGS (${result.warnings.length}):`);
    lines.push('-'.repeat(80));
    for (const warning of result.warnings) {
      lines.push(`  [${warning.type}] ${warning.message}`);
      if (warning.route) lines.push(`    Route: ${warning.route}`);
      if (warning.feature) lines.push(`    Feature: ${warning.feature}`);
      if (warning.doc) lines.push(`    Doc: ${warning.doc.metadata.title}`);
      lines.push('');
    }
  }

  // Summary
  lines.push('='.repeat(80));
  if (result.passed) {
    lines.push('✅ Validation PASSED');
  } else {
    lines.push('❌ Validation FAILED');
  }
  lines.push('='.repeat(80) + '\n');

  return lines.join('\n');
}

/**
 * Format validation result as JSON
 */
function formatJsonReport(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format validation result as Markdown
 */
function formatMarkdownReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('# Help Documentation Validation Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // Coverage
  lines.push('## Coverage');
  lines.push('');
  lines.push(`- **Documented Routes:** ${result.coverage.documentedRoutes}/${result.coverage.totalRoutes}`);
  lines.push(`- **Coverage:** ${result.coverage.coveragePercent}%`);
  lines.push('');

  // Errors
  if (result.errors.length > 0) {
    lines.push('## ❌ Errors');
    lines.push('');
    for (const error of result.errors) {
      lines.push(`### ${error.type}`);
      lines.push('');
      lines.push(`- **Message:** ${error.message}`);
      if (error.route) lines.push(`- **Route:** ${error.route}`);
      if (error.feature) lines.push(`- **Feature:** ${error.feature}`);
      if (error.doc) lines.push(`- **Document:** ${error.doc.metadata.title}`);
      lines.push('');
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('## ⚠️ Warnings');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`### ${warning.type}`);
      lines.push('');
      lines.push(`- **Message:** ${warning.message}`);
      if (warning.route) lines.push(`- **Route:** ${warning.route}`);
      if (warning.feature) lines.push(`- **Feature:** ${warning.feature}`);
      if (warning.doc) lines.push(`- **Document:** ${warning.doc.metadata.title}`);
      lines.push('');
    }
  }

  // Summary
  lines.push('## Summary');
  lines.push('');
  if (result.passed) {
    lines.push('✅ **Validation PASSED**');
  } else {
    lines.push('❌ **Validation FAILED**');
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Main validation function
 */
function main() {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {
    strict: args.includes('--strict'),
    format: args.includes('--json') ? 'json' : args.includes('--markdown') ? 'markdown' : 'console',
  };

  // Get report path if specified
  const reportIndex = args.indexOf('--report');
  if (reportIndex !== -1 && args[reportIndex + 1]) {
    options.reportPath = args[reportIndex + 1];
  }

  // Run validation
  const result = validateHelpDocs({
    checkCoverage: true,
    checkAccuracy: true,
    checkFreshness: true,
    maxDaysOld: 90,
  });

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

  // Determine exit code
  const hasErrors = result.errors.length > 0;
  const hasWarningsAsErrors = options.strict && result.warnings.length > 0;

  if (hasErrors || hasWarningsAsErrors) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as validateHelpDocsScript };

