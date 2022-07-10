import { readFileSync } from "fs";
import { DockerParser } from "../lib/ast/docker-parser";
import { DockerFile } from "../lib/ast/docker-type";
import { Matcher } from "../lib/debloat";
import {
  ruleAptGetInstallThenRemoveAptLists,
  ruleAptGetInstallUseNoRec,
  ruleAptGetUpdatePrecedesInstall,
} from "../lib/debloat/rules";

function praseFile(file: string) {
  const filePath = `./tests/data/${file}.Dockerfile`;
  const dockerParser = new DockerParser(readFileSync(filePath, "utf8"));
  dockerParser.filename = filePath;
  const ast = dockerParser.parse();
  expect(dockerParser.errors).toHaveLength(0);
  return ast;
}

describe("Testing docker parser with bash", () => {
  test("1c11182d763188889c00d8f44a91d0df09e0147b", () => {
    const dockerfile = praseFile("1c11182d763188889c00d8f44a91d0df09e0147b");
    expect(dockerfile).toBeInstanceOf(DockerFile);

    const matcher = new Matcher(dockerfile);

    expect(
      matcher.match(ruleAptGetInstallThenRemoveAptLists).violations
    ).toHaveLength(0);

    expect(
      matcher.match(ruleAptGetUpdatePrecedesInstall).violations
    ).toHaveLength(0);
  });
  test("1d8c362e7043d7b78836f06256d0ae9b82561af8", () => {
    const dockerfile = praseFile("1d8c362e7043d7b78836f06256d0ae9b82561af8");
    expect(dockerfile).toBeInstanceOf(DockerFile);

    const matcher = new Matcher(dockerfile);

    expect(
      matcher.match(ruleAptGetInstallThenRemoveAptLists).violations
    ).toHaveLength(0);

    expect(
      matcher.match(ruleAptGetUpdatePrecedesInstall).violations
    ).toHaveLength(0);

    expect(matcher.match(ruleAptGetInstallUseNoRec).violations).toHaveLength(1);
    if (ruleAptGetInstallUseNoRec.repair)
      ruleAptGetInstallUseNoRec.repair(
        matcher.match(ruleAptGetInstallUseNoRec).violations[0]
      );
  });
  test("0aa1cd6a00cfe247f17e680d5e2c394b5f0d3edc", () => {
    const dockerfile = praseFile("0aa1cd6a00cfe247f17e680d5e2c394b5f0d3edc");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0b15d39cebd7afc18eded9d4f41d932b00770eed", () => {
    const dockerfile = praseFile("0b15d39cebd7afc18eded9d4f41d932b00770eed");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0b687ec4b2f490051a53d114bf64242580c32f28", () => {
    const dockerfile = praseFile("0b687ec4b2f490051a53d114bf64242580c32f28");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0b1975d451426f9858f59b812411970f4e2ac49c", () => {
    const dockerfile = praseFile("0b1975d451426f9858f59b812411970f4e2ac49c");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0c1e517ccfa17cd28a2a1e54b6a017b6d7b94f0d", () => {
    const dockerfile = praseFile("0c1e517ccfa17cd28a2a1e54b6a017b6d7b94f0d");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("0c2ab277bc1488c0fad85b02a5e5cd4ff967e9d9", () => {
    const dockerfile = praseFile("0c2ab277bc1488c0fad85b02a5e5cd4ff967e9d9");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("1ae6fb60aa44225965af5580a60b7b11e92b0ae3", () => {
    const dockerfile = praseFile("1ae6fb60aa44225965af5580a60b7b11e92b0ae3");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
  test("1d1bb50eab9be0de526f64d25ee65a173d4b7bac", () => {
    const dockerfile = praseFile("1d1bb50eab9be0de526f64d25ee65a173d4b7bac");
    expect(dockerfile).toBeInstanceOf(DockerFile);
  });
});

// powsershell is not supported
// describe("Testing docker parser with powershell", () => {
//   test("0b90753a7f0376a82b40f6c9e9da67cd38d76f1e", () => {
//     const dockerfile = praseFile("0b90753a7f0376a82b40f6c9e9da67cd38d76f1e");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
//   test("0cee79e6174a0509d5a6f036676d5b86ec0be087", () => {
//     const dockerfile = praseFile("0cee79e6174a0509d5a6f036676d5b86ec0be087");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
//   test("0ee0b0080979a7fae89525da9115076a184a0393", () => {
//     const dockerfile = praseFile("0ee0b0080979a7fae89525da9115076a184a0393");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
//   test("0f119a2e24c747cd31f8d6da19c93fbcd5ace6bf", () => {
//     const dockerfile = praseFile("0f119a2e24c747cd31f8d6da19c93fbcd5ace6bf");
//     expect(dockerfile).toBeInstanceOf(DockerFile);
//   });
// });
