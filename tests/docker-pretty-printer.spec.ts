import { parseDocker } from "../lib/ast/docker-parser";
import { print } from "../lib/ast/docker-pretty-printer";
import { Matcher } from "../lib/debloat/rule-matcher";
import { praseFile } from "./test-utils";

describe("Testing docker-pretty-printer", () => {
  test("print 7cb0093bfdd6688528619ff0af54cdf0f95243b3", async () => {
    const dockerfile = await praseFile(
      "7cb0093bfdd6688528619ff0af54cdf0f95243b3"
    );
    // expect(print(dockerfile)).toBe(dockerfile.fileContent);
    const matcher = new Matcher(dockerfile);
    matcher.matchAll().forEach(async (e) => {
      await e.repair();
    });
    expect(print(dockerfile)).toBe(dockerfile.fileContent);
  });

  test("print 0001a177c159ca47f359c34cfdce78ecf80e7eb0", async () => {
    const dockerfile = await praseFile(
      "0001a177c159ca47f359c34cfdce78ecf80e7eb0"
    );
    // expect(print(dockerfile)).toBe(dockerfile.fileContent);
    const matcher = new Matcher(dockerfile);
    matcher.matchAll().forEach(async (e) => {
      console.log(e.toString());
      try {
        await e.repair();
      } catch (error) {}
    });
    expect(print(dockerfile)).toBe(dockerfile.fileContent);
  });

  test("print 0ce06af56644fb21ee96178f60c2d57eb73c8226", async () => {
    const dockerfile = await praseFile(
      "0ce06af56644fb21ee96178f60c2d57eb73c8226"
    );
    // expect(print(dockerfile)).toBe(dockerfile.fileContent);
    const matcher = new Matcher(dockerfile);
    matcher.matchAll().forEach(async (e) => {
      console.log(e.toString());
      try {
        await e.repair();
      } catch (error) {}
    });
    expect(print(dockerfile)).toBe(dockerfile.fileContent);
  });
  test("print 9cae314c3410c74d2267c7c71eeb17a83b13f07f", async () => {
    const dockerfile = await praseFile(
      "9cae314c3410c74d2267c7c71eeb17a83b13f07f"
    );
    // expect(print(dockerfile)).toBe(dockerfile.fileContent);
    const matcher = new Matcher(dockerfile);
    matcher.matchAll().forEach(async (e) => {
      console.log(e.toString());
      try {
        await e.repair();
      } catch (error) {}
    });
    expect(print(dockerfile)).toBe(dockerfile.fileContent);
  });
});