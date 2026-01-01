# CI/CD Error Output Guide

## Overview

This document explains how test failures are reported in CI/CD (Vercel) and how to interpret the error messages.

## Error Message Format

When tests fail in CI, you'll see detailed error messages that include:

### 1. Operation Context
- What the test was trying to do (e.g., "creating menu item", "editing announcement")
- The specific test name
- Relevant test data (titles, dates, etc.)

### 2. Technical Details
- **URL**: The page URL when the error occurred
- **Time elapsed**: How long the operation took before failing
- **Network status**: Whether network requests completed
- **Element state**: What elements were found/not found

### 3. Diagnostic Information
- Common causes for the failure
- What to check (API endpoints, console errors, etc.)
- References to screenshots/videos for visual debugging

## Example Error Messages

### Form Submission Failure

```
❌ Form submission failed: creating menu item
   Time elapsed: 8500ms
   URL: http://localhost:3000/admin/menu
   ❌ Success message not found after 5000ms (creating menu item)
      URL: http://localhost:3000/admin/menu
      Page title: Menu Management
      Tried selectors: .bg-green-900, [role="alert"], [class*="toast"], text=/success|created|saved|updated/i
      This usually means:
      - Form submission failed silently
      - Success toast didn't appear
      - Network request is still pending
      Check screenshot/video for visual context
   Check screenshot/video for visual context
```

### Network Timeout

```
❌ Network did not become idle after 5000ms (form submission)
   URL: http://localhost:3000/admin/announcements
   This usually means:
   - API requests are still pending
   - Background polling is active
   - Network timeout is too short
   Check network tab in browser devtools or increase timeout
```

### Element Not Found

```
Event not found on public events page after creation
Test: should create recurring weekly event with UNTIL date including last occurrence
Event title: UNTIL Test Event test-1234567890-abc123
URL: http://localhost:3000/events
Event count found: 0
This usually means:
- Event was created but not yet visible (timing issue)
- Event date is in the future and not shown
- Recurrence calculation failed
- Page didn't load correctly
Check screenshot/video for visual context
```

## CI Artifacts

### Screenshots
- **Location**: `test-results/[test-name]/test-failed-1.png`
- **When**: Captured on every test failure
- **In Vercel**: Available in the test report UI

### Videos
- **Location**: `test-results/[test-name]/video.webm`
- **When**: Captured on test failure in CI
- **In Vercel**: Available in the test report UI
- **Note**: Videos show the full test execution leading up to the failure

### Traces
- **Location**: `test-results/[test-name]/trace.zip`
- **When**: Always captured in CI
- **In Vercel**: Available in the test report UI
- **Note**: Traces include full execution history, network requests, console logs, and DOM snapshots

## Debugging Failed Tests

### 1. Check the Error Message
- Read the full error message for context
- Note the URL and timing information
- Review the "This usually means" section

### 2. Review Artifacts
- **Screenshot**: See what the page looked like when it failed
- **Video**: Watch the test execution to see what happened
- **Trace**: Use Playwright Trace Viewer for detailed debugging

### 3. Common Issues

#### Network Timeouts
- **Symptom**: "Network did not become idle"
- **Solution**: Check if API endpoints are slow or hanging
- **Fix**: Increase timeout or investigate API performance

#### Missing Elements
- **Symptom**: "Element not found" or "Success message not found"
- **Solution**: Check if UI changed or element selectors need updating
- **Fix**: Update selectors or wait conditions

#### Seed Data Issues
- **Symptom**: "No seed data found" or "Only found X items"
- **Solution**: Ensure seed script ran correctly
- **Fix**: Check database state or re-run seed script

#### Timing Issues
- **Symptom**: "Event not found" or "Element not visible"
- **Solution**: Test may need more time for async operations
- **Fix**: Increase retry count or wait time

## Best Practices for CI

### 1. Use Descriptive Test Names
```typescript
test('should create menu item with all required fields', ...)
// Not: test('menu test', ...)
```

### 2. Add Context to Waits
```typescript
await waitForFormSubmission(page, {
  context: 'creating menu item', // Helps identify where failure occurred
  ...
});
```

### 3. Capture Errors
```typescript
const errors = captureErrors(page);
// ... test code ...
if (errors.consoleErrors.length > 0) {
  console.error('Console errors:', errors.consoleErrors);
}
```

### 4. Check Seed Data
```typescript
const hasSeedData = await ensureSeedDataExists(page, 'announcement', 1);
if (!hasSeedData) {
  console.warn('⚠️  No seed data - test may fail');
}
```

## Vercel CI Integration

### Test Reports
- Test results are automatically uploaded to Vercel
- Access reports from the deployment page
- Download artifacts (screenshots, videos, traces) from the report

### GitHub Integration
- Test failures create annotations in GitHub PRs
- Click annotations to see error details
- Download artifacts from the PR checks page

### Logs
- Full test execution logs are available in Vercel build logs
- Search for `[PERFORMANCE]` tags for performance metrics
- Search for `❌` or `⚠️` for errors and warnings

## Monitoring

### Performance Metrics
Look for `[PERFORMANCE]` tags in logs:
```
[PERFORMANCE] 🖥️  Environment: CI
[PERFORMANCE] ⏱️  TOTAL EXECUTION TIME: 245.123s
[PERFORMANCE] 📊 Tests: 102 | ✅ Passed: 99 | ❌ Failed: 3 | ⏭️  Skipped: 0
[PERFORMANCE] 📈 Avg: 2.403s | ⚡ Fastest: 0.124s | 🐌 Slowest: 7.123s
```

### Flaky Test Detection
Run the flaky test detector to identify tests that fail intermittently:
```bash
tsx e2e/detect-flaky-tests.ts
```

## Getting Help

If a test fails in CI:

1. **Read the error message** - It contains diagnostic information
2. **Check artifacts** - Screenshots/videos show what happened
3. **Review logs** - Look for console errors or network failures
4. **Reproduce locally** - Run the test locally with the same conditions
5. **Check recent changes** - See if recent code changes affected the test

For persistent failures, check:
- Database state (seed data exists?)
- API endpoints (responding correctly?)
- UI changes (selectors still valid?)
- Timing issues (need more wait time?)

