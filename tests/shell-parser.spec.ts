import { BashOp } from "../lib/docker-type";
import { parseShell } from "../lib/parser/docker-bash-parser";

describe("Testing shell parser", () => {
  test("dollar", async () => {
    const root = await parseShell("${apt-mark showmanual}");
    expect(root.toString()).toBe("${apt-mark showmanual}");
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
  test("BashOp :?", async () => {
    const root = await parseShell(
      `bash -c "\${DOCKER_FILE_BUILD_COMMAND:?Build argument DOCKER_FILE_BUILD_COMMAND needs to be set (check READEME.md)!}"`
    );
    expect(root.getElement(BashOp)?.toString(true)).toBe(":?");
    expect(root.getElement(BashOp)?.toString()).toBe(":?");
  });
  test("BashReplace", async () => {
    let root = await parseShell("${CUDA/./-}");
    expect(root.toString(true)).toBe(root.position.file.content);
    expect(root.toString(false)).toBe(root.position.file.content);
    
    root = await parseShell("${CUDA//./-}");
    expect(root.toString(true)).toBe(root.position.file.content);
    expect(root.toString(false)).toBe(root.position.file.content);
  });
  test("BASH-BRACE-EXPANSION", async () => {
    let root = await parseShell('"$(basename ${OPENWRT_SDK_URL%%.tar.*})"');
    expect(root.toString(true)).toBe(root.position.file.content);
    expect(root.toString(false)).toBe(root.position.file.content);
  });
});
