import { parseDockerFile } from "../lib/ast/dockerParser";
import { DockerFile } from "../lib/ast/type";
import {
  ruleAptGetInstallThenRemoveAptLists,
  ruleAptGetInstallUseNoRec,
  ruleAptGetUpdatePrecedesInstall,
} from "../lib/ast/rule";

function praseFile(file: string) {
  return parseDockerFile(`./tests/data/${file}.Dockerfile`);
}
describe("Testing docker parser", () => {
  test("1c11182d763188889c00d8f44a91d0df09e0147b", () => {
    const dockerfile = praseFile("1c11182d763188889c00d8f44a91d0df09e0147b");
    expect(dockerfile).toBeInstanceOf(DockerFile);

    expect(
      dockerfile.match(ruleAptGetInstallThenRemoveAptLists).violations
    ).toHaveLength(0);

    expect(
      dockerfile.match(ruleAptGetUpdatePrecedesInstall).violations
    ).toHaveLength(0);
  });
  test("1d8c362e7043d7b78836f06256d0ae9b82561af8", () => {
    const dockerfile = praseFile("1d8c362e7043d7b78836f06256d0ae9b82561af8");
    expect(dockerfile).toBeInstanceOf(DockerFile);

    expect(
      dockerfile.match(ruleAptGetInstallThenRemoveAptLists).violations
    ).toHaveLength(0);

    expect(
      dockerfile.match(ruleAptGetUpdatePrecedesInstall).violations
    ).toHaveLength(0);

    expect(dockerfile.match(ruleAptGetInstallUseNoRec).violations).toHaveLength(
      1
    );
    if (ruleAptGetInstallUseNoRec.repair)
      ruleAptGetInstallUseNoRec.repair(
        dockerfile.match(ruleAptGetInstallUseNoRec).violations[0]
      );
  });
});
