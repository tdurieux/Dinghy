import { parseShell } from "../lib/ast/docker-bash-parser";
import { Matcher } from "../lib/debloat/rule-matcher";

describe("Testing shell parser", () => {
  test("dollar", async () => {
    const root = await parseShell("${apt-mark showmanual}");
    expect(root.toString()).toBe("${apt-mark showmanual}")
  });
});
