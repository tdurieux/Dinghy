import { readFileSync } from "fs";
import { DockerParser } from "../lib/ast/docker-parser";
import { DockerFile } from "../lib/ast/docker-type";
import { Matcher } from "../lib/debloat/rule-matcher";
import {
  ruleAptGetInstallThenRemoveAptLists,
  ruleAptGetInstallUseNoRec,
  ruleAptGetUpdatePrecedesInstall,
} from "../lib/debloat/rules";

async function praseFile(file: string) {
  const filePath = `./tests/data/${file}.Dockerfile`;
  const dockerParser = new DockerParser(readFileSync(filePath, "utf8"));
  dockerParser.filename = filePath;
  const ast = await dockerParser.parse();
  expect(dockerParser.errors).toHaveLength(0);
  return ast;
}

describe("Testing docker parser with bash", () => {
  test("1c11182d763188889c00d8f44a91d0df09e0147b", async () => {
    const dockerfile = await praseFile(
      "1c11182d763188889c00d8f44a91d0df09e0147b"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);

    const matcher = new Matcher(dockerfile);

    expect(matcher.match(ruleAptGetInstallThenRemoveAptLists)).toHaveLength(0);

    expect(matcher.match(ruleAptGetUpdatePrecedesInstall)).toHaveLength(0);
  });
  test("1d8c362e7043d7b78836f06256d0ae9b82561af8", async () => {
    const dockerfile = await praseFile(
      "1d8c362e7043d7b78836f06256d0ae9b82561af8"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);

    const matcher = new Matcher(dockerfile);

    expect(matcher.match(ruleAptGetInstallThenRemoveAptLists)).toHaveLength(0);

    expect(matcher.match(ruleAptGetUpdatePrecedesInstall)).toHaveLength(0);

    expect(matcher.match(ruleAptGetInstallUseNoRec)).toHaveLength(1);
    matcher.match(ruleAptGetInstallUseNoRec)[0].repair();
  });
  test("0aa1cd6a00cfe247f17e680d5e2c394b5f0d3edc", async () => {
    const dockerfile = await praseFile(
      "0aa1cd6a00cfe247f17e680d5e2c394b5f0d3edc"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);

    const violations = new Matcher(dockerfile).matchAll();
    expect(violations).toHaveLength(0);
  });
  test("0b15d39cebd7afc18eded9d4f41d932b00770eed", async () => {
    const dockerfile = await praseFile(
      "0b15d39cebd7afc18eded9d4f41d932b00770eed"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0b687ec4b2f490051a53d114bf64242580c32f28", async () => {
    const dockerfile = await praseFile(
      "0b687ec4b2f490051a53d114bf64242580c32f28"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0b1975d451426f9858f59b812411970f4e2ac49c", async () => {
    const dockerfile = await praseFile(
      "0b1975d451426f9858f59b812411970f4e2ac49c"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0c1e517ccfa17cd28a2a1e54b6a017b6d7b94f0d", async () => {
    const dockerfile = await praseFile(
      "0c1e517ccfa17cd28a2a1e54b6a017b6d7b94f0d"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0c2ab277bc1488c0fad85b02a5e5cd4ff967e9d9", async () => {
    const dockerfile = await praseFile(
      "0c2ab277bc1488c0fad85b02a5e5cd4ff967e9d9"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("1ae6fb60aa44225965af5580a60b7b11e92b0ae3", async () => {
    const dockerfile = await praseFile(
      "1ae6fb60aa44225965af5580a60b7b11e92b0ae3"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("1d1bb50eab9be0de526f64d25ee65a173d4b7bac", async () => {
    const dockerfile = await praseFile(
      "1d1bb50eab9be0de526f64d25ee65a173d4b7bac"
    );
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
});

// powsershell is not supported
// describe("Testing docker parser with powershell", () => {
//   test("0b90753a7f0376a82b40f6c9e9da67cd38d76f1e", async () => {
//     const dockerfile = await praseFile("0b90753a7f0376a82b40f6c9e9da67cd38d76f1e");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
//   test("0cee79e6174a0509d5a6f036676d5b86ec0be087", async () => {
//     const dockerfile = await praseFile("0cee79e6174a0509d5a6f036676d5b86ec0be087");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
//   test("0ee0b0080979a7fae89525da9115076a184a0393", async () => {
//     const dockerfile = await praseFile("0ee0b0080979a7fae89525da9115076a184a0393");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
//   test("0f119a2e24c747cd31f8d6da19c93fbcd5ace6bf", async () => {
//     const dockerfile = await praseFile("0f119a2e24c747cd31f8d6da19c93fbcd5ace6bf");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
// });
