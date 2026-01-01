#!/usr/bin/env tsx
/**
 * Script to detect flaky tests by running them multiple times
 * 
 * Usage:
 *   tsx e2e/detect-flaky-tests.ts [test-file] [runs]
 * 
 * Examples:
 *   tsx e2e/detect-flaky-tests.ts                           # Run all tests 5 times
 *   tsx e2e/detect-flaky-tests.ts e2e/announcements.spec.ts  # Run announcements tests 5 times
 *   tsx e2e/detect-flaky-tests.ts e2e/events.spec.ts 10     # Run events tests 10 times
 */

import { execSync } from 'child_process';
import * as path from 'path';

const testFile = process.argv[2];
const runs = parseInt(process.argv[3] || '5', 10);

interface TestResult {
  test: string;
  passed: number;
  failed: number;
  flaky: boolean;
}

const results: Map<string, TestResult> = new Map();

console.log(`🔍 Detecting flaky tests...`);
console.log(`   Test file: ${testFile || 'all tests'}`);
console.log(`   Runs: ${runs}`);
console.log('');

for (let i = 1; i <= runs; i++) {
  console.log(`\n📊 Run ${i}/${runs}`);
  console.log('─'.repeat(50));

  try {
    const command = testFile
      ? `npx playwright test ${testFile} --reporter=json`
      : `npx playwright test --reporter=json`;

    const output = execSync(command, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const jsonOutput = JSON.parse(output);
    
    // Process results
    for (const result of jsonOutput.suites || []) {
      for (const spec of result.specs || []) {
        for (const test of spec.tests || []) {
          const testKey = `${spec.title} › ${test.title}`;
          
          if (!results.has(testKey)) {
            results.set(testKey, {
              test: testKey,
              passed: 0,
              failed: 0,
              flaky: false,
            });
          }

          const testResult = results.get(testKey)!;
          
          if (test.results && test.results.length > 0) {
            const lastResult = test.results[test.results.length - 1];
            if (lastResult.status === 'passed') {
              testResult.passed++;
            } else {
              testResult.failed++;
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Run ${i} failed:`, error.message);
  }
}

// Analyze results
console.log('\n\n📈 Flakiness Analysis');
console.log('═'.repeat(80));

const flakyTests: TestResult[] = [];
const stableTests: TestResult[] = [];

for (const result of results.values()) {
  const total = result.passed + result.failed;
  const passRate = total > 0 ? (result.passed / total) * 100 : 0;
  
  // Consider a test flaky if it doesn't pass 100% of the time
  result.flaky = result.failed > 0;
  
  if (result.flaky) {
    flakyTests.push(result);
  } else {
    stableTests.push(result);
  }
}

// Sort by failure rate
flakyTests.sort((a, b) => {
  const aRate = a.failed / (a.passed + a.failed);
  const bRate = b.failed / (b.passed + b.failed);
  return bRate - aRate;
});

if (flakyTests.length > 0) {
  console.log(`\n⚠️  FLAKY TESTS (${flakyTests.length}):`);
  console.log('─'.repeat(80));
  
  for (const result of flakyTests) {
    const total = result.passed + result.failed;
    const passRate = ((result.passed / total) * 100).toFixed(1);
    const failRate = ((result.failed / total) * 100).toFixed(1);
    
    console.log(`\n❌ ${result.test}`);
    console.log(`   Passed: ${result.passed}/${total} (${passRate}%)`);
    console.log(`   Failed: ${result.failed}/${total} (${failRate}%)`);
  }
} else {
  console.log('\n✅ No flaky tests detected!');
}

if (stableTests.length > 0) {
  console.log(`\n✅ STABLE TESTS (${stableTests.length}):`);
  console.log('─'.repeat(80));
  
  for (const result of stableTests.slice(0, 10)) {
    console.log(`   ✓ ${result.test}`);
  }
  
  if (stableTests.length > 10) {
    console.log(`   ... and ${stableTests.length - 10} more`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log(`\n📊 Summary:`);
console.log(`   Total tests: ${results.size}`);
console.log(`   Flaky: ${flakyTests.length}`);
console.log(`   Stable: ${stableTests.length}`);

if (flakyTests.length > 0) {
  process.exit(1);
}

