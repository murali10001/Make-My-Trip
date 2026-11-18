/**
 * ANSI Colored Test Results Formatter & JSON Report Exporter.
 */

import { promises as fs } from 'fs';
import path from 'path';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

export class Reporter {
  constructor(reportPath = 'testing/reports/e2e_results.json') {
    this.reportPath = reportPath;
    this.results = [];
    this.startTime = Date.now();
  }

  logPass(tier, feature, name, durationMs) {
    const featureTag = feature ? `Feature ${String(feature).padStart(2, ' ')}` : 'General   ';
    console.log(`  ${GREEN}✓ PASS${RESET} [Tier ${tier} | ${featureTag}] ${name} ${DIM}(${durationMs}ms)${RESET}`);
  }

  logFail(tier, feature, name, error, durationMs) {
    const featureTag = feature ? `Feature ${String(feature).padStart(2, ' ')}` : 'General   ';
    console.error(`  ${RED}✗ FAIL${RESET} [Tier ${tier} | ${featureTag}] ${name} ${DIM}(${durationMs}ms)${RESET}`);
    console.error(`         ${RED}Error: ${error?.message || error}${RESET}`);
    if (error?.stack) {
      const filteredStack = error.stack.split('\n').slice(1, 4).join('\n');
      console.error(`         ${DIM}${filteredStack}${RESET}`);
    }
  }

  recordResult(testResult) {
    this.results.push(testResult);
  }

  generateSummary() {
    const durationMs = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASSED').length;
    const failedTests = this.results.filter(r => r.status === 'FAILED').length;

    // Per-tier breakdown
    const tierMap = {};
    for (const r of this.results) {
      const t = r.tier || 'unknown';
      if (!tierMap[t]) {
        tierMap[t] = { total: 0, passed: 0, failed: 0 };
      }
      tierMap[t].total++;
      if (r.status === 'PASSED') tierMap[t].passed++;
      else tierMap[t].failed++;
    }

    // Per-feature breakdown (features 1 to 34)
    const featureMap = {};
    for (let f = 1; f <= 34; f++) {
      featureMap[f] = { total: 0, passed: 0, failed: 0 };
    }
    for (const r of this.results) {
      if (r.feature && featureMap[r.feature]) {
        featureMap[r.feature].total++;
        if (r.status === 'PASSED') featureMap[r.feature].passed++;
        else featureMap[r.feature].failed++;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      durationMs,
      totalTests,
      passedTests,
      failedTests,
      allPassed: failedTests === 0 && totalTests > 0,
      tierMap,
      featureMap,
      results: this.results
    };
  }

  printSummaryTable(summary) {
    console.log('\n' + '='.repeat(80));
    console.log(`${BOLD}E2E TEST EXECUTION SUMMARY${RESET}`);
    console.log('='.repeat(80));

    // Print Tiers
    const tierNames = {
      '1': 'Tier 1: Feature Coverage      ',
      '2': 'Tier 2: Boundary & Corner Cases',
      '3': 'Tier 3: Pairwise Combinations  ',
      '4': 'Tier 4: Application Scenarios  '
    };

    for (const [tier, stats] of Object.entries(summary.tierMap)) {
      const name = tierNames[tier] || `Tier ${tier}                      `;
      const pct = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : '0.0';
      const color = stats.failed === 0 ? GREEN : RED;
      console.log(`  ${name} | ${color}${stats.passed} / ${stats.total} passed (${pct}%)${RESET}`);
    }

    console.log('-'.repeat(80));
    console.log(`${BOLD}Features 1-34 Verification Breakdown:${RESET}`);

    const featureLabels = {
      1: 'Real-time flight tracking & radar',
      2: 'Automated flight status simulation',
      3: 'Multi-flight tracking (Watchlist)',
      4: 'Flight status SSE stream',
      5: 'Flight 3-tier architecture',
      6: 'Demand-based surge pricing',
      7: 'Time-to-departure multipliers',
      8: 'Competitor pricing simulation',
      9: '24-48h Price freeze lifecycle',
      10: 'Promotional coupons validation',
      11: 'Real-time price stream (SSE)',
      12: 'Dynamic pricing 3-tier arch',
      13: 'Self-service booking cancellation',
      14: 'Tiered cancellation fee calc',
      15: 'Automated refund transitions',
      16: 'Refund tracking timeline & UTR',
      17: 'Refund 3-tier architecture',
      18: 'Seat map & lock / release',
      19: 'Hotel room 3D showcase',
      20: 'Saved user travel preferences',
      21: 'Real-time seat concurrency',
      22: 'Selection 3-tier architecture',
      23: 'Verified booking review gate',
      24: 'Sentiment scoring & category',
      25: 'Photo uploads & helpful votes',
      26: 'Hotelier replies & flagging',
      27: 'Admin review moderation queue',
      28: 'Review 3-tier architecture',
      29: 'Collaborative recommendations',
      30: 'Algorithmic explanations modal',
      31: 'User feedback & affinity loop',
      32: 'Curated fallback base catalog',
      33: 'Recommendation SSE stream sync',
      34: 'Recommendation 3-tier arch'
    };

    for (let f = 1; f <= 34; f++) {
      const stats = summary.featureMap[f];
      const name = featureLabels[f] || `Feature ${f}`;
      const fNum = String(f).padStart(2, ' ');
      const paddedName = name.padEnd(33, ' ');
      const statusTag = stats.total > 0 && stats.failed === 0 ? `${GREEN}[OK]${RESET}` : stats.failed > 0 ? `${RED}[FAIL]${RESET}` : `${YELLOW}[NO TESTS]${RESET}`;
      console.log(`    Feature ${fNum} (${paddedName}): ${stats.passed} / ${stats.total} passed ${statusTag}`);
    }

    console.log('-'.repeat(80));
    const totalColor = summary.failedTests === 0 && summary.totalTests > 0 ? GREEN : RED;
    console.log(
      `  Total Tests: ${BOLD}${summary.totalTests}${RESET} | ` +
      `Passed: ${GREEN}${summary.passedTests}${RESET} | ` +
      `Failed: ${summary.failedTests > 0 ? RED : ''}${summary.failedTests}${RESET} | ` +
      `Duration: ${CYAN}${(summary.durationMs / 1000).toFixed(2)}s${RESET}`
    );

    if (summary.allPassed) {
      console.log(`  ${BOLD}${GREEN}Status: ALL TESTS PASSED SUCCESSFULLY${RESET}`);
    } else {
      console.log(`  ${BOLD}${RED}Status: TEST SUITE FAILED (${summary.failedTests} failed)${RESET}`);
    }
    console.log('='.repeat(80) + '\n');
  }

  async saveReport(summary, outputPath = this.reportPath) {
    try {
      const resolvedPath = path.resolve(process.cwd(), outputPath);
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      await fs.writeFile(resolvedPath, JSON.stringify(summary, null, 2), 'utf-8');
      console.log(`Machine-readable report saved to: ${resolvedPath}`);
    } catch (err) {
      console.error(`Failed to save report to ${outputPath}:`, err.message);
    }
  }
}
