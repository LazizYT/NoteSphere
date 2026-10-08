/**
 * NoteSphere OS — Ultra-fast Zero-Dependency TypeScript Test Framework
 * Provides describe, it, expect, and test suite orchestration.
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface SuiteResult {
  name: string;
  tests: TestResult[];
  passed: boolean;
  durationMs: number;
}

type TestFn = () => void | Promise<void>;

class TestRunner {
  private currentSuite: string = 'Default';
  private suites: Map<string, { name: string; fn: TestFn }[]> = new Map();

  describe(name: string, fn: () => void) {
    const prevSuite = this.currentSuite;
    this.currentSuite = name;
    if (!this.suites.has(name)) {
      this.suites.set(name, []);
    }
    fn();
    this.currentSuite = prevSuite;
  }

  it(name: string, fn: TestFn) {
    const list = this.suites.get(this.currentSuite) || [];
    list.push({ name, fn });
    this.suites.set(this.currentSuite, list);
  }

  async run(): Promise<SuiteResult[]> {
    const suiteResults: SuiteResult[] = [];
    const totalStart = Date.now();

    console.log('\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[1m\x1b[36m║           🧪 NOTESPHERE OS — AUTOMATED TEST SUITE           ║\x1b[0m');
    console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════╝\x1b[0m\n');

    for (const [suiteName, tests] of this.suites.entries()) {
      console.log(`\x1b[1m\x1b[35m► Suite: ${suiteName}\x1b[0m`);
      const suiteStart = Date.now();
      const testResults: TestResult[] = [];
      let suitePassed = true;

      for (const test of tests) {
        const testStart = Date.now();
        try {
          await test.fn();
          const durationMs = Date.now() - testStart;
          testResults.push({ name: test.name, passed: true, durationMs });
          console.log(`  \x1b[32m✔ PASS\x1b[0m ${test.name} \x1b[90m(${durationMs}ms)\x1b[0m`);
        } catch (err: any) {
          suitePassed = false;
          const durationMs = Date.now() - testStart;
          const errMsg = err?.message || String(err);
          testResults.push({ name: test.name, passed: false, error: errMsg, durationMs });
          console.log(`  \x1b[31m✖ FAIL\x1b[0m ${test.name} \x1b[90m(${durationMs}ms)\x1b[0m`);
          console.log(`    \x1b[31mError: ${errMsg}\x1b[0m`);
        }
      }

      const suiteDuration = Date.now() - suiteStart;
      suiteResults.push({
        name: suiteName,
        tests: testResults,
        passed: suitePassed,
        durationMs: suiteDuration,
      });
      console.log('');
    }

    const totalDuration = Date.now() - totalStart;
    const totalTests = suiteResults.reduce((acc, s) => acc + s.tests.length, 0);
    const passedTests = suiteResults.reduce((acc, s) => acc + s.tests.filter((t) => t.passed).length, 0);
    const failedTests = totalTests - passedTests;

    console.log('\x1b[1m--------------------------------------------------------------\x1b[0m');
    if (failedTests === 0) {
      console.log(`\x1b[1m\x1b[32m🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} in ${totalDuration}ms\x1b[0m\n`);
    } else {
      console.log(`\x1b[1m\x1b[31m💥 TESTS FAILED: ${failedTests} failed, ${passedTests} passed out of ${totalTests} in ${totalDuration}ms\x1b[0m\n`);
    }

    return suiteResults;
  }
}

export const runner = new TestRunner();
export const describe = runner.describe.bind(runner);
export const it = runner.it.bind(runner);

export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected deep equality:\nExpected: ${b}\nReceived: ${a}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy, but got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item: any) {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`Expected array to contain ${JSON.stringify(item)}, but it does not`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(String(item))) {
          throw new Error(`Expected string to contain "${item}", but got "${actual}"`);
        }
      } else {
        throw new Error(`toContain only supports arrays and strings`);
      }
    },
    toBeGreaterThan(num: number) {
      if (typeof actual !== 'number' || actual <= num) {
        throw new Error(`Expected ${actual} to be greater than ${num}`);
      }
    },
    toBeGreaterThanOrEqual(num: number) {
      if (typeof actual !== 'number' || actual < num) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${num}`);
      }
    },
    toBeLessThan(num: number) {
      if (typeof actual !== 'number' || actual >= num) {
        throw new Error(`Expected ${actual} to be less than ${num}`);
      }
    },
    toThrow(expectedMessage?: string) {
      if (typeof actual !== 'function') {
        throw new Error(`Expected a function to test for throwing`);
      }
      let threw = false;
      let caughtError: any = null;
      try {
        (actual as any)();
      } catch (err: any) {
        threw = true;
        caughtError = err;
      }
      if (!threw) {
        throw new Error(`Expected function to throw, but it succeeded without errors`);
      }
      if (expectedMessage && !caughtError?.message?.includes(expectedMessage)) {
        throw new Error(`Expected throw message to contain "${expectedMessage}", but got "${caughtError?.message}"`);
      }
    },
  };
}
