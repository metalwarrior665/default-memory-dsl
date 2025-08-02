#!/usr/bin/env node
import { evaluateRamExpression, getCacheStats, clearCache } from './dsl.js';

function printUsage() {
    console.log('Usage: dsl-eval <command> [args...]');
    console.log('Commands:');
    console.log('  eval <expression> <jsonContext>  - Evaluate an expression');
    console.log('  stats                            - Show cache statistics');
    console.log('  clear                           - Clear cache');
    console.log('  test                            - Run cache performance test');
    console.log('');
    console.log('Example: dsl-eval eval "let a = 1; a + 2" "{\"runOptions\":{\"maxItems\":10},\"input\":{}}"');
}

async function runCacheTest() {
    console.log('Running cache performance test...\n');
    
    const expressions = [
        'input.foo * 2',
        'min(runOptions.maxItems, input.arr.length)',
        'let a = input.foo; a + input.multiplier',
        'input.nested.scores.length * input.multiplier + 10'
    ];
    
    const context = {
        runOptions: { maxItems: 100 },
        input: {
            foo: 42,
            arr: [1, 2, 3, 4, 5],
            multiplier: 3,
            nested: { scores: [10, 20, 30, 40] }
        }
    };
    
    clearCache();
    console.log('Testing each expression 5 times to show cache effectiveness:');
    
    for (const expr of expressions) {
        console.log(`\nExpression: ${expr}`);
        for (let i = 0; i < 5; i++) {
            const start = performance.now();
            const result = evaluateRamExpression(expr, context);
            const time = performance.now() - start;
            const stats = getCacheStats();
            console.log(`  Run ${i+1}: ${result} (${time.toFixed(4)}ms) - Cache: ${stats.hits}H/${stats.misses}M`);
        }
    }
    
    console.log('\nFinal cache statistics:');
    console.log(getCacheStats());
}

async function main() {
    const [, , command, ...args] = process.argv;
    
    if (!command) {
        printUsage();
        process.exit(1);
    }
    
    try {
        switch (command) {
            case 'eval': {
                const [expr, json] = args;
                if (!expr || !json) {
                    console.log('Usage: dsl-eval eval <expression> <jsonContext>');
                    process.exit(1);
                }
                
                let context;
                try {
                    context = JSON.parse(json);
                } catch (e) {
                    console.error('Invalid JSON:', (e as Error).message);
                    process.exit(1);
                }
                
                const result = evaluateRamExpression(expr, context);
                console.log(result);
                break;
            }
            
            case 'stats': {
                const stats = getCacheStats();
                console.log('Cache Statistics:');
                console.log(`  Cache hits: ${stats.hits}`);
                console.log(`  Cache misses: ${stats.misses}`);
                console.log(`  Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
                console.log(`  Cache size: ${stats.cacheSize} entries`);
                console.log(`  Total evaluations: ${stats.totalEvaluations}`);
                break;
            }
            
            case 'clear': {
                clearCache();
                console.log('Cache cleared');
                break;
            }
            
            case 'test': {
                await runCacheTest();
                break;
            }
            
            default:
                console.error('Unknown command:', command);
                printUsage();
                process.exit(1);
        }
    } catch (e) {
        console.error('Error:', (e as Error).message);
        process.exit(1);
    }
}

main(); 