# Default Memory DSL

A simple, non-Turing-complete domain-specific language (DSL) and interpreter in TypeScript for determining default RAM allocation for cloud-deployed programs based on input options.

## Purpose
This project allows developers to define a function (as a string) that determines the default RAM for their cloud program, based on the input object and run options. The function is evaluated by the cloud API when the program is run.

## Features
- Non-Turing-complete DSL
- Safe evaluation of user-defined expressions
- Access to two global objects: `runOptions` and `input`
- Supports basic arithmetic, min/max, array/object access, default (||), ternary, variable assignment, and grouping
- Max function length: 1000 characters

## Example DSL Functions
```
min(options.maxChargedResults || 99999, input.usernames.length) * 64
min(options.maxChargedResults, input.username.length * (input.resultsLimit || 1000) / input.onlyPostsNewerThan ? 20 : 1) * 64
```

## Getting Started
1. Clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Build the project:
   ```sh
   npx tsc
   ```
4. Run tests:
   ```sh
   npm test
   ```

## Project Structure
- `src/` - Source code for the DSL parser and interpreter
- `test/` - Test cases for the DSL

## License
ISC 