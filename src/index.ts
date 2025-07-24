// Entry point for the Default Memory DSL interpreter

export interface RunOptions {
    maxItems?: number;
    maxTotalChargedUsd?: number;
}

export interface DSLContext {
    runOptions: RunOptions;
    input: any;
}

// AST Node Types
export type ASTNode =
    | { type: 'NumberLiteral'; value: number }
    | { type: 'Identifier'; name: string }
    | { type: 'BinaryExpression'; operator: string; left: ASTNode; right: ASTNode }
    | { type: 'CallExpression'; callee: string; args: ASTNode[] }
    | { type: 'MemberExpression'; object: ASTNode; property: string }
    | { type: 'ArrayLength'; array: ASTNode }
    | { type: 'Default'; left: ASTNode; right: ASTNode }
    | { type: 'Ternary'; test: ASTNode; consequent: ASTNode; alternate: ASTNode }
    | { type: 'Assignment'; name: string; value: ASTNode }
    | { type: 'Sequence'; expressions: ASTNode[] };

// Token types
export type Token =
    | { type: 'number'; value: number }
    | { type: 'identifier'; value: string }
    | { type: 'operator'; value: string }
    | { type: 'paren'; value: '(' | ')' }
    | { type: 'semicolon' }
    | { type: 'dot' }
    | { type: 'comma' }
    | { type: 'question' }
    | { type: 'colon' }
    | { type: 'eof' };

const OPERATORS = ['+', '-', '*', '/', '%', '=', '||', '?', ':'];

export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < input.length) {
        const char = input[i];
        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
            i++;
            continue;
        }
        if (/[0-9]/.test(char)) {
            let num = '';
            while (i < input.length && /[0-9.]/.test(input[i])) {
                num += input[i++];
            }
            tokens.push({ type: 'number', value: parseFloat(num) });
            continue;
        }
        if (/[a-zA-Z_]/.test(char)) {
            let id = '';
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                id += input[i++];
            }
            tokens.push({ type: 'identifier', value: id });
            continue;
        }
        if (char === '(' || char === ')') {
            tokens.push({ type: 'paren', value: char });
            i++;
            continue;
        }
        if (char === ';') {
            tokens.push({ type: 'semicolon' });
            i++;
            continue;
        }
        if (char === '.') {
            tokens.push({ type: 'dot' });
            i++;
            continue;
        }
        if (char === ',') {
            tokens.push({ type: 'comma' });
            i++;
            continue;
        }
        if (char === '?') {
            tokens.push({ type: 'question' });
            i++;
            continue;
        }
        if (char === ':') {
            tokens.push({ type: 'colon' });
            i++;
            continue;
        }
        // Multi-char operators
        if (input.slice(i, i + 2) === '||') {
            tokens.push({ type: 'operator', value: '||' });
            i += 2;
            continue;
        }
        if (OPERATORS.includes(char)) {
            tokens.push({ type: 'operator', value: char });
            i++;
            continue;
        }
        throw new Error(`Unexpected character: ${char}`);
    }
    tokens.push({ type: 'eof' });
    return tokens;
}

// Parser implementation
class Parser {
    private tokens: Token[];
    private pos: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(offset = 0): Token {
        return this.tokens[this.pos + offset] || { type: 'eof' };
    }

    private next(): Token {
        return this.tokens[this.pos++] || { type: 'eof' };
    }

    private expect(type: Token['type'], value?: any): Token {
        const token = this.next();
        if (token.type !== type || (value !== undefined && token.type !== 'eof' && 'value' in token && token.value !== value)) {
            throw new Error(`Expected ${type}${value !== undefined ? ' ' + value : ''}, got ${token.type} ${'value' in token ? token.value : ''}`);
        }
        return token;
    }

    public parse(): ASTNode {
        const exprs: ASTNode[] = [];
        while (this.peek().type !== 'eof') {
            exprs.push(this.parseExpression());
            if (this.peek().type === 'semicolon') this.next();
        }
        return exprs.length === 1 ? exprs[0] : { type: 'Sequence', expressions: exprs };
    }

    private parseExpression(): ASTNode {
        return this.parseAssignment();
    }

    private parseAssignment(): ASTNode {
        const expr = this.parseTernary();
        const peeked = this.peek();
        if (peeked.type === 'operator' && 'value' in peeked && peeked.value === '=') {
            if (expr.type !== 'Identifier') throw new Error('Left side of assignment must be an identifier');
            this.next();
            const value = this.parseAssignment();
            return { type: 'Assignment', name: expr.name, value };
        }
        return expr;
    }

    private parseTernary(): ASTNode {
        let test = this.parseDefault();
        if (this.peek().type === 'question') {
            this.next();
            const consequent = this.parseExpression();
            this.expect('colon');
            const alternate = this.parseExpression();
            return { type: 'Ternary', test, consequent, alternate };
        }
        return test;
    }

    private parseDefault(): ASTNode {
        let left = this.parseBinary(0);
        let peeked = this.peek();
        while (peeked.type === 'operator' && 'value' in peeked && peeked.value === '||') {
            this.next();
            const right = this.parseBinary(0);
            left = { type: 'Default', left, right };
            peeked = this.peek();
        }
        return left;
    }

    private getPrecedence(op: string): number {
        switch (op) {
            case '*': case '/': case '%': return 3;
            case '+': case '-': return 2;
            default: return 1;
        }
    }

    private parseBinary(minPrec: number): ASTNode {
        let left = this.parseUnary();
        let peeked = this.peek();
        while (peeked.type === 'operator' && 'value' in peeked && ['+', '-', '*', '/', '%'].includes(peeked.value)) {
            const op = peeked.value;
            const prec = this.getPrecedence(op);
            if (prec < minPrec) break;
            this.next();
            let right = this.parseUnary();
            let nextPeeked = this.peek();
            while (nextPeeked.type === 'operator' && 'value' in nextPeeked && this.getPrecedence(nextPeeked.value) > prec) {
                right = this.parseBinary(this.getPrecedence(nextPeeked.value));
                nextPeeked = this.peek();
            }
            left = { type: 'BinaryExpression', operator: op, left, right };
            peeked = this.peek();
        }
        return left;
    }

    private parseUnary(): ASTNode {
        // No unary ops for now
        return this.parseCallOrMember();
    }

    private parseCallOrMember(): ASTNode {
        let expr = this.parsePrimary();
        while (true) {
            const peeked = this.peek();
            if (peeked.type === 'dot') {
                this.next();
                const propToken = this.expect('identifier');
                const prop = 'value' in propToken ? propToken.value : undefined;
                if (prop === 'length') {
                    expr = { type: 'ArrayLength', array: expr };
                } else if (typeof prop === 'string') {
                    expr = { type: 'MemberExpression', object: expr, property: prop };
                } else {
                    throw new Error('Expected property name after dot');
                }
            } else if (peeked.type === 'paren' && 'value' in peeked && typeof peeked.value === 'string' && peeked.value === '(') {
                this.next();
                const args: ASTNode[] = [];
                let nextPeeked = this.peek();
                if (!(nextPeeked.type === 'paren' && 'value' in nextPeeked && typeof nextPeeked.value === 'string' && nextPeeked.value === ')')) {
                    do {
                        args.push(this.parseExpression());
                        if (this.peek().type === 'comma') this.next();
                        else break;
                        nextPeeked = this.peek();
                    } while (true);
                }
                this.expect('paren', ')');
                if (expr.type !== 'Identifier') throw new Error('Call must be on identifier');
                expr = { type: 'CallExpression', callee: expr.name, args };
            } else {
                break;
            }
        }
        return expr;
    }

    private parsePrimary(): ASTNode {
        const token = this.peek();
        if (token.type === 'number') {
            this.next();
            return { type: 'NumberLiteral', value: token.value };
        }
        if (token.type === 'identifier') {
            this.next();
            return { type: 'Identifier', name: token.value };
        }
        if (token.type === 'paren' && 'value' in token && token.value === '(') {
            this.next();
            const expr = this.parseExpression();
            this.expect('paren', ')');
            return expr;
        }
        throw new Error(`Unexpected token: ${token.type}`);
    }
}

function parseDSL(expr: string): ASTNode {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens);
    return parser.parse();
}

// Evaluator implementation
function evaluateAST(node: ASTNode, context: DSLContext, env: Record<string, any>): any {
    switch (node.type) {
        case 'NumberLiteral':
            return node.value;
        case 'Identifier':
            if (node.name in env) return env[node.name];
            if (node.name === 'runOptions') return context.runOptions;
            if (node.name === 'input') return context.input;
            throw new Error(`Unknown identifier: ${node.name}`);
        case 'BinaryExpression': {
            const left = evaluateAST(node.left, context, env);
            const right = evaluateAST(node.right, context, env);
            switch (node.operator) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return left / right;
                case '%': return left % right;
                default: throw new Error(`Unknown operator: ${node.operator}`);
            }
        }
        case 'CallExpression': {
            const args = node.args.map(arg => evaluateAST(arg, context, env));
            switch (node.callee) {
                case 'min': return Math.min(...args);
                case 'max': return Math.max(...args);
                default: throw new Error(`Unknown function: ${node.callee}`);
            }
        }
        case 'MemberExpression': {
            const obj = evaluateAST(node.object, context, env);
            if (typeof obj !== 'object' || obj === null) throw new Error('Cannot access property of non-object');
            return obj[node.property];
        }
        case 'ArrayLength': {
            const arr = evaluateAST(node.array, context, env);
            if (!Array.isArray(arr)) throw new Error('length property only valid on arrays');
            return arr.length;
        }
        case 'Default': {
            const left = evaluateAST(node.left, context, env);
            return left ? left : evaluateAST(node.right, context, env);
        }
        case 'Ternary': {
            const test = evaluateAST(node.test, context, env);
            return test ? evaluateAST(node.consequent, context, env) : evaluateAST(node.alternate, context, env);
        }
        case 'Assignment': {
            const value = evaluateAST(node.value, context, env);
            env[node.name] = value;
            return value;
        }
        case 'Sequence': {
            let result;
            for (const expr of node.expressions) {
                result = evaluateAST(expr, context, env);
            }
            return result;
        }
        default:
            throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
}

// FIFO cache for parsed ASTs
const AST_CACHE_LIMIT = 100;
const astCache: Map<string, ASTNode> = new Map();

function getCachedAST(expr: string): ASTNode {
    if (astCache.has(expr)) {
        // Move to end to mark as recently used
        const ast = astCache.get(expr)!;
        astCache.delete(expr);
        astCache.set(expr, ast);
        return ast;
    }
    const ast = parseDSL(expr);
    astCache.set(expr, ast);
    // FIFO: remove oldest if over limit
    if (astCache.size > AST_CACHE_LIMIT) {
        const firstKey = astCache.keys().next().value;
        if (typeof firstKey === 'string') {
            astCache.delete(firstKey);
        }
    }
    return ast;
}

export function evaluateDSL(expr: string, context: DSLContext): number {
    const ast = getCachedAST(expr);
    const result = evaluateAST(ast, context, {});
    if (typeof result !== 'number' || !isFinite(result)) throw new Error('Result is not a finite number');
    return result;
} 