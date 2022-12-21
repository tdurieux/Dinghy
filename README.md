# Dinghy

A library to parse and modify Dockerfiles

## Install

```bash
npm install @tdurieux/dinghy
```

## Usage

```typescript
import * as dindhy from "@tdurieux/dinghy";

const ast = await dindhy.dockerfileParser.parseDocker(/* file */);
ast.traverse((node) => {
  if (ast instanceof dindhy.nodeType.DockerOpsValueNode) {
    console.log(ast.value);
  }
});
```
