import { parseDockerFile } from "../lib/ast/docker-parser";
import { DockerFile } from "../lib/ast/docker-type";
import { Matcher } from "../lib/debloat";
import {
  ruleAptGetInstallThenRemoveAptLists,
  ruleAptGetInstallUseNoRec,
  ruleAptGetUpdatePrecedesInstall,
} from "../lib/debloat/rules";

function praseFile(file: string) {
  return parseDockerFile(`./tests/data/${file}.Dockerfile`);
}
describe("Testing docker parser", () => {
  test("1c11182d763188889c00d8f44a91d0df09e0147b", () => {
    const dockerfile = praseFile("1c11182d763188889c00d8f44a91d0df09e0147b");
    expect(dockerfile).toBeInstanceOf(DockerFile);

    const matcher = new Matcher(dockerfile);

    expect(
      matcher.match(ruleAptGetInstallThenRemoveAptLists).violations
    ).toHaveLength(0);

    expect(
      matcher.match(ruleAptGetUpdatePrecedesInstall).violations
    ).toHaveLength(0);
  });
  test("1d8c362e7043d7b78836f06256d0ae9b82561af8", () => {
    const dockerfile = praseFile("1d8c362e7043d7b78836f06256d0ae9b82561af8");
    expect(dockerfile).toBeInstanceOf(DockerFile);

    const matcher = new Matcher(dockerfile);

    expect(
      matcher.match(ruleAptGetInstallThenRemoveAptLists).violations
    ).toHaveLength(0);

    expect(
      matcher.match(ruleAptGetUpdatePrecedesInstall).violations
    ).toHaveLength(0);

    expect(matcher.match(ruleAptGetInstallUseNoRec).violations).toHaveLength(1);
    if (ruleAptGetInstallUseNoRec.repair)
      ruleAptGetInstallUseNoRec.repair(
        matcher.match(ruleAptGetInstallUseNoRec).violations[0]
      );
  });
});
