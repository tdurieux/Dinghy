import { parseDocker } from "../lib/ast/docker-parser";
import { Matcher } from "../lib/debloat/rule-matcher";

describe("Testing shell parser", () => {
  test("dollar", async () => {
    const root = await parseDocker(
      `RUN mkdir -p /usr/local/etc \\
  && { \\
  echo 'install: --no-document'; \\
  echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc`
    );
    expect(root.toString()).toBe(
      `RUN mkdir -p /usr/local/etc \\
  && { \\
    echo 'install: --no-document'; \\
    echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc\n`
    );
  });
});
