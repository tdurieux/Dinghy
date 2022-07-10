import { parseDocker } from "../lib/ast/docker-parser";
import {
  BashLiteral,
  BashScript,
  BashWord,
  DockerFile,
  DockerRun,
  Q,
} from "../lib/ast/docker-type";

describe("Testing docker-types", () => {
  test("match", async () => {
    const root = await parseDocker("RUN wget localhost");
    expect(root.match(Q(BashLiteral))).toBe(false);
    expect(root.match(Q(DockerFile))).toBe(true);
    
    expect(root.match(Q(DockerFile, Q(DockerRun, Q(BashScript))))).toBe(true);
    expect(root.match(Q(DockerFile, DockerRun, BashScript))).toBe(true);
  });

  test("find", async () => {
    const root = await parseDocker("RUN wget localhost");
    expect(root.find(Q(BashLiteral))).toHaveLength(2);
    let e = root.find(Q(BashWord, Q(BashLiteral, "localhost")));
    expect(e).toHaveLength(1);
    expect(e[0]).toBeInstanceOf(BashWord);
  });
});
