import { DockerParser } from "../lib/ast/docker-parser";
import { Printer } from "../lib/ast/docker-printer";
import File from "../lib/ast/file";

export async function praseFile(file: string) {
  const filePath = `./tests/data/${file}.Dockerfile`;
  const dockerParser = new DockerParser(new File(filePath));
  const ast = await dockerParser.parse();
  expect(dockerParser.errors).toHaveLength(0);
  const printer = new Printer(ast, true);
  // printer.print();
  expect(printer.errors).toHaveLength(0);
  return ast;
}
