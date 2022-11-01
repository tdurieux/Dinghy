import { readFileSync } from "fs";
import { DockerParser } from "../lib/ast/docker-parser";
import { Printer } from "../lib/ast/docker-printer";

export async function praseFile(file: string) {
  const filePath = `./tests/data/${file}.Dockerfile`;
  const dockerParser = new DockerParser(readFileSync(filePath, "utf8"));
  dockerParser.filename = filePath;
  const ast = await dockerParser.parse();
  expect(dockerParser.errors).toHaveLength(0);
  const printer = new Printer(ast, true);
  // printer.print();
  expect(printer.errors).toHaveLength(0);
  return ast;
}