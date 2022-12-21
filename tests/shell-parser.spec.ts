import { parseShell } from "../lib/parser/docker-bash-parser";

describe("Testing shell parser", () => {
  test("dollar", async () => {
    const root = await parseShell("${apt-mark showmanual}");
    expect(root.toString()).toBe("${apt-mark showmanual} ");
  });
  test("Reprint shell", async () => {
    const root = await parseShell(`apk update \
&& apk add \
ruby ruby-dev ruby-json \
&& rm -f /var/cache/apk/* \
&& gem install -N \
puppet puppet-lint`);
    expect(root.toString()).toBe(root.position.file.content);
  });
});
