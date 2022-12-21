import { readFileSync } from "fs";
import { File } from "../lib/";
import { BashLiteral, Position } from "../lib/docker-type";

describe("Testing file", () => {
  test("undifined paramater", async () => {
    const t = () => {
      new File();
    };
    expect(t).toThrow("File content cannot be empty");
  });
  test("empty paramater", async () => {
    const t = () => {
      new File(undefined, "");
    };
    expect(t).toThrow("File content cannot be empty");
  });
  test("defined path", async () => {
    const file = new File(__filename);
    expect(file.content).toBe(readFileSync(__filename, "utf8"));
  });
  test("defined path and content", async () => {
    const file = new File(__filename, "test");
    expect(file.content).toBe("test");
  });
  test("content at position", async () => {
    const file = new File(__filename, "test");
    expect(file.contentAtPosition(new Position(0, 0, 0, 0))).toBe("");
    expect(file.contentAtPosition(new Position(0, 1, 0, 2))).toBe("e");
    expect(file.contentAtPosition(new Position(0, 0, 0, 1))).toBe("t");
    expect(file.contentAtPosition(new Position(0, 0, 0, 2))).toBe("te");
    expect(file.contentAtPosition(new Position(0, 0, 0, 3))).toBe("tes");
    expect(file.contentAtPosition(new Position(0, 0, 0, 4))).toBe("test");
    expect(file.contentAtPosition(new Position(0, 0, 0, 5))).toBe("test");
  });
  test("content at node", async () => {
    const file = new File(__filename, "test");
    const node = new BashLiteral("").setPosition(new Position(0, 0, 0, 4));
    expect(file.contentOfNode(node)).toBe("test");
  });
});
