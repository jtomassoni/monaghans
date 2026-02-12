#!/usr/bin/env tsx

/**
 * Help Documentation Quality Checks
 * 
 * Validates that help documentation meets quality standards:
 * - All docs have clear titles
 * - All docs have step-by-step instructions
 * - All docs are written in plain language
 * - All docs are accessible (basic checks)
 */

import { loadAllHelpDocs } from '../lib/help-content-loader';
import fs from 'fs';
import path from 'path';

interface QualityCheck {
  name: string;
  passed: boolean;
  message: string;
  issues: string[];
}

/**
 * Check that all docs have clear titles
 */
function checkClearTitles(): QualityCheck {
  const allDocs = loadAllHelpDocs();
  const issues: string[] = [];

  for (const doc of allDocs) {
    const title = doc.metadata.title.trim();
    
    // Check title length (should be between 5 and 100 characters)
    if (title.length < 5) {
      issues.push(`${doc.filePath}: Title too short (${title.length} chars)`);
    }
    if (title.length > 100) {
      issues.push(`${doc.filePath}: Title too long (${title.length} chars)`);
    }
    
    // Check for generic titles
    const genericTitles = ['help', 'documentation', 'guide', 'tutorial', 'info'];
    if (genericTitles.some((generic) => title.toLowerCase() === generic)) {
      issues.push(`${doc.filePath}: Title is too generic ("${title}")`);
    }
  }

  return {
    name: 'Clear Titles',
    passed: issues.length === 0,
    message:
      issues.length === 0
        ? `All ${allDocs.length} documents have clear titles`
        : `Found ${issues.length} title issues`,
    issues,
  };
}

/**
 * Check that docs have step-by-step instructions
 */
function checkStepByStepInstructions(): QualityCheck {
  const allDocs = loadAllHelpDocs();
  const issues: string[] = [];

  for (const doc of allDocs) {
    const content = doc.content.toLowerCase();
    
    // Look for indicators of step-by-step content
    const hasSteps =
      content.includes('step') ||
      content.includes('1.') ||
      content.includes('first') ||
      content.includes('then') ||
      content.includes('next') ||
      content.match(/\d+\.\s+\w+/); // Numbered list pattern
    
    // Check for action words
    const hasActions =
      content.includes('click') ||
      content.includes('select') ||
      content.includes('enter') ||
      content.includes('type') ||
      content.includes('choose') ||
      content.includes('navigate');

    if (!hasSteps && !hasActions && content.length > 200) {
      // Only flag if content is substantial but lacks instructions
      issues.push(
        `${doc.filePath}: May lack step-by-step instructions (content length: ${doc.content.length} chars)`
      );
    }
  }

  return {
    name: 'Step-by-Step Instructions',
    passed: issues.length === 0,
    message:
      issues.length === 0
        ? `All documents appear to have instructional content`
        : `Found ${issues.length} documents that may lack step-by-step instructions`,
    issues,
  };
}

/**
 * Check that docs are written in plain language
 */
function checkPlainLanguage(): QualityCheck {
  const allDocs = loadAllHelpDocs();
  const issues: string[] = [];

  // Common technical jargon that should be avoided or explained
  const technicalTerms = [
    'api',
    'endpoint',
    'database',
    'schema',
    'migration',
    'prisma',
    'typescript',
    'javascript',
    'react',
    'next.js',
  ];

  for (const doc of allDocs) {
    const content = doc.content.toLowerCase();
    const title = doc.metadata.title.toLowerCase();

    // Check for unexplained technical terms
    for (const term of technicalTerms) {
      if (content.includes(term) && !content.includes(`what is ${term}`) && !content.includes(`${term} is`)) {
        // Term is used but may not be explained
        // Only flag if it appears multiple times without explanation
        const count = (content.match(new RegExp(term, 'g')) || []).length;
        if (count > 2) {
          issues.push(
            `${doc.filePath}: May use technical term "${term}" without explanation (appears ${count} times)`
          );
        }
      }
    }

    // Check for overly complex sentences (basic check - sentences with many commas)
    const sentences = doc.content.split(/[.!?]+/);
    for (let i = 0; i < Math.min(sentences.length, 10); i++) {
      const sentence = sentences[i].trim();
      const commaCount = (sentence.match(/,/g) || []).length;
      if (commaCount > 4 && sentence.length > 150) {
        // Very long sentence with many commas - may be too complex
        issues.push(
          `${doc.filePath}: May contain overly complex sentences (sentence ${i + 1} has ${commaCount} commas and ${sentence.length} chars)`
        );
        break; // Only flag once per document
      }
    }
  }

  return {
    name: 'Plain Language',
    passed: issues.length === 0,
    message:
      issues.length === 0
        ? `All documents appear to use plain language`
        : `Found ${issues.length} potential plain language issues`,
    issues,
  };
}

/**
 * Check basic accessibility
 */
function checkAccessibility(): QualityCheck {
  const allDocs = loadAllHelpDocs();
  const issues: string[] = [];

  for (const doc of allDocs) {
    // Check for heading structure (should have h1 or h2)
    const hasHeadings = /^#+\s+\w+/m.test(doc.content);
    if (!hasHeadings && doc.content.length > 500) {
      issues.push(`${doc.filePath}: Long content without clear heading structure`);
    }

    // Check for alt text in images (basic - look for image syntax)
    const imageMatches = doc.content.match(/!\[([^\]]*)\]\([^)]+\)/g) || [];
    for (const imageMatch of imageMatches) {
      const altText = imageMatch.match(/!\[([^\]]*)\]/)?.[1];
      if (!altText || altText.trim().length === 0) {
        issues.push(`${doc.filePath}: Image without alt text`);
      }
    }

    // Check for link text (links should have descriptive text)
    const linkMatches = doc.content.match(/\[([^\]]*)\]\([^)]+\)/g) || [];
    for (const linkMatch of linkMatches) {
      const linkText = linkMatch.match(/\[([^\]]*)\]/)?.[1];
      if (!linkText || linkText.trim().length === 0 || linkText === 'here' || linkText === 'click here') {
        issues.push(`${doc.filePath}: Link with non-descriptive text ("${linkText}")`);
      }
    }
  }

  return {
    name: 'Accessibility (Basic Checks)',
    passed: issues.length === 0,
    message:
      issues.length === 0
        ? `All documents pass basic accessibility checks`
        : `Found ${issues.length} accessibility issues`,
    issues,
  };
}

/**
 * Check that docs have required metadata
 */
function checkRequiredMetadata(): QualityCheck {
  const allDocs = loadAllHelpDocs();
  const issues: string[] = [];

  for (const doc of allDocs) {
    // Check required fields
    if (!doc.metadata.title || doc.metadata.title.trim().length === 0) {
      issues.push(`${doc.filePath}: Missing title`);
    }
    if (!doc.metadata.feature) {
      issues.push(`${doc.filePath}: Missing feature`);
    }

    // Check recommended fields
    if (!doc.metadata.lastUpdated) {
      issues.push(`${doc.filePath}: Missing lastUpdated date (recommended)`);
    }
    if (!doc.metadata.version) {
      issues.push(`${doc.filePath}: Missing version (recommended)`);
    }
  }

  return {
    name: 'Required Metadata',
    passed: issues.length === 0,
    message:
      issues.length === 0
        ? `All documents have required metadata`
        : `Found ${issues.length} metadata issues`,
    issues,
  };
}

/**
 * Run all quality checks
 */
function runAllQualityChecks(): void {
  console.log('\n' + '='.repeat(80));
  console.log('Help Documentation Quality Checks');
  console.log('='.repeat(80) + '\n');

  const checks = [
    checkRequiredMetadata(),
    checkClearTitles(),
    checkStepByStepInstructions(),
    checkPlainLanguage(),
    checkAccessibility(),
  ];

  let passedCount = 0;
  let failedCount = 0;
  let totalIssues = 0;

  for (const check of checks) {
    const status = check.passed ? '✅ PASS' : '⚠️  WARN';
    console.log(`${status}: ${check.name}`);
    console.log(`   ${check.message}`);
    
    if (check.issues.length > 0) {
      console.log(`   Issues:`);
      for (const issue of check.issues.slice(0, 10)) {
        // Show first 10 issues
        console.log(`     - ${issue}`);
      }
      if (check.issues.length > 10) {
        console.log(`     ... and ${check.issues.length - 10} more`);
      }
      totalIssues += check.issues.length;
    }
    console.log('');

    if (check.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('='.repeat(80));
  console.log(`Summary: ${passedCount} passed, ${failedCount} with warnings`);
  console.log(`Total issues found: ${totalIssues}`);
  console.log('='.repeat(80) + '\n');

  // Don't fail on quality warnings - these are suggestions
  // process.exit(0);
}

// Run if called directly
if (require.main === module) {
  runAllQualityChecks();
}

export {
  runAllQualityChecks,
  checkClearTitles,
  checkStepByStepInstructions,
  checkPlainLanguage,
  checkAccessibility,
  checkRequiredMetadata,
};

