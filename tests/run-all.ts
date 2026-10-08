/**
 * NoteSphere OS — Master Test Runner
 * Executes all unit and API integration tests sequentially.
 */

import { runner } from './test-framework';
import './unit.test';
import './api-integration.test';

async function main() {
  console.log('🚀 Starting NoteSphere OS Full Test Suite...\n');
  const results = await runner.run();
  const hasFailures = results.some((r) => !r.passed);
  if (hasFailures) {
    console.error('❌ Test suite failed with errors.');
    process.exit(1);
  } else {
    console.log('✅ All tests completed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
