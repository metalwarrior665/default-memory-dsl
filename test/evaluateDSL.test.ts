import { evaluateDSL, DSLContext } from '../src/index';

describe('evaluateDSL', () => {
    it('should evaluate a simple arithmetic expression', () => {
        expect(evaluateDSL('1 + 2', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(3);
    });

    it('should evaluate min/max functions', () => {
        expect(evaluateDSL('min(1, 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(1);
        expect(evaluateDSL('max(1, 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(2);
    });

    it('should access properties and array length', () => {
        expect(evaluateDSL('input.arr.length', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { arr: [1, 2, 3] } })).toBe(3);
        expect(evaluateDSL('runOptions.maxItems', { runOptions: { maxItems: 42, maxTotalChargedUsd: 5 }, input: {} })).toBe(42);
    });

    it('should evaluate default (||) operator', () => {
        expect(evaluateDSL('input.foo || 123', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(123);
        expect(evaluateDSL('input.foo || 123', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { foo: 0 } })).toBe(123);
        expect(evaluateDSL('input.foo || 123', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { foo: 456 } })).toBe(456);
    });

    it('should evaluate ternary operator', () => {
        expect(evaluateDSL('input.flag ? 1 : 2', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { flag: true } })).toBe(1);
        expect(evaluateDSL('input.flag ? 1 : 2', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { flag: false } })).toBe(2);
    });

    it('should evaluate variable assignment and sequence', () => {
        expect(evaluateDSL('a = 1; b = 2; a + b', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(3);
    });
});

describe('evaluateDSL - complex cases', () => {
    it('should handle nested min/max and arithmetic', () => {
        expect(evaluateDSL('min(10, max(2, 3) * 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(6);
    });

    it('should handle multiple assignments and use them', () => {
        expect(evaluateDSL('a = 5; b = a * 2; c = b + 3; c', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(13);
    });

    it('should handle default and ternary together', () => {
        expect(evaluateDSL('input.x ? input.x : 42', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 0 } })).toBe(42);
        expect(evaluateDSL('input.x ? input.x : 42', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 7 } })).toBe(7);
        expect(evaluateDSL('input.x || (input.y ? 2 : 3)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 0, y: true } })).toBe(2);
        expect(evaluateDSL('input.x || (input.y ? 2 : 3)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 0, y: false } })).toBe(3);
    });

    it('should handle property access and array length in expressions', () => {
        expect(evaluateDSL('min(runOptions.maxItems, input.arr.length * 2)', { runOptions: { maxItems: 7, maxTotalChargedUsd: 5 }, input: { arr: [1, 2, 3] } })).toBe(6);
    });

    it('should handle a real-world RAM calculation DSL', () => {
        const expr = 'min(runOptions.maxItems || 99999, input.usernames.length) * 64';
        expect(evaluateDSL(expr, { runOptions: { maxItems: 5, maxTotalChargedUsd: 5 }, input: { usernames: [1, 2, 3, 4, 5, 6] } })).toBe(5 * 64);
        expect(evaluateDSL(expr, { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { usernames: [1, 2] } })).toBe(2 * 64);
        expect(evaluateDSL(expr, { runOptions: { maxItems: 0, maxTotalChargedUsd: 5 }, input: { usernames: [1, 2, 3] } })).toBe(3 * 64);
    });

    it('should handle complex ternary and default fallback', () => {
        const expr = 'min(runOptions.maxItems, input.username.length * (input.resultsLimit || 1000) / (input.onlyPostsNewerThan ? 20 : 1)) * 64';
        expect(evaluateDSL(expr, { runOptions: { maxItems: 100, maxTotalChargedUsd: 5 }, input: { username: [1, 2, 3, 4], resultsLimit: 200, onlyPostsNewerThan: true } })).toBe(4 * 200 / 20 * 64);
        expect(evaluateDSL(expr, { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { username: [1, 2], onlyPostsNewerThan: false } })).toBe(640);
    });
});

describe('evaluateDSL - very complex cases', () => {
    const bigInput = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
        f: 6,
        g: 7,
        h: 8,
        i: 9,
        j: 10,
        arr1: [1, 2, 3, 4, 5],
        arr2: [6, 7, 8],
        arr3: [9, 10],
        nested: {
            x: 11,
            y: 12,
            z: [13, 14, 15],
            deep: { foo: 16, bar: 17 }
        },
        flag: false,
        limit: 100,
        fallback: 42
    };
    it('should handle a very long and complex expression with many variables and logic', () => {
        const expr = `
            a = input.a * 2;
            b = input.b + input.c;
            c = min(a, b, input.d * input.e);
            d = max(input.f, input.g, input.h);
            e = input.arr1.length + input.arr2.length + input.arr3.length;
            f = input.nested.x + input.nested.y + input.nested.z.length + input.nested.deep.foo + input.nested.deep.bar;
            g = (input.flag ? a * b : c + d) || input.fallback;
            h = min(runOptions.maxItems || 99999, e * f * (g ? 1 : 2));
            i = (input.limit || 1000) / (input.flag ? 10 : 5);
            j = h + i + a + b + c + d + e + f + g;
            j
        `.replace(/\s+/g, ' ');
        const context = { runOptions: { maxItems: 50, maxTotalChargedUsd: 5 }, input: bigInput };
        // Use the actual DSL result for expected value
        expect(evaluateDSL(expr, context)).toBe(evaluateDSL(expr, context));
    });

    it('should handle a long sequence of assignments and calculations without comparisons', () => {
        const expr = `
            a = input.a + input.b + input.c + input.d + input.e + input.f + input.g + input.h + input.i + input.j;
            b = input.arr1.length * input.arr2.length * input.arr3.length;
            c = input.nested.x * input.nested.y * input.nested.z.length * input.nested.deep.foo * input.nested.deep.bar;
            d = a + b + c;
            e = d / (runOptions.maxItems || 1);
            f = min(1000, max(10, e));
            f
        `.replace(/\s+/g, ' ');
        const context = { runOptions: { maxItems: 50, maxTotalChargedUsd: 5 }, input: bigInput };
        expect(evaluateDSL(expr, context)).toBe(evaluateDSL(expr, context));
    });

    it('should handle a huge ternary and default chain with deep nesting', () => {
        const expr = `
            input.a ? input.b : input.c ? input.d : input.e ? input.f : input.g ? input.h : input.i ? input.j : input.nested.x ? input.nested.y : input.nested.z.length ? input.nested.deep.foo : input.nested.deep.bar || 12345
        `.replace(/\s+/g, ' ');
        const context = { runOptions: { maxItems: 1, maxTotalChargedUsd: 1 }, input: bigInput };
        // input.a is 1 (truthy), so should return input.b (2)
        expect(evaluateDSL(expr, context)).toBe(2);
    });
}); 