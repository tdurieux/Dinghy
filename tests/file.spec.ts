import { readFileSync } from "fs";
import { File } from "../lib/";
import { Position } from "../lib/core/core-types";
import { BashLiteral } from "../lib/shell/shell-types";

describe("Testing file", () => {
  test("undifined paramater", () => {
    const t = () => {
      new File();
    };
    expect(t).toThrow("File content cannot be empty");
  });
  test("empty paramater", () => {
    const t = () => {
      new File(undefined, "");
    };
    expect(t).toThrow("File content cannot be empty");
  });
  test("defined path", () => {
    const file = new File(__filename);
    expect(file.content).toBe(readFileSync(__filename, "utf8"));
  });
  test("defined path and content", () => {
    const file = new File(__filename, "test");
    expect(file.content).toBe("test");
  });
  test("content at position", () => {
    const file = new File(__filename, "test");
    expect(file.contentAtPosition(new Position(0, 0, 0, 0))).toBe("");
    expect(file.contentAtPosition(new Position(0, 1, 0, 2))).toBe("e");
    expect(file.contentAtPosition(new Position(0, 0, 0, 1))).toBe("t");
    expect(file.contentAtPosition(new Position(0, 0, 0, 2))).toBe("te");
    expect(file.contentAtPosition(new Position(0, 0, 0, 3))).toBe("tes");
    expect(file.contentAtPosition(new Position(0, 0, 0, 4))).toBe("test");
    expect(file.contentAtPosition(new Position(0, 0, 0, 5))).toBe("test");
  });
  test("content at node", () => {
    const file = new File(__filename, "test");
    const node = new BashLiteral("").setPosition(new Position(0, 0, 0, 4));
    expect(file.contentOfNode(node)).toBe("test");
  });
});
