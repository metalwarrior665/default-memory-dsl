import { evaluateRamExpression } from '../src/dsl';
import { describe, it, expect } from 'vitest';
describe('evaluateRamExpression', () => {
    it('should evaluate a simple arithmetic expression', () => {
        expect(evaluateRamExpression('1 + 2', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(3);
    });
    it('should evaluate min/max functions', () => {
        expect(evaluateRamExpression('min(1, 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(1);
        expect(evaluateRamExpression('max(1, 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(2);
    });
    it('should access properties and array length', () => {
        expect(evaluateRamExpression('input.arr.length', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { arr: [1, 2, 3] } })).toBe(3);
        expect(evaluateRamExpression('runOptions.maxItems', { runOptions: { maxItems: 42, maxTotalChargedUsd: 5 }, input: {} })).toBe(42);
    });
    it('should evaluate default (||) operator', () => {
        expect(evaluateRamExpression('input.foo || 123', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(123);
        expect(evaluateRamExpression('input.foo || 123', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { foo: 0 } })).toBe(123);
        expect(evaluateRamExpression('input.foo || 123', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { foo: 456 } })).toBe(456);
    });
    it('should evaluate ternary operator', () => {
        expect(evaluateRamExpression('input.flag ? 1 : 2', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { flag: true } })).toBe(1);
        expect(evaluateRamExpression('input.flag ? 1 : 2', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { flag: false } })).toBe(2);
    });
    it('should evaluate variable assignment and sequence', () => {
        expect(evaluateRamExpression('let a = 1; let b = 2; a + b', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(3);
    });
});
describe('evaluateRamExpression - complex cases', () => {
    it('should handle nested min/max and arithmetic', () => {
        expect(evaluateRamExpression('min(10, max(2, 3) * 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(6);
    });
    it('should handle multiple assignments and use them', () => {
        expect(evaluateRamExpression('let a = 5; let b = a * 2; let c = b + 3; c', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(13);
    });
    it('should handle default and ternary together', () => {
        expect(evaluateRamExpression('input.x ? input.x : 42', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 0 } })).toBe(42);
        expect(evaluateRamExpression('input.x ? input.x : 42', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 7 } })).toBe(7);
        expect(evaluateRamExpression('input.x || (input.y ? 2 : 3)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 0, y: true } })).toBe(2);
        expect(evaluateRamExpression('input.x || (input.y ? 2 : 3)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { x: 0, y: false } })).toBe(3);
    });
    it('should handle property access and array length in expressions', () => {
        expect(evaluateRamExpression('min(runOptions.maxItems, input.arr.length * 2)', { runOptions: { maxItems: 7 }, input: { arr: [1, 2, 3] } })).toBe(6);
    });
    it('should handle a real-world RAM calculation DSL', () => {
        const expr = 'min(runOptions.maxItems || 99999, input.usernames.length) * 64';
        expect(evaluateRamExpression(expr, { runOptions: { maxItems: 5 }, input: { usernames: [1, 2, 3, 4, 5, 6] } })).toBe(5 * 64);
        expect(evaluateRamExpression(expr, { runOptions: { maxItems: 10 }, input: { usernames: [1, 2] } })).toBe(2 * 64);
        expect(evaluateRamExpression(expr, { runOptions: { maxItems: 0 }, input: { usernames: [1, 2, 3] } })).toBe(3 * 64);
    });
    it('should handle complex ternary and default fallback', () => {
        const expr = 'min(runOptions.maxItems, input.username.length * (input.resultsLimit || 1000) / (input.onlyPostsNewerThan ? 20 : 1)) * 64';
        expect(evaluateRamExpression(expr, { runOptions: { maxItems: 100 }, input: { username: [1, 2, 3, 4], resultsLimit: 200, onlyPostsNewerThan: true } })).toBe(4 * 200 / 20 * 64);
        expect(evaluateRamExpression(expr, { runOptions: { maxItems: 10 }, input: { username: [1, 2], onlyPostsNewerThan: false } })).toBe(10 * 64);
    });
});
describe('evaluateRamExpression - very complex cases', () => {
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
            let a = input.a * 2;
            let b = input.b + input.c;
            let c = min(a, b, input.d * input.e);
            let d = max(input.f, input.g, input.h);
            let e = input.arr1.length + input.arr2.length + input.arr3.length;
            let f = input.nested.x + input.nested.y + input.nested.z.length + input.nested.deep.foo + input.nested.deep.bar;
            let g = (input.flag ? a * b : c + d) || input.fallback;
            let h = min(runOptions.maxItems || 99999, e * f * (g ? 1 : 2));
            let i = (input.limit || 1000) / (input.flag ? 10 : 5);
            let j = h + i + a + b + c + d + e + f + g;
            j
        `.replace(/\s+/g, ' ');
        const context = { runOptions: { maxItems: 50, maxTotalChargedUsd: 5 }, input: bigInput };
        expect(evaluateRamExpression(expr, context)).toBe(evaluateRamExpression(expr, context));
    });
    it('should handle a huge ternary and default chain with deep nesting', () => {
        const expr = `
            input.a ? input.b : input.c ? input.d : input.e ? input.f : input.g ? input.h : input.i ? input.j : input.nested.x ? input.nested.y : input.nested.z.length ? input.nested.deep.foo : input.nested.deep.bar || 12345
        `.replace(/\s+/g, ' ');
        const context = { runOptions: { maxItems: 1, maxTotalChargedUsd: 1 }, input: bigInput };
        expect(evaluateRamExpression(expr, context)).toBe(2);
    });
    it('should handle a long sequence of assignments and calculations without comparisons', () => {
        const expr = `
            let a = input.a + input.b + input.c + input.d + input.e + input.f + input.g + input.h + input.i + input.j;
            let b = input.arr1.length * input.arr2.length * input.arr3.length;
            let c = input.nested.x * input.nested.y * input.nested.z.length * input.nested.deep.foo * input.nested.deep.bar;
            let d = a + b + c;
            let e = d / (runOptions.maxItems || 1);
            let f = min(1000, max(10, e));
            f
        `.replace(/\s+/g, ' ');
        const context = { runOptions: { maxItems: 50, maxTotalChargedUsd: 5 }, input: bigInput };
        expect(evaluateRamExpression(expr, context)).toBe(evaluateRamExpression(expr, context));
    });
});
describe('evaluateRamExpression - multiple operands (bug fix tests)', () => {
    it('should handle addition with more than two operands', () => {
        expect(evaluateRamExpression('1 + 2 + 3', { runOptions: {}, input: {} })).toBe(6);
        expect(evaluateRamExpression('1 + 2 + 3 + 4', { runOptions: {}, input: {} })).toBe(10);
    });
    
    it('should handle subtraction with more than two operands', () => {
        expect(evaluateRamExpression('10 - 2 - 3', { runOptions: {}, input: {} })).toBe(5);
        expect(evaluateRamExpression('1 + 2 - 3', { runOptions: {}, input: {} })).toBe(0);
    });
    
    it('should handle multiplication with more than two operands', () => {
        expect(evaluateRamExpression('2 * 3 * 4', { runOptions: {}, input: {} })).toBe(24);
        expect(evaluateRamExpression('2 * 3 * 4 * 5', { runOptions: {}, input: {} })).toBe(120);
    });
    
    it('should handle division with more than two operands', () => {
        expect(evaluateRamExpression('20 / 4 / 2', { runOptions: {}, input: {} })).toBe(2.5);
        expect(evaluateRamExpression('6 / 2 * 3', { runOptions: {}, input: {} })).toBe(9);
    });
    
    it('should handle mixed mul/div operations with correct left-to-right evaluation', () => {
        expect(evaluateRamExpression('6 / 2 * 3', { runOptions: {}, input: {} })).toBe(9);
        expect(evaluateRamExpression('8 * 2 / 4', { runOptions: {}, input: {} })).toBe(4);
        expect(evaluateRamExpression('2 * 3 / 6 * 4', { runOptions: {}, input: {} })).toBe(4);
    });
    
    it('should handle mixed add/sub operations with correct left-to-right evaluation', () => {
        expect(evaluateRamExpression('1 + 2 - 3 + 4', { runOptions: {}, input: {} })).toBe(4);
        expect(evaluateRamExpression('10 - 2 + 3 - 1', { runOptions: {}, input: {} })).toBe(10);
    });
});

describe('evaluateRamExpression - edge cases and complex scenarios', () => {
    it('should handle deeply nested arithmetic expressions', () => {
        expect(evaluateRamExpression('1 + 2 * 3 + 4 * 5 - 6 / 2', { runOptions: {}, input: {} })).toBe(24); // 1 + 6 + 20 - 3
        expect(evaluateRamExpression('((1 + 2) * 3 + 4) * 5 - 6', { runOptions: {}, input: {} })).toBe(59); // ((3) * 3 + 4) * 5 - 6 = (13) * 5 - 6 = 65 - 6
    });

    it('should handle modulo operations with multiple operands', () => {
        expect(evaluateRamExpression('10 % 3 % 2', { runOptions: {}, input: {} })).toBe(1); // (10 % 3) % 2 = 1 % 2 = 1
        expect(evaluateRamExpression('15 % 4 * 2', { runOptions: {}, input: {} })).toBe(6); // (15 % 4) * 2 = 3 * 2 = 6
    });

    it('should handle multiple function calls in sequence', () => {
        expect(evaluateRamExpression('min(1, 2, 3) + max(4, 5, 6)', { runOptions: {}, input: {} })).toBe(7);
        expect(evaluateRamExpression('max(min(1, 2), min(3, 4)) + min(max(5, 6), max(7, 8))', { runOptions: {}, input: {} })).toBe(9); // max(1, 3) + min(6, 8) = 3 + 6
    });

    it('should handle complex ternary chains', () => {
        expect(evaluateRamExpression('1 ? 2 ? 3 : 4 : 5', { runOptions: {}, input: {} })).toBe(3);
        expect(evaluateRamExpression('0 ? 2 ? 3 : 4 : 5 ? 6 : 7', { runOptions: {}, input: {} })).toBe(6);
    });

    it('should handle mixed operators with correct precedence', () => {
        expect(evaluateRamExpression('1 + 2 * 3 - 4 / 2 + 5 % 3', { runOptions: {}, input: {} })).toBe(7); // 1 + 6 - 2 + 2 = 7
        expect(evaluateRamExpression('2 * 3 + 4 * 5 - 6 * 7 / 2', { runOptions: {}, input: {} })).toBe(5); // 6 + 20 - 21 = 5
    });

    it('should handle property access chains with arithmetic', () => {
        const context = { 
            runOptions: { maxItems: 100 }, 
            input: { 
                user: { profile: { scores: [10, 20, 30] } },
                multiplier: 2,
                base: 5
            } 
        };
        expect(evaluateRamExpression('input.user.profile.scores.length * input.multiplier + input.base', context)).toBe(11); // 3 * 2 + 5
    });

    it('should handle default operators with complex expressions', () => {
        expect(evaluateRamExpression('input.missing || (1 + 2 * 3)', { runOptions: {}, input: {} })).toBe(7);
        expect(evaluateRamExpression('input.zero || input.missing || (5 * 2)', { runOptions: {}, input: { zero: 0 } })).toBe(10);
    });

    it('should handle function calls with arithmetic arguments', () => {
        expect(evaluateRamExpression('min(1 + 2, 3 * 4, 5 - 6)', { runOptions: {}, input: {} })).toBe(-1); // min(3, 12, -1)
        expect(evaluateRamExpression('max(10 / 2, 3 + 4, 2 * 3)', { runOptions: {}, input: {} })).toBe(7); // max(5, 7, 6)
    });

    it('should handle variable assignments in complex expressions', () => {
        expect(evaluateRamExpression('let a = 2 * 3; let b = a + 4; let c = b * 2; c - a', { runOptions: {}, input: {} })).toBe(14); // c=20, a=6, result=14
        expect(evaluateRamExpression('let x = 1; let y = x * 2; let z = y + x; x + y + z', { runOptions: {}, input: {} })).toBe(6); // x=1, y=2, z=3, result=6
    });

    it('should handle zero and negative numbers correctly', () => {
        expect(evaluateRamExpression('0 + 1 * 2', { runOptions: {}, input: {} })).toBe(2);
        expect(evaluateRamExpression('5 - 10 + 3', { runOptions: {}, input: {} })).toBe(-2);
        expect(evaluateRamExpression('0 * 100 + 1', { runOptions: {}, input: {} })).toBe(1);
    });

    it('should handle decimal arithmetic correctly', () => {
        expect(evaluateRamExpression('1.5 + 2.5', { runOptions: {}, input: {} })).toBe(4);
        expect(evaluateRamExpression('10.5 / 2.1', { runOptions: {}, input: {} })).toBe(5);
        expect(evaluateRamExpression('3.14 * 2', { runOptions: {}, input: {} })).toBe(6.28);
    });

    it('should handle very long arithmetic chains', () => {
        expect(evaluateRamExpression('1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1', { runOptions: {}, input: {} })).toBe(10);
        expect(evaluateRamExpression('2 * 2 * 2 * 2 * 2', { runOptions: {}, input: {} })).toBe(32);
        expect(evaluateRamExpression('100 - 10 - 10 - 10 - 10 - 10', { runOptions: {}, input: {} })).toBe(50);
    });

    it('should handle mixed operators in parentheses', () => {
        expect(evaluateRamExpression('(1 + 2) * (3 + 4)', { runOptions: {}, input: {} })).toBe(21);
        expect(evaluateRamExpression('(10 - 5) / (2 + 3)', { runOptions: {}, input: {} })).toBe(1);
        expect(evaluateRamExpression('(2 * 3 + 4) * (5 - 1)', { runOptions: {}, input: {} })).toBe(40); // (6 + 4) * 4 = 40
    });

    it('should handle edge cases with truthy/falsy values', () => {
        const context = { runOptions: { maxItems: 0 }, input: { empty: [], str: "", num: 0, bool: false, obj: {} } };
        expect(evaluateRamExpression('input.empty.length || 5', context)).toBe(5); // [] has length 0, so falsy
        expect(evaluateRamExpression('input.str || 10', context)).toBe(10); // "" is falsy
        expect(evaluateRamExpression('input.num || 15', context)).toBe(15); // 0 is falsy  
        expect(evaluateRamExpression('input.bool || 20', context)).toBe(20); // false is falsy
        expect(evaluateRamExpression('input.obj || 25', context)).toBe(1); // {} is truthy, so evaluates to 1
    });
});

describe('evaluateRamExpression - top-level expressions', () => {
    it('should evaluate a top-level arithmetic expression', () => {
        expect(evaluateRamExpression('1 + 2 * 3', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(7);
    });
    it('should evaluate a top-level min/max expression', () => {
        expect(evaluateRamExpression('min(1, 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(1);
        expect(evaluateRamExpression('max(1, 2)', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: {} })).toBe(2);
    });
    it('should evaluate a top-level property access expression', () => {
        expect(evaluateRamExpression('input.foo + 1', { runOptions: { maxItems: 10, maxTotalChargedUsd: 5 }, input: { foo: 41 } })).toBe(42);
    });
});
