# **Dinghy: Versatile AST Generator for Shell Scripts and Dockerfiles**

[![CI](https://github.com/tdurieux/Dinghy/actions/workflows/build-test.yml/badge.svg)](https://github.com/tdurieux/Dinghy/actions/workflows/build-test.yml) ![NPM Version](https://img.shields.io/npm/v/%40tdurieux%2Fdinghy)

Dinghy is a robust library designed to generate Abstract Syntax Trees (ASTs) for both shell scripts and Dockerfiles. It offers developers a solution for parsing and analyzing these files, facilitating advanced automation and analysis tasks.

For detailed documentation, please visit [https://durieux.me/Dinghy/](https://durieux.me/Dinghy/).

## Features

- **AST Generation**: Effortlessly generate ASTs for shell scripts and Dockerfiles.
- **Parsing**: Accurately parse complex Dockerfiles, capturing their structure and directives.
- **Traversal**: Traverse the AST to perform various analysis tasks such as linting or modification.
- **Querying**: Extract specific information about commands, arguments, and more with ease.
- **Modular Design**: Built with modularity in mind, enabling easy extension and customization.
- **TypeScript Support**: Fully compatible with TypeScript for type-safe development.

## Installation

```bash
npm install @tdurieux/dinghy
```

## Usage

```typescript
import dinghy from "@tdurieux/dinghy";

// Parse Dockerfile
const dockerAST = dinghy.parseDocker(/* file path or file content */);
dockerAST.traverse((node) => {
  if (node instanceof dinghy.AbstractValueNode) {
    console.log(node.value);
  }
});

// Parse Shell Script
const shellAST = dinghy.parseShell(/* file path or file content */);
shellAST.traverse((node) => {
  if (node instanceof dinghy.AbstractValueNode) {
    console.log(node.value);
  }
});
```

Additional examples are available in the library's test suite.

## Contributing

Contributions to Dinghy are welcome! Whether it's bug fixes, new features, or documentation improvements, feel free to submit pull requests on our GitHub repository.

## License

Dinghy is licensed under the MIT License. See the LICENSE file for details.

**Happy Coding with Dinghy!**