Your goal is to write a very simple non-Turing-complete domain specific language and interpreter in TS.

The use-case is this:
- We have a cloud platform that allows users to deploy and run their programs.
- Developers can release these programs into out "app store"
- Programs can be run with a RAM within range of 128 MB to 32 GB
- Programs take a JSON input object that defines things like URLs to process, limitations, filters etc.
- The goal is to allow developers to define a function that will determine default RAM based on the input object. This function will be executed by the cloud API when user runs the program.

Function:
- The function will be provided as a string in configuration file.
- The function should be just an expression that will evaluate to a number.
- The function will have access to 2 global objects:
    - `runOptions` with 2 properties:
        - `runOptions.maxItems` (integer)
        - `runOptions.maxTotalChargedUsd` (integer)
    - `input` with arbitrary properties, can be nested
- Max characters in the function is 1000


Language specification:
- Non-Turing-complete
- Interpreter should be written in TS
- Allowed operations:
    - Basic arithmetic operations: +, -, *, /, %
    - Min/max
    - array.length
    - object.property
    - default (||) - fallback for falsy values
    - ternary - truthy ? value : value
    - variable assignment for readability, separated by ;. Last expression is returned.
    - () for grouping precedence

Testing:
Write many test cases

Example functions:
- "min(options.maxChargedResults || 99999, input.usernames.length) * 64"
- "min(options.maxChargedResults, input.username.length * (input.resultsLimit || 1000) / input.onlyPostsNewerThan ? 20 : 1) * 64"

Or do you think function syntax would be better than operators? e.g.
- "min(default(options.maxChargedResults, 99999), length(input.usernames)) * 64"
- "min(options.maxChargedResults, length(input.username) * default(input.resultsLimit, 1000) / ternary(input.onlyPostsNewerThan, 20, 1)) * 64"