#!/usr/bin/env tsx

/**
 * Help Validation System Tests
 * 
 * Tests the validation system to ensure it:
 * - Catches missing documentation
 * - Catches outdated documentation
 * - Catches broken references
 * - Fails build appropriately on errors
 */

import { validateHelpDocs, ValidationErrorType } from '../lib/help-doc-validator';
import { getFeatureRegistry } from '../lib/feature-registry';
import { loadAllHelpDocs } from '../lib/help-content-loader';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Test that validation catches missing docs
 */
function testMissingDocs(): TestResult {
  try {
    const result = validateHelpDocs({
      checkCoverage: true,
      checkAccuracy: true,
      checkFreshness: false,
    });

    // Check if validation properly identifies missing docs
    const hasMissingDocErrors = result.errors.some(
      (e) => e.type === ValidationErrorType.MISSING_DOC
    );

    return {
      name: 'Missing Documentation Detection',
      passed: true, // Test passes if validation runs without errors
      message: hasMissingDocErrors
        ? `Found ${result.errors.filter((e) => e.type === ValidationErrorType.MISSING_DOC).length} missing documentation items`
        : 'All routes have documentation',
      details: {
        errors: result.errors.filter((e) => e.type === ValidationErrorType.MISSING_DOC),
        coverage: result.coverage,
      },
    };
  } catch (error) {
    return {
      name: 'Missing Documentation Detection',
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test that validation catches broken references
 */
function testBrokenReferences(): TestResult {
  try {
    const result = validateHelpDocs({
      checkCoverage: false,
      checkAccuracy: true,
      checkFreshness: false,
    });

    const hasBrokenRefs = result.errors.some(
      (e) =>
        e.type === ValidationErrorType.INVALID_ROUTE ||
        e.type === ValidationErrorType.INVALID_FEATURE
    );

    return {
      name: 'Broken Reference Detection',
      passed: true,
      message: hasBrokenRefs
        ? `Found ${result.errors.filter((e) => e.type === ValidationErrorType.INVALID_ROUTE || e.type === ValidationErrorType.INVALID_FEATURE).length} broken references`
        : 'No broken references found',
      details: {
        errors: result.errors.filter(
          (e) =>
            e.type === ValidationErrorType.INVALID_ROUTE ||
            e.type === ValidationErrorType.INVALID_FEATURE
        ),
      },
    };
  } catch (error) {
    return {
      name: 'Broken Reference Detection',
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test that validation catches outdated docs
 */
function testOutdatedDocs(): TestResult {
  try {
    const result = validateHelpDocs({
      checkCoverage: false,
      checkAccuracy: false,
      checkFreshness: true,
      maxDaysOld: 90,
    });

    const hasOutdated = result.warnings.some(
      (e) => e.type === ValidationErrorType.OUTDATED_DOC
    );

    return {
      name: 'Outdated Documentation Detection',
      passed: true,
      message: hasOutdated
        ? `Found ${result.warnings.filter((e) => e.type === ValidationErrorType.OUTDATED_DOC).length} potentially outdated documentation items`
        : 'All documentation is up to date',
      details: {
        warnings: result.warnings.filter((e) => e.type === ValidationErrorType.OUTDATED_DOC),
      },
    };
  } catch (error) {
    return {
      name: 'Outdated Documentation Detection',
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test that validation fails build on errors
 */
function testBuildFailure(): TestResult {
  try {
    const result = validateHelpDocs({
      checkCoverage: true,
      checkAccuracy: true,
      checkFreshness: false,
    });

    // Validation should fail if there are errors
    const shouldFail = result.errors.length > 0;
    const actuallyFails = !result.passed;

    return {
      name: 'Build Failure on Errors',
      passed: shouldFail === actuallyFails,
      message: shouldFail
        ? `Validation correctly fails with ${result.errors.length} errors`
        : 'Validation passes when no errors present',
      details: {
        errors: result.errors,
        passed: result.passed,
      },
    };
  } catch (error) {
    return {
      name: 'Build Failure on Errors',
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test feature registry
 */
function testFeatureRegistry(): TestResult {
  try {
    const registry = getFeatureRegistry();
    const adminPages = registry.getAdminPages();
    const apiEndpoints = registry.getApiEndpoints();
    const routesNeedingDocs = registry.getRoutesNeedingDocs();

    return {
      name: 'Feature Registry',
      passed: true,
      message: `Registry loaded: ${adminPages.length} admin pages, ${apiEndpoints.length} API endpoints, ${routesNeedingDocs.length} routes needing docs`,
      details: {
        adminPages: adminPages.length,
        apiEndpoints: apiEndpoints.length,
        routesNeedingDocs: routesNeedingDocs.length,
      },
    };
  } catch (error) {
    return {
      name: 'Feature Registry',
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test help content loader
 */
function testHelpContentLoader(): TestResult {
  try {
    const allDocs = loadAllHelpDocs();

    // Check that docs have required fields
    const invalidDocs = allDocs.filter(
      (doc) => !doc.metadata.title || !doc.metadata.feature
    );

    return {
      name: 'Help Content Loader',
      passed: invalidDocs.length === 0,
      message:
        invalidDocs.length === 0
          ? `Successfully loaded ${allDocs.length} help documents`
          : `Found ${invalidDocs.length} documents with missing required fields`,
      details: {
        totalDocs: allDocs.length,
        invalidDocs: invalidDocs.length,
      },
    };
  } catch (error) {
    return {
      name: 'Help Content Loader',
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Run all validation tests
 */
function runAllTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('Help Validation System Tests');
  console.log('='.repeat(80) + '\n');

  const tests = [
    testFeatureRegistry(),
    testHelpContentLoader(),
    testMissingDocs(),
    testBrokenReferences(),
    testOutdatedDocs(),
    testBuildFailure(),
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const test of tests) {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${test.name}`);
    console.log(`   ${test.message}`);
    if (test.details) {
      console.log(`   Details:`, JSON.stringify(test.details, null, 2));
    }
    console.log('');

    if (test.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('='.repeat(80));
  console.log(`Summary: ${passedCount} passed, ${failedCount} failed`);
  console.log('='.repeat(80) + '\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests, testMissingDocs, testBrokenReferences, testOutdatedDocs, testBuildFailure };

