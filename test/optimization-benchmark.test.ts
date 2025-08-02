import { 
  evaluateRamExpression, 
  evaluateRamExpressionNoCache, 
  getCacheStats, 
  clearCache 
} from '../src/dsl';
import { describe, it, beforeEach } from 'vitest';

describe('Optimization Impact Benchmarks', () => {
  const baseContext = { 
    runOptions: { maxItems: 100, maxTotalChargedUsd: 100 }, 
    input: { 
      foo: 42, 
      bar: 24,
      baz: 12,
      arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      user: { 
        profile: { 
          scores: [10, 20, 30, 40, 50],
          settings: { theme: 'dark', notifications: true }
        } 
      },
      multiplier: 2.5,
      nested: {
        x: 11, y: 12, z: 13,
        deep: { 
          foo: 16, bar: 17, baz: 18,
          items: [100, 200, 300, 400, 500],
          config: { enabled: true, timeout: 5000 }
        }
      }
    } 
  };

  beforeEach(() => {
    clearCache();
  });

  describe('Property Access Optimizations', () => {
    const N = 10000;

    const propertyExpressions = [
      'input.foo',
      'input.user.profile.scores.length',
      'input.nested.deep.items.length',
      'input.user.profile.settings.theme',
      'runOptions.maxItems',
      'input.nested.deep.config.timeout'
    ];

    propertyExpressions.forEach(expr => {
      it(`should benchmark property access: ${expr}`, () => {
        // Test with cache (property cache + CST cache)
        clearCache();
        const withCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpression(expr, baseContext);
        }
        const withCacheTime = performance.now() - withCacheStart;

        // Test without cache (no CST cache, no property cache)
        const noCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpressionNoCache(expr, baseContext);
        }
        const noCacheTime = performance.now() - noCacheStart;

        const improvement = ((noCacheTime - withCacheTime) / noCacheTime * 100);
        const withCacheOpsPerMs = N / withCacheTime;
        const noCacheOpsPerMs = N / noCacheTime;

        console.log(`\n--- PROPERTY ACCESS: ${expr} ---`);
        console.log(`No optimizations: ${noCacheTime.toFixed(2)}ms (${noCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`With optimizations: ${withCacheTime.toFixed(2)}ms (${withCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`Improvement: ${improvement.toFixed(1)}% faster`);
      });
    });
  });

  describe('Arithmetic Operation Optimizations', () => {
    const N = 10000;

    const arithmeticExpressions = [
      '1 + 2 + 3 + 4 + 5',
      '10 * 2 * 3 * 4',
      '100 / 2 / 5',
      '1 + 2 * 3 + 4 * 5 - 6 / 2 + 7 % 3',
      'input.foo + input.bar * input.baz - input.multiplier',
      '(input.foo + input.bar) * (input.baz - input.multiplier) / 2'
    ];

    arithmeticExpressions.forEach(expr => {
      it(`should benchmark arithmetic: ${expr}`, () => {
        clearCache();
        const withCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpression(expr, baseContext);
        }
        const withCacheTime = performance.now() - withCacheStart;

        const noCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpressionNoCache(expr, baseContext);
        }
        const noCacheTime = performance.now() - noCacheStart;

        const improvement = ((noCacheTime - withCacheTime) / noCacheTime * 100);
        const withCacheOpsPerMs = N / withCacheTime;
        const noCacheOpsPerMs = N / noCacheTime;

        console.log(`\n--- ARITHMETIC: ${expr} ---`);
        console.log(`No optimizations: ${noCacheTime.toFixed(2)}ms (${noCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`With optimizations: ${withCacheTime.toFixed(2)}ms (${withCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`Improvement: ${improvement.toFixed(1)}% faster`);
      });
    });
  });

  describe('Function Call Optimizations', () => {
    const N = 10000;

    const functionExpressions = [
      'min(1, 2)',
      'max(10, 20, 30)',
      'min(input.foo, input.bar, input.baz)',
      'max(input.arr.length, input.nested.x, input.nested.y)',
      'min(max(input.foo, input.bar), min(input.baz, input.multiplier))',
      'max(min(1, 2, 3), min(4, 5, 6), min(7, 8, 9))'
    ];

    functionExpressions.forEach(expr => {
      it(`should benchmark function calls: ${expr}`, () => {
        clearCache();
        const withCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpression(expr, baseContext);
        }
        const withCacheTime = performance.now() - withCacheStart;

        const noCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpressionNoCache(expr, baseContext);
        }
        const noCacheTime = performance.now() - noCacheStart;

        const improvement = ((noCacheTime - withCacheTime) / noCacheTime * 100);
        const withCacheOpsPerMs = N / withCacheTime;
        const noCacheOpsPerMs = N / noCacheTime;

        console.log(`\n--- FUNCTION CALLS: ${expr} ---`);
        console.log(`No optimizations: ${noCacheTime.toFixed(2)}ms (${noCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`With optimizations: ${withCacheTime.toFixed(2)}ms (${withCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`Improvement: ${improvement.toFixed(1)}% faster`);
      });
    });
  });

  describe('Complex Expression Optimizations', () => {
    const N = 5000; // Fewer iterations for complex expressions

    const complexExpressions = [
      'let a = input.foo; let b = input.bar; let c = a * b + input.baz; c',
      'min(runOptions.maxItems, input.arr.length * input.multiplier) + input.foo',
      'input.user.profile.scores.length * (input.multiplier + 1) + min(input.nested.x, input.nested.y)',
      `let base = input.foo * 2;
       let arrayScore = input.arr.length * input.multiplier;
       let nestedScore = input.nested.x + input.nested.y + input.nested.deep.items.length;
       let finalScore = min(runOptions.maxItems, max(base, arrayScore) + nestedScore);
       finalScore * (input.nested.deep.foo || 1)`.replace(/\s+/g, ' ').trim()
    ];

    complexExpressions.forEach((expr, idx) => {
      it(`should benchmark complex expression ${idx + 1}`, () => {
        clearCache();
        const withCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpression(expr, baseContext);
        }
        const withCacheTime = performance.now() - withCacheStart;

        const noCacheStart = performance.now();
        for (let i = 0; i < N; i++) {
          evaluateRamExpressionNoCache(expr, baseContext);
        }
        const noCacheTime = performance.now() - noCacheStart;

        const improvement = ((noCacheTime - withCacheTime) / noCacheTime * 100);
        const withCacheOpsPerMs = N / withCacheTime;
        const noCacheOpsPerMs = N / noCacheTime;

        console.log(`\n--- COMPLEX EXPRESSION ${idx + 1} ---`);
        console.log(`Expression: ${expr.substring(0, 60)}${expr.length > 60 ? '...' : ''}`);
        console.log(`No optimizations: ${noCacheTime.toFixed(2)}ms (${noCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`With optimizations: ${withCacheTime.toFixed(2)}ms (${withCacheOpsPerMs.toFixed(0)} ops/ms)`);
        console.log(`Improvement: ${improvement.toFixed(1)}% faster`);
      });
    });
  });

  describe('Memory and Cache Efficiency', () => {
    it('should test property cache effectiveness', () => {
      const expression = 'input.user.profile.scores.length + input.nested.deep.items.length + input.foo';
      const N = 1000;

      clearCache();
      const start = performance.now();
      
      for (let i = 0; i < N; i++) {
        // Same expression, slightly different context each time
        const context = {
          ...baseContext,
          input: {
            ...baseContext.input,
            dynamicValue: i // This changes, but paths stay the same
          }
        };
        evaluateRamExpression(expression, context);
      }
      
      const time = performance.now() - start;
      const stats = getCacheStats();

      console.log(`\n--- PROPERTY CACHE EFFICIENCY ---`);
      console.log(`Expression: ${expression}`);
      console.log(`Evaluated ${N} times with varying contexts`);
      console.log(`Total time: ${time.toFixed(2)}ms (${(time/N).toFixed(4)}ms/eval)`);
      console.log(`Cache stats: ${stats.hits} hits, ${stats.misses} miss, ${(stats.hitRate * 100).toFixed(1)}% hit rate`);
      console.log(`Operations per ms: ${(N / time).toFixed(0)}`);
    });

    it('should measure memory usage patterns', () => {
      // Test with many unique property paths to stress property cache
      const expressions = Array.from({ length: 100 }, (_, i) => 
        `input.foo${i % 10} || input.nested.value${i % 20} || ${i}`
      );

      clearCache();
      const start = performance.now();
      
      expressions.forEach(expr => {
        for (let i = 0; i < 50; i++) {
          evaluateRamExpression(expr, baseContext);
        }
      });
      
      const time = performance.now() - start;
      const stats = getCacheStats();

      console.log(`\n--- MEMORY USAGE PATTERNS ---`);
      console.log(`${expressions.length} unique expressions, 50 evals each`);
      console.log(`Total evaluations: ${expressions.length * 50}`);
      console.log(`Total time: ${time.toFixed(2)}ms`);
      console.log(`Cache size: ${stats.cacheSize} entries`);
      console.log(`Average time per evaluation: ${(time / (expressions.length * 50)).toFixed(4)}ms`);
    });
  });
});