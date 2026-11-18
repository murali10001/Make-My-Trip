#!/usr/bin/env node

/**
 * Unified E2E Test Runner for MakeMyTrip Clone Platform.
 * CLI Flags:
 *   --tier <1|2|3|4>      : Run only tests for the specified tier
 *   --feature <1..34>     : Run only tests for the specified feature
 *   --baseUrl <url>       : Override backend API base URL (default: http://localhost:8081)
 *   --report <path>       : Override report JSON output path (default: testing/reports/e2e_results.json)
 */

import assert from 'node:assert';
import { setBaseUrl, getBaseUrl, probeServer } from './harness/env.mjs';
import { Reporter } from './harness/reporter.mjs';
import { client } from './harness/client.mjs';
import { listenToSse } from './harness/sse_client.mjs';

// Parse command line arguments
function parseArgs(args) {
  const options = {
    tier: null,
    feature: null,
    baseUrl: null,
    report: 'testing/reports/e2e_results.json'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tier' && args[i + 1]) {
      options.tier = parseInt(args[++i], 10);
    } else if (arg === '--feature' && args[i + 1]) {
      options.feature = parseInt(args[++i], 10);
    } else if (arg === '--baseUrl' && args[i + 1]) {
      options.baseUrl = args[++i];
    } else if (arg === '--report' && args[i + 1]) {
      options.report = args[++i];
    }
  }

  return options;
}

// Dynamic test suite loader
async function loadSuites() {
  const suites = [];

  // Tier 1 Suites
  try {
    suites.push({ tier: 1, ...(await import('./tier1/01_flight_status.test.mjs')) });
    suites.push({ tier: 1, ...(await import('./tier1/02_dynamic_pricing.test.mjs')) });
    suites.push({ tier: 1, ...(await import('./tier1/03_cancellation_refunds.test.mjs')) });
    suites.push({ tier: 1, ...(await import('./tier1/04_seat_room_selection.test.mjs')) });
    suites.push({ tier: 1, ...(await import('./tier1/05_customer_reviews.test.mjs')) });
    suites.push({ tier: 1, ...(await import('./tier1/06_recommendations.test.mjs')) });
  } catch (err) {
    console.warn('Warning: Some Tier 1 suites could not be loaded:', err.message);
  }

  // Tier 2 Suites
  try {
    suites.push({ tier: 2, ...(await import('./tier2/01_flight_status_boundary.test.mjs')) });
    suites.push({ tier: 2, ...(await import('./tier2/02_dynamic_pricing_boundary.test.mjs')) });
    suites.push({ tier: 2, ...(await import('./tier2/03_cancellation_refunds_boundary.test.mjs')) });
    suites.push({ tier: 2, ...(await import('./tier2/04_seat_room_selection_boundary.test.mjs')) });
    suites.push({ tier: 2, ...(await import('./tier2/05_customer_reviews_boundary.test.mjs')) });
    suites.push({ tier: 2, ...(await import('./tier2/06_recommendations_boundary.test.mjs')) });
  } catch (err) {
    console.warn('Warning: Some Tier 2 suites could not be loaded:', err.message);
  }

  // Tier 3 Suite
  try {
    suites.push({ tier: 3, ...(await import('./tier3/pairwise_combinations.test.mjs')) });
  } catch (err) {
    console.warn('Warning: Tier 3 suite could not be loaded:', err.message);
  }

  // Tier 4 Suite
  try {
    suites.push({ tier: 4, ...(await import('./tier4/application_scenarios.test.mjs')) });
  } catch (err) {
    console.warn('Warning: Tier 4 suite could not be loaded:', err.message);
  }

  return suites;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.baseUrl) {
    setBaseUrl(options.baseUrl);
  }

  const reporter = new Reporter(options.report);
  const targetBaseUrl = getBaseUrl();

  console.log('\n' + '='.repeat(80));
  console.log(`MAKEMYTRIP E2E TEST RUNNER`);
  console.log(`Target URL : ${targetBaseUrl}`);
  if (options.tier) console.log(`Filter Tier: ${options.tier}`);
  if (options.feature) console.log(`Filter Feat: ${options.feature}`);
  console.log('='.repeat(80));

  // 1. Pre-flight connectivity probe
  console.log('\n[PRE-FLIGHT] Probing backend server at ' + targetBaseUrl + '...');
  const probe = await probeServer(targetBaseUrl, 15, 1000);
  if (!probe.ok) {
    console.error(`\n[ERROR] Pre-flight connectivity check failed: ${probe.error}`);
    console.error(`Please ensure the Spring Boot backend is running on port 8081.`);
    const summary = reporter.generateSummary();
    await reporter.saveReport(summary);
    process.exit(1);
  }
  console.log('[PRE-FLIGHT] Backend is up and healthy. Starting tests...\n');

  // 2. Load all test suites
  const loadedSuites = await loadSuites();
  let allTests = [];

  for (const s of loadedSuites) {
    if (Array.isArray(s.tests)) {
      for (const t of s.tests) {
        allTests.push({ ...t, tier: t.tier || s.tier });
      }
    }
  }

  // Apply filters
  if (options.tier !== null) {
    allTests = allTests.filter(t => t.tier === options.tier);
  }
  if (options.feature !== null) {
    allTests = allTests.filter(t => t.feature === options.feature);
  }

  console.log(`Discovered ${allTests.length} tests matching execution filters.\n`);

  // 3. Execute tests sequentially
  const context = {
    client,
    sse: { listenToSse },
    assert
  };

  for (const test of allTests) {
    const testStartTime = Date.now();
    let status = 'PASSED';
    let errorObj = null;

    try {
      await test.fn(context);
    } catch (err) {
      status = 'FAILED';
      errorObj = err;
    }

    const durationMs = Date.now() - testStartTime;

    if (status === 'PASSED') {
      reporter.logPass(test.tier, test.feature, test.name, durationMs);
    } else {
      reporter.logFail(test.tier, test.feature, test.name, errorObj, durationMs);
    }

    reporter.recordResult({
      tier: test.tier,
      feature: test.feature,
      name: test.name,
      status,
      durationMs,
      error: errorObj ? errorObj.message : null
    });
  }

  // 4. Summarize and export report
  const summary = reporter.generateSummary();
  reporter.printSummaryTable(summary);
  await reporter.saveReport(summary);

  // 5. Exit with appropriate code
  process.exit(summary.allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
