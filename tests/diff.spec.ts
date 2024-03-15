import { parseShell, parseDocker } from "../lib";

describe("Testing diff", () => {
  test("diff shell", () => {
    const astOld = parseShell("echo test");
    const astNew = parseShell("echo hello");

    const diff = astOld.diff(astNew);
    expect(diff.size()).toBe(1);
  });
  test("diff dockerfile", () => {
    const astOld = parseDocker("FROM ubuntu:latest");
    const astNew = parseDocker("FROM ubuntu:12");

    const diff = astOld.diff(astNew);
    expect(diff.size()).toBe(1);
  });
});
