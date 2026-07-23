<div align="center">

# ⛵ Dinghy

**A versatile AST parser for shell scripts and Dockerfiles.**

[![CI](https://github.com/tdurieux/Dinghy/actions/workflows/build-test.yml/badge.svg)](https://github.com/tdurieux/Dinghy/actions/workflows/build-test.yml)
[![npm](https://img.shields.io/npm/v/@tdurieux/dinghy?logo=npm)](https://www.npmjs.com/package/@tdurieux/dinghy)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-durieux.me%2FDinghy-e5503a)](https://durieux.me/Dinghy/)

[Features](#features) · [Install](#installation) · [Usage](#usage) · [Docs](https://durieux.me/Dinghy/)

</div>

## What it does

Dinghy turns **shell scripts and Dockerfiles into Abstract Syntax Trees** you can query, traverse, and modify. It parses a Dockerfile together with the shell embedded in its `RUN` instructions into a single tree — the foundation for linting, analysis, and automated rewriting tasks.

Dinghy is the parsing engine behind [docker-parfum](https://github.com/tdurieux/docker-parfum). Full API documentation lives at **[durieux.me/Dinghy](https://durieux.me/Dinghy/)**.

## Features

- **Unified AST** for both shell scripts and Dockerfiles.
- **Accurate parsing** of complex Dockerfiles, capturing structure and directives.
- **Traversal** for analysis tasks such as linting or modification.
- **Querying** to extract commands, arguments, and more.
- **Modular** design, easy to extend with custom node types.
- **TypeScript-first**, fully typed.

## Installation

```bash
npm install @tdurieux/dinghy
```

## Usage

```typescript
import dinghy from "@tdurieux/dinghy";

// Parse a Dockerfile (path or content)
const dockerAST = dinghy.parseDocker(/* file path or file content */);
dockerAST.traverse((node) => {
  if (node instanceof dinghy.AbstractValueNode) {
    console.log(node.value);
  }
});

// Parse a shell script (path or content)
const shellAST = dinghy.parseShell(/* file path or file content */);
shellAST.traverse((node) => {
  if (node instanceof dinghy.AbstractValueNode) {
    console.log(node.value);
  }
});
```

See the [API documentation](https://durieux.me/Dinghy/) for the full node hierarchy, queries, and printers.

## Used by

- [docker-parfum](https://github.com/tdurieux/docker-parfum) — detects and repairs Dockerfile smells on top of Dinghy.

## License

MIT © [Thomas Durieux](https://durieux.me)
