import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

interface TestTiming {
  title: string;
  file: string;
  duration: number;
  status: string;
}

class PerformanceReporter implements Reporter {
  private startTime: number = 0;
  private testTimings: TestTiming[] = [];
  private currentTestStart: number = 0;
  private currentTestTitle: string = '';
  private currentTestFile: string = '';

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    const timestamp = new Date().toISOString();
    const environment = process.env.CI ? 'CI (Vercel/GitHub Actions)' : 'Local Machine';
    const nodeVersion = process.version;
    
    console.log('\n' + '='.repeat(80));
    console.log('🚀 E2E TEST PERFORMANCE TRACKING STARTED');
    console.log('='.repeat(80));
    console.log(`📅 Started at: ${timestamp}`);
    console.log(`🖥️  Environment: ${environment}`);
    console.log(`⚙️  Node.js: ${nodeVersion}`);
    console.log(`⚠️  Note: Times are machine-specific and will differ between local and CI`);
    console.log(`🔍 Search for "[PERFORMANCE]" in logs to find performance metrics`);
    console.log('='.repeat(80) + '\n');
  }

  onTestBegin(test: TestCase) {
    this.currentTestStart = Date.now();
    this.currentTestTitle = test.title;
    this.currentTestFile = test.location.file.split('/').pop() || 'unknown';
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Use high-precision timing (milliseconds converted to seconds with 3 decimal places)
    const duration = (Date.now() - this.currentTestStart) / 1000;
    const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    
    this.testTimings.push({
      title: this.currentTestTitle,
      file: this.currentTestFile,
      duration,
      status,
    });

    // Log each test with clear formatting (3 decimal places for precision)
    const durationStr = duration.toFixed(3).padStart(8);
    console.log(`⏱️  [${durationStr}s] ${status} ${this.currentTestFile} → ${this.currentTestTitle}`);
  }

  onEnd(result: FullResult) {
    // Use high-precision timing for total duration
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const timestamp = new Date().toISOString();
    const environment = process.env.CI ? 'CI (Vercel/GitHub Actions)' : 'Local Machine';

    console.log('\n' + '='.repeat(80));
    console.log('📊 E2E TEST PERFORMANCE SUMMARY');
    console.log('='.repeat(80));
    console.log(`🖥️  Environment: ${environment} (times are machine-specific)`);

    // Sort tests by duration (slowest first)
    const sortedTimings = [...this.testTimings].sort((a, b) => b.duration - a.duration);

    // Show top 10 slowest tests
    if (sortedTimings.length > 0) {
      console.log('\n🐌 Top 10 Slowest Tests:');
      console.log('-'.repeat(80));
      sortedTimings.slice(0, 10).forEach((timing, index) => {
        const durationStr = timing.duration.toFixed(3).padStart(8);
        const rank = (index + 1).toString().padStart(2);
        console.log(`  ${rank}. [${durationStr}s] ${timing.status} ${timing.file} → ${timing.title}`);
      });
    }

    // Statistics
    const passed = this.testTimings.filter(t => t.status === '✅').length;
    const failed = this.testTimings.filter(t => t.status === '❌').length;
    const skipped = this.testTimings.filter(t => t.status === '⏭️').length;
    const totalTests = this.testTimings.length;
    const avgDuration = totalTests > 0 
      ? (this.testTimings.reduce((sum, t) => sum + t.duration, 0) / totalTests).toFixed(3)
      : '0.000';
    const minDuration = totalTests > 0 
      ? Math.min(...this.testTimings.map(t => t.duration)).toFixed(3)
      : '0.000';
    const maxDuration = totalTests > 0 
      ? Math.max(...this.testTimings.map(t => t.duration)).toFixed(3)
      : '0.000';

    console.log('\n📈 Test Statistics:');
    console.log('-'.repeat(80));
    console.log(`  Total Tests:     ${totalTests}`);
    console.log(`  ✅ Passed:       ${passed}`);
    console.log(`  ❌ Failed:       ${failed}`);
    console.log(`  ⏭️  Skipped:      ${skipped}`);
    console.log(`  ⏱️  Avg Duration: ${avgDuration}s`);
    console.log(`  ⚡ Fastest:      ${minDuration}s`);
    console.log(`  🐌 Slowest:      ${maxDuration}s`);

    // Total execution time
    console.log('\n' + '='.repeat(80));
    console.log(`⏱️  TOTAL EXECUTION TIME: ${totalDuration.toFixed(3)}s (${(totalDuration / 60).toFixed(2)} minutes)`);
    console.log(`📅 Completed at: ${timestamp}`);
    console.log('='.repeat(80) + '\n');

    // Also log a single-line summary for easy grep/searching in logs (especially in Vercel)
    console.log('\n' + '='.repeat(80));
    console.log(`[PERFORMANCE] 🖥️  Environment: ${environment}`);
    console.log('[PERFORMANCE] ⏱️  TOTAL EXECUTION TIME: ' + totalDuration.toFixed(3) + 's');
    console.log('[PERFORMANCE] 📊 Tests: ' + totalTests + ' | ✅ Passed: ' + passed + ' | ❌ Failed: ' + failed + ' | ⏭️  Skipped: ' + skipped);
    console.log('[PERFORMANCE] 📈 Avg: ' + avgDuration + 's | ⚡ Fastest: ' + minDuration + 's | 🐌 Slowest: ' + maxDuration + 's');
    console.log('='.repeat(80) + '\n');
  }
}

export default PerformanceReporter;

