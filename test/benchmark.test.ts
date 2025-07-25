import { evaluateDSL } from '../src/index';

describe('evaluateDSL performance benchmark', () => {
    // Simple, parser-safe DSL expression
    const expr = `a = 1; b = 2; c = 3; d = 4; e = 5; f = 6; g = 7; h = 8; i = 9; j = 10; sum1 = a+b+c+d+e; sum2 = f+g+h+i+j; prod1 = a*b*c*d*e; prod2 = f*g*h*i*j; minval = min(sum1, sum2); maxval = max(prod1, prod2); result = minval + maxval; result`;
    const context = { runOptions: { maxItems: 100, maxTotalChargedUsd: 100 }, input: {} };
    const N = 10000;

    it('should benchmark cold cache (parse every time)', () => {
        // Clear cache by using unique expressions
        const t0 = Date.now();
        for (let i = 0; i < N; i++) {
            evaluateDSL(expr + ' ' + i, context);
        }
        const t1 = Date.now();
        console.log(`Cold cache: ${N} evals in ${t1 - t0} ms, avg ${(t1 - t0) / N} ms/eval`);
    });

    it('should benchmark warm cache (reuse same expression)', () => {
        const t0 = Date.now();
        for (let i = 0; i < N; i++) {
            evaluateDSL(expr, context);
        }
        const t1 = Date.now();
        console.log(`Warm cache: ${N} evals in ${t1 - t0} ms, avg ${(t1 - t0) / N} ms/eval`);
    });
}); 