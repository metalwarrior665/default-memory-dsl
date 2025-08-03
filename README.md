# Default Memory DSL

A simple, non-Turing-complete domain-specific language (DSL) and interpreter in TypeScript for determining default RAM allocation for cloud-deployed programs based on input options.

## Allowed Operations
- Basic arithmetic operations: `+`, `-`, `*`, `/`, `%`
- `min` and `max` functions (work like `Math.min` and `Math.max`)
- Accessing array length with `array.length`
- Accessing object properties with `object.property`
- Default value fallback using `||`
- Ternary operator: `condition ? valueIfTrue : valueIfFalse`
- Variable assignment using `let varName = value;` for readability, with statements separated by `;`
- Parentheses `()` for grouping expressions and controlling precedence

## Language Specification
- Literals can only be numbers
- Non-number values from `runOptions` and `input` evaluate to either `1` (truthy) or `0` (falsy)
- The provided string must end with a single expression that evaluates to a number
- The maximum length of the function string is 1000 characters

## Global Objects
- `runOptions`: An object with the following properties:
    - `runOptions.maxItems` (integer)
    - `runOptions.maxTotalChargedUsd` (integer)
- `input`: An object that can have arbitrary properties, which can be nested

## Example Functions
- `"min(options.maxItems || 99999, input.usernames.length) * 64"`
- `"min(options.maxItems, input.username.length * (input.resultsLimit || 1000) / input.onlyPostsNewerThan ? 20 : 1) * 64"`