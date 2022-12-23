import { parseDocker } from "../lib/parser/docker-parser";

describe("Testing Docker parser", () => {
  test("parse gemrc configuration", async () => {
    const root = await parseDocker(
      `RUN mkdir -p /usr/local/etc \\
  && { \\
    echo 'install: --no-document'; \\
    echo 'update: --no-document'; \\
  } >> /usr/local/etc/gemrc`
    );
    expect(root.toString()).toBe(root.position.file.content);
  });

  test("parse instruction tag", async () => {
    const root = await parseDocker(`COPY --from=test source destination`);
    expect(root.toString()).toBe(root.position.file.content);
  });
});
