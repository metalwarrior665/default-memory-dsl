// ramDsl.ts
import {
  createToken,
  Lexer,
  CstParser,
  ICstVisitor,
  CstNode,
} from 'chevrotain';
import { writeFileSync } from 'fs';

// --------------------
// 1. Define Tokens
// --------------------
const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /\d+(\.\d+)?/ });
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_.]*/ });
const Let = createToken({ name: 'Let', pattern: /let/ });
const Assign = createToken({ name: 'Assign', pattern: /=/ });
const Semi = createToken({ name: 'Semi', pattern: /;/ });
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const Plus = createToken({ name: 'Plus', pattern: /\+/ });
const Minus = createToken({ name: 'Minus', pattern: /-/ });
const Mult = createToken({ name: 'Mult', pattern: /\*/ });
const Div = createToken({ name: 'Div', pattern: /\// });
const Mod = createToken({ name: 'Mod', pattern: /%/ });
const Or = createToken({ name: 'Or', pattern: /\|\|/ });
const TernaryQ = createToken({ name: 'TernaryQ', pattern: /\?/ });
const TernaryC = createToken({ name: 'TernaryC', pattern: /:/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });
const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });

const allTokens = [
  WhiteSpace,
  Let, NumberLiteral, Identifier,
  Assign, Semi,
  LParen, RParen, Comma,
  Plus, Minus, Mult, Div, Mod, Or,
  TernaryQ, TernaryC,
];

const RamLexer = new Lexer(allTokens);

// --------------------
// 2. Define Parser
// --------------------
class RamParser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  public program = this.RULE('program', () => {
    this.MANY(() => this.SUBRULE(this.letStatement));
    this.SUBRULE(this.expression);
  });

  private letStatement = this.RULE('letStatement', () => {
    this.CONSUME(Let);
    this.CONSUME(Identifier);
    this.CONSUME(Assign);
    this.SUBRULE(this.expression);
    this.CONSUME(Semi);
  });

  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.ternaryExpr);
  });

  private ternaryExpr = this.RULE('ternaryExpr', () => {
    this.SUBRULE(this.orExpr);
    this.OPTION(() => {
      this.CONSUME(TernaryQ);
      this.SUBRULE1(this.expression);
      this.CONSUME(TernaryC);
      this.SUBRULE2(this.expression);
    });
  });

  private orExpr = this.RULE('orExpr', () => {
    this.SUBRULE(this.addExpr);
    this.MANY(() => {
      this.CONSUME(Or);
      this.SUBRULE2(this.addExpr);
    });
  });

  private addExpr = this.RULE('addExpr', () => {
    this.SUBRULE(this.mulExpr);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus) },
        { ALT: () => this.CONSUME(Minus) },
      ]);
      this.SUBRULE2(this.mulExpr);
    });
  });

  private mulExpr = this.RULE('mulExpr', () => {
    this.SUBRULE(this.primary);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Mult) },
        { ALT: () => this.CONSUME(Div) },
        { ALT: () => this.CONSUME(Mod) },
      ]);
      this.SUBRULE2(this.primary);
    });
  });

  private primary = this.RULE('primary', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.expression);
          this.CONSUME(RParen);
        },
      },
      {
        ALT: () => {

          this.SUBRULE(this.functionCall);
        },
      },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(Identifier) },
    ]);
  });

  private functionCall = this.RULE('functionCall', () => {
    this.CONSUME(Identifier);
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.expression);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression);
      });
    });
    this.CONSUME(RParen);
  });
}

const parserInstance = new RamParser();
const BaseVisitor = parserInstance.getBaseCstVisitorConstructor();

// --------------------
// 3. Optimized Interpreter (Evaluator)
// --------------------

// Pre-computed function lookup for better performance
const FUNCTION_MAP = new Map<string, (...args: number[]) => number>([
  ['min', Math.min],
  ['max', Math.max]
]);

// Context property cache to avoid repeated property access
class PropertyCache {
  private cache = new Map<string, any>();
  private context: any;

  constructor(context: any) {
    this.context = context;
  }

  get(path: string): any {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    const parts = path.split('.');
    let value = this.context;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        value = undefined;
        break;
      }
      value = value[part];
    }

    this.cache.set(path, value);
    return value;
  }

  clear() {
    this.cache.clear();
  }
}

class RamInterpreter extends BaseVisitor implements ICstVisitor<any, number> {
  private variables: Map<string, number> = new Map(); // Use Map for better performance
  private propertyCache: PropertyCache;

  constructor(context: any) {
    super();
    this.propertyCache = new PropertyCache(context);
    this.validateVisitor();
  }

  program(ctx: any) {
    ctx.letStatement?.forEach((stmt: CstNode) => this.visit(stmt));
    return this.visit(ctx.expression);
  }

  letStatement(ctx: any) {
    const name = ctx.Identifier[0].image;
    const value = this.visit(ctx.expression);
    this.variables.set(name, value);
  }

  expression(ctx: any) {
    const result =  this.visit(ctx.ternaryExpr);
    return result;
  }

  ternaryExpr(ctx: any) {
    const cond = this.visit(ctx.orExpr);
    if (ctx.TernaryQ) {
      return cond ? this.visit(ctx.expression[0]) : this.visit(ctx.expression[1]);
    }
    return cond;
  }

  orExpr(ctx: any) {
    let result = this.visit(ctx.addExpr[0]);
    for (let i = 1; i < ctx.addExpr.length; i++) {
      result = result || this.visit(ctx.addExpr[i]);
    }
    return result;
  }

  addExpr(ctx: any) {
    let result = this.visit(ctx.mulExpr[0]);
    
    // Optimized: avoid object creation if only one operand
    if (ctx.mulExpr.length === 1) return result;
    
    // We need to merge and sort the operators by their position in the source
    const operators: { pos: number; type: string }[] = [];
    
    if (ctx.Plus) {
      ctx.Plus.forEach((token: any) => operators.push({ pos: token.startOffset, type: '+' }));
    }
    if (ctx.Minus) {
      ctx.Minus.forEach((token: any) => operators.push({ pos: token.startOffset, type: '-' }));
    }
    
    // Sort operators by their position in the source
    operators.sort((a, b) => a.pos - b.pos);
    
    // Apply operators in left-to-right order with optimized arithmetic
    for (let i = 0; i < operators.length; i++) {
      const right = this.visit(ctx.mulExpr[i + 1]);
      // Inline arithmetic for better performance
      result = operators[i].type === '+' ? result + right : result - right;
    }
    
    return result;
  }

  mulExpr(ctx: any) { 
    let result = this.visit(ctx.primary[0]);
    
    // Optimized: avoid object creation if only one operand
    if (ctx.primary.length === 1) return result;
    
    // We need to merge and sort the operators by their position in the source
    const operators: { pos: number; type: string }[] = [];
    
    if (ctx.Mult) {
      ctx.Mult.forEach((token: any) => operators.push({ pos: token.startOffset, type: '*' }));
    }
    if (ctx.Div) {
      ctx.Div.forEach((token: any) => operators.push({ pos: token.startOffset, type: '/' }));
    }
    if (ctx.Mod) {
      ctx.Mod.forEach((token: any) => operators.push({ pos: token.startOffset, type: '%' }));
    }
    
    // Sort operators by their position in the source
    operators.sort((a, b) => a.pos - b.pos);
    
    // Apply operators in left-to-right order with optimized arithmetic
    for (let i = 0; i < operators.length; i++) {
      const right = this.visit(ctx.primary[i + 1]);
      const opType = operators[i].type;
      
      // Inline operations for better performance
      if (opType === '*') result *= right;
      else if (opType === '/') result /= right;
      else result %= right;
    }

    return result;
  }

  primary(ctx: any) {
    // Optimized: direct property access for better performance
    if (ctx.NumberLiteral) {
      return parseFloat(ctx.NumberLiteral[0].image);
    }
    
    if (ctx.Identifier && !ctx.functionCall) {
      const fullPath = ctx.Identifier[0].image;
      const dotIndex = fullPath.indexOf('.');
      
      if (dotIndex === -1) {
        // Simple variable access
        if (this.variables.has(fullPath)) {
          return this.variables.get(fullPath)!;
        }
        // Context root access
        const value = this.propertyCache.get(fullPath);
        if (typeof value === 'number') return value;
        if (Array.isArray(value)) return value.length;
        return value ? 1 : 0;
      } else {
        // Property path access - use optimized cache
        const rootName = fullPath.substring(0, dotIndex);
        
        if (this.variables.has(rootName)) {
          // Variable with property access (shouldn't happen in current grammar, but safe)
          const baseValue = this.variables.get(rootName)!;
          const restPath = fullPath.substring(dotIndex + 1);
          const parts = restPath.split('.');
          let value = baseValue;
          for (const part of parts) {
            if (value === null || value === undefined) {
              value = undefined;
              break;
            }
            value = value[part];
          }
          if (typeof value === 'number') return value;
          if (Array.isArray(value)) return value.length;
          return value ? 1 : 0;
        } else {
          // Context property access
          const value = this.propertyCache.get(fullPath);
          if (typeof value === 'number') return value;
          if (Array.isArray(value)) return value.length;
          return value ? 1 : 0;
        }
      }
    }
    
    if (ctx.functionCall) return this.visit(ctx.functionCall);
    return this.visit(ctx.expression);
  }

  functionCall(ctx: any) {
    const name = ctx.Identifier[0].image;
    
    // Optimized: use pre-computed function map
    const func = FUNCTION_MAP.get(name);
    if (!func) {
      throw new Error(`Unknown function: ${name}`);
    }
    
    // Build arguments array efficiently
    const args: number[] = [];
    if (ctx.expression && ctx.expression.length > 0) {
      args.push(this.visit(ctx.expression[0]));
      for (let i = 1; i < ctx.expression.length; i++) {
        args.push(this.visit(ctx.expression[i]));
      }
    }
    
    return func(...args);
  }
}

// --------------------
// 4. Simple LRU Cache for CSTs
// --------------------
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V> = new Map();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Cache for parsed CSTs (expression -> CST)
const cstCache = new LRUCache<string, any>(1000);
let cacheHits = 0;
let cacheMisses = 0;

// --------------------
// 5. Entrypoint with CST Caching
// --------------------
export function evaluateRamExpression(source: string, context: any): number {
  // Try to get parsed CST from cache
  let cst = cstCache.get(source);
  
  if (!cst) {
    // Cache miss - parse the expression
    cacheMisses++;
    const lex = RamLexer.tokenize(source);
    if (lex.errors.length) throw new Error("Lexing error: " + JSON.stringify(lex.errors));

    parserInstance.input = lex.tokens;
    cst = parserInstance.program();
    if (parserInstance.errors.length) throw new Error("Parsing error: " + JSON.stringify(parserInstance.errors));

    // Cache the parsed CST
    cstCache.set(source, cst);

    // Debug: write CST to file (only for cache misses to avoid excessive writes)
    if (process.env.NODE_ENV !== 'production') {
      const json = JSON.stringify(cst, null, 2);
      writeFileSync('cst.json', json, 'utf8');
    }
  } else {
    // Cache hit
    cacheHits++;
  }

  // Evaluate with cached or newly parsed CST
  // Create visitor with fresh property cache for each evaluation
  const visitor = new RamInterpreter(context);
  return visitor.visit(cst);
}

// --------------------
// 6. Cache Management and Statistics
// --------------------
export function getCacheStats() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
    cacheSize: cstCache.size(),
    totalEvaluations: cacheHits + cacheMisses
  };
}

export function clearCache() {
  cstCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

// Function for benchmarking without cache
export function evaluateRamExpressionNoCache(source: string, context: any): number {
  const lex = RamLexer.tokenize(source);
  if (lex.errors.length) throw new Error("Lexing error: " + JSON.stringify(lex.errors));

  parserInstance.input = lex.tokens;
  const cst = parserInstance.program();
  if (parserInstance.errors.length) throw new Error("Parsing error: " + JSON.stringify(parserInstance.errors));

  const visitor = new RamInterpreter(context);
  return visitor.visit(cst);
}

// Example usage:
// const ram = evaluateRamExpression("let a = runOptions.maxItems || 100; max(a, 256) * 2", {
//   runOptions: { maxItems: 1500, maxTotalChargedUsd: 10 },
//   input: { urls: ["a", "b"] }
// });
