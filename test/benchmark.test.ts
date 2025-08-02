import { 
  evaluateRamExpression, 
  evaluateRamExpressionNoCache, 
  getCacheStats, 
  clearCache 
} from '../src/dsl';
import { describe, it, beforeEach } from 'vitest';

describe('Performance Benchmarks', () => {
  const baseContext = { 
    runOptions: { maxItems: 100, maxTotalChargedUsd: 100 }, 
    input: { 
      foo: 42, 
      arr: [1, 2, 3, 4, 5],
      user: { profile: { scores: [10, 20, 30] } },
      multiplier: 2,
      nested: {
        x: 11,
        y: 12,
        z: [13, 14, 15],
        deep: { foo: 16, bar: 17 }
      }
    } 
  };

  // Different expression complexity levels
  const expressions = {
    simple: '1 + 2',
    property: 'input.foo',
    arrayLength: 'input.arr.length',
    arithmetic: '1 + 2 * 3 + 4 * 5 - 6 / 2',
    function: 'min(1, 2) + max(3, 4)',
    complex: 'min(runOptions.maxItems, input.arr.length * input.multiplier) + input.foo',
    nested: 'input.user.profile.scores.length * (input.multiplier + 1) + min(input.nested.x, input.nested.y)',
    variables: 'let a = input.foo; let b = input.arr.length; let c = a * b; c + input.multiplier',
    veryComplex: `
      let base = input.foo * 2;
      let arrayScore = input.arr.length * input.multiplier;
      let nestedScore = input.nested.x + input.nested.y + input.nested.z.length;
      let finalScore = min(runOptions.maxItems, max(base, arrayScore) + nestedScore);
      finalScore * (input.nested.deep.foo || 1)
    `.replace(/\s+/g, ' ').trim()
  };

  beforeEach(() => {
    clearCache();
  });

  describe('Cache Performance Analysis', () => {
    const N = 1000; // Number of iterations

    Object.entries(expressions).forEach(([name, expr]) => {
      it(`should benchmark ${name} expression`, () => {
        // Test 1: No cache (cold runs)
        const noCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpressionNoCache(expr, baseContext);
        }
        const noCacheTime = performance.now() - noCacheStart;

        // Clear cache and test with cache (first run populates cache)
        clearCache();
        const withCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpression(expr, baseContext);
        }
        const withCacheTime = performance.now() - withCacheStart;

        const stats = getCacheStats();
        const improvement = ((noCacheTime - withCacheTime) / noCacheTime * 100);

        console.log(`\n--- ${name.toUpperCase()} EXPRESSION ---`);
        console.log(`Expression: ${expr.substring(0, 60)}${expr.length > 60 ? '...' : ''}`);
        console.log(`No cache: ${noCacheTime.toFixed(2)}ms (${(noCacheTime/N).toFixed(4)}ms/eval)`);
        console.log(`With cache: ${withCacheTime.toFixed(2)}ms (${(withCacheTime/N).toFixed(4)}ms/eval)`);
        console.log(`Cache stats: ${stats.hits} hits, ${stats.misses} miss, ${(stats.hitRate * 100).toFixed(1)}% hit rate`);
        console.log(`Improvement: ${improvement.toFixed(1)}% faster`);
      });
    });
  });

  describe('Cache Behavior with Different Contexts', () => {
    it('should show cache effectiveness with same expression, different contexts', () => {
      const expression = 'input.foo * input.multiplier + input.arr.length';
      const contexts = Array.from({ length: 100 }, (_, i) => ({
        runOptions: { maxItems: 100 + i },
        input: {
          foo: 10 + i,
          multiplier: 2 + (i % 3),
          arr: Array(5 + (i % 10)).fill(0)
        }
      }));

      clearCache();
      const start = performance.now();
      
      // Run same expression with different contexts
      contexts.forEach(context => {
        evaluateRamExpression(expression, context);
      });
      
      const time = performance.now() - start;
      const stats = getCacheStats();

      console.log(`\n--- DIFFERENT CONTEXTS TEST ---`);
      console.log(`Expression: ${expression}`);
      console.log(`Evaluated with ${contexts.length} different contexts`);
      console.log(`Total time: ${time.toFixed(2)}ms (${(time/contexts.length).toFixed(4)}ms/eval)`);
      console.log(`Cache stats: ${stats.hits} hits, ${stats.misses} miss, ${(stats.hitRate * 100).toFixed(1)}% hit rate`);
      console.log(`Cache shows ${stats.hits} parsing operations saved out of ${contexts.length} evaluations`);
    });
  });

  describe('Cache Hit Rate Analysis', () => {
    it('should analyze cache performance with realistic usage patterns', () => {
      // Simulate realistic usage: some expressions repeat, some are unique
      const commonExpressions = [
        'input.foo * 2',
        'min(runOptions.maxItems, input.arr.length)',
        'input.multiplier + 1'
      ];

      const uniqueExpressions = Array.from({ length: 50 }, (_, i) => 
        `input.foo + ${i} * input.multiplier`
      );

      clearCache();
      const start = performance.now();

      // Mix of repeated and unique expressions
      for (let round = 0; round < 10; round++) {
        // Each round: evaluate common expressions multiple times
        commonExpressions.forEach(expr => {
          for (let i = 0; i < 5; i++) {
            evaluateRamExpression(expr, {
              ...baseContext,
              input: { ...baseContext.input, round, iteration: i }
            });
          }
        });

        // And some unique expressions
        uniqueExpressions.slice(round * 5, (round + 1) * 5).forEach(expr => {
          evaluateRamExpression(expr, baseContext);
        });
      }

      const time = performance.now() - start;
      const stats = getCacheStats();

      console.log(`\n--- REALISTIC USAGE PATTERN ---`);
      console.log(`Mixed common and unique expressions`);
      console.log(`Total evaluations: ${stats.totalEvaluations}`);
      console.log(`Total time: ${time.toFixed(2)}ms (${(time/stats.totalEvaluations).toFixed(4)}ms/eval)`);
      console.log(`Cache stats: ${stats.hits} hits, ${stats.misses} misses, ${(stats.hitRate * 100).toFixed(1)}% hit rate`);
      console.log(`Cache size: ${stats.cacheSize} entries`);
      
      // Estimate time saved
      const avgTimePerParse = 0.1; // ms - rough estimate
      const timeSaved = stats.hits * avgTimePerParse;
      console.log(`Estimated parsing time saved: ~${timeSaved.toFixed(2)}ms`);
    });
  });

  describe('Cache Memory Usage Analysis', () => {
    it('should analyze cache memory behavior', () => {
      // Create many unique expressions to test LRU behavior
      const expressions = Array.from({ length: 1200 }, (_, i) => 
        `input.foo + ${i} * input.multiplier % ${i + 1}`
      );

      clearCache();
      
      expressions.forEach(expr => {
        evaluateRamExpression(expr, baseContext);
      });

      const stats = getCacheStats();
      
      console.log(`\n--- CACHE MEMORY USAGE ---`);
      console.log(`Created ${expressions.length} unique expressions`);
      console.log(`Cache size limit: 1000 entries`);
      console.log(`Actual cache size: ${stats.cacheSize} entries`);
      console.log(`LRU eviction occurred: ${stats.cacheSize < expressions.length ? 'Yes' : 'No'}`);
      console.log(`Cache stats: ${stats.hits} hits, ${stats.misses} misses`);

      // Test that oldest entries were evicted
      const oldExpression = expressions[0];
      const newExpression = expressions[expressions.length - 1];
      
      clearCache();
      expressions.forEach(expr => evaluateRamExpression(expr, baseContext));
      
      // These should both be cache misses since we cleared cache
      clearCache();
      evaluateRamExpression(oldExpression, baseContext);
      const afterOld = getCacheStats();
      
      evaluateRamExpression(newExpression, baseContext);
      const afterNew = getCacheStats();
      
      console.log(`Testing specific expressions after full cache:...`);
      console.log(`Both should be cache misses after clear: old=${afterOld.misses}, new=${afterNew.misses - afterOld.misses}`);
    });
  });
});