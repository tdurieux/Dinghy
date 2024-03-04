import { BashCommand, BashCondition, BashOp } from "../lib/shell/shell-types";
import { parseShell } from "../lib/shell/shell-parser";
import { parseDocker } from "../lib/docker/docker-parser";

describe("Testing shell parser", () => {
  test("dollar", () => {
    const root = parseShell("${apt-mark showmanual}");
    expect(root.toString()).toBe("${apt-mark showmanual}");
  });
  test("dollar expression", () => {
    const root =
      parseShell(`\${steps_get-days-before-expiration_outputs_days}`);
    expect(root.toString()).toBe(root.position.file?.content);
  });
  test("Reprint shell", () => {
    const root = parseShell(`apk update \
&& apk add \
ruby ruby-dev ruby-json \
&& rm -f /var/cache/apk/* \
&& gem install -N \
puppet puppet-lint`);
    expect(root.toString()).toBe(root.position.file?.content);
  });
  test("BashOp :?", () => {
    const root = parseShell(
      `bash -c "\${DOCKER_FILE_BUILD_COMMAND:?Build argument DOCKER_FILE_BUILD_COMMAND needs to be set (check READEME.md)!}"`
    );
    expect(root.getElement(BashOp)?.toString(true)).toBe(":?");
    expect(root.getElement(BashOp)?.toString()).toBe(":?");
  });
  test("BashReplace", () => {
    let root = parseShell("${CUDA/./-}");
    expect(root.toString(true)).toBe(root.position.file?.content);
    expect(root.toString(false)).toBe(root.position.file?.content);

    root = parseShell("${CUDA//./-}");
    expect(root.toString(true)).toBe(root.position.file?.content);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
  test("BASH-PROC-SUB", () => {
    let root = parseShell('bash <(echo "ls")');
    expect(root.toString(true)).toBe(root.position.file?.content);
    expect(root.toString(false)).toBe(root.position.file?.content);

    root = parseShell('bash >(echo "ls")');
    expect(root.toString(true)).toBe(root.position.file?.content);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
  test("BASH-BRACE-EXPANSION", () => {
    const root = parseShell('"$(basename ${OPENWRT_SDK_URL%%.tar.*})"');
    root.getElements(BashCommand).forEach((node) => {
      node.isChanged = true;
    });
    expect(root.toString(true)).toBe(root.position.file?.content);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
  test("BASH-EXPRESSION", () => {
    const root = parseDocker(
      "RUN export CHROMEDRIVER_RELEASE=$(curl --location --fail --retry 3 https://chromedriver.storage.googleapis.com/LATEST_RELEASE)"
    );
    root.getElements(BashCommand).forEach((node) => {
      node.isChanged = true;
    });
    expect(root.toString(false)).toBe(root.position.file?.content);
    expect(root.toString(true)).toBe(root.position.file?.content);
  });
  test("Condition", () => {
    const root = parseShell(`if [ ! -z $GOARM ]; then
  export GOARM=v$GOARM
fi
if [ "$stringvar" == "tux" ]; then
  export GOARM=v$GOARM
fi`);
    expect(root.getElements(BashCommand)).toHaveLength(0);
    expect(root.getElements(BashCondition)).toHaveLength(2);
    expect(root.toString(true)).toBe(root.position.file?.content);
    expect(root.toString(false)).toBe(root.position.file?.content);
  });
});
